import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsDateString,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { PartnerType, PartnerStatus } from '../../../common/enums';

export enum PaymentMethod {
  BANK_TRANSFER = 'BANK_TRANSFER',
  PAYPAL = 'PAYPAL',
  STRIPE_PAYOUT = 'STRIPE_PAYOUT',
}

export class PartnerDto {
  @ApiProperty({ description: 'Partner unique identifier' })
  @IsString()
  partnerId: string;

  @ApiProperty({ description: 'Partner company name' })
  @IsString()
  companyName: string;

  @ApiProperty({ description: 'Primary contact email' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ description: 'Primary contact name' })
  @IsString()
  contactName: string;

  @ApiProperty({
    description: 'Type of business partnership',
    enum: PartnerType,
  })
  @IsEnum(PartnerType)
  businessType: PartnerType;

  @ApiProperty({ description: 'Partner website URL', required: false })
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;

  @ApiProperty({ description: 'Partner business description', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Commission rate percentage (e.g., 15.0 for 15%)',
    minimum: 0,
    maximum: 50,
  })
  @IsNumber()
  @Min(0)
  @Max(50)
  commissionRate: number;

  @ApiProperty({
    description: 'Preferred payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({ description: 'Total number of referrals made' })
  @IsNumber()
  totalReferrals: number;

  @ApiProperty({ description: 'Number of successful conversions' })
  @IsNumber()
  successfulConversions: number;

  @ApiProperty({ description: 'Total commission earned in cents' })
  @IsNumber()
  totalCommissionEarned: number;

  @ApiProperty({ description: 'Total commission paid out in cents' })
  @IsNumber()
  totalCommissionPaid: number;

  @ApiProperty({
    description: 'Partner account status',
    enum: PartnerStatus,
  })
  @IsEnum(PartnerStatus)
  status: PartnerStatus;

  @ApiProperty({ description: 'Partner approval timestamp', required: false })
  @IsOptional()
  @IsDateString()
  approvedAt?: string;

  @ApiProperty({ description: 'Partner creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;

  @ApiProperty({ description: 'Version for optimistic concurrency' })
  @IsNumber()
  version: number;
}
