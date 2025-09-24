import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsObject,
} from 'class-validator';
import { UserRole, UserStatus } from '../interfaces/user.interface';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  full_name: string;

  @IsString()
  organization_name: string;

  @IsString()
  org_domain: string;

  @IsString()
  origin_country: string;

  @IsArray()
  @IsString({ each: true })
  operating_countries: string[];

  @IsEnum(['yes', 'no'])
  government: 'yes' | 'no';

  @IsString()
  industry_sector: string;

  @IsOptional()
  @IsString()
  additional_context?: string;

  @IsOptional()
  @IsString()
  org_home_link?: string;

  @IsOptional()
  @IsString()
  org_about_us_link?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  job_title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  partner_referral_code?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  full_name?: string;

  @IsOptional()
  @IsString()
  phone_number?: string;

  @IsOptional()
  @IsString()
  job_title?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsBoolean()
  email_verified?: boolean;

  @IsOptional()
  @IsObject()
  preferences?: {
    notifications?: {
      email_reports?: boolean;
      security_alerts?: boolean;
      product_updates?: boolean;
    };
    dashboard?: {
      default_view?: string;
      items_per_page?: number;
    };
    locale?: {
      language?: string;
      timezone?: string;
      date_format?: string;
    };
  };
}

export class UserResponseDto {
  email: string;
  full_name: string;
  organization_name: string;
  org_domain: string;
  role: UserRole;
  status: UserStatus;
  phone_number?: string;
  job_title?: string;
  department?: string;
  email_verified: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  preferences?: {
    notifications?: {
      email_reports?: boolean;
      security_alerts?: boolean;
      product_updates?: boolean;
    };
    dashboard?: {
      default_view?: string;
      items_per_page?: number;
    };
    locale?: {
      language?: string;
      timezone?: string;
      date_format?: string;
    };
  };
}

export class UserListResponseDto {
  users: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export class ChangeUserRoleDto {
  @IsEnum(UserRole)
  new_role: UserRole;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UserSearchDto {
  @IsOptional()
  @IsString()
  search_term?: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

export class ResendVerificationDto {
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @IsEmail()
  email: string;

  @IsString()
  reason: string;
}
