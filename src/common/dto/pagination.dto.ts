import { IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Standard pagination parameters for list endpoints
 */
export class PaginationDto {
  @ApiPropertyOptional({
    description: 'Number of items to return',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Number of items to skip',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  offset?: number = 0;
}

/**
 * Pagination metadata for response objects
 */
export class PaginationInfoDto {
  @ApiPropertyOptional({
    description: 'Total number of items available',
    example: 150,
  })
  total: number;

  @ApiPropertyOptional({
    description: 'Number of items per page',
    example: 20,
  })
  limit: number;

  @ApiPropertyOptional({
    description: 'Number of items skipped',
    example: 0,
  })
  offset: number;

  @ApiPropertyOptional({
    description: 'Whether there are more items available',
    example: true,
  })
  hasNext: boolean;

  @ApiPropertyOptional({
    description: 'Whether there are previous items available',
    example: false,
  })
  hasPrevious: boolean;

  constructor(total: number, limit: number, offset: number) {
    this.total = total;
    this.limit = limit;
    this.offset = offset;
    this.hasNext = offset + limit < total;
    this.hasPrevious = offset > 0;
  }
}
