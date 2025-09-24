import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ExchangeCodeDto {
  @ApiProperty({ description: 'Authorization code from Cognito' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'State parameter for CSRF protection' })
  @IsOptional()
  @IsString()
  state?: string;
}
