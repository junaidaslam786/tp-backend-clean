import { BaseEntity } from '../../../core/database/repositories/base.repository';

export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  partner_reffered: boolean;
  partner_code?: string;
  client_name?: string; // Only for non-platform admins
  organizations: string[]; // Organization names user belongs to
  upgraded_to_le_at?: string; // ISO string date
  phone?: string;
  avatar_url?: string;
  last_login_at?: string;
  login_count?: number;
  is_mfa_enabled?: boolean;
  preferences?: UserPreferences;
}

export enum UserRole {
  ADMIN = 'admin',
  LE_ADMIN = 'le_admin',
  VIEWER = 'viewer',
  PLATFORM_ADMIN = 'platform_admin',
  SUPER_ADMIN = 'super_admin',
}

export enum UserStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
}

export interface UserPreferences {
  notifications_email?: boolean;
  notifications_sms?: boolean;
  theme?: 'light' | 'dark';
  timezone?: string;
  language?: string;
}

export interface UserProfile {
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  organizations: string[];
  last_login_at?: string;
  avatar_url?: string;
  preferences?: UserPreferences;
}

export interface UserStats {
  total_users: number;
  active_users: number;
  pending_approval: number;
  by_role: Record<UserRole, number>;
  by_status: Record<UserStatus, number>;
}
