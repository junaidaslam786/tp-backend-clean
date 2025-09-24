import { IsOptional, IsString, IsEmail, Length, IsObject } from 'class-validator';

/**
 * Update Profile DTO
 * Data transfer object for user profile updates
 */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(1, 100)
  readonly firstName?: string;

  @IsOptional()
  @IsString()
  @Length(1, 100)
  readonly lastName?: string;

  @IsOptional()
  @IsEmail()
  readonly email?: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  readonly bio?: string;

  @IsOptional()
  @IsString()
  readonly timezone?: string;

  @IsOptional()
  @IsString()
  readonly language?: string;

  @IsOptional()
  @IsObject()
  readonly preferences?: Record<string, any>;

  @IsOptional()
  @IsObject()
  readonly contact?: {
    phone?: string;
    address?: Record<string, any>;
  };
}
