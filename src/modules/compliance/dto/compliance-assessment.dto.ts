import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ComplianceFramework {
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  GDPR = 'GDPR',
  HIPAA = 'HIPAA',
  PCI_DSS = 'PCI_DSS',
  NIST = 'NIST',
  CIS = 'CIS',
  CUSTOM = 'CUSTOM',
}

export enum ComplianceStatus {
  NOT_STARTED = 'NOT_STARTED',
  IN_PROGRESS = 'IN_PROGRESS',
  UNDER_REVIEW = 'UNDER_REVIEW',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
}

export enum ControlStatus {
  COMPLIANT = 'COMPLIANT',
  NON_COMPLIANT = 'NON_COMPLIANT',
  PARTIALLY_COMPLIANT = 'PARTIALLY_COMPLIANT',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
  UNDER_REVIEW = 'UNDER_REVIEW',
}

export class ComplianceControlDto {
  @ApiProperty({ description: 'Control identifier within framework' })
  @IsString()
  controlId: string;

  @ApiProperty({ description: 'Control title/name' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Control description' })
  @IsString()
  description: string;

  @ApiProperty({
    description: 'Current compliance status for this control',
    enum: ControlStatus,
  })
  @IsEnum(ControlStatus)
  status: ControlStatus;

  @ApiProperty({ description: 'Evidence or notes for this control', required: false })
  @IsOptional()
  @IsString()
  evidence?: string;

  @ApiProperty({ description: 'Gap analysis or remediation notes', required: false })
  @IsOptional()
  @IsString()
  gaps?: string;

  @ApiProperty({ description: 'Last assessment date', required: false })
  @IsOptional()
  @IsDateString()
  lastAssessed?: string;

  @ApiProperty({ description: 'Next review due date', required: false })
  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;
}

export class ComplianceAssessmentDto {
  @ApiProperty({ description: 'Assessment unique identifier' })
  @IsString()
  assessmentId: string;

  @ApiProperty({ description: 'Organization ID this assessment belongs to' })
  @IsString()
  organizationId: string;

  @ApiProperty({ description: 'Assessment name/title' })
  @IsString()
  assessmentName: string;

  @ApiProperty({
    description: 'Compliance framework being assessed',
    enum: ComplianceFramework,
  })
  @IsEnum(ComplianceFramework)
  framework: ComplianceFramework;

  @ApiProperty({
    description: 'Current assessment status',
    enum: ComplianceStatus,
  })
  @IsEnum(ComplianceStatus)
  status: ComplianceStatus;

  @ApiProperty({
    description: 'Controls included in this assessment',
    type: [ComplianceControlDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ComplianceControlDto)
  controls: ComplianceControlDto[];

  @ApiProperty({ description: 'Overall compliance score (0-100)' })
  @IsNumber()
  overallScore: number;

  @ApiProperty({ description: 'Number of compliant controls' })
  @IsNumber()
  compliantControls: number;

  @ApiProperty({ description: 'Total number of controls' })
  @IsNumber()
  totalControls: number;

  @ApiProperty({ description: 'Assessment scope description', required: false })
  @IsOptional()
  @IsString()
  scope?: string;

  @ApiProperty({ description: 'Assessment methodology notes', required: false })
  @IsOptional()
  @IsString()
  methodology?: string;

  @ApiProperty({ description: 'Key findings summary', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keyFindings?: string[];

  @ApiProperty({ description: 'Remediation recommendations', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @ApiProperty({ description: 'Assessment start date' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Assessment completion date', required: false })
  @IsOptional()
  @IsDateString()
  completionDate?: string;

  @ApiProperty({ description: 'Next assessment due date', required: false })
  @IsOptional()
  @IsDateString()
  nextAssessmentDate?: string;

  @ApiProperty({ description: 'Assessment creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ description: 'Version for optimistic concurrency' })
  @IsNumber()
  version: number;
}
