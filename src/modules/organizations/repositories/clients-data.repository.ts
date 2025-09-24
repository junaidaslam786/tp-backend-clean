import { Injectable } from '@nestjs/common';
import { BaseRepository } from '../../../core/database/repositories/base.repository';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import {
  ClientsData,
  OrganizationSize,
} from '../interfaces/clients-data.interface';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from '../dto/organization.dto';

@Injectable()
export class ClientsDataRepository extends BaseRepository<ClientsData> {
  constructor(dynamoDbService: DynamoDbService) {
    super(dynamoDbService, 'clients_data');
  }

  async createOrganization(
    orgData: CreateOrganizationDto,
  ): Promise<ClientsData> {
    const organization: ClientsData = {
      client_name: orgData.client_name,
      organization_name: orgData.organization_name,
      org_domain: orgData.org_domain,
      org_home_link: orgData.org_home_link,
      org_about_us_link: orgData.org_about_us_link,
      origin_country: orgData.origin_country,
      operating_countries: orgData.operating_countries,
      government: orgData.government,
      additional_context: orgData.additional_context,
      industry_sector: orgData.industry_sector,
      admins: orgData.admins,
      viewers: orgData.viewers || [],
      total_users: orgData.admins.length + (orgData.viewers?.length || 0),
      app_count: 0,
      company_size: orgData.company_size,
      annual_revenue: orgData.annual_revenue,
      description: orgData.description,
      website: orgData.website,
      phone: orgData.phone,
      address: orgData.address,
      compliance_frameworks: [],
      security_certifications: [],
      active_runs: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return this.create(organization);
  }

  async findByClientName(clientName: string): Promise<ClientsData[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'client_name = :clientName',
        { ':clientName': clientName },
        this.tableName,
      );

      return result as ClientsData[];
    } catch (error) {
      console.error('Error finding organizations by client name:', error);
      throw error;
    }
  }

  async findByDomain(domain: string): Promise<ClientsData[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'org_domain = :domain',
        { ':domain': domain },
        this.tableName,
        { indexName: 'DomainIndex' },
      );

      return result as ClientsData[];
    } catch (error) {
      console.error('Error finding organizations by domain:', error);
      throw error;
    }
  }

  async findByIndustry(industry: string): Promise<ClientsData[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'industry_sector = :industry',
        { ':industry': industry },
        this.tableName,
        { indexName: 'IndustryIndex' },
      );

      return result as ClientsData[];
    } catch (error) {
      console.error('Error finding organizations by industry:', error);
      throw error;
    }
  }

  async findByCountry(country: string): Promise<ClientsData[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'origin_country = :country',
        { ':country': country },
        this.tableName,
        { indexName: 'CountryIndex' },
      );

      return result as ClientsData[];
    } catch (error) {
      console.error('Error finding organizations by country:', error);
      throw error;
    }
  }

  async findBySize(size: OrganizationSize): Promise<ClientsData[]> {
    try {
      const result = await this.dynamoDbService.queryItems(
        'company_size = :size',
        { ':size': size },
        this.tableName,
        { indexName: 'SizeIndex' },
      );

      return result as ClientsData[];
    } catch (error) {
      console.error('Error finding organizations by size:', error);
      throw error;
    }
  }

  async findByClientAndOrganization(
    clientName: string,
    organizationName: string,
  ): Promise<ClientsData | null> {
    return this.findByKey({
      client_name: clientName,
      organization_name: organizationName,
    });
  }

  async updateOrganization(
    clientName: string,
    organizationName: string,
    updateData: UpdateOrganizationDto,
  ): Promise<ClientsData> {
    const updates: Partial<ClientsData> = {};

    if (updateData.organization_name !== undefined) {
      updates.organization_name = updateData.organization_name;
    }

    if (updateData.operating_countries !== undefined) {
      updates.operating_countries = updateData.operating_countries;
    }

    if (updateData.additional_context !== undefined) {
      updates.additional_context = updateData.additional_context;
    }

    if (updateData.org_home_link !== undefined) {
      updates.org_home_link = updateData.org_home_link;
    }

    if (updateData.org_about_us_link !== undefined) {
      updates.org_about_us_link = updateData.org_about_us_link;
    }

    if (updateData.admins !== undefined) {
      updates.admins = updateData.admins;
    }

    if (updateData.viewers !== undefined) {
      updates.viewers = updateData.viewers;
    }

    if (updateData.company_size !== undefined) {
      updates.company_size = updateData.company_size;
    }

    if (updateData.annual_revenue !== undefined) {
      updates.annual_revenue = updateData.annual_revenue;
    }

    if (updateData.description !== undefined) {
      updates.description = updateData.description;
    }

    if (updateData.website !== undefined) {
      updates.website = updateData.website;
    }

    if (updateData.phone !== undefined) {
      updates.phone = updateData.phone;
    }

    if (updateData.address !== undefined) {
      updates.address = updateData.address;
    }

    if (updateData.compliance_frameworks !== undefined) {
      updates.compliance_frameworks = updateData.compliance_frameworks;
    }

    if (updateData.security_certifications !== undefined) {
      updates.security_certifications = updateData.security_certifications;
    }

    // Update total users count if admins or viewers changed
    if (updateData.admins !== undefined || updateData.viewers !== undefined) {
      const current = await this.findByClientAndOrganization(
        clientName,
        organizationName,
      );
      if (current) {
        const adminCount = updateData.admins?.length ?? current.admins.length;
        const viewerCount =
          updateData.viewers?.length ?? current.viewers.length;
        updates.total_users = adminCount + viewerCount;
      }
    }

    return this.update(
      { client_name: clientName, organization_name: organizationName },
      updates,
    );
  }

  async addAdmin(
    clientName: string,
    organizationName: string,
    adminEmail: string,
  ): Promise<ClientsData> {
    const organization = await this.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!organization.admins.includes(adminEmail)) {
      const updatedAdmins = [...organization.admins, adminEmail];
      return this.update(
        { client_name: clientName, organization_name: organizationName },
        {
          admins: updatedAdmins,
          total_users: organization.total_users + 1,
        },
      );
    }

    return organization;
  }

  async removeAdmin(
    clientName: string,
    organizationName: string,
    adminEmail: string,
  ): Promise<ClientsData> {
    const organization = await this.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new Error('Organization not found');
    }

    if (organization.admins.length <= 1) {
      throw new Error('Cannot remove the last admin from organization');
    }

    const updatedAdmins = organization.admins.filter(
      (email) => email !== adminEmail,
    );
    return this.update(
      { client_name: clientName, organization_name: organizationName },
      {
        admins: updatedAdmins,
        total_users: organization.total_users - 1,
      },
    );
  }

  async addViewer(
    clientName: string,
    organizationName: string,
    viewerEmail: string,
  ): Promise<ClientsData> {
    const organization = await this.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new Error('Organization not found');
    }

    if (!organization.viewers.includes(viewerEmail)) {
      const updatedViewers = [...organization.viewers, viewerEmail];
      return this.update(
        { client_name: clientName, organization_name: organizationName },
        {
          viewers: updatedViewers,
          total_users: organization.total_users + 1,
        },
      );
    }

    return organization;
  }

  async removeViewer(
    clientName: string,
    organizationName: string,
    viewerEmail: string,
  ): Promise<ClientsData> {
    const organization = await this.findByClientAndOrganization(
      clientName,
      organizationName,
    );
    if (!organization) {
      throw new Error('Organization not found');
    }

    const updatedViewers = organization.viewers.filter(
      (email) => email !== viewerEmail,
    );
    return this.update(
      { client_name: clientName, organization_name: organizationName },
      {
        viewers: updatedViewers,
        total_users: organization.total_users - 1,
      },
    );
  }

  async incrementAppCount(
    clientName: string,
    organizationName: string,
  ): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { client_name: clientName, organization_name: organizationName },
        'SET app_count = app_count + :inc',
        { ':inc': 1 },
        this.tableName,
      );
    } catch (error) {
      console.error('Error incrementing app count:', error);
      throw error;
    }
  }

  async decrementAppCount(
    clientName: string,
    organizationName: string,
  ): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { client_name: clientName, organization_name: organizationName },
        'SET app_count = if_not_exists(app_count, :zero) - :dec',
        { ':dec': 1, ':zero': 0 },
        this.tableName,
      );
    } catch (error) {
      console.error('Error decrementing app count:', error);
      throw error;
    }
  }

  async updateRiskScore(
    clientName: string,
    organizationName: string,
    riskScore: number,
  ): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { client_name: clientName, organization_name: organizationName },
        'SET risk_score = :score, last_assessment_date = :date',
        {
          ':score': riskScore,
          ':date': new Date().toISOString(),
        },
        this.tableName,
      );
    } catch (error) {
      console.error('Error updating risk score:', error);
      throw error;
    }
  }

  async updateMaturityScore(
    clientName: string,
    organizationName: string,
    maturityScore: number,
  ): Promise<void> {
    try {
      await this.dynamoDbService.updateItem(
        { client_name: clientName, organization_name: organizationName },
        'SET maturity_score = :score',
        { ':score': maturityScore },
        this.tableName,
      );
    } catch (error) {
      console.error('Error updating maturity score:', error);
      throw error;
    }
  }

  async searchOrganizations(filters: {
    search_term?: string;
    industry_sector?: string;
    size?: OrganizationSize;
    country?: string;
    domain?: string;
  }): Promise<ClientsData[]> {
    try {
      const filterExpressions: string[] = [];
      const expressionAttributeValues: Record<string, any> = {};
      const expressionAttributeNames: Record<string, string> = {};

      if (filters.search_term) {
        filterExpressions.push(
          '(contains(organization_name, :search) OR contains(client_name, :search))',
        );
        expressionAttributeValues[':search'] = filters.search_term;
      }

      if (filters.industry_sector) {
        filterExpressions.push('industry_sector = :industry');
        expressionAttributeValues[':industry'] = filters.industry_sector;
      }

      if (filters.size) {
        filterExpressions.push('company_size = :size');
        expressionAttributeValues[':size'] = filters.size;
      }

      if (filters.country) {
        filterExpressions.push('origin_country = :country');
        expressionAttributeValues[':country'] = filters.country;
      }

      if (filters.domain) {
        filterExpressions.push('org_domain = :domain');
        expressionAttributeValues[':domain'] = filters.domain;
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

      return result as ClientsData[];
    } catch (error) {
      console.error('Error searching organizations:', error);
      throw error;
    }
  }

  async getOrganizationStats(): Promise<{
    total: number;
    by_industry: Record<string, number>;
    by_country: Record<string, number>;
    by_size: Record<OrganizationSize, number>;
    average_users_per_org: number;
    average_apps_per_org: number;
  }> {
    try {
      const result = await this.dynamoDbService.scanItems(this.tableName);
      const organizations = result as ClientsData[];

      const stats = {
        total: organizations.length,
        by_industry: {} as Record<string, number>,
        by_country: {} as Record<string, number>,
        by_size: {} as Record<OrganizationSize, number>,
        average_users_per_org: 0,
        average_apps_per_org: 0,
      };

      // Initialize size counters
      Object.values(OrganizationSize).forEach((size) => {
        stats.by_size[size] = 0;
      });

      let totalUsers = 0;
      let totalApps = 0;

      organizations.forEach((org) => {
        // Count by industry
        stats.by_industry[org.industry_sector] =
          (stats.by_industry[org.industry_sector] || 0) + 1;

        // Count by country
        stats.by_country[org.origin_country] =
          (stats.by_country[org.origin_country] || 0) + 1;

        // Count by size
        if (org.company_size) {
          stats.by_size[org.company_size] =
            (stats.by_size[org.company_size] || 0) + 1;
        }

        // Sum for averages
        totalUsers += org.total_users;
        totalApps += org.app_count;
      });

      stats.average_users_per_org =
        organizations.length > 0 ? totalUsers / organizations.length : 0;
      stats.average_apps_per_org =
        organizations.length > 0 ? totalApps / organizations.length : 0;

      return stats;
    } catch (error) {
      console.error('Error getting organization stats:', error);
      throw error;
    }
  }

  async deleteOrganization(
    clientName: string,
    organizationName: string,
  ): Promise<void> {
    await this.delete({
      client_name: clientName,
      organization_name: organizationName,
    });
  }
}
