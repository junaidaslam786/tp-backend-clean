import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class VerifyMfaDto {
  @ApiProperty({ description: 'MFA token' })
  @IsString()
  token: string;

  @ApiProperty({ description: 'User session identifier' })
  @IsString()
  session: string;
}
