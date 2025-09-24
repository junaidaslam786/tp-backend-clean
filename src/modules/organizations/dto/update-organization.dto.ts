import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  Length,
  IsObject,
  IsBoolean,
  IsNumber,
} from 'class-validator';
import { OrganizationSize } from '../repositories/organization.repository';

/**
 * Update Organization DTO
 * Data transfer object for organization updates
 */
export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  readonly name?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  readonly domain?: string;

  @IsOptional()
  @IsEmail()
  readonly primaryContactEmail?: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  readonly primaryContactName?: string;

  @IsOptional()
  @IsString()
  readonly industry?: string;

  @IsOptional()
  @IsEnum(OrganizationSize)
  readonly size?: OrganizationSize;

  @IsOptional()
  @IsString()
  @Length(2, 3)
  readonly country?: string;

  @IsOptional()
  @IsString()
  readonly timezone?: string;

  @IsOptional()
  @IsObject()
  readonly billingAddress?: {
    street: string;
    city: string;
    state?: string;
    postalCode: string;
    country: string;
  };

  @IsOptional()
  @IsBoolean()
  readonly autoEnrollByDomain?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly requireMfaForAdmins?: boolean;

  @IsOptional()
  @IsNumber()
  readonly dataRetentionDays?: number;

  @IsOptional()
  @IsBoolean()
  readonly allowExportDownloads?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly emailNotifications?: boolean;
}
