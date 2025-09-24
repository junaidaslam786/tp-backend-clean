import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNumber,
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SubLevel } from '../interfaces';

export class SubscriptionTierLimitsDto {
  @ApiProperty({ description: 'Maximum number of users allowed' })
  @IsNumber()
  max_users: number;

  @ApiProperty({
    description: 'Maximum number of organizations (LE only)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  max_organizations?: number;

  @ApiProperty({ description: 'Maximum number of runs per month' })
  @IsNumber()
  max_runs_per_month: number;

  @ApiProperty({ description: 'Maximum number of exports per month' })
  @IsNumber()
  max_exports_per_month: number;

  @ApiProperty({ description: 'Storage limit in GB' })
  @IsNumber()
  storage_gb: number;

  @ApiProperty({ description: 'API calls per month limit' })
  @IsNumber()
  api_calls_per_month: number;
}

export class SubscriptionTierDto {
  @ApiProperty({
    description: 'Subscription tier',
    enum: SubLevel,
  })
  @IsEnum(SubLevel)
  sub_level: SubLevel;

  @ApiProperty({ description: 'Display name of the tier' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tier description' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Monthly price in cents' })
  @IsNumber()
  price_monthly: number;

  @ApiProperty({ description: 'Annual price in cents' })
  @IsNumber()
  price_annual: number;

  @ApiProperty({ description: 'Currency code' })
  @IsString()
  currency: string;

  @ApiProperty({
    description: 'List of features included in this tier',
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features: string[];

  @ApiProperty({
    description: 'Usage limits for this tier',
    type: SubscriptionTierLimitsDto,
  })
  @ValidateNested()
  @Type(() => SubscriptionTierLimitsDto)
  limits: SubscriptionTierLimitsDto;
}
