import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PaymentsService } from '../../payments/services/payments.service';
import { PartnerRepository } from '../repositories/partner.repository';
import { PartnerCodeRepository } from '../repositories/partner-code.repository';
import { Payment, PaymentStatus } from '../../payments/interfaces';
import { PartnerDto } from '../dto/partner.dto';
import { PartnerType } from '../../../common/enums/partner.enum';

export interface CommissionCalculation {
  partnerId: string;
  paymentId: string;
  baseAmount: number;
  commissionRate: number;
  commissionAmount: number;
  status: 'PENDING' | 'CALCULATED' | 'PAID';
  createdAt: string;
}

export interface ReferralAttribution {
  partnerCode: string;
  partnerId: string;
  userEmail: string;
  attributedAt: string;
  conversionDate?: string;
  paymentId?: string;
  commissionAmount?: number;
  status: 'ATTRIBUTED' | 'CONVERTED' | 'COMMISSION_PAID';
}

/**
 * Partner Commission Service
 * Handles referral attribution, commission calculation, and partner analytics
 */
@Injectable()
export class PartnerCommissionService {
  private readonly logger = new Logger(PartnerCommissionService.name);

  constructor(
    private readonly partnerRepository: PartnerRepository,
    private readonly partnerCodeRepository: PartnerCodeRepository,
    private readonly paymentsService: PaymentsService,
  ) {}

  /**
   * Process partner referral attribution during user registration
   */
  async processReferralAttribution(
    partnerCode: string,
    userEmail: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<ReferralAttribution> {
    this.logger.log('Processing referral attribution', {
      partnerCode,
      userEmail,
    });

    // Validate partner code
    const codeValidation = await this.validatePartnerCode(partnerCode);
    if (!codeValidation.isValid) {
      throw new NotFoundException('Invalid or expired partner code');
    }

    // Create attribution record
    const attribution: ReferralAttribution = {
      partnerCode,
      partnerId: codeValidation.partnerId!,
      userEmail,
      attributedAt: new Date().toISOString(),
      status: 'ATTRIBUTED',
    };

    // Update partner code usage statistics
    await this.partnerCodeRepository.incrementUsage(partnerCode);

    // Update partner referral statistics
    await this.updatePartnerReferralStats(codeValidation.partnerId!, 'referral');

    this.logger.log('Referral attribution processed successfully', {
      partnerCode,
      partnerId: attribution.partnerId,
      userEmail,
    });

    return attribution;
  }

  /**
   * Process conversion when user makes a payment
   */
  async processReferralConversion(
    userEmail: string,
    payment: Payment,
  ): Promise<CommissionCalculation | null> {
    // Check if user has an existing referral attribution
    const attribution = await this.findReferralAttribution(userEmail);
    if (!attribution) {
      this.logger.debug('No referral attribution found for user', { userEmail });
      return null;
    }

    this.logger.log('Processing referral conversion', {
      userEmail,
      paymentId: payment.payment_id,
      partnerId: attribution.partnerId,
    });

    // Get partner details for commission calculation
    const partner = await this.partnerRepository.findById(attribution.partnerId);
    if (!partner) {
      this.logger.error('Partner not found for conversion', {
        partnerId: attribution.partnerId,
      });
      return null;
    }

    // Calculate commission
    const commissionCalculation = await this.calculateCommission(
      partner,
      payment,
    );

    // Update attribution with conversion details
    attribution.conversionDate = new Date().toISOString();
    attribution.paymentId = payment.payment_id;
    attribution.commissionAmount = commissionCalculation.commissionAmount;
    attribution.status = 'CONVERTED';

    // Update partner conversion statistics
    await this.updatePartnerReferralStats(partner.partnerId, 'conversion');

    this.logger.log('Referral conversion processed successfully', {
      userEmail,
      partnerId: partner.partnerId,
      commissionAmount: commissionCalculation.commissionAmount,
    });

    return commissionCalculation;
  }

  /**
   * Calculate commission for a payment
   */
  private async calculateCommission(
    partner: PartnerDto,
    payment: Payment,
  ): Promise<CommissionCalculation> {
    // Base commission calculation
    const baseAmount = payment.total_amount;
    const commissionRate = partner.commissionRate / 100; // Convert percentage to decimal
    let commissionAmount = Math.round(baseAmount * commissionRate);

    // Apply tier-based commission modifiers
    commissionAmount = this.applyTierModifiers(
      commissionAmount,
      payment.sub_level,
      partner,
    );

    return {
      partnerId: partner.partnerId,
      paymentId: payment.payment_id,
      baseAmount,
      commissionRate: partner.commissionRate,
      commissionAmount,
      status: 'CALCULATED',
      createdAt: new Date().toISOString(),
    };
  }

  /**
   * Apply subscription tier modifiers to commission
   */
  private applyTierModifiers(
    baseCommission: number,
    subscriptionTier: string,
    partner: PartnerDto,
  ): number {
    // LE (Law Enforcement) tier gets higher commission rates
    if (subscriptionTier === 'LE') {
      const leMultiplier = partner.businessType === PartnerType.LAW_ENFORCEMENT ? 1.5 : 1.2;
      return Math.round(baseCommission * leMultiplier);
    }

    // L3 tier gets moderate bonus
    if (subscriptionTier === 'L3') {
      return Math.round(baseCommission * 1.1);
    }

    // L1 and L2 use base commission
    return baseCommission;
  }

  /**
   * Validate partner referral code
   */
  private async validatePartnerCode(code: string): Promise<{
    isValid: boolean;
    partnerId?: string;
    expirationDate?: string;
  }> {
    const partnerCode = await this.partnerCodeRepository.findByCode(code);
    
    if (!partnerCode || !partnerCode.isActive) {
      return { isValid: false };
    }

    // Check expiration
    if (partnerCode.expiresAt && new Date(partnerCode.expiresAt) < new Date()) {
      return { isValid: false };
    }

    // Check usage limits
    if (
      partnerCode.maxUses &&
      partnerCode.currentUses >= partnerCode.maxUses
    ) {
      return { isValid: false };
    }

    // Validate partner is active
    const partner = await this.partnerRepository.findById(partnerCode.partnerId);
    if (!partner || partner.status !== 'ACTIVE') {
      return { isValid: false };
    }

    return {
      isValid: true,
      partnerId: partnerCode.partnerId,
      expirationDate: partnerCode.expiresAt,
    };
  }

  /**
   * Find referral attribution for a user
   * In production, this would query a referral attribution table
   */
  private async findReferralAttribution(userEmail: string): Promise<ReferralAttribution | null> {
    // Mock implementation - in production this would query DynamoDB
    // For now, we'll simulate finding attribution for demo purposes
    
    // Check if user has partner_reffered flag set and partner_code
    // This would be stored when user registers with a partner code
    return null; // Placeholder - implement based on your data model
  }

  /**
   * Update partner referral statistics
   */
  private async updatePartnerReferralStats(
    partnerId: string,
    eventType: 'referral' | 'conversion',
  ): Promise<void> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) return;

    if (eventType === 'referral') {
      const updatedTotalReferrals = (partner.totalReferrals || 0) + 1;
      await this.partnerRepository.update(partnerId, {
        totalReferrals: updatedTotalReferrals,
      });
    } else if (eventType === 'conversion') {
      const updatedConversions = (partner.successfulConversions || 0) + 1;
      await this.partnerRepository.update(partnerId, {
        successfulConversions: updatedConversions,
      });
    }
  }

  /**
   * Get partner commission summary
   */
  async getPartnerCommissionSummary(
    partnerId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    partnerId: string;
    period: { start: string; end: string };
    totalReferrals: number;
    totalConversions: number;
    conversionRate: number;
    totalCommissionEarned: number;
    pendingCommissions: number;
    paidCommissions: number;
    averageCommissionPerConversion: number;
  }> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const period = {
      start: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      end: endDate || new Date().toISOString(),
    };

    // In production, these would be calculated from actual commission records
    const totalReferrals = partner.totalReferrals || 0;
    const totalConversions = partner.successfulConversions || 0;
    const totalCommissionEarned = partner.totalCommissionEarned || 0;

    return {
      partnerId,
      period,
      totalReferrals,
      totalConversions,
      conversionRate: totalReferrals > 0 ? (totalConversions / totalReferrals) * 100 : 0,
      totalCommissionEarned,
      pendingCommissions: Math.round(totalCommissionEarned * 0.3), // Mock calculation
      paidCommissions: Math.round(totalCommissionEarned * 0.7), // Mock calculation
      averageCommissionPerConversion: totalConversions > 0 ? Math.round(totalCommissionEarned / totalConversions) : 0,
    };
  }

  /**
   * Generate partner commission report
   */
  async generateCommissionReport(
    partnerId: string,
    startDate: string,
    endDate: string,
  ): Promise<{
    partner: PartnerDto;
    period: { start: string; end: string };
    summary: any;
    transactions: Array<{
      date: string;
      type: 'referral' | 'conversion' | 'commission_payment';
      userEmail?: string;
      paymentId?: string;
      amount?: number;
      status: string;
    }>;
  }> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    const summary = await this.getPartnerCommissionSummary(
      partnerId,
      startDate,
      endDate,
    );

    // Mock transaction history - in production this would query commission records
    const transactions = [
      {
        date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'referral' as const,
        userEmail: 'user1@example.com',
        status: 'attributed',
      },
      {
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        type: 'conversion' as const,
        userEmail: 'user1@example.com',
        paymentId: 'payment_123',
        amount: 150,
        status: 'converted',
      },
    ];

    return {
      partner,
      period: summary.period,
      summary,
      transactions,
    };
  }

  /**
   * Process commission payment to partner
   */
  async processCommissionPayment(
    partnerId: string,
    amount: number,
    paymentMethod: 'BANK_TRANSFER' | 'PAYPAL' | 'CHECK',
    notes?: string,
  ): Promise<{
    success: boolean;
    paymentId: string;
    message: string;
  }> {
    const partner = await this.partnerRepository.findById(partnerId);
    if (!partner) {
      throw new NotFoundException('Partner not found');
    }

    // Generate payment ID
    const paymentId = `comm_${Date.now()}_${partnerId.substring(0, 8)}`;

    // In production, integrate with payment processor
    // For now, we'll simulate the payment

    this.logger.log('Processing commission payment', {
      partnerId,
      amount,
      paymentMethod,
      paymentId,
    });

    // Update partner's total commission paid
    const updatedCommissionPaid = (partner.totalCommissionPaid || 0) + amount;
    await this.partnerRepository.update(partnerId, {
      totalCommissionPaid: updatedCommissionPaid,
    });

    return {
      success: true,
      paymentId,
      message: `Commission payment of $${amount} processed successfully via ${paymentMethod}`,
    };
  }
}
