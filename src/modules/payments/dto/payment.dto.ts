import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsEmail,
  Min,
} from 'class-validator';
import { SubLevel } from '../../subscriptions/interfaces';
import { PaymentStatus } from '../interfaces';

export class CreatePaymentDto {
  @ApiProperty({ description: 'Subscription tier level', enum: SubLevel })
  @IsEnum(SubLevel)
  sub_level: SubLevel;

  @ApiProperty({ description: 'Client organization name' })
  @IsString()
  client_name: string;

  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  user_email: string;

  @ApiPropertyOptional({ description: 'Partner referral code' })
  @IsOptional()
  @IsString()
  partner_code?: string;

  @ApiProperty({ description: 'Payment amount in cents' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: 'Payment method type' })
  @IsString()
  payment_method: string;
}

export class PaymentDto {
  @ApiProperty({ description: 'Payment ID' })
  payment_id: string;

  @ApiProperty({ description: 'Subscription tier level', enum: SubLevel })
  sub_level: SubLevel;

  @ApiProperty({ description: 'Client organization name' })
  client_name: string;

  @ApiProperty({ description: 'User email address' })
  user_email: string;

  @ApiPropertyOptional({ description: 'Partner referral code' })
  partner_code?: string;

  @ApiProperty({ description: 'Payment amount in cents' })
  amount: number;

  @ApiProperty({ description: 'Tax amount in cents' })
  tax_amount: number;

  @ApiProperty({ description: 'Total amount in cents' })
  total_amount: number;

  @ApiProperty({ description: 'Payment method type' })
  payment_method: string;

  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  payment_status: PaymentStatus;

  @ApiPropertyOptional({ description: 'Stripe payment intent ID' })
  stripe_payment_intent_id?: string;

  @ApiPropertyOptional({ description: 'Invoice ID' })
  invoice_id?: string;

  @ApiProperty({ description: 'Payment created date' })
  created_at: Date;

  @ApiProperty({ description: 'Payment updated date' })
  updated_at: Date;
}

export class UpdatePaymentStatusDto {
  @ApiProperty({ description: 'Payment status', enum: PaymentStatus })
  @IsEnum(PaymentStatus)
  payment_status: PaymentStatus;

  @ApiPropertyOptional({ description: 'Stripe payment intent ID' })
  @IsOptional()
  @IsString()
  stripe_payment_intent_id?: string;

  @ApiPropertyOptional({ description: 'Invoice ID' })
  @IsOptional()
  @IsString()
  invoice_id?: string;
}
