import { Injectable, Logger } from '@nestjs/common';
import { DynamoDbService } from '../dynamodb.service';
import { AuditAction, AuditType } from '../../../common/enums/audit.enum';

export interface AuditEvent {
  id: string;
  action: AuditAction;
  type: AuditType;
  userId?: string;
  organizationId?: string;
  details: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditRepository {
  private readonly logger = new Logger(AuditRepository.name);

  constructor(private readonly dynamoDbService: DynamoDbService) {}

  /**
   * Log an audit event
   */
  async logEvent(
    action: AuditAction,
    type: AuditType,
    details: Record<string, any>,
    userId?: string,
    organizationId?: string,
  ): Promise<void> {
    const event: AuditEvent = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      action,
      type,
      userId,
      organizationId,
      details,
      timestamp: new Date().toISOString(),
    };

    try {
      const item = {
        pk: `AUDIT#${event.timestamp.split('T')[0]}`, // Date-based partitioning
        sk: `EVENT#${event.id}`,
        ...event,
      };

      await this.dynamoDbService.putItem(item, 'users'); // Using users table for audit events
      
      this.logger.log('Audit event logged successfully', {
        action,
        type,
        userId,
        organizationId,
      });
    } catch (error) {
      this.logger.error('Failed to log audit event', error);
      // Don't throw error to prevent audit logging from breaking business logic
    }
  }

  /**
   * Get audit events for a user
   */
  async getEventsForUser(
    userId: string,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    try {
      // Mock implementation - in real scenario would query by userId GSI
      this.logger.log(`Mock: Getting audit events for user ${userId}`);
      return [];
    } catch (error) {
      this.logger.error('Failed to get audit events for user', error);
      return [];
    }
  }

  /**
   * Get audit events for an organization
   */
  async getEventsForOrganization(
    organizationId: string,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    try {
      // Mock implementation - in real scenario would query by organizationId GSI
      this.logger.log(`Mock: Getting audit events for organization ${organizationId}`);
      return [];
    } catch (error) {
      this.logger.error('Failed to get audit events for organization', error);
      return [];
    }
  }

  /**
   * Get audit events by action type
   */
  async getEventsByAction(
    action: AuditAction,
    limit: number = 50,
  ): Promise<AuditEvent[]> {
    try {
      // Mock implementation - in real scenario would query by action GSI
      this.logger.log(`Mock: Getting audit events for action ${action}`);
      return [];
    } catch (error) {
      this.logger.error('Failed to get audit events by action', error);
      return [];
    }
  }
}
