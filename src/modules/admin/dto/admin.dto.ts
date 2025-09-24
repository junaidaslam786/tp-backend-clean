import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { UserRole, UserStatus } from '../../users/interfaces/user.interface';
import { AdminActionType } from '../interfaces/admin.interface';
import { JoinRequestStatus } from '../../organizations/interfaces/pending-joins.interface';
import { OrganizationSize } from '../../organizations/interfaces/clients-data.interface';

export class AdminUserActionDto {
  @IsEnum(AdminActionType)
  action_type: AdminActionType;

  @IsEmail()
  target_user_email: string;

  @IsOptional()
  @IsString()
  target_organization?: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEmail()
  performed_by: string;
}

export class AdminOrganizationActionDto {
  @IsEnum(AdminActionType)
  action_type: AdminActionType;

  @IsString()
  target_organization: string;

  @IsString()
  target_client_name: string;

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsEmail()
  performed_by: string;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  affected_users?: string[];
}

export class BulkActionRequestDto {
  @IsEnum(AdminActionType)
  action_type: AdminActionType;

  @IsArray()
  @IsString({ each: true })
  targets: string[];

  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  schedule_for?: string;
}

export class AdminDashboardStatsResponseDto {
  users: {
    total: number;
    active: number;
    pending_verification: number;
    suspended: number;
    by_role: Record<UserRole, number>;
    new_this_month: number;
  };
  organizations: {
    total: number;
    active: number;
    by_size: Record<OrganizationSize, number>;
    by_industry: Record<string, number>;
    new_this_month: number;
  };
  join_requests: {
    total_pending: number;
    total_this_month: number;
    by_status: Record<JoinRequestStatus, number>;
    average_processing_time: number;
  };
  system: {
    total_apps: number;
    total_assessments: number;
    active_subscriptions: number;
    revenue_this_month: number;
  };
}

export class UserManagementFiltersDto {
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

  @IsOptional()
  @IsString()
  search_term?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class OrganizationManagementFiltersDto {
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

  @IsOptional()
  @IsString()
  search_term?: string;

  @IsOptional()
  @IsNumber()
  page?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;
}

export class AdminActivityLogResponseDto {
  log_id: string;
  admin_email: string;
  action_type: AdminActionType;
  target_type: 'user' | 'organization' | 'system';
  target_id: string;
  action_details: Record<string, any>;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  success: boolean;
  error_message?: string;
}

export class AdminActivityLogListResponseDto {
  logs: AdminActivityLogResponseDto[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export class BulkActionResultResponseDto {
  request_id: string;
  action_type: AdminActionType;
  total_targets: number;
  successful_actions: number;
  failed_actions: number;
  errors: Array<{
    target: string;
    error: string;
  }>;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

export class AdminSystemStatsDto {
  @IsOptional()
  @IsString()
  period?: 'day' | 'week' | 'month' | 'year';

  @IsOptional()
  @IsString()
  metric_type?: 'users' | 'organizations' | 'requests' | 'revenue';
}

export class SystemExportRequestDto {
  @IsEnum(['users', 'organizations', 'join_requests', 'activity_logs'])
  export_type: 'users' | 'organizations' | 'join_requests' | 'activity_logs';

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filters?: string[];

  @IsEnum(['csv', 'json', 'xlsx'])
  format: 'csv' | 'json' | 'xlsx';

  @IsBoolean()
  include_deleted: boolean;
}
