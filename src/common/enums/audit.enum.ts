/**
 * Partner types for the referral and partnership system
 */
export enum PartnerType {
  /**
   * Reseller partner who sells platform subscriptions
   */
  RESELLER = 'RESELLER',

  /**
   * Consultant partner who provides implementation services
   */
  CONSULTANT = 'CONSULTANT',

  /**
   * System integrator partner
   */
  INTEGRATOR = 'INTEGRATOR',

  /**
   * Affiliate partner with commission-based referrals
   */
  AFFILIATE = 'AFFILIATE',
}

/**
 * Partner status indicating the current state of partnership
 */
export enum PartnerStatus {
  /**
   * Partnership application is pending approval
   */
  PENDING = 'PENDING',

  /**
   * Partnership is approved and active
   */
  APPROVED = 'APPROVED',

  /**
   * Partnership is temporarily suspended
   */
  SUSPENDED = 'SUSPENDED',

  /**
   * Partnership has been terminated
   */
  TERMINATED = 'TERMINATED',
}

/**
 * Audit event types for tracking system activities
 */
export enum AuditEventType {
  /**
   * Authentication-related events
   */
  AUTHENTICATION = 'AUTHENTICATION',

  /**
   * Authorization and access control events
   */
  AUTHORIZATION = 'AUTHORIZATION',

  /**
   * Data access events
   */
  DATA_ACCESS = 'DATA_ACCESS',

  /**
   * Data modification events
   */
  DATA_MODIFICATION = 'DATA_MODIFICATION',

  /**
   * Configuration change events
   */
  CONFIGURATION_CHANGE = 'CONFIGURATION_CHANGE',

  /**
   * Security-related events
   */
  SECURITY_EVENT = 'SECURITY_EVENT',

  /**
   * System-level events
   */
  SYSTEM_EVENT = 'SYSTEM_EVENT',
}

/**
 * Actor types for audit events
 */
export enum ActorType {
  /**
   * Human user action
   */
  USER = 'USER',

  /**
   * System-initiated action
   */
  SYSTEM = 'SYSTEM',

  /**
   * API client action
   */
  API_CLIENT = 'API_CLIENT',

  /**
   * Webhook-triggered action
   */
  WEBHOOK = 'WEBHOOK',

  /**
   * Scheduled job action
   */
  SCHEDULED_JOB = 'SCHEDULED_JOB',
}

/**
 * Audit risk levels for event severity
 */
export enum AuditRiskLevel {
  /**
   * Low risk audit event
   */
  LOW = 'LOW',

  /**
   * Medium risk audit event
   */
  MEDIUM = 'MEDIUM',

  /**
   * High risk audit event
   */
  HIGH = 'HIGH',

  /**
   * Critical risk audit event
   */
  CRITICAL = 'CRITICAL',
}

/**
 * Audit actions for tracking system events
 */
export enum AuditAction {
  // User Management
  USER_REGISTERED = 'USER_REGISTERED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_APPROVED = 'USER_APPROVED',
  USER_REJECTED = 'USER_REJECTED',
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_ROLE_CHANGED = 'USER_ROLE_CHANGED',
  USER_LOGIN = 'USER_LOGIN',
  USER_LOGOUT = 'USER_LOGOUT',

  // Organization Management
  ORGANIZATION_CREATED = 'ORGANIZATION_CREATED',
  ORGANIZATION_UPDATED = 'ORGANIZATION_UPDATED',
  ORGANIZATION_DELETED = 'ORGANIZATION_DELETED',
  USER_ADDED_TO_ORG = 'USER_ADDED_TO_ORG',
  USER_REMOVED_FROM_ORG = 'USER_REMOVED_FROM_ORG',

  // Subscription Management
  SUBSCRIPTION_UPGRADED = 'SUBSCRIPTION_UPGRADED',
  SUBSCRIPTION_DOWNGRADED = 'SUBSCRIPTION_DOWNGRADED',
  SUBSCRIPTION_CANCELLED = 'SUBSCRIPTION_CANCELLED',
  SUBSCRIPTION_RENEWED = 'SUBSCRIPTION_RENEWED',

  // Payment Processing
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED',
  COMMISSION_CALCULATED = 'COMMISSION_CALCULATED',

  // Profiling Operations
  PROFILING_RUN_STARTED = 'PROFILING_RUN_STARTED',
  PROFILING_RUN_COMPLETED = 'PROFILING_RUN_COMPLETED',
  PROFILING_RUN_FAILED = 'PROFILING_RUN_FAILED',
  REPORT_GENERATED = 'REPORT_GENERATED',
  REPORT_DOWNLOADED = 'REPORT_DOWNLOADED',

  // Partner Operations
  PARTNER_REGISTERED = 'PARTNER_REGISTERED',
  PARTNER_ACTIVATED = 'PARTNER_ACTIVATED',
  PARTNER_SUSPENDED = 'PARTNER_SUSPENDED',
  REFERRAL_ATTRIBUTED = 'REFERRAL_ATTRIBUTED',
  COMMISSION_PAID = 'COMMISSION_PAID',

  // System Operations
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
  CONFIGURATION_CHANGED = 'CONFIGURATION_CHANGED',
  SECURITY_EVENT = 'SECURITY_EVENT',
}

/**
 * Audit event types for categorizing events
 */
export enum AuditType {
  USER_MANAGEMENT = 'USER_MANAGEMENT',
  ORGANIZATION_MANAGEMENT = 'ORGANIZATION_MANAGEMENT',
  SUBSCRIPTION_MANAGEMENT = 'SUBSCRIPTION_MANAGEMENT',
  PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
  PROFILING_OPERATIONS = 'PROFILING_OPERATIONS',
  PARTNER_MANAGEMENT = 'PARTNER_MANAGEMENT',
  SYSTEM_OPERATIONS = 'SYSTEM_OPERATIONS',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
}
