import { UserRole, UserStatus } from '../../users/interfaces/user.interface';
import { JoinRequestStatus } from '../../organizations/interfaces/pending-joins.interface';
import { OrganizationSize } from '../../organizations/interfaces/clients-data.interface';

export interface AdminDashboardStats {
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

export interface UserManagementFilters {
  role?: UserRole;
  status?: UserStatus;
  organization?: string;
  domain?: string;
  country?: string;
  date_range?: {
    start: string;
    end: string;
  };
  search_term?: string;
}

export interface OrganizationManagementFilters {
  industry_sector?: string;
  size?: OrganizationSize;
  country?: string;
  domain?: string;
  subscription_tier?: string;
  date_range?: {
    start: string;
    end: string;
  };
  search_term?: string;
}

export interface AdminUserAction {
  action_type: AdminActionType;
  target_user_email: string;
  target_organization?: string;
  reason: string;
  notes?: string;
  performed_by: string;
  performed_at: string;
}

export interface AdminOrganizationAction {
  action_type: AdminActionType;
  target_organization: string;
  target_client_name: string;
  reason: string;
  notes?: string;
  performed_by: string;
  performed_at: string;
  affected_users?: string[];
}

export enum AdminActionType {
  // User actions
  SUSPEND_USER = 'suspend_user',
  ACTIVATE_USER = 'activate_user',
  CHANGE_USER_ROLE = 'change_user_role',
  DELETE_USER = 'delete_user',
  RESET_PASSWORD = 'reset_password',
  VERIFY_EMAIL = 'verify_email',

  // Organization actions
  SUSPEND_ORGANIZATION = 'suspend_organization',
  ACTIVATE_ORGANIZATION = 'activate_organization',
  DELETE_ORGANIZATION = 'delete_organization',
  CHANGE_SUBSCRIPTION = 'change_subscription',
  ADD_ADMIN = 'add_admin',
  REMOVE_ADMIN = 'remove_admin',

  // Join request actions
  APPROVE_JOIN_REQUEST = 'approve_join_request',
  REJECT_JOIN_REQUEST = 'reject_join_request',
  EXPEDITE_JOIN_REQUEST = 'expedite_join_request',

  // System actions
  SYSTEM_MAINTENANCE = 'system_maintenance',
  DATA_EXPORT = 'data_export',
  BULK_UPDATE = 'bulk_update',
}

export interface AdminActivityLog {
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

export interface BulkActionRequest {
  action_type: AdminActionType;
  targets: string[]; // Array of user emails or organization names
  reason: string;
  notes?: string;
  schedule_for?: string; // ISO string for scheduled actions
}

export interface BulkActionResult {
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
