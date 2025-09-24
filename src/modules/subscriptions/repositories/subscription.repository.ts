import { Injectable } from '@nestjs/common';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { ClientSubs, SubLevel, PaymentStatus } from '../interfaces';
import { CreateSubscriptionDto } from '../dto';

@Injectable()
export class SubscriptionRepository {
  constructor(private readonly dynamodbService: DynamoDbService) {}

  async create(subscriptionData: CreateSubscriptionDto): Promise<ClientSubs> {
    const subscription = {
      client_name: subscriptionData.client_name,
      sub_level: subscriptionData.sub_level,
      run_number: 0,
      progress: 'created',
      payment_status: PaymentStatus.PENDING,
      sub_type: subscriptionData.sub_type,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };

    await this.dynamodbService.createClientSubscription(subscription);
    return subscription as ClientSubs;
  }

  async findByClientName(clientName: string): Promise<ClientSubs | null> {
    const result = await this.dynamodbService.getClientSubscription(
      clientName,
      'ACTIVE',
    );
    return result as ClientSubs | null;
  }

  async findBySubLevel(subLevel: SubLevel): Promise<ClientSubs[]> {
    // Using scanItems method from the service
    const params = {
      filterExpression: 'sub_level = :subLevel',
      expressionAttributeValues: {
        ':subLevel': subLevel,
      },
    };
    
    const results = await this.dynamodbService.scanItems('ClientSubs', params);
    return results as ClientSubs[];
  }

  async updateProgress(clientName: string, progress: string): Promise<void> {
    // Since the service doesn't have a generic update method,
    // we'll use the putItem method to update the record
    const existing = await this.findByClientName(clientName);
    if (existing) {
      const updated = {
        ...existing,
        progress,
        updatedAt: new Date().toISOString(),
        version: (existing.version || 0) + 1,
      };
      await this.dynamodbService.putItem(updated, 'ClientSubs');
    }
  }

  async updatePaymentStatus(
    clientName: string,
    paymentStatus: PaymentStatus,
  ): Promise<void> {
    const existing = await this.findByClientName(clientName);
    if (existing) {
      const updated = {
        ...existing,
        payment_status: paymentStatus,
        updatedAt: new Date().toISOString(),
        version: (existing.version || 0) + 1,
      };
      await this.dynamodbService.putItem(updated, 'ClientSubs');
    }
  }

  async incrementRunNumber(clientName: string): Promise<void> {
    const existing = await this.findByClientName(clientName);
    if (existing) {
      const updated = {
        ...existing,
        run_number: existing.run_number + 1,
        updatedAt: new Date().toISOString(),
        version: (existing.version || 0) + 1,
      };
      await this.dynamodbService.putItem(updated, 'ClientSubs');
    }
  }

  async findActiveSubscriptions(): Promise<ClientSubs[]> {
    const params = {
      filterExpression: 'payment_status = :status',
      expressionAttributeValues: {
        ':status': PaymentStatus.PAID,
      },
    };
    
    const results = await this.dynamodbService.scanItems('ClientSubs', params);
    return results as ClientSubs[];
  }

  async delete(clientName: string): Promise<void> {
    const key = { client_name: clientName, subscription_status: 'ACTIVE' };
    await this.dynamodbService.deleteItem(key, 'ClientSubs');
  }
}
