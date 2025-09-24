import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { BaseEntity } from '../../../core/database/repositories/base.repository';
import {
  ProfilingProfileDto,
  CreateProfilingProfileDto,
  UpdateProfilingProfileDto,
  ThreatScoreDto,
  VulnerabilityDto,
} from '../dto';
import { ProfilingStatus } from '../../../common/enums';

/**
 * ProfilingProfile Entity for DynamoDB
 */
export interface ProfilingProfile extends BaseEntity {
  pk: string; // ORG#organizationId
  sk: string; // PROFILE#profileId
  profileId: string;
  organizationId: string;
  profileName: string;
  industryType: string;
  companySize: string;
  status: ProfilingStatus;
  threatScore: ThreatScoreDto;
  vulnerabilities: VulnerabilityDto[];
  completionPercentage: number;
  riskSummary?: string;
  recommendations?: string[];
  lastAnalyzedAt: string;
  // GSI fields for querying
  gsi1pk: string; // ORG#organizationId
  gsi1sk: string; // STATUS#status#CREATED#createdAt
}

@Injectable()
export class ProfilingRepository {
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  async createProfile(
    organizationId: string,
    createProfileDto: CreateProfilingProfileDto,
  ): Promise<ProfilingProfileDto> {
    const profileId = `PROF-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const now = new Date().toISOString();

    const profile: ProfilingProfile = {
      pk: `ORG#${organizationId}`,
      sk: `PROFILE#${profileId}`,
      profileId,
      organizationId,
      profileName: createProfileDto.profileName,
      industryType: createProfileDto.industryType,
      companySize: createProfileDto.companySize,
      status: ProfilingStatus.PENDING,
      threatScore: {
        overall: 0,
        malware: 0,
        phishing: 0,
        ransomware: 0,
        dataBreach: 0,
        insiderThreat: 0,
      },
      vulnerabilities: [],
      completionPercentage: 0,
      riskSummary: undefined,
      recommendations: undefined,
      createdAt: now,
      lastAnalyzedAt: now,
      updatedAt: now,
      version: 1,
      gsi1pk: `ORG#${organizationId}`,
      gsi1sk: `STATUS#${ProfilingStatus.PENDING}#CREATED#${now}`,
    };

    try {
      await this.dynamoDbService.putItem(profile, 'ProfilingProfiles');
      return this.mapToDto(profile);
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        throw new ConflictException('Profile with this ID already exists');
      }
      throw error;
    }
  }

  async findById(
    organizationId: string,
    profileId: string,
  ): Promise<ProfilingProfileDto | null> {
    const result = await this.dynamoDbService.getItem(
      {
        pk: `ORG#${organizationId}`,
        sk: `PROFILE#${profileId}`,
      },
      'ProfilingProfiles',
    );

    return result ? this.mapToDto(result as ProfilingProfile) : null;
  }

  async findByOrganization(
    organizationId: string,
    limit: number,
    offset: number,
  ): Promise<{
    profiles: ProfilingProfileDto[];
    total: number;
  }> {
    // Query all profiles for organization using pk
    const profiles = await this.dynamoDbService.queryItems(
      'pk = :pk AND begins_with(sk, :skPrefix)',
      {
        ':pk': `ORG#${organizationId}`,
        ':skPrefix': 'PROFILE#',
      },
      'ProfilingProfiles',
      {
        limit,
        scanIndexForward: false, // Latest first
      },
    );

    const profileDtos = profiles.map((item) => 
      this.mapToDto(item as ProfilingProfile)
    );
    
    // Apply offset manually since DynamoDB doesn't support offset directly
    const paginatedProfiles = profileDtos.slice(offset, offset + limit);
    
    return {
      profiles: paginatedProfiles,
      total: profiles.length,
    };
  }

  async updateProfile(
    organizationId: string,
    profileId: string,
    updateProfileDto: UpdateProfilingProfileDto,
  ): Promise<ProfilingProfileDto> {
    const existing = await this.findById(organizationId, profileId);
    if (!existing) {
      throw new NotFoundException('Profile not found');
    }

    const key = {
      pk: `ORG#${organizationId}`,
      sk: `PROFILE#${profileId}`,
    };

    // Prepare updates, filtering out undefined values
    const updates: Partial<ProfilingProfile> = {};
    
    if (updateProfileDto.profileName !== undefined) {
      updates.profileName = updateProfileDto.profileName;
    }
    if (updateProfileDto.industryType !== undefined) {
      updates.industryType = updateProfileDto.industryType;
    }
    if (updateProfileDto.companySize !== undefined) {
      updates.companySize = updateProfileDto.companySize;
    }

    const updated = await this.dynamoDbService.updateItem(
      key,
      this.buildUpdateExpression(updates),
      this.buildExpressionAttributeValues(updates),
      'ProfilingProfiles',
      this.buildExpressionAttributeNames(updates),
      `version = :expectedVersion`,
    );

    return this.mapToDto(updated as ProfilingProfile);
  }

  async deleteProfile(organizationId: string, profileId: string): Promise<void> {
    const key = {
      pk: `ORG#${organizationId}`,
      sk: `PROFILE#${profileId}`,
    };
    
    await this.dynamoDbService.deleteItem(key, 'ProfilingProfiles');
  }

  async updateThreatScore(profileId: string, threatScore: ThreatScoreDto): Promise<void> {
    // Find the profile first to get the complete key
    const profiles = await this.dynamoDbService.scanItems('ProfilingProfiles', {
      filterExpression: 'profileId = :profileId',
      expressionAttributeValues: { ':profileId': profileId },
    });

    if (profiles.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    const profile = profiles[0] as ProfilingProfile;
    const now = new Date().toISOString();

    const key = { pk: profile.pk, sk: profile.sk };
    const updateExpression = 'SET threatScore = :threatScore, lastAnalyzedAt = :lastAnalyzedAt, updatedAt = :updatedAt, #version = #version + :one';
    const expressionAttributeNames = { '#version': 'version' };
    const expressionAttributeValues = {
      ':threatScore': threatScore,
      ':lastAnalyzedAt': now,
      ':updatedAt': now,
      ':one': 1,
    };

    await this.dynamoDbService.updateItem(
      key,
      updateExpression,
      expressionAttributeValues,
      'ProfilingProfiles',
      expressionAttributeNames,
    );
  }

  async updateVulnerabilities(profileId: string, vulnerabilities: VulnerabilityDto[]): Promise<void> {
    // Find the profile first to get the complete key
    const profiles = await this.dynamoDbService.scanItems('ProfilingProfiles', {
      filterExpression: 'profileId = :profileId',
      expressionAttributeValues: { ':profileId': profileId },
    });

    if (profiles.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    const profile = profiles[0] as ProfilingProfile;
    const now = new Date().toISOString();

    const key = { pk: profile.pk, sk: profile.sk };
    const updateExpression = 'SET vulnerabilities = :vulnerabilities, lastAnalyzedAt = :lastAnalyzedAt, updatedAt = :updatedAt, #version = #version + :one';
    const expressionAttributeNames = { '#version': 'version' };
    const expressionAttributeValues = {
      ':vulnerabilities': vulnerabilities,
      ':lastAnalyzedAt': now,
      ':updatedAt': now,
      ':one': 1,
    };

    await this.dynamoDbService.updateItem(
      key,
      updateExpression,
      expressionAttributeValues,
      'ProfilingProfiles',
      expressionAttributeNames,
    );
  }

  async updateAnalysisStatus(profileId: string, status: ProfilingStatus, progress: number): Promise<void> {
    // Find the profile first to get the complete key
    const profiles = await this.dynamoDbService.scanItems('ProfilingProfiles', {
      filterExpression: 'profileId = :profileId',
      expressionAttributeValues: { ':profileId': profileId },
    });

    if (profiles.length === 0) {
      throw new NotFoundException('Profile not found');
    }

    const profile = profiles[0] as ProfilingProfile;
    const now = new Date().toISOString();

    const key = { pk: profile.pk, sk: profile.sk };
    const updateExpression = 'SET #status = :status, completionPercentage = :progress, gsi1sk = :gsi1sk, lastAnalyzedAt = :lastAnalyzedAt, updatedAt = :updatedAt, #version = #version + :one';
    const expressionAttributeNames = { 
      '#status': 'status',
      '#version': 'version'
    };
    const expressionAttributeValues = {
      ':status': status,
      ':progress': progress,
      ':gsi1sk': `STATUS#${status}#CREATED#${profile.createdAt}`,
      ':lastAnalyzedAt': now,
      ':updatedAt': now,
      ':one': 1,
    };

    await this.dynamoDbService.updateItem(
      key,
      updateExpression,
      expressionAttributeValues,
      'ProfilingProfiles',
      expressionAttributeNames,
    );
  }

  /**
   * Get profiling run statistics for an organization
   */
  async getOrganizationStats(organizationId: string): Promise<{
    totalProfiles: number;
    completedProfiles: number;
    runningProfiles: number;
    failedProfiles: number;
  }> {
    const profiles = await this.dynamoDbService.queryItems(
      'pk = :pk AND begins_with(sk, :skPrefix)',
      {
        ':pk': `ORG#${organizationId}`,
        ':skPrefix': 'PROFILE#',
      },
      'ProfilingProfiles',
    );

    const profileData = profiles as ProfilingProfile[];
    
    return {
      totalProfiles: profileData.length,
      completedProfiles: profileData.filter(p => p.status === ProfilingStatus.COMPLETED).length,
      runningProfiles: profileData.filter(p => p.status === ProfilingStatus.RUNNING).length,
      failedProfiles: profileData.filter(p => p.status === ProfilingStatus.FAILED).length,
    };
  }

  private mapToDto(profile: ProfilingProfile): ProfilingProfileDto {
    return {
      profileId: profile.profileId,
      organizationId: profile.organizationId,
      profileName: profile.profileName,
      industryType: profile.industryType,
      companySize: profile.companySize,
      status: profile.status,
      threatScore: profile.threatScore,
      vulnerabilities: profile.vulnerabilities,
      completionPercentage: profile.completionPercentage,
      riskSummary: profile.riskSummary,
      recommendations: profile.recommendations,
      createdAt: profile.createdAt,
      lastAnalyzedAt: profile.lastAnalyzedAt,
      updatedAt: profile.updatedAt,
      version: profile.version,
    };
  }

  private buildUpdateExpression(updates: Partial<ProfilingProfile>): string {
    const expressions = Object.keys(updates).map(key => `#${key} = :${key}`);
    expressions.push('#updatedAt = :updatedAt');
    expressions.push('#version = #version + :one');
    return `SET ${expressions.join(', ')}`;
  }

  private buildExpressionAttributeNames(updates: Partial<ProfilingProfile>): Record<string, string> {
    const names: Record<string, string> = {
      '#updatedAt': 'updatedAt',
      '#version': 'version',
    };
    
    Object.keys(updates).forEach(key => {
      names[`#${key}`] = key;
    });
    
    return names;
  }

  private buildExpressionAttributeValues(updates: Partial<ProfilingProfile>): Record<string, any> {
    const values: Record<string, any> = {
      ':updatedAt': new Date().toISOString(),
      ':one': 1,
    };
    
    Object.entries(updates).forEach(([key, value]) => {
      values[`:${key}`] = value;
    });
    
    return values;
  }
}
