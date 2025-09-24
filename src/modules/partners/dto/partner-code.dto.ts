import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';

export class PartnerCodeDto {
  @ApiProperty({ description: 'Partner referral code' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'Partner ID that owns this code' })
  @IsString()
  partnerId: string;

  @ApiProperty({ description: 'Maximum number of uses allowed', required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  maxUses?: number;

  @ApiProperty({ description: 'Current number of times code has been used' })
  @IsNumber()
  @Min(0)
  currentUses: number;

  @ApiProperty({ description: 'Whether the code is currently active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Code expiration timestamp', required: false })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiProperty({ description: 'Number of successful conversions from this code' })
  @IsNumber()
  @Min(0)
  conversions: number;

  @ApiProperty({ description: 'Total value of conversions in cents' })
  @IsNumber()
  @Min(0)
  totalValue: number;

  @ApiProperty({ description: 'Code creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ description: 'Version for optimistic concurrency' })
  @IsNumber()
  version: number;
}
