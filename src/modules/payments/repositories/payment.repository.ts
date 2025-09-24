import { Injectable } from '@nestjs/common';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { Payment, PaymentStatus } from '../interfaces';
import { CreatePaymentDto } from '../dto';

@Injectable()
export class PaymentRepository {
  constructor(private readonly dynamodbService: DynamoDbService) {}

  async create(paymentData: CreatePaymentDto): Promise<Payment> {
    const payment: Payment = {
      payment_id: this.generatePaymentId(),
      sub_level: paymentData.sub_level,
      client_name: paymentData.client_name,
      user_email: paymentData.user_email,
      partner_code: paymentData.partner_code,
      amount: paymentData.amount,
      tax_amount: this.calculateTaxAmount(paymentData.amount),
      total_amount:
        paymentData.amount + this.calculateTaxAmount(paymentData.amount),
      payment_method: paymentData.payment_method,
      payment_status: PaymentStatus.PENDING,
      payment_date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    await this.dynamodbService.putItem(payment, 'Payments');
    return payment;
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const result = await this.dynamodbService.getItem(
      { payment_id: paymentId },
      'Payments',
    );
    return result as Payment | null;
  }

  async findByClientName(clientName: string): Promise<Payment[]> {
    const params = {
      filterExpression: 'client_name = :clientName',
      expressionAttributeValues: {
        ':clientName': clientName,
      },
    };

    const results = await this.dynamodbService.scanItems('Payments', params);
    return results as Payment[];
  }

  async findByUserEmail(userEmail: string): Promise<Payment[]> {
    const params = {
      filterExpression: 'user_email = :userEmail',
      expressionAttributeValues: {
        ':userEmail': userEmail,
      },
    };

    const results = await this.dynamodbService.scanItems('Payments', params);
    return results as Payment[];
  }

  async findByStatus(status: PaymentStatus): Promise<Payment[]> {
    const params = {
      filterExpression: 'payment_status = :status',
      expressionAttributeValues: {
        ':status': status,
      },
    };

    const results = await this.dynamodbService.scanItems('Payments', params);
    return results as Payment[];
  }

  async updatePaymentStatus(
    paymentId: string,
    status: PaymentStatus,
    stripePaymentIntentId?: string,
  ): Promise<void> {
    const existing = await this.findById(paymentId);
    if (existing) {
      const updated = {
        ...existing,
        payment_status: status,
        stripe_payment_intent_id:
          stripePaymentIntentId || existing.stripe_payment_intent_id,
        updatedAt: new Date().toISOString(),
        version: (existing.version || 0) + 1,
      };
      await this.dynamodbService.putItem(updated, 'Payments');
    }
  }

  async findPendingPayments(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.PENDING);
  }

  async findSuccessfulPayments(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.PAID);
  }

  async findFailedPayments(): Promise<Payment[]> {
    return this.findByStatus(PaymentStatus.FAILED);
  }

  async getPaymentSummary(): Promise<{
    total_payments: number;
    total_revenue: number;
    successful_payments: number;
    failed_payments: number;
    pending_payments: number;
  }> {
    const allPayments = await this.dynamodbService.scanItems('Payments', {});
    const payments = allPayments as Payment[];

    const successful = payments.filter(
      (p) => p.payment_status === PaymentStatus.PAID,
    );
    const failed = payments.filter(
      (p) => p.payment_status === PaymentStatus.FAILED,
    );
    const pending = payments.filter(
      (p) => p.payment_status === PaymentStatus.PENDING,
    );

    return {
      total_payments: payments.length,
      total_revenue: successful.reduce((sum, p) => sum + p.total_amount, 0),
      successful_payments: successful.length,
      failed_payments: failed.length,
      pending_payments: pending.length,
    };
  }

  async deletePayment(paymentId: string): Promise<void> {
    const key = { payment_id: paymentId };
    await this.dynamodbService.deleteItem(key, 'Payments');
  }

  private generatePaymentId(): string {
    return `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateTaxAmount(amount: number): number {
    // Calculate 8.5% tax
    return Math.round(amount * 0.085);
  }
}
