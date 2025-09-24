import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { AssessmentType } from './create-profiling-profile.dto';

export class UpdateProfilingProfileDto {
  @ApiProperty({ description: 'Profile name/title', required: false })
  @IsOptional()
  @IsString()
  profileName?: string;

  @ApiProperty({ description: 'Industry type for context-specific analysis', required: false })
  @IsOptional()
  @IsString()
  industryType?: string;

  @ApiProperty({ description: 'Company size category', required: false })
  @IsOptional()
  @IsString()
  companySize?: string;

  @ApiProperty({
    description: 'Type of assessment to perform',
    enum: AssessmentType,
    required: false,
  })
  @IsOptional()
  @IsEnum(AssessmentType)
  assessmentType?: AssessmentType;

  @ApiProperty({ description: 'Risk assessment notes', required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({
    description: 'Specific areas of concern to focus analysis on',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  focusAreas?: string[];

  @ApiProperty({
    description: 'Security measures to consider',
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  securityMeasures?: string[];
}
