import { HttpStatus } from '@nestjs/common';

/**
 * Base Business Exception
 * Abstract base class for all custom business logic exceptions
 */
export abstract class BusinessException extends Error {
  public readonly isBusinessException = true;
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: any;

  constructor(
    message: string,
    code: string,
    statusCode: number = HttpStatus.BAD_REQUEST,
    details?: any,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, BusinessException.prototype);
  }
}

/**
 * User-related business exceptions
 */
export class UserNotFoundException extends BusinessException {
  constructor(userId: string) {
    super(
      `User with ID '${userId}' not found`,
      'USER_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { userId },
    );
  }
}

export class UserAlreadyExistsException extends BusinessException {
  constructor(email: string) {
    super(
      `User with email '${email}' already exists`,
      'USER_ALREADY_EXISTS',
      HttpStatus.CONFLICT,
      { email },
    );
  }
}

export class InvalidUserCredentialsException extends BusinessException {
  constructor() {
    super(
      'Invalid user credentials provided',
      'INVALID_CREDENTIALS',
      HttpStatus.UNAUTHORIZED,
    );
  }
}

/**
 * Organization-related business exceptions
 */
export class OrganizationNotFoundException extends BusinessException {
  constructor(organizationId: string) {
    super(
      `Organization with ID '${organizationId}' not found`,
      'ORGANIZATION_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { organizationId },
    );
  }
}

export class OrganizationAlreadyExistsException extends BusinessException {
  constructor(name: string) {
    super(
      `Organization with name '${name}' already exists`,
      'ORGANIZATION_ALREADY_EXISTS',
      HttpStatus.CONFLICT,
      { name },
    );
  }
}

export class InsufficientOrganizationPermissionsException extends BusinessException {
  constructor(action: string) {
    super(
      `Insufficient permissions to perform action: ${action}`,
      'INSUFFICIENT_ORGANIZATION_PERMISSIONS',
      HttpStatus.FORBIDDEN,
      { action },
    );
  }
}

/**
 * Subscription-related business exceptions
 */
export class SubscriptionNotFoundException extends BusinessException {
  constructor(subscriptionId: string) {
    super(
      `Subscription with ID '${subscriptionId}' not found`,
      'SUBSCRIPTION_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { subscriptionId },
    );
  }
}

export class SubscriptionLimitExceededException extends BusinessException {
  constructor(feature: string, limit: number, current: number) {
    super(
      `Subscription limit exceeded for '${feature}'. Limit: ${limit}, Current: ${current}`,
      'SUBSCRIPTION_LIMIT_EXCEEDED',
      HttpStatus.FORBIDDEN,
      { feature, limit, current },
    );
  }
}

export class InactiveSubscriptionException extends BusinessException {
  constructor(subscriptionId: string, status: string) {
    super(
      `Subscription '${subscriptionId}' is inactive with status: ${status}`,
      'INACTIVE_SUBSCRIPTION',
      HttpStatus.FORBIDDEN,
      { subscriptionId, status },
    );
  }
}

/**
 * Partner-related business exceptions
 */
export class PartnerNotFoundException extends BusinessException {
  constructor(partnerId: string) {
    super(
      `Partner with ID '${partnerId}' not found`,
      'PARTNER_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { partnerId },
    );
  }
}

export class PartnerNotActiveException extends BusinessException {
  constructor(partnerId: string) {
    super(
      `Partner with ID '${partnerId}' is not active`,
      'PARTNER_NOT_ACTIVE',
      HttpStatus.FORBIDDEN,
      { partnerId },
    );
  }
}

/**
 * Profiling-related business exceptions
 */
export class ProfilingJobNotFoundException extends BusinessException {
  constructor(jobId: string) {
    super(
      `Profiling job with ID '${jobId}' not found`,
      'PROFILING_JOB_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { jobId },
    );
  }
}

export class ProfilingJobAlreadyRunningException extends BusinessException {
  constructor(jobId: string) {
    super(
      `Profiling job with ID '${jobId}' is already running`,
      'PROFILING_JOB_ALREADY_RUNNING',
      HttpStatus.CONFLICT,
      { jobId },
    );
  }
}

export class InvalidProfilingConfigurationException extends BusinessException {
  constructor(reason: string, details?: any) {
    super(
      `Invalid profiling configuration: ${reason}`,
      'INVALID_PROFILING_CONFIGURATION',
      HttpStatus.BAD_REQUEST,
      details,
    );
  }
}

/**
 * Export-related business exceptions
 */
export class ExportNotFoundException extends BusinessException {
  constructor(exportId: string) {
    super(
      `Export with ID '${exportId}' not found`,
      'EXPORT_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { exportId },
    );
  }
}

export class ExportGenerationFailedException extends BusinessException {
  constructor(exportId: string, reason: string) {
    super(
      `Export generation failed for ID '${exportId}': ${reason}`,
      'EXPORT_GENERATION_FAILED',
      HttpStatus.INTERNAL_SERVER_ERROR,
      { exportId, reason },
    );
  }
}

export class ExportFormatNotSupportedException extends BusinessException {
  constructor(format: string, supportedFormats: string[]) {
    super(
      `Export format '${format}' is not supported. Supported formats: ${supportedFormats.join(', ')}`,
      'EXPORT_FORMAT_NOT_SUPPORTED',
      HttpStatus.BAD_REQUEST,
      { format, supportedFormats },
    );
  }
}

/**
 * Payment-related business exceptions
 */
export class PaymentNotFoundException extends BusinessException {
  constructor(paymentId: string) {
    super(
      `Payment with ID '${paymentId}' not found`,
      'PAYMENT_NOT_FOUND',
      HttpStatus.NOT_FOUND,
      { paymentId },
    );
  }
}

export class PaymentProcessingFailedException extends BusinessException {
  constructor(paymentId: string, reason: string) {
    super(
      `Payment processing failed for ID '${paymentId}': ${reason}`,
      'PAYMENT_PROCESSING_FAILED',
      HttpStatus.BAD_REQUEST,
      { paymentId, reason },
    );
  }
}

export class InsufficientFundsException extends BusinessException {
  constructor(amount: number, available: number) {
    super(
      `Insufficient funds. Required: ${amount}, Available: ${available}`,
      'INSUFFICIENT_FUNDS',
      HttpStatus.BAD_REQUEST,
      { required: amount, available },
    );
  }
}

/**
 * Data validation business exceptions
 */
export class DuplicateDataException extends BusinessException {
  constructor(resource: string, field: string, value: string) {
    super(
      `Duplicate ${resource} found with ${field}: ${value}`,
      'DUPLICATE_DATA',
      HttpStatus.CONFLICT,
      { resource, field, value },
    );
  }
}

export class InvalidDataFormatException extends BusinessException {
  constructor(field: string, expectedFormat: string, actualValue: string) {
    super(
      `Invalid format for ${field}. Expected: ${expectedFormat}, Got: ${actualValue}`,
      'INVALID_DATA_FORMAT',
      HttpStatus.BAD_REQUEST,
      { field, expectedFormat, actualValue },
    );
  }
}

export class DataIntegrityViolationException extends BusinessException {
  constructor(constraint: string, details?: any) {
    super(
      `Data integrity violation: ${constraint}`,
      'DATA_INTEGRITY_VIOLATION',
      HttpStatus.BAD_REQUEST,
      { constraint, ...details },
    );
  }
}
