import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Request } from 'express';
import { Observable, map } from 'rxjs';
import { BaseResponseDto, PaginatedResponseDto } from '../dto/response.dto';

/**
 * Transform Interceptor
 * Standardizes API responses by wrapping them in consistent response structure
 * Adds metadata like timestamps and request IDs to all responses
 */
@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, BaseResponseDto<T> | PaginatedResponseDto<T>>
{
  /**
   * Intercepts outgoing responses and transforms them to standard format
   * @param context - The execution context
   * @param next - The call handler for the next interceptor/handler
   * @returns Observable - The transformed response observable
   */
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<BaseResponseDto<T> | PaginatedResponseDto<T>> {
    const request = context.switchToHttp().getRequest<Request>();
    const requestId = request['requestId'] || this.generateRequestId();

    return next.handle().pipe(
      map((data) => {
        // If data is already wrapped in a response DTO, return as-is
        if (this.isResponseDto(data)) {
          return data;
        }

        // Check if this is paginated data
        if (this.isPaginatedData(data)) {
          return new PaginatedResponseDto(
            data.items,
            data.pagination,
            requestId,
          );
        }

        // Wrap in standard response format
        return new BaseResponseDto(data, requestId);
      }),
    );
  }

  /**
   * Checks if data is already wrapped in a response DTO
   * @param data - The response data
   * @returns boolean - True if data is already a response DTO
   */
  private isResponseDto(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'timestamp' in data &&
      'requestId' in data &&
      'data' in data
    );
  }

  /**
   * Checks if data is paginated (has items and pagination properties)
   * @param data - The response data
   * @returns boolean - True if data is paginated
   */
  private isPaginatedData(data: any): boolean {
    return (
      data &&
      typeof data === 'object' &&
      'items' in data &&
      'pagination' in data &&
      Array.isArray(data.items)
    );
  }

  /**
   * Generates a unique request identifier
   * @returns string - Unique request ID
   */
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
