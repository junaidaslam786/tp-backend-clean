import { Injectable } from '@nestjs/common';
import { AdminDashboardDto } from '../dto/admin-dashboard.dto';
import { DynamoDbService } from '../../../core/database/dynamodb.service';

@Injectable()
export class AdminRepository {
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  async getDashboardMetrics(): Promise<AdminDashboardDto> {
    // Count users: type = 'USER'
    const users = await this.dynamoDbService.queryItems(
      'type = :type',
      { ':type': 'USER' },
      'GSI1',
    );
    // Count organizations: type = 'ORGANIZATION'
    const orgs = await this.dynamoDbService.queryItems(
      'type = :type',
      { ':type': 'ORGANIZATION' },
      'GSI1',
    );
    // Count active subscriptions: type = 'SUBSCRIPTION', status = 'ACTIVE'
    const activeSubs = await this.dynamoDbService.queryItems(
      'type = :type AND #status = :status',
      { ':type': 'SUBSCRIPTION', ':status': 'ACTIVE' },
      'users', // table name
      { 
        indexName: 'GSI1',
        expressionAttributeNames: { '#status': 'status' },
      },
    );
    // Count assessments: type = 'COMPLIANCE_ASSESSMENT'
    const assessments = await this.dynamoDbService.queryItems(
      'type = :type',
      { ':type': 'COMPLIANCE_ASSESSMENT' },
      'GSI1',
    );
    // Recent activity: last 10 items from type = 'AUDIT_EVENT' (by createdAt desc)
    const recent = await this.dynamoDbService.queryItems(
      'type = :type',
      { ':type': 'AUDIT_EVENT' },
      'users', // table name
      { 
        indexName: 'GSI1',
        limit: 10,
        scanIndexForward: false,
      },
    );
    return {
      totalUsers: users.length,
      totalOrganizations: orgs.length,
      activeSubscriptions: activeSubs.length,
      totalAssessments: assessments.length,
      recentActivity: recent.map(
        (item) => item.action || item.eventType || 'activity',
      ),
    };
  }
}
