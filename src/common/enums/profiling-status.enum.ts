/**
 * Profiling run status indicating the current state of execution
 */
export enum ProfilingStatus {
  /**
   * Profiling run is queued and waiting to start
   */
  PENDING = 'PENDING',

  /**
   * Profiling run is currently executing
   */
  RUNNING = 'RUNNING',

  /**
   * Profiling run completed successfully
   */
  COMPLETED = 'COMPLETED',

  /**
   * Profiling run failed during execution
   */
  FAILED = 'FAILED',

  /**
   * Profiling run was canceled by user or system
   */
  CANCELLED = 'CANCELLED',
}

/**
 * Compliance frameworks supported by the platform
 */
export enum ComplianceFramework {
  /**
   * Information Security Manual (Australian Government)
   */
  ISM = 'ISM',

  /**
   * Essential Eight security framework
   */
  ESSENTIAL_EIGHT = 'ESSENTIAL_EIGHT',

  /**
   * NIST Cybersecurity Framework
   */
  NIST = 'NIST',

  /**
   * ISO 27001 Information Security Management
   */
  ISO27001 = 'ISO27001',
}

/**
 * Assessment scope defining the breadth of security evaluation
 */
export enum AssessmentScope {
  /**
   * Complete organizational assessment
   */
  FULL_ORGANIZATION = 'FULL_ORGANIZATION',

  /**
   * Department-specific assessment
   */
  DEPARTMENT = 'DEPARTMENT',

  /**
   * System-specific assessment
   */
  SYSTEM = 'SYSTEM',
}

/**
 * Risk levels for threat assessment results
 */
export enum RiskLevel {
  /**
   * Low risk - minimal security concerns
   */
  LOW = 'LOW',

  /**
   * Medium risk - some security concerns requiring attention
   */
  MEDIUM = 'MEDIUM',

  /**
   * High risk - significant security concerns requiring immediate attention
   */
  HIGH = 'HIGH',

  /**
   * Critical risk - severe security concerns requiring urgent action
   */
  CRITICAL = 'CRITICAL',
}

/**
 * Assessment status indicating review and completion state
 */
export enum AssessmentStatus {
  /**
   * Assessment is in draft state
   */
  DRAFT = 'DRAFT',

  /**
   * Assessment has been submitted for review
   */
  SUBMITTED = 'SUBMITTED',

  /**
   * Assessment is under review
   */
  UNDER_REVIEW = 'UNDER_REVIEW',

  /**
   * Assessment review is completed
   */
  COMPLETED = 'COMPLETED',

  /**
   * Assessment was rejected and needs revision
   */
  REJECTED = 'REJECTED',
}
