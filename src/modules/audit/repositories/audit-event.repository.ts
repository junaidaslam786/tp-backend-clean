import { Injectable } from '@nestjs/common';

export interface AuditEvent {
  pk: string; // AUDIT#{entityType}#{entityId}
  sk: string; // EVENT#{timestamp}#{eventId}
  type: string; // "AUDIT_EVENT"
  eventId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  actorUserId?: string;
  actorType: string;
  actorIp?: string;
  action: string;
  resource: string;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  changes?: any[];
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  riskLevel: string;
  sensitiveData: boolean;
  timestamp: string;
  timezone: string;
  source: string;
}

@Injectable()
export class AuditEventRepository {
  /**
   * Write audit event (stub)
   */
  async write(event: Partial<AuditEvent>): Promise<void> {
    // TODO: Implement audit event write (stub)
    throw new Error('Audit event write not yet implemented');
  }

  /**
   * List audit events for entity
   */
  async listByEntity(entityType: string, entityId: string): Promise<AuditEvent[]> {
    // TODO: Implement query by PK
    throw new Error('Audit event list not yet implemented');
  }
}
