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
import { PartnerType } from '../../../common/enums';
import { PaymentMethod } from './partner.dto';

export class CreatePartnerDto {
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
    required: false,
    default: 15.0,
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
    default: PaymentMethod.BANK_TRANSFER,
  })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}
