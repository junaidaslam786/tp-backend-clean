import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
} from 'class-validator';

export enum ReportType {
  ASSESSMENT = 'ASSESSMENT',
  COMPLIANCE = 'COMPLIANCE',
  EXECUTIVE = 'EXECUTIVE',
  AUDIT = 'AUDIT',
  CUSTOM = 'CUSTOM',
}

export enum ReportFormat {
  PDF = 'PDF',
  CSV = 'CSV',
  JSON = 'JSON',
  XLSX = 'XLSX',
}

export enum ReportStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  READY = 'READY',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
}

export class ReportDto {
  @ApiProperty({ description: 'Report unique identifier' })
  @IsString()
  reportId: string;

  @ApiProperty({ description: 'Organization ID this report belongs to' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'User ID who requested the report' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Type of report', enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType;

  @ApiProperty({ description: 'Format of the report', enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat;

  @ApiProperty({ description: 'Status of the report', enum: ReportStatus })
  @IsEnum(ReportStatus)
  status: ReportStatus;

  @ApiProperty({ description: 'Report file name' })
  @IsString()
  fileName: string;

  @ApiProperty({ description: 'S3 key for the report file' })
  @IsString()
  s3Key: string;

  @ApiProperty({ description: 'S3 bucket for the report file' })
  @IsString()
  s3Bucket: string;

  @ApiProperty({ description: 'Report creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ description: 'Version for optimistic concurrency' })
  @IsNumber()
  version: number;

  @ApiProperty({
    description: 'Optional: Associated assessment or run',
    required: false,
  })
  @IsOptional()
  @IsString()
  sourceId?: string;

  @ApiProperty({
    description: 'Optional: Date range for the report',
    required: false,
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsDateString()
  dateRange?: string[];
}
