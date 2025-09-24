/**
 * User roles defining access levels and permissions within the platform
 */
export enum UserRole {
  /**
   * Standard user with basic access to organization features
   */
  USER = 'USER',

  /**
   * Organization administrator with management privileges for their organization
   */
  ORG_ADMIN = 'ORG_ADMIN',

  /**
   * Partner user with access to referral management and commission tracking
   */
  PARTNER = 'PARTNER',

  /**
   * Law enforcement administrator with LE subscription access and multi-org capabilities
   */
  LE_ADMIN = 'LE_ADMIN',

  /**
   * Platform administrator with system-wide access and management capabilities
   */
  PLATFORM_ADMIN = 'PLATFORM_ADMIN',
}

/**
 * User account status indicating the current state of the user account
 */
export enum UserStatus {
  /**
   * Active user account with full access
   */
  ACTIVE = 'ACTIVE',

  /**
   * Suspended user account with restricted access
   */
  SUSPENDED = 'SUSPENDED',

  /**
   * User account pending email verification
   */
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',

  /**
   * User account pending admin approval for organization access
   */
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}
