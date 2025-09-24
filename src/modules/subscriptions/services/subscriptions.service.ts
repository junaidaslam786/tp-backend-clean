import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SubscriptionRepository } from '../repositories/subscription.repository';
import {
  ClientSubs,
  SubLevel,
  PaymentStatus,
  SubscriptionTierConfig,
} from '../interfaces';
import {
  CreateSubscriptionDto,
  UpdateSubscriptionDto,
  UpgradeSubscriptionDto,
} from '../dto';

/**
 * Subscriptions Service
 * Business logic for subscription management operations with L1/L2/L3/LE tiers
 */
@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly subscriptionRepository: SubscriptionRepository,
  ) {}

  /**
   * Get available subscription tiers with pricing for L1/L2/L3/LE model
   * @returns List of available subscription tiers
   */
  async getAvailableTiers(): Promise<SubscriptionTierConfig[]> {
    const tiers: SubscriptionTierConfig[] = [
      {
        sub_level: SubLevel.L1,
        name: 'Level 1',
        description: 'Basic threat intelligence assessment',
        price_monthly: 9900, // $99.00
        price_annual: 95000, // $950.00 (20% discount)
        currency: 'USD',
        features: [
          'Basic threat assessment',
          'Weekly security reports',
          'Email alerts',
          'Basic API access',
        ],
        limits: {
          max_users: 5,
          max_runs_per_month: 10,
          max_exports_per_month: 5,
          storage_gb: 1,
          api_calls_per_month: 1000,
        },
      },
      {
        sub_level: SubLevel.L2,
        name: 'Level 2',
        description: 'Advanced threat intelligence with enhanced features',
        price_monthly: 19900, // $199.00
        price_annual: 191000, // $1,910.00 (20% discount)
        currency: 'USD',
        features: [
          'Advanced threat assessment',
          'Daily security reports',
          'Real-time alerts',
          'Advanced API access',
          'Custom integrations',
        ],
        limits: {
          max_users: 25,
          max_runs_per_month: 50,
          max_exports_per_month: 25,
          storage_gb: 10,
          api_calls_per_month: 10000,
        },
      },
      {
        sub_level: SubLevel.L3,
        name: 'Level 3',
        description: 'Enterprise-grade threat intelligence platform',
        price_monthly: 49900, // $499.00
        price_annual: 479000, // $4,790.00 (20% discount)
        currency: 'USD',
        features: [
          'Enterprise threat assessment',
          'Real-time monitoring',
          'Custom dashboards',
          'Full API access',
          'Dedicated support',
          'White-label options',
        ],
        limits: {
          max_users: 100,
          max_runs_per_month: 200,
          max_exports_per_month: 100,
          storage_gb: 50,
          api_calls_per_month: 50000,
        },
      },
      {
        sub_level: SubLevel.LE,
        name: 'Law Enforcement',
        description:
          'Specialized tier for law enforcement agencies with multi-org access',
        price_monthly: 99900, // $999.00
        price_annual: 959000, // $9,590.00 (20% discount)
        currency: 'USD',
        features: [
          'All L3 features',
          'Multi-organization access',
          'Law enforcement tools',
          'Evidence management',
          'Compliance reporting',
          'Priority support',
          'Custom training',
        ],
        limits: {
          max_users: 500,
          max_organizations: 10,
          max_runs_per_month: 1000,
          max_exports_per_month: 500,
          storage_gb: 200,
          api_calls_per_month: 200000,
        },
      },
    ];

    return tiers;
  }

  /**
   * Create new subscription after successful payment
   * @param subscriptionData - Subscription creation data
   * @returns Promise with created subscription
   */
  async createSubscription(
    subscriptionData: CreateSubscriptionDto,
  ): Promise<ClientSubs> {
    // Validate the subscription tier
    const availableTiers = await this.getAvailableTiers();
    const tierExists = availableTiers.some(
      (tier) => tier.sub_level === subscriptionData.sub_level,
    );

    if (!tierExists) {
      throw new BadRequestException('Invalid subscription tier');
    }

    // Create the subscription with PENDING payment status
    const subscription =
      await this.subscriptionRepository.create(subscriptionData);

    return subscription;
  }

  /**
   * Get subscription by client name
   * @param clientName - Client organization name
   * @returns Promise with subscription or null
   */
  async getSubscriptionByClientName(
    clientName: string,
  ): Promise<ClientSubs | null> {
    return this.subscriptionRepository.findByClientName(clientName);
  }

  /**
   * Upgrade subscription tier
   * @param clientName - Client organization name
   * @param upgradeData - Upgrade information
   * @returns Promise with success result
   */
  async upgradeSubscription(
    clientName: string,
    upgradeData: UpgradeSubscriptionDto,
  ): Promise<{ success: boolean; message: string; requiresPayment: boolean }> {
    const currentSubscription =
      await this.getSubscriptionByClientName(clientName);

    if (!currentSubscription) {
      throw new NotFoundException('Subscription not found');
    }

    // Validate upgrade path
    const currentTierOrder = this.getTierOrder(currentSubscription.sub_level);
    const targetTierOrder = this.getTierOrder(upgradeData.target_sub_level);

    if (targetTierOrder <= currentTierOrder) {
      throw new BadRequestException('Cannot downgrade or move to same tier');
    }

    // For LE tier upgrades, special handling for role updates will be needed
    if (upgradeData.target_sub_level === SubLevel.LE) {
      // This will trigger user role update to le_admin in the payment flow
      return {
        success: true,
        message:
          'Upgrade to LE tier initiated. Payment required and role will be updated to le_admin.',
        requiresPayment: true,
      };
    }

    return {
      success: true,
      message: `Upgrade from ${currentSubscription.sub_level} to ${upgradeData.target_sub_level} initiated.`,
      requiresPayment: true,
    };
  }

  /**
   * Update subscription progress
   * @param clientName - Client organization name
   * @param progress - New progress status
   */
  async updateProgress(clientName: string, progress: string): Promise<void> {
    await this.subscriptionRepository.updateProgress(clientName, progress);
  }

  /**
   * Update payment status of subscription
   * @param clientName - Client organization name
   * @param paymentStatus - New payment status
   */
  async updatePaymentStatus(
    clientName: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    await this.subscriptionRepository.updatePaymentStatus(
      clientName,
      paymentStatus,
    );
  }

  /**
   * Increment run number for subscription
   * @param clientName - Client organization name
   */
  async incrementRunNumber(clientName: string): Promise<void> {
    await this.subscriptionRepository.incrementRunNumber(clientName);
  }

  /**
   * Helper method to get tier order for upgrade validation
   * @param subLevel - Subscription level
   * @returns Numeric order (higher = better tier)
   */
  private getTierOrder(subLevel: SubLevel): number {
    switch (subLevel) {
      case SubLevel.L1:
        return 1;
      case SubLevel.L2:
        return 2;
      case SubLevel.L3:
        return 3;
      case SubLevel.LE:
        return 4;
      default:
        return 0;
    }
  }

  /**
   * Get tier configuration by subscription level
   * @param subLevel - Subscription level
   * @returns Tier configuration
   */
  async getTierConfig(
    subLevel: SubLevel,
  ): Promise<SubscriptionTierConfig | null> {
    const availableTiers = await this.getAvailableTiers();
    return availableTiers.find((tier) => tier.sub_level === subLevel) || null;
  }

  /**
   * Get active subscriptions summary
   * @returns Promise with subscription statistics
   */
  async getSubscriptionSummary(): Promise<{
    totalSubscriptions: number;
    tierDistribution: Record<SubLevel, number>;
    paymentStatusDistribution: Record<PaymentStatus, number>;
  }> {
    // This would typically use a scan operation to get statistics
    // For now, returning a basic implementation
    return {
      totalSubscriptions: 0,
      tierDistribution: {
        [SubLevel.L1]: 0,
        [SubLevel.L2]: 0,
        [SubLevel.L3]: 0,
        [SubLevel.LE]: 0,
      },
      paymentStatusDistribution: {
        [PaymentStatus.PENDING]: 0,
        [PaymentStatus.PAID]: 0,
        [PaymentStatus.FAILED]: 0,
        [PaymentStatus.CANCELLED]: 0,
        [PaymentStatus.REFUNDED]: 0,
      },
    };
  }

  /**
   * Validate subscription eligibility for features
   * @param clientName - Client organization name
   * @param feature - Feature to check
   * @returns Promise with eligibility result
   */
  async validateFeatureAccess(
    clientName: string,
    feature: string,
  ): Promise<{ allowed: boolean; reason?: string }> {
    const subscription = await this.getSubscriptionByClientName(clientName);

    if (!subscription) {
      return {
        allowed: false,
        reason: 'No active subscription found',
      };
    }

    if (subscription.payment_status !== PaymentStatus.PAID) {
      return {
        allowed: false,
        reason: 'Subscription payment is not completed',
      };
    }

    const tierConfig = await this.getTierConfig(subscription.sub_level);
    if (!tierConfig) {
      return {
        allowed: false,
        reason: 'Invalid subscription tier',
      };
    }

    // Check if feature is available for this tier
    if (!tierConfig.features.includes(feature)) {
      return {
        allowed: false,
        reason: `Feature '${feature}' not available for ${subscription.sub_level} tier`,
      };
    }

    return { allowed: true };
  }
}
