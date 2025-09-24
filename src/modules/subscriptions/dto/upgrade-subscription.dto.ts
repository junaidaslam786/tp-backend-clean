import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { SubLevel } from '../interfaces';

export class UpgradeSubscriptionDto {
  @ApiProperty({
    description: 'Target subscription tier',
    enum: SubLevel,
  })
  @IsEnum(SubLevel)
  target_sub_level: SubLevel;

  @ApiProperty({
    description: 'Partner referral code',
    required: false,
  })
  @IsOptional()
  @IsString()
  partner_code?: string;
}
