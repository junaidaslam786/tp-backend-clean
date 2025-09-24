import { BaseEntity } from '../../../core/database/repositories/base.repository';
import { SubLevel } from '../../subscriptions/interfaces';

/**
 * Payment Interface
 * Represents a payment record for subscription purchases
 */
export interface Payment extends BaseEntity {
  payment_id: string;
  sub_level: SubLevel;
  client_name: string;
  user_email: string;
  amount: number; // In cents
  partner_code?: string;
  discount_amount?: number; // In cents
  tax_type?: string;
  tax_amount?: number; // In cents
  total_amount: number; // In cents
  payment_method: string;
  session_id?: string;
  transaction_id?: string;
  stripe_payment_intent_id?: string;
  payment_status: PaymentStatus;
  payment_date: string; // ISO date string
  invoice_pdf_link?: string;
  partner_code_index?: string; // Copy of partner_code for GSI
  client_name_index?: string; // Copy of client_name for GSI
  user_email_index?: string; // Copy of user_email for GSI
}

/**
 * Payment Status Enum
 */
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PAID = 'paid',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PARTIALLY_REFUNDED = 'partially_refunded',
}

/**
 * Payment Method Types
 */
export enum PaymentMethodType {
  CARD = 'card',
  BANK_TRANSFER = 'bank_transfer',
  WALLET = 'wallet',
  CRYPTO = 'crypto',
}

/**
 * Tax Types
 */
export enum TaxType {
  GST = 'gst',
  VAT = 'vat',
  SALES_TAX = 'sales_tax',
  NONE = 'none',
}

/**
 * Payment Summary for Reporting
 */
export interface PaymentSummary {
  total_payments: number;
  total_amount: number;
  successful_payments: number;
  failed_payments: number;
  pending_payments: number;
  refunded_amount: number;
  by_tier: Record<string, { count: number; amount: number }>;
  by_partner: Record<
    string,
    { count: number; amount: number; commission: number }
  >;
}

/**
 * Payment Checkout Session
 */
export interface PaymentCheckoutSession {
  session_id: string;
  client_name: string;
  user_email: string;
  sub_level: SubLevel;
  amount: number;
  currency: string;
  success_url: string;
  cancel_url: string;
  expires_at: string;
  created_at: string;
}

/**
 * Invoice Data
 */
export interface Invoice {
  invoice_id: string;
  payment_id: string;
  client_name: string;
  user_email: string;
  sub_level: string;
  amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  invoice_date: string;
  due_date: string;
  status: InvoiceStatus;
  pdf_url?: string;
}

/**
 * Invoice Status
 */
export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}
