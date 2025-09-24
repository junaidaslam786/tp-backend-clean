import { 
  Injectable, 
  NotFoundException, 
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import {
  SubLevel,
  ClientSubs,
  PaymentStatus,
  SubType,
} from '../../subscriptions/interfaces';
import { User, UserRole } from '../../users/interfaces/user.interface';
import { QuotaValidationService } from '../../profiling/services/quota-validation.service';

export interface SubscriptionOverrideDto {
  organizationId: string;
  newTier: SubLevel;
  reason: string;
  durationMonths?: number; // Optional override duration
}

export interface SubscriptionStatsDto {
  totalSubscriptions: number;
  subscriptionsByTier: Record<SubLevel, number>;
  subscriptionsByStatus: Record<PaymentStatus, number>;
  monthlyRevenue: number;
  churned: number;
  newSubscriptions: number;
}

@Injectable()
export class SubscriptionAdminService {
  private readonly logger = new Logger(SubscriptionAdminService.name);
  
  constructor(
    private readonly dynamoDbService: DynamoDbService,
    private readonly quotaValidationService: QuotaValidationService,
  ) {}

  /**
   * Override subscription tier for an organization (admin only)
   */
  async overrideSubscriptionTier(
    overrideDto: SubscriptionOverrideDto,
    adminUser: User,
  ): Promise<ClientSubs> {
    this.validateAdminAccess(adminUser);

    // Find current subscription
    const currentSub = await this.getCurrentSubscription(overrideDto.organizationId);
    if (!currentSub) {
      throw new NotFoundException('No subscription found for organization');
    }

    // Create subscription override record
    const now = new Date().toISOString();
    const overrideRecord: ClientSubs = {
      client_name: overrideDto.organizationId,
      sub_level: overrideDto.newTier,
      run_number: currentSub.run_number,
      progress: 'active',
      payment_status: PaymentStatus.PAID,
      sub_type: SubType.UPGRADE,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    // Store override - construct DDB record with proper keys
    const dbRecord = {
      pk: `CLIENT#${overrideDto.organizationId}`,
      sk: `SUB#${Date.now()}`,
      ...overrideRecord,
    };
    
    await this.dynamoDbService.putItem(dbRecord, 'ClientSubs');

    // Log the override
    this.logger.warn(
      `Admin ${adminUser.email} overrode subscription for ${overrideDto.organizationId} to ${overrideDto.newTier}. Reason: ${overrideDto.reason}`,
    );

    return overrideRecord;
  }

  /**
   * Get all subscriptions with admin view
   */
  async getAllSubscriptions(): Promise<ClientSubs[]> {
    const subscriptions = await this.dynamoDbService.scanItems('ClientSubs', {});
    return subscriptions as ClientSubs[];
  }

  /**
   * Get subscription statistics
   */
  async getSubscriptionStats(): Promise<SubscriptionStatsDto> {
    const allSubscriptions = await this.getAllSubscriptions();
    
    // Get active subscriptions (most recent per organization)
    const activeSubscriptions = this.getActiveSubscriptions(allSubscriptions);
    
    const stats: SubscriptionStatsDto = {
      totalSubscriptions: activeSubscriptions.length,
      subscriptionsByTier: {
        [SubLevel.L1]: 0,
        [SubLevel.L2]: 0,
        [SubLevel.L3]: 0,
        [SubLevel.LE]: 0,
      },
      subscriptionsByStatus: {
        [PaymentStatus.PENDING]: 0,
        [PaymentStatus.PAID]: 0,
        [PaymentStatus.FAILED]: 0,
        [PaymentStatus.CANCELLED]: 0,
        [PaymentStatus.REFUNDED]: 0,
      },
      monthlyRevenue: 0,
      churned: 0,
      newSubscriptions: 0,
    };

    // Calculate statistics
    activeSubscriptions.forEach((sub) => {
      stats.subscriptionsByTier[sub.sub_level]++;
      stats.subscriptionsByStatus[sub.payment_status]++;
    });

    // Calculate monthly metrics
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const currentMonthSubs = allSubscriptions.filter(
      (sub) => sub.createdAt.substring(0, 7) === currentMonth,
    );
    
    stats.newSubscriptions = currentMonthSubs.length;

    // Calculate revenue (mock calculation - would integrate with payment system)
    const tierPrices = {
      [SubLevel.L1]: 49,
      [SubLevel.L2]: 99,
      [SubLevel.L3]: 199,
      [SubLevel.LE]: 499,
    };

    stats.monthlyRevenue = activeSubscriptions
      .filter((sub) => sub.payment_status === PaymentStatus.PAID)
      .reduce((total, sub) => total + (tierPrices[sub.sub_level] || 0), 0);

    return stats;
  }

  /**
   * Force subscription renewal
   */
  async forceRenewal(
    organizationId: string,
    adminUser: User,
  ): Promise<void> {
    this.validateAdminAccess(adminUser);
    
    const currentSub = await this.getCurrentSubscription(organizationId);
    if (!currentSub) {
      throw new NotFoundException('No subscription found for organization');
    }

    // Reset usage for the organization
    const periodKey = this.getCurrentPeriodKey();
    
    try {
      await this.dynamoDbService.putItem(
        {
          pk: `ORG#${organizationId}`,
          sk: `USAGE#${periodKey}`,
          organizationId,
          period: periodKey,
          runsThisMonth: 0,
          exportsThisMonth: 0,
          apiCallsThisMonth: 0,
          storageUsedGb: 0,
          currentUsers: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        'Usage',
      );

      this.logger.log(
        `Admin ${adminUser.email} forced renewal for ${organizationId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to force renewal for ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Suspend subscription
   */
  async suspendSubscription(
    organizationId: string,
    adminUser: User,
    reason: string,
  ): Promise<void> {
    this.validateAdminAccess(adminUser);
    
    const currentSub = await this.getCurrentSubscription(organizationId);
    if (!currentSub) {
      throw new NotFoundException('No subscription found for organization');
    }

    // Create new cancelled subscription record
    const now = new Date().toISOString();
    const cancelledRecord = {
      pk: `CLIENT#${organizationId}`,
      sk: `SUB#${Date.now()}`,
      client_name: organizationId,
      sub_level: currentSub.sub_level,
      run_number: currentSub.run_number,
      progress: 'suspended',
      payment_status: PaymentStatus.CANCELLED,
      sub_type: SubType.UPGRADE,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    await this.dynamoDbService.putItem(cancelledRecord, 'ClientSubs');

    this.logger.warn(
      `Admin ${adminUser.email} suspended subscription for ${organizationId}. Reason: ${reason}`,
    );
  }

  /**
   * Reactivate subscription
   */
  async reactivateSubscription(
    organizationId: string,
    adminUser: User,
  ): Promise<void> {
    this.validateAdminAccess(adminUser);
    
    const currentSub = await this.getCurrentSubscription(organizationId);
    if (!currentSub) {
      throw new NotFoundException('No subscription found for organization');
    }

    // Create new active subscription record
    const now = new Date().toISOString();
    const reactivatedRecord = {
      pk: `CLIENT#${organizationId}`,
      sk: `SUB#${Date.now()}`,
      client_name: organizationId,
      sub_level: currentSub.sub_level,
      run_number: currentSub.run_number,
      progress: 'active',
      payment_status: PaymentStatus.PAID,
      sub_type: SubType.UPGRADE,
      createdAt: now,
      updatedAt: now,
      version: 1,
    };

    await this.dynamoDbService.putItem(reactivatedRecord, 'ClientSubs');

    this.logger.log(
      `Admin ${adminUser.email} reactivated subscription for ${organizationId}`,
    );
  }

  /**
   * Get organization usage details
   */
  async getOrganizationUsage(organizationId: string): Promise<any> {
    return this.quotaValidationService.getQuotaSummary(organizationId);
  }

  /**
   * Get subscription audit trail
   */
  async getSubscriptionAuditTrail(
    organizationId: string,
  ): Promise<ClientSubs[]> {
    const subscriptions = await this.dynamoDbService.queryItems(
      'pk = :pk',
      { ':pk': `CLIENT#${organizationId}` },
      'ClientSubs',
    );

    return (subscriptions as ClientSubs[]).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }

  private async getCurrentSubscription(
    organizationId: string,
  ): Promise<ClientSubs | null> {
    const subscriptions = await this.dynamoDbService.queryItems(
      'client_name = :clientName',
      { ':clientName': organizationId },
      'ClientSubs',
    );
    
    if (subscriptions.length === 0) {
      return null;
    }
    
    // Return the most recent active subscription
    const activeSubscription = subscriptions
      .filter((sub: ClientSubs) => sub.payment_status === PaymentStatus.PAID)
      .sort(
        (a: ClientSubs, b: ClientSubs) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )[0];
      
    return activeSubscription as ClientSubs;
  }

  private getActiveSubscriptions(allSubscriptions: ClientSubs[]): ClientSubs[] {
    // Group by organization and get most recent per organization
    const subscriptionsByOrg = new Map<string, ClientSubs>();
    
    allSubscriptions
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .forEach((sub) => {
        if (!subscriptionsByOrg.has(sub.client_name)) {
          subscriptionsByOrg.set(sub.client_name, sub);
        }
      });
    
    return Array.from(subscriptionsByOrg.values()).filter(
      (sub) => sub.payment_status === PaymentStatus.PAID,
    );
  }

  private validateAdminAccess(user: User): void {
    if (![UserRole.SUPER_ADMIN, UserRole.PLATFORM_ADMIN].includes(user.role)) {
      throw new BadRequestException(
        'Insufficient permissions for subscription admin operations',
      );
    }
  }

  private getCurrentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
}
