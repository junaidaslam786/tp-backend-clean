import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum AssessmentType {
  INITIAL = 'INITIAL',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
  INCIDENT_RESPONSE = 'INCIDENT_RESPONSE',
  COMPLIANCE_DRIVEN = 'COMPLIANCE_DRIVEN',
}

export class CreateProfilingProfileDto {
  @ApiProperty({ description: 'Profile name/title' })
  @IsString()
  profileName: string;

  @ApiProperty({ description: 'Industry type for context-specific analysis' })
  @IsString()
  industryType: string;

  @ApiProperty({ description: 'Company size category' })
  @IsString()
  companySize: string;

  @ApiProperty({
    description: 'Type of assessment to perform',
    enum: AssessmentType,
    required: false,
    default: AssessmentType.INITIAL,
  })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiProperty({ description: 'Initial risk assessment notes', required: false })
  @IsOptional()
  @IsString()
  initialNotes?: string;

  @ApiProperty({
    description: 'Specific areas of concern to focus analysis on',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiProperty({
    description: 'Existing security measures to consider',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existingMeasures?: string[];
}
