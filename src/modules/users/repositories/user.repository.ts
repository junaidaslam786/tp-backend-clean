import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/repositories/base.repository';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { User, UserRole, UserStatus } from '../interfaces/user.interface';
import { CreateUserDto, UpdateUserDto } from '../dto/user.dto';

// Re-export User interface for external use
export { User } from '../interfaces/user.interface';

@Injectable()
export class UserRepository extends BaseRepository<User> {
  constructor(dynamoDbService: DynamoDbService) {
    super(dynamoDbService, 'users');
  }

  async createUser(userData: CreateUserDto): Promise<User> {
    const user: User = {
      email: userData.email,
      name: userData.full_name,
      role: userData.role || UserRole.VIEWER,
      status: UserStatus.PENDING_APPROVAL,
      partner_reffered: !!userData.partner_referral_code,
      partner_code: userData.partner_referral_code,
      organizations: [userData.organization_name],
      phone: userData.phone_number,
      is_mfa_enabled: false,
      preferences: {
        notifications_email: true,
        notifications_sms: false,
        theme: 'light',
        timezone: 'UTC',
        language: 'en',
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.findByKey({ email });
  }

  async findByOrganization(organizationName: string): Promise<User[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'organization_name = :org',
        { ':org': organizationName },
        this.tableName,
        { indexName: 'OrganizationIndex' },
      );

      return result as User[];
    } catch (error) {
      console.error('Error finding users by organization:', error);
      throw error;
    }
  }

  async findByRole(role: UserRole): Promise<User[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        '#role = :role',
        { ':role': role },
        this.tableName,
        {
          indexName: 'RoleIndex',
          expressionAttributeNames: { '#role': 'role' },
        },
      );

      return result as User[];
    } catch (error) {
      console.error('Error finding users by role:', error);
      throw error;
    }
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
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

      return result as User[];
    } catch (error) {
      console.error('Error finding users by status:', error);
      throw error;
    }
  }

  async findByOrganizationAndRole(
    organizationName: string,
    role: UserRole,
  ): Promise<User[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'organization_name = :org',
        { ':org': organizationName },
        this.tableName,
        {
          indexName: 'OrganizationIndex',
          filterExpression: '#role = :role',
          expressionAttributeNames: { '#role': 'role' },
          expressionAttributeValues: { ':role': role },
        },
      );

      return result as User[];
    } catch (error) {
      console.error('Error finding users by organization and role:', error);
      throw error;
    }
  }

  async getOrganizationAdmins(organizationName: string): Promise<User[]> {
    return this.findByOrganizationAndRole(organizationName, UserRole.ADMIN);
  }

  async getOrganizationViewers(organizationName: string): Promise<User[]> {
    return this.findByOrganizationAndRole(organizationName, UserRole.VIEWER);
  }

  async updateUser(email: string, updateData: UpdateUserDto | any): Promise<User> {
    const updates: Partial<User> = {};

    if (updateData.full_name !== undefined) {
      updates.name = updateData.full_name;
    }

    if (updateData.phone_number !== undefined) {
      updates.phone = updateData.phone_number;
    }

    if (updateData.role !== undefined) {
      updates.role = updateData.role;
    }

    if (updateData.status !== undefined) {
      updates.status = updateData.status;
    }

    if (updateData.upgraded_to_le_at !== undefined) {
      updates.upgraded_to_le_at = updateData.upgraded_to_le_at;
    }

    if (updateData.preferences !== undefined) {
      updates.preferences = {
        notifications_email:
          updateData.preferences.notifications?.email_reports ?? true,
        notifications_sms:
          updateData.preferences.notifications?.security_alerts ?? false,
        theme:
          (updateData.preferences.dashboard?.default_view as
            | 'light'
            | 'dark') ?? 'light',
        timezone: updateData.preferences.locale?.timezone ?? 'UTC',
        language: updateData.preferences.locale?.language ?? 'en',
      };
    }

    return this.update({ email }, updates);
  }

  async verifyUserEmail(email: string): Promise<User> {
    return this.updateUser(email, {
      status: UserStatus.ACTIVE,
    });
  }

  async suspendUser(email: string): Promise<User> {
    return this.updateUser(email, {
      status: UserStatus.SUSPENDED,
    });
  }

  async activateUser(email: string): Promise<User> {
    return this.updateUser(email, {
      status: UserStatus.ACTIVE,
    });
  }

  async changeUserRole(email: string, newRole: UserRole): Promise<User> {
    return this.updateUser(email, {
      role: newRole,
    });
  }

  async updateLastLogin(email: string): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { email },
        'SET last_login_at = :last_login, login_count = if_not_exists(login_count, :zero) + :inc',
        {
          ':last_login': new Date().toISOString(),
          ':inc': 1,
          ':zero': 0,
        },
        this.tableName,
      );
    } catch (error) {
      console.error('Error updating last login:', error);
      throw error;
    }
  }

  async searchUsers(filters: {
    search_term?: string;
    role?: UserRole;
    status?: UserStatus;
    organization?: string;
  }): Promise<User[]> {
    try {
      const filterExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (filters.search_term) {
        filterExpressions.push(
          '(contains(#name, :search) OR contains(email, :search))',
        );
        expressionAttributeValues[':search'] = filters.search_term;
        expressionAttributeNames['#name'] = 'name';
      }

      if (filters.role) {
        filterExpressions.push('#role = :role');
        expressionAttributeNames['#role'] = 'role';
        expressionAttributeValues[':role'] = filters.role;
      }

      if (filters.status) {
        filterExpressions.push('#status = :status');
        expressionAttributeNames['#status'] = 'status';
        expressionAttributeValues[':status'] = filters.status;
      }

      if (filters.organization) {
        filterExpressions.push('contains(organizations, :org)');
        expressionAttributeValues[':org'] = filters.organization;
      }

      const result = await this.dynamoDbService.scanItems(this.tableName, {
        filterExpression:
          filterExpressions.length > 0
            ? filterExpressions.join(' AND ')
            : undefined,
        expressionAttributeValues:
          Object.keys(expressionAttributeValues).length > 0
            ? expressionAttributeValues
            : undefined,
        expressionAttributeNames:
          Object.keys(expressionAttributeNames).length > 0
            ? expressionAttributeNames
            : undefined,
      });

      return result as User[];
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  }

  async getUserStats(): Promise<{
    total: number;
    by_role: Record<UserRole, number>;
    by_status: Record<UserStatus, number>;
    by_organization: Record<string, number>;
  }> {
    try {
      const result = await this.dynamoDbService.scanItems(this.tableName);
      const users = result as User[];

      const stats = {
        total: users.length,
        by_role: {} as Record<UserRole, number>,
        by_status: {} as Record<UserStatus, number>,
        by_organization: {} as Record<string, number>,
      };

      // Initialize counters
      Object.values(UserRole).forEach((role) => {
        stats.by_role[role] = 0;
      });
      Object.values(UserStatus).forEach((status) => {
        stats.by_status[status] = 0;
      });

      users.forEach((user) => {
        // Count by role
        stats.by_role[user.role] = (stats.by_role[user.role] || 0) + 1;

        // Count by status
        stats.by_status[user.status] = (stats.by_status[user.status] || 0) + 1;

        // Count by organization
        user.organizations.forEach((org) => {
          stats.by_organization[org] = (stats.by_organization[org] || 0) + 1;
        });
      });

      return stats;
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async deleteUser(email: string): Promise<void> {
    await this.delete({ email });
  }

  async addUserToOrganization(
    email: string,
    organizationName: string,
  ): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    if (!user.organizations.includes(organizationName)) {
      const updatedOrganizations = [...user.organizations, organizationName];
      return this.update({ email }, { organizations: updatedOrganizations });
    }

    return user;
  }

  async removeUserFromOrganization(
    email: string,
    organizationName: string,
  ): Promise<User> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    const updatedOrganizations = user.organizations.filter(
      (org) => org !== organizationName,
    );
    return this.update({ email }, { organizations: updatedOrganizations });
  }
}
