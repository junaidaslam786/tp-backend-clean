/**
 * Subscription tiers available for organizations
 */
export enum SubscriptionTier {
  /**
   * Basic tier with limited features for small organizations
   */
  BASIC = 'BASIC',

  /**
   * Professional tier with advanced features for growing organizations
   */
  PRO = 'PRO',

  /**
   * Enterprise tier with full features and premium support
   */
  ENTERPRISE = 'ENTERPRISE',
}

/**
 * Subscription status indicating the current billing state
 */
export enum SubscriptionStatus {
  /**
   * Active subscription with current billing
   */
  ACTIVE = 'ACTIVE',

  /**
   * Subscription with overdue payment
   */
  PAST_DUE = 'PAST_DUE',

  /**
   * Canceled subscription
   */
  CANCELED = 'CANCELED',

  /**
   * Subscription with unpaid invoice
   */
  UNPAID = 'UNPAID',

  /**
   * Trial subscription period
   */
  TRIALING = 'TRIALING',
}

/**
 * Billing cycle frequency for subscriptions
 */
export enum BillingCycle {
  /**
   * Monthly billing cycle
   */
  MONTHLY = 'MONTHLY',

  /**
   * Annual billing cycle
   */
  ANNUAL = 'ANNUAL',
}

/**
 * Organization size categories for subscription limits and pricing
 */
export enum OrganizationSize {
  /**
   * Small organization (1-50 employees)
   */
  SMALL = 'SMALL',

  /**
   * Medium organization (51-200 employees)
   */
  MEDIUM = 'MEDIUM',

  /**
   * Large organization (201-1000 employees)
   */
  LARGE = 'LARGE',

  /**
   * Enterprise organization (1000+ employees)
   */
  ENTERPRISE = 'ENTERPRISE',
}
