import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsString, IsOptional } from 'class-validator';
import { SubLevel, SubType, PaymentStatus } from '../interfaces';

export class CreateSubscriptionDto {
  @ApiProperty({ description: 'Client organization name' })
  @IsString()
  client_name: string;

  @ApiProperty({
    description: 'Subscription tier level',
    enum: SubLevel,
    example: 'L1',
  })
  @IsEnum(SubLevel)
  sub_level: SubLevel;

  @ApiProperty({
    description: 'Subscription type',
    enum: SubType,
    example: 'new',
  })
  @IsEnum(SubType)
  sub_type: SubType;

  @ApiProperty({
    description: 'Partner referral code',
    required: false,
  })
  @IsOptional()
  @IsString()
  partner_code?: string;
}

export class SubscriptionDto {
  @ApiProperty({ description: 'Client organization name' })
  @IsString()
  client_name: string;

  @ApiProperty({
    description: 'Subscription tier level',
    enum: SubLevel,
  })
  @IsEnum(SubLevel)
  sub_level: SubLevel;

  @ApiProperty({ description: 'Current run number' })
  @IsNumber()
  run_number: number;

  @ApiProperty({ description: 'Subscription progress status' })
  @IsString()
  progress: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
  })
  @IsEnum(PaymentStatus)
  payment_status: PaymentStatus;

  @ApiProperty({
    description: 'Subscription type',
    enum: SubType,
  })
  @IsEnum(SubType)
  sub_type: SubType;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  created_at: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsString()
  updated_at: string;
}

export class UpdateSubscriptionDto {
  @ApiProperty({
    description: 'Subscription progress status',
    required: false,
  })
  @IsOptional()
  @IsString()
  progress?: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatus,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  payment_status?: PaymentStatus;
}
