import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/repositories/base.repository';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import {
  PendingJoins,
  JoinRequestStatus,
} from '../interfaces/pending-joins.interface';
import { CreateJoinRequestDto } from '../dto/organization.dto';

@Injectable()
export class PendingJoinsRepository extends BaseRepository<PendingJoins> {
  constructor(dynamoDbService: DynamoDbService) {
    super(dynamoDbService, 'pending_joins');
  }

  async createJoinRequest(
    requestData: CreateJoinRequestDto,
  ): Promise<PendingJoins> {
    const joinRequest: PendingJoins = {
      join_id: this.generateJoinId(),
      requesting_user_email: requestData.requesting_user_email,
      organization_name: requestData.organization_name,
      org_domain: requestData.org_domain,
      request_date: new Date().toISOString(),
      status: JoinRequestStatus.PENDING,
      requester_details: {
        full_name: requestData.full_name,
        role_requested: requestData.role_requested,
        justification: requestData.justification,
        department: requestData.department,
        title: requestData.title,
      },
      organization_details: {
        client_name: '', // Will be populated by service layer
        organization_name: requestData.organization_name,
        org_domain: requestData.org_domain,
        industry_sector: '', // Will be populated by service layer
        current_admin_count: 0, // Will be populated by service layer
      },
      expiry_date: this.getExpiryDate(),
      notification_sent: false,
      follow_up_count: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(joinRequest);
  }

  async findByJoinId(joinId: string): Promise<PendingJoins | null> {
    return this.findByKey({ join_id: joinId });
  }

  async findByRequestingUser(userEmail: string): Promise<PendingJoins[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'requesting_user_email = :userEmail',
        { ':userEmail': userEmail },
        this.tableName,
        { indexName: 'RequestingUserIndex' },
      );

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding join requests by user:', error);
      throw error;
    }
  }

  async findByOrganization(organization: string): Promise<PendingJoins[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'organization_name = :organization',
        { ':organization': organization },
        this.tableName,
        { indexName: 'OrganizationIndex' },
      );

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding join requests by organization:', error);
      throw error;
    }
  }

  async findByStatus(status: JoinRequestStatus): Promise<PendingJoins[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        '#status = :status',
        { ':status': status },
        this.tableName,
        {
          indexName: 'StatusIndex',
          expressionAttributeNames: { '#status': 'status' },
        },
      );

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding join requests by status:', error);
      throw error;
    }
  }

  async findPendingRequestsForUser(
    userEmail: string,
    organization?: string,
  ): Promise<PendingJoins[]> {
    try {
      let filterExpression =
        'requesting_user_email = :userEmail AND #status = :status';
      const expressionAttributeValues: any = {
        ':userEmail': userEmail,
        ':status': JoinRequestStatus.PENDING,
      };
      const expressionAttributeNames: any = { '#status': 'status' };

      if (organization) {
        filterExpression += ' AND organization_name = :organization';
        expressionAttributeValues[':organization'] = organization;
      }

      const result = await this.dynamoDbService.scanItems(this.tableName, {
        filterExpression,
        expressionAttributeValues,
        expressionAttributeNames,
      });

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding pending requests for user:', error);
      throw error;
    }
  }

  async findPendingRequestsForOrganization(
    organization: string,
  ): Promise<PendingJoins[]> {
    try {
      const result = await this.dynamoDbService.scanItems(this.tableName, {
        filterExpression: 'organization_name = :organization AND #status = :status',
        expressionAttributeValues: {
          ':organization': organization,
          ':status': JoinRequestStatus.PENDING,
        },
        expressionAttributeNames: { '#status': 'status' },
      });

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding pending requests for organization:', error);
      throw error;
    }
  }

  async approveJoinRequest(
    joinId: string,
    approvedBy: string,
    notes?: string,
  ): Promise<PendingJoins> {
    const updates: Partial<PendingJoins> = {
      status: JoinRequestStatus.APPROVED,
      approval_details: {
        approved_by: approvedBy,
        approval_date: new Date().toISOString(),
        approval_notes: notes,
      },
    };

    return this.update({ join_id: joinId }, updates);
  }

  async rejectJoinRequest(
    joinId: string,
    rejectedBy: string,
    notes?: string,
  ): Promise<PendingJoins> {
    const updates: Partial<PendingJoins> = {
      status: JoinRequestStatus.REJECTED,
      approval_details: {
        approved_by: rejectedBy,
        approval_date: new Date().toISOString(),
        approval_notes: notes,
      },
    };

    return this.update({ join_id: joinId }, updates);
  }

  async expireJoinRequest(joinId: string): Promise<PendingJoins> {
    return this.update(
      { join_id: joinId },
      {
        status: JoinRequestStatus.EXPIRED,
      },
    );
  }

  async withdrawJoinRequest(joinId: string): Promise<PendingJoins> {
    return this.update(
      { join_id: joinId },
      {
        status: JoinRequestStatus.WITHDRAWN,
      },
    );
  }

  async updateJoinRequest(
    joinId: string,
    updates: Partial<{
      justification: string;
      role_requested: string;
      department: string;
      title: string;
    }>,
  ): Promise<PendingJoins> {
    const current = await this.findByJoinId(joinId);
    if (!current) {
      throw new Error('Join request not found');
    }

    const updatedDetails = {
      ...current.requester_details,
      ...updates,
    };

    return this.update(
      { join_id: joinId },
      { requester_details: updatedDetails },
    );
  }

  async getExpiredRequests(): Promise<PendingJoins[]> {
    try {
      const now = new Date().toISOString();

      const result = await this.dynamoDbService.scanItems(this.tableName, {
        filterExpression: '#status = :status AND expiry_date < :now',
        expressionAttributeValues: {
          ':status': JoinRequestStatus.PENDING,
          ':now': now,
        },
        expressionAttributeNames: { '#status': 'status' },
      });

      return result as PendingJoins[];
    } catch (error) {
      console.error('Error finding expired requests:', error);
      throw error;
    }
  }

  async bulkExpireRequests(joinIds: string[]): Promise<void> {
    try {
      const updatePromises = joinIds.map((joinId) =>
        this.expireJoinRequest(joinId),
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error bulk expiring requests:', error);
      throw error;
    }
  }

  async incrementFollowUpCount(joinId: string): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { join_id: joinId },
        'SET follow_up_count = follow_up_count + :inc',
        { ':inc': 1 },
        this.tableName,
      );
    } catch (error) {
      console.error('Error incrementing follow-up count:', error);
      throw error;
    }
  }

  async markNotificationSent(joinId: string): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { join_id: joinId },
        'SET notification_sent = :sent',
        { ':sent': true },
        this.tableName,
      );
    } catch (error) {
      console.error('Error marking notification sent:', error);
      throw error;
    }
  }

  async getJoinRequestStats(): Promise<{
    total: number;
    by_status: Record<JoinRequestStatus, number>;
    by_organization: Record<string, number>;
    average_processing_time_hours: number;
    pending_older_than_7_days: number;
  }> {
    try {
      const result = await this.dynamoDbService.scanItems(this.tableName);
      const requests = result as PendingJoins[];

      const stats = {
        total: requests.length,
        by_status: {} as Record<JoinRequestStatus, number>,
        by_organization: {} as Record<string, number>,
        average_processing_time_hours: 0,
        pending_older_than_7_days: 0,
      };

      // Initialize status counters
      Object.values(JoinRequestStatus).forEach((status) => {
        stats.by_status[status] = 0;
      });

      let totalProcessingTime = 0;
      let processedCount = 0;
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      requests.forEach((request) => {
        // Count by status
        stats.by_status[request.status] = (stats.by_status[request.status] || 0) + 1;

        // Count by organization
        stats.by_organization[request.organization_name] =
          (stats.by_organization[request.organization_name] || 0) + 1;

        // Calculate processing time for approved/rejected requests
        if (request.approval_details?.approval_date) {
          const createdTime = new Date(request.request_date).getTime();
          const processedTime = new Date(request.approval_details.approval_date).getTime();
          totalProcessingTime += processedTime - createdTime;
          processedCount++;
        }

        // Count pending requests older than 7 days
        if (
          request.status === JoinRequestStatus.PENDING &&
          new Date(request.request_date) < sevenDaysAgo
        ) {
          stats.pending_older_than_7_days++;
        }
      });

      stats.average_processing_time_hours =
        processedCount > 0
          ? totalProcessingTime / (processedCount * 1000 * 60 * 60)
          : 0;

      return stats;
    } catch (error) {
      console.error('Error getting join request stats:', error);
      throw error;
    }
  }

  async deleteJoinRequest(joinId: string): Promise<void> {
    await this.delete({ join_id: joinId });
  }

  async hasExistingPendingRequest(
    userEmail: string,
    organization: string,
  ): Promise<boolean> {
    try {
      const pendingRequests = await this.findPendingRequestsForUser(
        userEmail,
        organization,
      );
      return pendingRequests.length > 0;
    } catch (error) {
      console.error('Error checking existing pending request:', error);
      return false;
    }
  }

  private generateJoinId(): string {
    const timestamp = Date.now().toString(36);
    const randomStr = Math.random().toString(36).substring(2, 8);
    return `join-${timestamp}-${randomStr}`;
  }

  private getExpiryDate(): string {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days from now
    return expiryDate.toISOString();
  }
}