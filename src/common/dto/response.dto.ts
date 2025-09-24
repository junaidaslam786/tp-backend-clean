import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  IsInt,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { PaginationInfoDto } from './pagination.dto';

/**
 * Base response DTO for standardized API responses
 * Provides consistent structure across all endpoints
 */
export class BaseResponseDto<T = any> {
  @ApiProperty({
    description: 'Response data payload',
    example: {},
  })
  data: T;

  @ApiProperty({
    description: 'Response timestamp in ISO format',
    example: '2024-01-15T10:30:00.000Z',
  })
  timestamp: string;

  @ApiProperty({
    description: 'Unique request identifier for tracking',
    example: 'req_123456789',
  })
  requestId: string;

  constructor(data: T, requestId: string) {
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
  }
}

/**
 * Paginated response DTO for endpoints returning multiple items
 * Extends base response with pagination metadata
 */
export class PaginatedResponseDto<T = any> extends BaseResponseDto<T[]> {
  @ApiProperty({
    description: 'Pagination information and metadata',
    type: PaginationInfoDto,
  })
  @ValidateNested()
  @Type(() => PaginationInfoDto)
  pagination: PaginationInfoDto;

  constructor(data: T[], pagination: PaginationInfoDto, requestId: string) {
    super(data, requestId);
    this.pagination = pagination;
  }
}

/**
 * Error response DTO for standardized error handling
 * Provides consistent error format across all endpoints
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: 'Error code for programmatic handling',
    example: 'VALIDATION_ERROR',
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Human-readable error message',
    example: 'The provided data is invalid',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'HTTP status code',
    example: 400,
  })
  @IsInt()
  status: number;

  @ApiProperty({
    description: 'Response timestamp in ISO format',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'Unique request identifier for tracking',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;

  @ApiPropertyOptional({
    description: 'Detailed error information for debugging',
    example: {
      field: 'email',
      constraint: 'isEmail',
      value: 'invalid-email',
    },
  })
  @IsOptional()
  @IsObject()
  details?: any;

  constructor(
    code: string,
    message: string,
    status: number,
    requestId: string,
    details?: any,
  ) {
    this.code = code;
    this.message = message;
    this.status = status;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
    this.details = details;
  }
}

/**
 * Success response DTO for operations that don't return data
 * Used for operations like delete, update confirmations
 */
export class SuccessResponseDto {
  @ApiProperty({
    description: 'Success indicator',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: 'Success message',
    example: 'Operation completed successfully',
  })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Response timestamp in ISO format',
    example: '2024-01-15T10:30:00.000Z',
  })
  @IsString()
  timestamp: string;

  @ApiProperty({
    description: 'Unique request identifier for tracking',
    example: 'req_123456789',
  })
  @IsString()
  requestId: string;

  constructor(message: string, requestId: string) {
    this.success = true;
    this.message = message;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;
  }
}
