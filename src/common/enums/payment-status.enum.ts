/**
 * Payment status indicating the current state of payment processing
 */
export enum PaymentStatus {
  /**
   * Payment is pending processing
   */
  PENDING = 'PENDING',

  /**
   * Payment completed successfully
   */
  SUCCEEDED = 'SUCCEEDED',

  /**
   * Payment failed to process
   */
  FAILED = 'FAILED',

  /**
   * Payment was canceled before completion
   */
  CANCELED = 'CANCELED',

  /**
   * Payment was fully refunded
   */
  REFUNDED = 'REFUNDED',

  /**
   * Payment was partially refunded
   */
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
}

/**
 * Payment method types supported by the platform
 */
export enum PaymentMethodType {
  /**
   * Credit or debit card payment
   */
  CARD = 'CARD',

  /**
   * Bank account transfer
   */
  BANK_ACCOUNT = 'BANK_ACCOUNT',

  /**
   * PayPal payment
   */
  PAYPAL = 'PAYPAL',

  /**
   * Stripe payment method
   */
  STRIPE = 'STRIPE',
}
