import {
  ArgumentMetadata,
  BadRequestException,
  Injectable,
  PipeTransform,
  ValidationPipeOptions,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';

/**
 * Custom Validation Pipe Options
 * Extends NestJS ValidationPipeOptions with additional features
 */
export interface CustomValidationPipeOptions extends ValidationPipeOptions {
  /**
   * Whether to return detailed validation errors
   */
  detailedErrors?: boolean;

  /**
   * Whether to log validation errors
   */
  logErrors?: boolean;

  /**
   * Custom error message prefix
   */
  errorPrefix?: string;
}

/**
 * Custom Validation Pipe
 * Enhanced validation pipe with additional security and error handling features
 * Provides consistent validation across all endpoints with detailed error messages
 */
@Injectable()
export class CustomValidationPipe
  extends ValidationPipe
  implements PipeTransform<any>
{
  private readonly options: CustomValidationPipeOptions;

  constructor(options?: CustomValidationPipeOptions) {
    // Set secure defaults
    const defaultOptions: CustomValidationPipeOptions = {
      // Security: Strip unknown properties
      whitelist: true,
      // Security: Throw error if unknown properties are present
      forbidNonWhitelisted: true,
      // Transform: Convert payloads to DTO instances
      transform: true,
      // Transform: Convert primitive types (string to number, etc.)
      transformOptions: {
        enableImplicitConversion: true,
      },
      // Validation: Stop on first error for performance
      stopAtFirstError: false,
      // Custom: Return detailed validation errors
      detailedErrors: true,
      // Custom: Log validation errors for monitoring
      logErrors: true,
      // Custom: Error message prefix
      errorPrefix: 'Validation failed',
    };

    const mergedOptions = { ...defaultOptions, ...options };
    super(mergedOptions);
    this.options = mergedOptions;
  }

  /**
   * Transforms and validates the input value
   * @param value - The value to validate
   * @param metadata - Metadata about the parameter
   * @returns Promise<any> - The transformed and validated value
   * @throws BadRequestException - If validation fails
   */
  async transform(value: any, metadata: ArgumentMetadata): Promise<any> {
    // Skip validation for certain types
    if (this.shouldSkipValidation(metadata)) {
      return value;
    }

    try {
      // Use parent transform method for standard validation
      const result = await super.transform(value, metadata);
      return result;
    } catch (error) {
      // Handle validation errors with custom formatting
      if (error instanceof BadRequestException) {
        throw this.formatValidationError(error);
      }
      throw error;
    }
  }

  /**
   * Determines if validation should be skipped for the given metadata
   * @param metadata - The argument metadata
   * @returns boolean - True if validation should be skipped
   */
  private shouldSkipValidation(metadata: ArgumentMetadata): boolean {
    const { metatype } = metadata;

    // Skip validation for primitive types and built-in objects
    const types: Array<new (...args: any[]) => any> = [
      String,
      Boolean,
      Number,
      Array,
      Object,
    ];

    return !metatype || types.includes(metatype);
  }

  /**
   * Formats validation errors into a consistent structure
   * @param error - The validation error from NestJS
   * @returns BadRequestException - Formatted validation exception
   */
  private formatValidationError(
    error: BadRequestException,
  ): BadRequestException {
    const response = error.getResponse() as any;

    // If detailed errors are disabled, return simplified message
    if (!this.options.detailedErrors) {
      return new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: this.options.errorPrefix || 'Validation failed',
        statusCode: 400,
      });
    }

    // Format detailed validation errors
    const formattedErrors = this.formatDetailedErrors(response.message);

    const errorResponse = {
      code: 'VALIDATION_ERROR',
      message: this.options.errorPrefix || 'Validation failed',
      statusCode: 400,
      details: {
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
      },
    };

    // Log validation errors if enabled
    if (this.options.logErrors) {
      console.warn('Validation Error:', errorResponse);
    }

    return new BadRequestException(errorResponse);
  }

  /**
   * Formats detailed validation errors for better readability
   * @param errors - Array of validation error messages or objects
   * @returns Array of formatted error objects
   */
  private formatDetailedErrors(errors: any[]): any[] {
    if (!Array.isArray(errors)) {
      return [{ message: String(errors) }];
    }

    return errors.map((error: any) => {
      if (typeof error === 'string') {
        return { message: error };
      }

      if (typeof error === 'object' && error !== null) {
        return {
          property: error.property || 'unknown',
          value: error.value,
          constraints: error.constraints || {},
          message: this.extractConstraintMessages(error.constraints || {}),
        };
      }

      return { message: error.toString() };
    });
  }

  /**
   * Extracts constraint messages from validation constraints
   * @param constraints - Object containing validation constraints
   * @returns string - Combined constraint messages
   */
  private extractConstraintMessages(
    constraints: Record<string, string>,
  ): string {
    const messages = Object.values(constraints);
    return messages.length > 0 ? messages.join('; ') : 'Invalid value';
  }

  /**
   * Creates a validation error from class-validator ValidationError objects
   * @param errors - Array of ValidationError objects
   * @returns BadRequestException - Formatted validation exception
   */
  protected createValidationError(
    errors: ValidationError[],
  ): BadRequestException {
    const formattedErrors = errors.map((error) => ({
      property: error.property,
      value: error.value,
      constraints: error.constraints || {},
      children: error.children || [],
    }));

    const errorResponse = {
      code: 'VALIDATION_ERROR',
      message: this.options.errorPrefix || 'Validation failed',
      statusCode: 400,
      details: {
        errors: formattedErrors,
        timestamp: new Date().toISOString(),
      },
    };

    return new BadRequestException(errorResponse);
  }
}

/**
 * Factory function to create a validation pipe with common configurations
 */
export const createValidationPipe = (
  options?: CustomValidationPipeOptions,
): CustomValidationPipe => {
  return new CustomValidationPipe(options);
};

/**
 * Pre-configured validation pipe for strict validation
 * Use for endpoints that require strict data validation
 */
export const StrictValidationPipe = new CustomValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  stopAtFirstError: false,
  detailedErrors: true,
  logErrors: true,
  errorPrefix: 'Strict validation failed',
});

/**
 * Pre-configured validation pipe for lenient validation
 * Use for endpoints that can accept partial or flexible data
 */
export const LenientValidationPipe = new CustomValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: false,
  transform: true,
  stopAtFirstError: true,
  detailedErrors: false,
  logErrors: false,
  errorPrefix: 'Validation error',
});
