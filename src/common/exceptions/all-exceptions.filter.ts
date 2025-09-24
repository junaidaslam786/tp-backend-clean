import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto } from '../dto/response.dto';

/**
 * Global Exception Filter
 * Catches all exceptions and formats them into standardized error responses
 * Provides consistent error handling across the entire application
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  /**
   * Catches and handles all exceptions
   * @param exception - The thrown exception
   * @param host - The arguments host containing request/response
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP status and error details
    const { status, errorCode, message, details } =
      this.extractErrorInfo(exception);

    // Get request ID for tracing
    const requestId = request['requestId'] || this.generateRequestId();

    // Create standardized error response
    const errorResponse = new ErrorResponseDto(
      errorCode,
      message,
      status,
      requestId,
      details,
    );

    // Log the error
    this.logError(exception, request, errorResponse);

    // Send error response
    response.status(status).json(errorResponse);
  }

  /**
   * Extracts error information from the exception
   * @param exception - The thrown exception
   * @returns Object containing status, code, message, and details
   */
  private extractErrorInfo(exception: unknown): {
    status: number;
    errorCode: string;
    message: string;
    details?: any;
  } {
    // Handle HTTP exceptions (from NestJS)
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();

      if (typeof response === 'object' && response !== null) {
        return {
          status,
          errorCode: (response as any).error || HttpStatus[status],
          message: (response as any).message || exception.message,
          details: (response as any).details || response,
        };
      }

      return {
        status,
        errorCode: HttpStatus[status] || 'HTTP_EXCEPTION',
        message: typeof response === 'string' ? response : exception.message,
      };
    }

    // Handle business exceptions (custom exceptions)
    if (this.isBusinessException(exception)) {
      return {
        status: (exception as any).statusCode || HttpStatus.BAD_REQUEST,
        errorCode: (exception as any).code || 'BUSINESS_ERROR',
        message: (exception as any).message || 'Business logic error',
        details: (exception as any).details,
      };
    }

    // Handle validation errors
    if (this.isValidationError(exception)) {
      return {
        status: HttpStatus.BAD_REQUEST,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: this.extractValidationDetails(exception),
      };
    }

    // Handle database errors
    if (this.isDatabaseError(exception)) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorCode: 'DATABASE_ERROR',
        message: 'Database operation failed',
        details: this.extractDatabaseDetails(exception),
      };
    }

    // Handle unknown errors
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      errorCode: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? exception : undefined,
    };
  }

  /**
   * Checks if exception is a business exception
   * @param exception - The exception to check
   * @returns boolean - True if it's a business exception
   */
  private isBusinessException(exception: unknown): boolean {
    return (
      typeof exception === 'object' &&
      exception !== null &&
      'isBusinessException' in exception
    );
  }

  /**
   * Checks if exception is a validation error
   * @param exception - The exception to check
   * @returns boolean - True if it's a validation error
   */
  private isValidationError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name === 'ValidationError' ||
        exception.message.includes('validation'))
    );
  }

  /**
   * Checks if exception is a database error
   * @param exception - The exception to check
   * @returns boolean - True if it's a database error
   */
  private isDatabaseError(exception: unknown): boolean {
    return (
      exception instanceof Error &&
      (exception.name.includes('Database') ||
        exception.name.includes('Connection') ||
        exception.message.includes('database'))
    );
  }

  /**
   * Extracts validation error details
   * @param exception - The validation exception
   * @returns any - Validation error details
   */
  private extractValidationDetails(exception: unknown): any {
    if (exception && typeof exception === 'object' && 'details' in exception) {
      return (exception as any).details;
    }
    return exception;
  }

  /**
   * Extracts database error details
   * @param exception - The database exception
   * @returns any - Database error details
   */
  private extractDatabaseDetails(exception: unknown): any {
    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        // Only include stack trace in development
        ...(process.env.NODE_ENV === 'development' && {
          stack: exception.stack,
        }),
      };
    }
    return exception;
  }

  /**
   * Logs the error with appropriate level and context
   * @param exception - The original exception
   * @param request - The HTTP request
   * @param errorResponse - The formatted error response
   */
  private logError(
    exception: unknown,
    request: Request,
    errorResponse: ErrorResponseDto,
  ): void {
    const { method, url } = request;
    const userId = (request as any)['user']?.userId || 'anonymous';

    const logContext = {
      message: 'Exception occurred',
      requestId: errorResponse.requestId,
      method,
      url,
      userId,
      errorCode: errorResponse.code,
      statusCode: errorResponse.status,
      errorMessage: errorResponse.message,
    };

    // Log as error for 5xx status codes, warn for 4xx
    if (errorResponse.status >= 500) {
      this.logger.error({
        ...logContext,
        exception: {
          name: exception instanceof Error ? exception.name : 'Unknown',
          message: exception instanceof Error ? exception.message : exception,
          stack: exception instanceof Error ? exception.stack : undefined,
        },
      });
    } else {
      this.logger.warn(logContext);
    }
  }

  /**
   * Generates a unique request identifier
   * @returns string - Unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
