import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsObject,
} from 'class-validator';
import { OrganizationSize } from '../interfaces/clients-data.interface';
import { JoinRequestStatus } from '../interfaces/pending-joins.interface';

export class CreateOrganizationDto {
  @IsString()
  client_name: string;

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

  @IsArray()
  @IsEmail({}, { each: true })
  admins: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  viewers?: string[];

  @IsOptional()
  @IsEnum(OrganizationSize)
  company_size?: OrganizationSize;

  @IsOptional()
  @IsString()
  annual_revenue?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  organization_name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  operating_countries?: string[];

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
  @IsArray()
  @IsEmail({}, { each: true })
  admins?: string[];

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  viewers?: string[];

  @IsOptional()
  @IsEnum(OrganizationSize)
  company_size?: OrganizationSize;

  @IsOptional()
  @IsString()
  annual_revenue?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  compliance_frameworks?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  security_certifications?: string[];
}

export class OrganizationResponseDto {
  client_name: string;
  organization_name: string;
  org_domain: string;
  org_home_link?: string;
  org_about_us_link?: string;
  origin_country: string;
  operating_countries: string[];
  government: 'yes' | 'no';
  additional_context?: string;
  industry_sector: string;
  admins: string[];
  viewers: string[];
  total_users: number;
  app_count: number;
  company_size?: OrganizationSize;
  annual_revenue?: string;
  description?: string;
  website?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
  };
  compliance_frameworks?: string[];
  security_certifications?: string[];
  subscription_tier?: string;
  last_assessment_date?: string;
  risk_score?: number;
  maturity_score?: number;
  active_runs?: number;
  created_at: string;
  updated_at: string;
}

export class OrganizationListResponseDto {
  organizations: OrganizationResponseDto[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export class AddOrganizationMemberDto {
  @IsEmail()
  user_email: string;

  @IsEnum(['admin', 'viewer'])
  role: 'admin' | 'viewer';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class RemoveOrganizationMemberDto {
  @IsEmail()
  user_email: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateJoinRequestDto {
  @IsEmail()
  requesting_user_email: string;

  @IsString()
  organization_name: string;

  @IsString()
  org_domain: string;

  @IsString()
  full_name: string;

  @IsString()
  role_requested: string;

  @IsOptional()
  @IsString()
  justification?: string;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsString()
  title?: string;
}

export class ProcessJoinRequestDto {
  @IsEnum(['approved', 'rejected'])
  action: 'approved' | 'rejected';

  @IsString()
  processed_by: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class JoinRequestResponseDto {
  join_id: string;
  requesting_user_email: string;
  organization_name: string;
  org_domain: string;
  request_date: string;
  status: JoinRequestStatus;
  requester_details: {
    full_name: string;
    role_requested: string;
    justification?: string;
    department?: string;
    title?: string;
  };
  organization_details: {
    client_name: string;
    organization_name: string;
    org_domain: string;
    industry_sector: string;
    current_admin_count: number;
  };
  approval_details?: {
    approved_by?: string;
    approval_date?: string;
    approval_notes?: string;
  };
  expiry_date: string;
  notification_sent: boolean;
  follow_up_count: number;
  created_at: string;
  updated_at: string;
}

export class JoinRequestListResponseDto {
  join_requests: JoinRequestResponseDto[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export class OrganizationSearchDto {
  @IsOptional()
  @IsString()
  search_term?: string;

  @IsOptional()
  @IsString()
  industry_sector?: string;

  @IsOptional()
  @IsEnum(OrganizationSize)
  size?: OrganizationSize;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  domain?: string;

  @IsOptional()
  @IsString()
  subscription_tier?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}

export class AddUserToOrganizationDto {
  @IsEmail()
  userEmail: string;

  @IsEnum(['admin', 'viewer'])
  role: 'admin' | 'viewer';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangeUserRoleInOrganizationDto {
  @IsEnum(['admin', 'viewer'])
  newRole: 'admin' | 'viewer';

  @IsOptional()
  @IsString()
  reason?: string;
}
