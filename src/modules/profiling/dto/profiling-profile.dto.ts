import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProfilingStatus } from '../../../common/enums';

export class ThreatScoreDto {
  @ApiProperty({ description: 'Overall threat level score (0-100)' })
  @IsNumber()
  overall: number;

  @ApiProperty({ description: 'Malware threat score (0-100)' })
  @IsNumber()
  malware: number;

  @ApiProperty({ description: 'Phishing threat score (0-100)' })
  @IsNumber()
  phishing: number;

  @ApiProperty({ description: 'Ransomware threat score (0-100)' })
  @IsNumber()
  ransomware: number;

  @ApiProperty({ description: 'Data breach risk score (0-100)' })
  @IsNumber()
  dataBreach: number;

  @ApiProperty({ description: 'Insider threat score (0-100)' })
  @IsNumber()
  insiderThreat: number;
}

export class VulnerabilityDto {
  @ApiProperty({ description: 'Vulnerability category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Severity level (low, medium, high, critical)' })
  @IsString()
  severity: string;

  @ApiProperty({ description: 'Vulnerability description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Recommended remediation action' })
  @IsString()
  remediation: string;

  @ApiProperty({ description: 'Priority score for addressing this vulnerability' })
  @IsNumber()
  priority: number;
}

export class ProfilingProfileDto {
  @ApiProperty({ description: 'Profiling profile unique identifier' })
  @IsString()
  profileId: string;

  @ApiProperty({ description: 'Organization ID this profile belongs to' })
  @IsString()
  organizationId: string;

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
    description: 'Current profiling status',
    enum: ProfilingStatus,
  })
  @IsEnum(ProfilingStatus)
  status: ProfilingStatus;

  @ApiProperty({
    description: 'Threat assessment scores',
    type: ThreatScoreDto,
  })
  @ValidateNested()
  @Type(() => ThreatScoreDto)
  threatScore: ThreatScoreDto;

  @ApiProperty({
    description: 'Identified vulnerabilities',
    type: [VulnerabilityDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VulnerabilityDto)
  vulnerabilities: VulnerabilityDto[];

  @ApiProperty({ description: 'Analysis completion percentage (0-100)' })
  @IsNumber()
  completionPercentage: number;

  @ApiProperty({ description: 'Risk assessment summary', required: false })
  @IsOptional()
  @IsString()
  riskSummary?: string;

  @ApiProperty({ description: 'Recommended actions', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recommendations?: string[];

  @ApiProperty({ description: 'Profile creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last analysis update timestamp' })
  @IsDateString()
  lastAnalyzedAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ description: 'Version for optimistic concurrency' })
  @IsNumber()
  version: number;
}
