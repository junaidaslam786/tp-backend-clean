import { BaseEntity } from '../../../core/database/repositories/base.repository';

/**
 * ClientSubs Interface
 * Represents a client subscription record as per specification
 */
export interface ClientSubs extends BaseEntity {
  client_name: string;
  sub_level: SubLevel;
  run_number: number;
  progress: string;
  payment_status: PaymentStatus;
  sub_type: SubType;
}

/**
 * Subscription Tier Enum
 * Following the specification requirements
 */
export enum SubLevel {
  L1 = 'L1',
  L2 = 'L2',
  L3 = 'L3',
  LE = 'LE',
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

/**
 * Subscription Type Enum
 */
export enum SubType {
  NEW = 'new',
  UPGRADE = 'upgrade',
}

/**
 * Subscription Tier Configuration
 * Defines the limits and features for each tier
 */
export interface SubscriptionTierConfig {
  sub_level: SubLevel;
  name: string;
  description: string;
  price_monthly: number;
  price_annual: number;
  currency: string;
  features: string[];
  limits: {
    max_users: number;
    max_organizations?: number; // Only for LE
    max_runs_per_month: number;
    max_exports_per_month: number;
    storage_gb: number;
    api_calls_per_month: number;
  };
}

/**
 * Subscription Usage Tracking
 */
export interface SubscriptionUsage {
  client_name: string;
  current_users: number;
  current_organizations?: number; // Only for LE
  runs_this_month: number;
  exports_this_month: number;
  storage_used_gb: number;
  api_calls_this_month: number;
  period_start: string;
  period_end: string;
}
