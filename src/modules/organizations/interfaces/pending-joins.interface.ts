import { BaseEntity } from '../../../core/database/repositories/base.repository';

// Pending organization join requests
export interface PendingJoins extends BaseEntity {
  join_id: string; // Partition key - unique join request ID
  requesting_user_email: string; // Sort key - email of user requesting to join
  organization_name: string; // Organization being requested to join
  org_domain: string; // Domain of the organization
  request_date: string; // ISO string of when request was made
  status: JoinRequestStatus;
  requester_details: {
    full_name: string;
    role_requested: string; // Role they want in the organization
    justification?: string; // Why they want to join
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
    approved_by?: string; // Email of admin who approved/rejected
    approval_date?: string; // ISO string
    approval_notes?: string;
  };
  expiry_date: string; // ISO string - when request expires
  notification_sent: boolean;
  follow_up_count: number; // Number of reminders sent
}

export enum JoinRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  WITHDRAWN = 'withdrawn',
}

export interface JoinRequestStats {
  total_requests: number;
  by_status: Record<JoinRequestStatus, number>;
  by_organization: Record<string, number>;
  average_processing_time: number; // in hours
  approval_rate: number; // percentage
}

export interface JoinRequestSummary {
  join_id: string;
  requesting_user_email: string;
  organization_name: string;
  request_date: string;
  status: JoinRequestStatus;
  requester_name: string;
  role_requested: string;
  days_pending: number;
}
