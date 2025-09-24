import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUrl,
  Min,
  Max,
} from 'class-validator';
import { PartnerType, PartnerStatus } from '../../../common/enums';
import { PaymentMethod } from './partner.dto';

export class UpdatePartnerDto {
  @ApiProperty({ description: 'Partner company name', required: false })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiProperty({ description: 'Primary contact email', required: false })
  @IsOptional()
  @IsEmail()
  contactEmail?: string;

  @ApiProperty({ description: 'Primary contact name', required: false })
  @IsOptional()
  @IsString()
  contactName?: string;

  @ApiProperty({
    description: 'Type of business partnership',
    enum: PartnerType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PartnerType)
  businessType?: PartnerType;

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
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  commissionRate?: number;

  @ApiProperty({
    description: 'Preferred payment method',
    enum: PaymentMethod,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @ApiProperty({
    description: 'Partner status',
    enum: PartnerStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PartnerStatus)
  status?: PartnerStatus;

  @ApiProperty({ description: 'Total number of referrals made', required: false })
  @IsOptional()
  @IsNumber()
  totalReferrals?: number;

  @ApiProperty({ description: 'Number of successful conversions', required: false })
  @IsOptional()
  @IsNumber()
  successfulConversions?: number;

  @ApiProperty({ description: 'Total commission earned in cents', required: false })
  @IsOptional()
  @IsNumber()
  totalCommissionEarned?: number;

  @ApiProperty({ description: 'Total commission paid out in cents', required: false })
  @IsOptional()
  @IsNumber()
  totalCommissionPaid?: number;
}
