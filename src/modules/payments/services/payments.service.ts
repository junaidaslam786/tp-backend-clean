import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentRepository } from '../repositories/payment.repository';
import { SubscriptionsService } from '../../subscriptions/services/subscriptions.service';
import { UsersService } from '../../users/services/users.service';
import { Payment, PaymentStatus as PaymentsPaymentStatus } from '../interfaces';
import { SubLevel, SubType, PaymentStatus } from '../../subscriptions/interfaces';
import { UserRole } from '../../users/interfaces/user.interface';
import { CreatePaymentDto, UpdatePaymentStatusDto } from '../dto/payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Create new payment for subscription
   * @param paymentData - Payment creation data
   * @returns Promise with created payment
   */
  async createPayment(paymentData: CreatePaymentDto): Promise<Payment> {
    // Validate subscription tier exists
    const tierConfig = await this.subscriptionsService.getTierConfig(
      paymentData.sub_level,
    );
    if (!tierConfig) {
      throw new BadRequestException('Invalid subscription tier');
    }

    // Calculate payment amounts
    const baseAmount = paymentData.amount;
    const taxAmount = Math.round(baseAmount * 0.1); // 10% tax
    const totalAmount = baseAmount + taxAmount;

    // Create payment record
    const payment = await this.paymentRepository.create(paymentData);

    return payment;
  }

  /**
   * Process payment and create/upgrade subscription
   * @param paymentId - Payment ID
   * @param stripePaymentIntentId - Stripe payment intent ID
   * @returns Promise with processing result
   */
  async processPayment(
    paymentId: string,
    stripePaymentIntentId: string,
  ): Promise<{ success: boolean; message: string; requiresRoleUpdate?: boolean }> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Payment already processed');
    }

    try {
      // Update payment status to paid
      await this.updatePaymentStatus(paymentId, {
        payment_status: PaymentsPaymentStatus.PAID,
        stripe_payment_intent_id: stripePaymentIntentId,
      });

      // Check if this is an existing subscription (upgrade) or new subscription
      const existingSubscription = await this.subscriptionsService.getSubscriptionByClientName(
        payment.client_name,
      );

      if (existingSubscription) {
        // This is an upgrade - update subscription tier
        await this.subscriptionsService.updatePaymentStatus(
          payment.client_name,
          PaymentStatus.PAID,
        );
        
        // For LE tier upgrades, check if role update is needed
        if (payment.sub_level === SubLevel.LE) {
          // Update user role to le_admin
          const user = await this.usersService.findByEmail(payment.user_email);
          if (user && user.role !== UserRole.LE_ADMIN) {
            await this.usersService.updateUserRole(payment.user_email, UserRole.LE_ADMIN);
            return {
              success: true,
              message: 'Payment processed successfully. Subscription upgraded to LE tier and user role updated to le_admin.',
              requiresRoleUpdate: true,
            };
          }
        }

        return {
          success: true,
          message: `Payment processed successfully. Subscription upgraded to ${payment.sub_level} tier.`,
        };
      } else {
        // This is a new subscription
        await this.subscriptionsService.createSubscription({
          client_name: payment.client_name,
          sub_level: payment.sub_level,
          sub_type: SubType.NEW,
          partner_code: payment.partner_code,
        });

        // For LE tier, update user role to le_admin
        if (payment.sub_level === SubLevel.LE) {
          const user = await this.usersService.findByEmail(payment.user_email);
          if (user && user.role !== UserRole.LE_ADMIN) {
            await this.usersService.updateUserRole(
              payment.user_email,
              UserRole.LE_ADMIN,
            );
            return {
              success: true,
              message:
                'Payment processed successfully. New LE subscription created and user role updated to le_admin.',
              requiresRoleUpdate: true,
            };
          }
        }

        return {
          success: true,
          message: `Payment processed successfully. New ${payment.sub_level} subscription created.`,
        };
      }
    } catch (error) {
      // Update payment status to failed
      await this.updatePaymentStatus(paymentId, {
        payment_status: PaymentStatus.FAILED,
      });

      throw new BadRequestException(
        `Payment processing failed: ${error.message}`,
      );
    }
  }

  /**
   * Update payment status
   * @param paymentId - Payment ID
   * @param updateData - Status update data
   * @returns Promise with updated payment
   */
  async updatePaymentStatus(
    paymentId: string,
    updateData: UpdatePaymentStatusDto,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    await this.paymentRepository.updatePaymentStatus(
      paymentId,
      updateData.payment_status,
      updateData.stripe_payment_intent_id,
    );

    // Return updated payment
    return this.paymentRepository.findById(paymentId);
  }

  /**
   * Get payment by ID
   * @param paymentId - Payment ID
   * @returns Promise with payment or null
   */
  async getPaymentById(paymentId: string): Promise<Payment | null> {
    return this.paymentRepository.findById(paymentId);
  }

  /**
   * Get payments by client name
   * @param clientName - Client organization name
   * @returns Promise with payments array
   */
  async getPaymentsByClientName(clientName: string): Promise<Payment[]> {
    return this.paymentRepository.findByClientName(clientName);
  }

  /**
   * Get payment summary statistics
   * @returns Promise with payment summary
   */
  async getPaymentSummary(): Promise<{
    totalPayments: number;
    totalAmount: number;
    statusDistribution: Record<PaymentStatus, number>;
    tierDistribution: Record<SubLevel, number>;
  }> {
    // TODO: Implement when paymentRepository.getAllPayments() method is available
    return {
      totalPayments: 0,
      totalAmount: 0,
      statusDistribution: {} as Record<PaymentStatus, number>,
      tierDistribution: {} as Record<SubLevel, number>,
    };
  }

  /**
   * Calculate refund amount for subscription
   * @param paymentId - Payment ID
   * @returns Promise with refund calculation
   */
  async calculateRefund(paymentId: string): Promise<{
    eligibleForRefund: boolean;
    refundAmount: number;
    reason?: string;
  }> {
    const payment = await this.paymentRepository.findById(paymentId);
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.payment_status !== PaymentsPaymentStatus.PAID) {
      return {
        eligibleForRefund: false,
        refundAmount: 0,
        reason: 'Payment is not in paid status',
      };
    }

    // Check if payment is within refund window (e.g., 30 days)
    const paymentDate = new Date(payment.createdAt);
    const currentDate = new Date();
    const daysDifference = Math.floor(
      (currentDate.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (daysDifference > 30) {
      return {
        eligibleForRefund: false,
        refundAmount: 0,
        reason: 'Payment is outside the 30-day refund window',
      };
    }

    // Calculate pro-rated refund based on usage
    const remainingDays = 30 - daysDifference;
    const refundAmount = Math.round(
      (payment.total_amount * remainingDays) / 30,
    );

    return {
      eligibleForRefund: true,
      refundAmount,
    };
  }

  /**
   * Process refund for payment
   * @param paymentId - Payment ID
   * @param reason - Refund reason
   * @returns Promise with refund result
   */
  async processRefund(
    paymentId: string,
    reason: string,
  ): Promise<{ success: boolean; message: string; refundAmount: number }> {
    const refundCalculation = await this.calculateRefund(paymentId);
    
    if (!refundCalculation.eligibleForRefund) {
      throw new BadRequestException(
        `Refund not eligible: ${refundCalculation.reason}`,
      );
    }

    // Update payment status to refunded
    await this.updatePaymentStatus(paymentId, {
      payment_status: PaymentStatus.REFUNDED,
    });

    // Here you would integrate with Stripe to process the actual refund
    // For now, we'll just update the status

    return {
      success: true,
      message: 'Refund processed successfully',
      refundAmount: refundCalculation.refundAmount,
    };
  }

  /**
   * Validate partner referral code
   * @param partnerCode - Partner referral code
   * @returns Promise with validation result
   */
  async validatePartnerCode(partnerCode: string): Promise<{
    valid: boolean;
    discount?: number;
    partnerName?: string;
  }> {
    // This would typically query a partners table
    // For now, implementing basic validation
    const validCodes = {
      'PARTNER001': { discount: 0.1, partnerName: 'Law Enforcement Partner 1' },
      'PARTNER002': { discount: 0.15, partnerName: 'Law Enforcement Partner 2' },
      'GOV001': { discount: 0.2, partnerName: 'Government Agency Discount' },
    };

    if (validCodes[partnerCode]) {
      return {
        valid: true,
        discount: validCodes[partnerCode].discount,
        partnerName: validCodes[partnerCode].partnerName,
      };
    }

    return { valid: false };
  }
}
