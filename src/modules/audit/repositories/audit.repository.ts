import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/repositories/base.repository';
import { DynamoDbService } from '../../../core/database/dynamodb.service';

export interface AuditEvent {
  id?: string;
  action: string;
  type: string;
  user_id: string;
  organization_id?: string;
  resource_id?: string;
  details: any;
  timestamp: string;
  ip_address?: string;
  user_agent?: string;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class AuditRepository extends BaseRepository<AuditEvent> {
  constructor(dynamoDbService: DynamoDbService) {
    super(dynamoDbService, 'audit_events');
  }

  async logEvent(eventData: Omit<AuditEvent, 'id' | 'createdAt' | 'updatedAt'>): Promise<AuditEvent> {
    const event: AuditEvent = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...eventData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(event);
  }

  async getEventsByUser(
    userId: string,
    limit: number = 50,
    startDate?: string,
    endDate?: string,
  ): Promise<AuditEvent[]> {
    let filterExpression = 'user_id = :userId';
    const expressionValues: any = { ':userId': userId };

    if (startDate && endDate) {
      filterExpression += ' AND #timestamp BETWEEN :startDate AND :endDate';
      expressionValues[':startDate'] = startDate;
      expressionValues[':endDate'] = endDate;
    }

    return this.dynamoDbService.scanItems(this.tableName, {
      filterExpression,
      expressionAttributeValues: expressionValues,
      expressionAttributeNames: { '#timestamp': 'timestamp' },
      limit,
    }) as Promise<AuditEvent[]>;
  }

  async getEventsByOrganization(
    organizationId: string,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    return this.dynamoDbService.scanItems(this.tableName, {
      filterExpression: 'organization_id = :orgId',
      expressionAttributeValues: { ':orgId': organizationId },
      limit,
    }) as Promise<AuditEvent[]>;
  }

  async getEventsByType(
    type: string,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    return this.dynamoDbService.scanItems(this.tableName, {
      filterExpression: '#type = :type',
      expressionAttributeValues: { ':type': type },
      expressionAttributeNames: { '#type': 'type' },
      limit,
    }) as Promise<AuditEvent[]>;
  }
}
