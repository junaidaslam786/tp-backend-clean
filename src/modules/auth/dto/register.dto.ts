import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ description: 'User email address' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'User password', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'User full name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Partner code for referrals' })
  @IsOptional()
  @IsString()
  partnerCode?: string;
}
