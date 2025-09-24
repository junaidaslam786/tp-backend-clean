import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';

/**
 * Logging Interceptor
 * Logs incoming requests and outgoing responses for monitoring and debugging
 * Includes request details, response times, and error information
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  /**
   * Intercepts incoming requests and logs request/response information
   * @param context - The execution context
   * @param next - The call handler for the next interceptor/handler
   * @returns Observable - The response observable with logging
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    const startTime = Date.now();

    // Generate unique request ID if not present
    const requestId = this.generateRequestId();
    request['requestId'] = requestId;

    // Log incoming request
    this.logRequest(request, requestId);

    return next.handle().pipe(
      tap({
        next: (responseData) => {
          const duration = Date.now() - startTime;
          this.logResponse(
            request,
            response,
            responseData,
            duration,
            requestId,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logError(request, response, error, duration, requestId);
        },
      }),
    );
  }

  /**
   * Logs incoming request details
   * @param request - The HTTP request
   * @param requestId - Unique request identifier
   */
  private logRequest(request: Request, requestId: string): void {
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'];
    const contentLength = headers['content-length'];
    const userId = (request['user'] as any)?.sub || 'anonymous';

    this.logger.log({
      message: 'Incoming Request',
      requestId,
      method,
      url,
      userId,
      userAgent,
      contentLength,
      // Only log body for non-sensitive endpoints
      body: this.shouldLogBody(url) ? body : '[REDACTED]',
    });
  }

  /**
   * Logs successful response details
   * @param request - The HTTP request
   * @param response - The HTTP response
   * @param responseData - The response data
   * @param duration - Request duration in milliseconds
   * @param requestId - Unique request identifier
   */
  private logResponse(
    request: Request,
    response: Response,
    responseData: any,
    duration: number,
    requestId: string,
  ): void {
    const { method, url } = request;
    const { statusCode } = response;
    const userId = (request['user'] as any)?.sub || 'anonymous';

    this.logger.log({
      message: 'Outgoing Response',
      requestId,
      method,
      url,
      userId,
      statusCode,
      duration: `${duration}ms`,
      responseSize: this.calculateResponseSize(responseData),
    });
  }

  /**
   * Logs error response details
   * @param request - The HTTP request
   * @param response - The HTTP response
   * @param error - The error object
   * @param duration - Request duration in milliseconds
   * @param requestId - Unique request identifier
   */
  private logError(
    request: Request,
    response: Response,
    error: any,
    duration: number,
    requestId: string,
  ): void {
    const { method, url } = request;
    const { statusCode } = response;
    const userId = (request['user'] as any)?.sub || 'anonymous';

    this.logger.error({
      message: 'Request Error',
      requestId,
      method,
      url,
      userId,
      statusCode,
      duration: `${duration}ms`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    });
  }

  /**
   * Generates a unique request identifier
   * @returns string - Unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Determines if request body should be logged
   * @param url - The request URL
   * @returns boolean - True if body should be logged
   */
  private shouldLogBody(url: string): boolean {
    // Don't log sensitive endpoints
    const sensitiveEndpoints = [
      '/auth/login',
      '/auth/register',
      '/auth/password',
      '/users/password',
      '/payment',
    ];

    return !sensitiveEndpoints.some((endpoint) => url.includes(endpoint));
  }

  /**
   * Calculates response data size for logging
   * @param responseData - The response data
   * @returns string - Response size description
   */
  private calculateResponseSize(responseData: any): string {
    if (!responseData) {
      return '0 bytes';
    }

    try {
      const size = JSON.stringify(responseData).length;
      if (size < 1024) {
        return `${size} bytes`;
      } else if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(2)} KB`;
      } else {
        return `${(size / (1024 * 1024)).toFixed(2)} MB`;
      }
    } catch {
      return 'unknown size';
    }
  }
}
