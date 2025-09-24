import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { 
  SubLevel, 
  SubscriptionTierConfig, 
  ClientSubs 
} from '../../subscriptions/interfaces';

export interface QuotaCheckResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetDate: string;
  message?: string;
}

export interface UsageStats {
  runsThisMonth: number;
  exportsThisMonth: number;
  apiCallsThisMonth: number;
  storageUsedGb: number;
  currentUsers: number;
  currentOrganizations?: number;
}

@Injectable()
export class QuotaValidationService {
  private readonly logger = new Logger(QuotaValidationService.name);
  
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  /**
   * Check if organization can start a new profiling run
   */
  async canStartProfilingRun(organizationId: string): Promise<QuotaCheckResult> {
    try {
      // Get organization's subscription details
      const subscription = await this.getOrganizationSubscription(organizationId);
      if (!subscription) {
        throw new ForbiddenException('No active subscription found');
      }

      // Get subscription tier limits
      const tierLimits = this.getTierLimits(subscription.sub_level);
      
      // Get current month usage
      const usage = await this.getCurrentMonthUsage(organizationId);
      
      // Check if under limit
      const remaining = tierLimits.max_runs_per_month - usage.runsThisMonth;
      const allowed = remaining > 0;
      
      // Calculate reset date (first day of next month)
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      resetDate.setHours(0, 0, 0, 0);

      return {
        allowed,
        remaining: Math.max(0, remaining),
        limit: tierLimits.max_runs_per_month,
        resetDate: resetDate.toISOString(),
        message: allowed 
          ? `${remaining} profiling runs remaining this month`
          : `Monthly limit of ${tierLimits.max_runs_per_month} profiling runs exceeded. Upgrade subscription for more runs.`,
      };
    } catch (error) {
      this.logger.error(`Failed to check profiling quota for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Check if organization can generate a report/export
   */
  async canGenerateReport(organizationId: string): Promise<QuotaCheckResult> {
    try {
      const subscription = await this.getOrganizationSubscription(organizationId);
      if (!subscription) {
        throw new ForbiddenException('No active subscription found');
      }

      const tierLimits = this.getTierLimits(subscription.sub_level);
      const usage = await this.getCurrentMonthUsage(organizationId);
      
      const remaining = tierLimits.max_exports_per_month - usage.exportsThisMonth;
      const allowed = remaining > 0;
      
      const resetDate = new Date();
      resetDate.setMonth(resetDate.getMonth() + 1);
      resetDate.setDate(1);
      resetDate.setHours(0, 0, 0, 0);

      return {
        allowed,
        remaining: Math.max(0, remaining),
        limit: tierLimits.max_exports_per_month,
        resetDate: resetDate.toISOString(),
        message: allowed 
          ? `${remaining} report exports remaining this month`
          : `Monthly limit of ${tierLimits.max_exports_per_month} exports exceeded. Upgrade subscription for more exports.`,
      };
    } catch (error) {
      this.logger.error(`Failed to check export quota for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Record a profiling run to update usage
   */
  async recordProfilingRun(organizationId: string): Promise<void> {
    const periodKey = this.getCurrentPeriodKey();
    
    try {
      // Update usage counter
      await this.dynamoDbService.updateItem(
        { 
          pk: `ORG#${organizationId}`,
          sk: `USAGE#${periodKey}`
        },
        'SET runsThisMonth = if_not_exists(runsThisMonth, :zero) + :one, updatedAt = :now',
        {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
        'Usage',
      );
      
      this.logger.log(`Recorded profiling run for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to record profiling run for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Record a report export to update usage
   */
  async recordReportExport(organizationId: string): Promise<void> {
    const periodKey = this.getCurrentPeriodKey();
    
    try {
      await this.dynamoDbService.updateItem(
        { 
          pk: `ORG#${organizationId}`,
          sk: `USAGE#${periodKey}`
        },
        'SET exportsThisMonth = if_not_exists(exportsThisMonth, :zero) + :one, updatedAt = :now',
        {
          ':zero': 0,
          ':one': 1,
          ':now': new Date().toISOString(),
        },
        'Usage',
      );
      
      this.logger.log(`Recorded report export for organization ${organizationId}`);
    } catch (error) {
      this.logger.error(`Failed to record export for org ${organizationId}:`, error);
      throw error;
    }
  }

  /**
   * Get current usage statistics for an organization
   */
  async getUsageStats(organizationId: string): Promise<UsageStats> {
    const periodKey = this.getCurrentPeriodKey();
    
    try {
      const usage = await this.dynamoDbService.getItem(
        { 
          pk: `ORG#${organizationId}`,
          sk: `USAGE#${periodKey}`
        },
        'Usage',
      );

      return {
        runsThisMonth: usage?.runsThisMonth || 0,
        exportsThisMonth: usage?.exportsThisMonth || 0,
        apiCallsThisMonth: usage?.apiCallsThisMonth || 0,
        storageUsedGb: usage?.storageUsedGb || 0,
        currentUsers: usage?.currentUsers || 0,
        currentOrganizations: usage?.currentOrganizations || undefined,
      };
    } catch (error) {
      this.logger.error(`Failed to get usage stats for org ${organizationId}:`, error);
      // Return default usage if query fails
      return {
        runsThisMonth: 0,
        exportsThisMonth: 0,
        apiCallsThisMonth: 0,
        storageUsedGb: 0,
        currentUsers: 0,
      };
    }
  }

  private async getOrganizationSubscription(organizationId: string): Promise<ClientSubs | null> {
    try {
      // Query ClientSubs table for organization's subscription
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
        .filter((sub: ClientSubs) => sub.payment_status === 'paid')
        .sort((a: ClientSubs, b: ClientSubs) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        )[0];
        
      return activeSubscription as ClientSubs;
    } catch (error) {
      this.logger.error(`Failed to get subscription for org ${organizationId}:`, error);
      return null;
    }
  }

  private getTierLimits(subLevel: SubLevel): SubscriptionTierConfig['limits'] {
    // Define tier limits matching specification
    const tierLimits: Record<SubLevel, SubscriptionTierConfig['limits']> = {
      [SubLevel.L1]: {
        max_users: 5,
        max_runs_per_month: 10,
        max_exports_per_month: 5,
        storage_gb: 1,
        api_calls_per_month: 1000,
      },
      [SubLevel.L2]: {
        max_users: 15,
        max_runs_per_month: 25,
        max_exports_per_month: 15,
        storage_gb: 5,
        api_calls_per_month: 5000,
      },
      [SubLevel.L3]: {
        max_users: 50,
        max_runs_per_month: 100,
        max_exports_per_month: 50,
        storage_gb: 20,
        api_calls_per_month: 20000,
      },
      [SubLevel.LE]: {
        max_users: 500,
        max_organizations: 10,
        max_runs_per_month: 500,
        max_exports_per_month: 200,
        storage_gb: 100,
        api_calls_per_month: 100000,
      },
    };

    return tierLimits[subLevel];
  }

  private async getCurrentMonthUsage(organizationId: string): Promise<UsageStats> {
    return this.getUsageStats(organizationId);
  }

  private getCurrentPeriodKey(): string {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  /**
   * Initialize usage tracking for a new organization
   */
  async initializeUsageTracking(organizationId: string): Promise<void> {
    const periodKey = this.getCurrentPeriodKey();
    
    try {
      const usageRecord = {
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
      };

      await this.dynamoDbService.putItem(usageRecord, 'Usage');
      this.logger.log(`Initialized usage tracking for organization ${organizationId}`);
    } catch (error) {
      // Ignore if already exists
      if (error.name !== 'ConditionalCheckFailedException') {
        this.logger.error(`Failed to initialize usage tracking for org ${organizationId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get quota summary for dashboard display
   */
  async getQuotaSummary(organizationId: string): Promise<{
    subscription: {
      tier: SubLevel;
      status: string;
    };
    usage: UsageStats;
    limits: SubscriptionTierConfig['limits'];
    quotas: {
      profilingRuns: QuotaCheckResult;
      exports: QuotaCheckResult;
    };
  }> {
    const subscription = await this.getOrganizationSubscription(organizationId);
    if (!subscription) {
      throw new ForbiddenException('No active subscription found');
    }

    const usage = await this.getUsageStats(organizationId);
    const limits = this.getTierLimits(subscription.sub_level);
    const profilingRuns = await this.canStartProfilingRun(organizationId);
    const exports = await this.canGenerateReport(organizationId);

    return {
      subscription: {
        tier: subscription.sub_level,
        status: subscription.payment_status,
      },
      usage,
      limits,
      quotas: {
        profilingRuns,
        exports,
      },
    };
  }
}
