import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException,
  Logger 
} from '@nestjs/common';
import { ProfilingProfileDto, ThreatScoreDto, VulnerabilityDto } from '../dto/profiling-profile.dto';
import { CreateProfilingProfileDto } from '../dto/create-profiling-profile.dto';
import { UpdateProfilingProfileDto } from '../dto/update-profiling-profile.dto';
import { ProfilingRepository } from '../repositories/profiling.repository';
import { QuotaValidationService, QuotaCheckResult } from './quota-validation.service';
import { ProfilingStatus, RiskLevel } from '../../../common/enums';

export interface AnalysisRun {
  analysisId: string;
  profileId: string;
  organizationId: string;
  status: ProfilingStatus;
  progress: number;
  startedAt: string;
  completedAt?: string;
  estimatedCompletion: string;
  results?: {
    threatScore: ThreatScoreDto;
    vulnerabilities: VulnerabilityDto[];
    recommendations: string[];
    riskSummary: string;
  };
  error?: string;
}

@Injectable()
export class ProfilingService {
  private readonly logger = new Logger(ProfilingService.name);
  private readonly analysisRuns: Map<string, AnalysisRun> = new Map();

  constructor(
    private readonly profilingRepository: ProfilingRepository,
    private readonly quotaValidationService: QuotaValidationService,
  ) {}

  async createProfile(
    organizationId: string,
    createProfileDto: CreateProfilingProfileDto,
  ): Promise<ProfilingProfileDto> {
    // Initialize usage tracking if needed
    await this.quotaValidationService.initializeUsageTracking(organizationId);
    
    // Create profile for organization
    const profile = await this.profilingRepository.createProfile(
      organizationId,
      createProfileDto,
    );
    
    this.logger.log(`Created profiling profile ${profile.profileId} for organization ${organizationId}`);
    
    return profile;
  }

  async listProfiles(
    organizationId: string,
    limit: number,
    offset: number,
  ): Promise<{
    profiles: ProfilingProfileDto[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { profiles, total } = await this.profilingRepository.findByOrganization(
        organizationId,
        limit,
        offset,
    );
    return { profiles, total, limit, offset };
  }

  async getProfile(
    organizationId: string,
    profileId: string,
  ): Promise<ProfilingProfileDto> {
    const profile = await this.profilingRepository.findById(
      organizationId,
      profileId,
    );
    if (!profile) {
      throw new NotFoundException('Profiling profile not found');
    }
    return profile;
  }

  async updateProfile(
    organizationId: string,
    profileId: string,
    updateProfileDto: UpdateProfilingProfileDto,
  ): Promise<ProfilingProfileDto> {
    // Throws if not found
    await this.getProfile(organizationId, profileId);
    return this.profilingRepository.updateProfile(
      organizationId,
      profileId,
      updateProfileDto,
    );
  }

  async deleteProfile(
    organizationId: string,
    profileId: string,
  ): Promise<void> {
    // Throws if not found
    await this.getProfile(organizationId, profileId);
    await this.profilingRepository.deleteProfile(organizationId, profileId);
  }

  async startAnalysis(
    organizationId: string,
    profileId: string,
  ): Promise<{
    profileId: string;
    analysisId: string;
    status: string;
    estimatedCompletion: string;
  }> {
    // Check quota before starting analysis
    const quotaCheck = await this.quotaValidationService.canStartProfilingRun(organizationId);
    if (!quotaCheck.allowed) {
      throw new ForbiddenException(quotaCheck.message);
    }

    // Verify profile exists
    const profile = await this.getProfile(organizationId, profileId);
    
    // Check if analysis is already running
    if (profile.status === ProfilingStatus.RUNNING) {
      throw new BadRequestException('Analysis is already running for this profile');
    }

    // Generate unique analysis ID
    const analysisId = `ANL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const startTime = new Date();
    const estimatedCompletion = new Date(startTime.getTime() + 5 * 60 * 1000); // 5 minutes estimate

    // Create analysis run record
    const analysisRun: AnalysisRun = {
      analysisId,
      profileId,
      organizationId,
      status: ProfilingStatus.RUNNING,
      progress: 0,
      startedAt: startTime.toISOString(),
      estimatedCompletion: estimatedCompletion.toISOString(),
    };

    // Store analysis run
    this.analysisRuns.set(analysisId, analysisRun);

    // Update profile status
    await this.profilingRepository.updateAnalysisStatus(
      profileId, 
      ProfilingStatus.RUNNING, 
      0
    );

    // Record usage for quota tracking
    await this.quotaValidationService.recordProfilingRun(organizationId);

    // Start background analysis (simulate with setTimeout)
    this.startBackgroundAnalysis(analysisRun);

    this.logger.log(`Started threat analysis ${analysisId} for profile ${profileId}`);

    return { 
      profileId, 
      analysisId, 
      status: ProfilingStatus.RUNNING, 
      estimatedCompletion: estimatedCompletion.toISOString() 
    };
  }

  async getAnalysisStatus(
    organizationId: string,
    profileId: string,
    analysisId: string,
  ): Promise<{
    analysisId: string;
    status: string;
    progress: number;
    completedAt?: string;
    results?: any;
  }> {
    // Get analysis run from memory store
    const analysisRun = this.analysisRuns.get(analysisId);
    
    if (!analysisRun) {
      throw new NotFoundException('Analysis run not found');
    }

    // Verify analysis belongs to organization/profile
    if (analysisRun.organizationId !== organizationId || analysisRun.profileId !== profileId) {
      throw new ForbiddenException('Analysis run not found for this organization/profile');
    }

    return {
      analysisId: analysisRun.analysisId,
      status: analysisRun.status,
      progress: analysisRun.progress,
      completedAt: analysisRun.completedAt,
      results: analysisRun.results,
    };
  }

  /**
   * Get quota information for organization
   */
  async getQuotaInfo(organizationId: string): Promise<any> {
    return this.quotaValidationService.getQuotaSummary(organizationId);
  }

  /**
   * Get organization profiling statistics
   */
  async getOrganizationStats(organizationId: string): Promise<any> {
    return this.profilingRepository.getOrganizationStats(organizationId);
  }

  /**
   * Start background analysis simulation
   */
  private startBackgroundAnalysis(analysisRun: AnalysisRun): void {
    // Simulate analysis progress with timeouts
    setTimeout(() => this.updateAnalysisProgress(analysisRun, 25), 30000);   // 30s - 25%
    setTimeout(() => this.updateAnalysisProgress(analysisRun, 50), 60000);   // 1m - 50%
    setTimeout(() => this.updateAnalysisProgress(analysisRun, 75), 120000);  // 2m - 75%
    setTimeout(() => this.completeAnalysis(analysisRun), 180000);           // 3m - complete
  }

  /**
   * Update analysis progress
   */
  private async updateAnalysisProgress(analysisRun: AnalysisRun, progress: number): Promise<void> {
    try {
      analysisRun.progress = progress;
      await this.profilingRepository.updateAnalysisStatus(
        analysisRun.profileId,
        ProfilingStatus.RUNNING,
        progress,
      );
      
      this.logger.log(`Analysis ${analysisRun.analysisId} progress: ${progress}%`);
    } catch (error) {
      this.logger.error(`Failed to update analysis progress:`, error);
    }
  }

  /**
   * Complete analysis with simulated results
   */
  private async completeAnalysis(analysisRun: AnalysisRun): Promise<void> {
    try {
      const results = this.generateMockAnalysisResults();
      
      // Update analysis run
      analysisRun.status = ProfilingStatus.COMPLETED;
      analysisRun.progress = 100;
      analysisRun.completedAt = new Date().toISOString();
      analysisRun.results = results;

      // Update profile with results
      await this.profilingRepository.updateAnalysisStatus(
        analysisRun.profileId,
        ProfilingStatus.COMPLETED,
        100,
      );

      await this.profilingRepository.updateThreatScore(
        analysisRun.profileId,
        results.threatScore,
      );

      await this.profilingRepository.updateVulnerabilities(
        analysisRun.profileId,
        results.vulnerabilities,
      );

      this.logger.log(`Completed analysis ${analysisRun.analysisId}`);
    } catch (error) {
      this.logger.error(`Failed to complete analysis:`, error);
      
      // Mark as failed
      analysisRun.status = ProfilingStatus.FAILED;
      analysisRun.error = error.message;
      
      await this.profilingRepository.updateAnalysisStatus(
        analysisRun.profileId,
        ProfilingStatus.FAILED,
        analysisRun.progress,
      );
    }
  }

  /**
   * Generate mock analysis results for simulation
   */
  private generateMockAnalysisResults(): {
    threatScore: ThreatScoreDto;
    vulnerabilities: VulnerabilityDto[];
    recommendations: string[];
    riskSummary: string;
  } {
    // Generate realistic mock data
    const threatScore: ThreatScoreDto = {
      overall: Math.floor(Math.random() * 40) + 30, // 30-70
      malware: Math.floor(Math.random() * 50) + 25,
      phishing: Math.floor(Math.random() * 60) + 20,
      ransomware: Math.floor(Math.random() * 45) + 15,
      dataBreach: Math.floor(Math.random() * 55) + 25,
      insiderThreat: Math.floor(Math.random() * 35) + 10,
    };

    const vulnerabilities: VulnerabilityDto[] = [
      {
        category: 'Network Security',
        severity: 'high',
        description: 'Unencrypted network communications detected',
        remediation: 'Implement TLS encryption for all network communications',
        priority: 85,
      },
      {
        category: 'Access Control',
        severity: 'medium',
        description: 'Weak password policies identified',
        remediation: 'Enforce strong password requirements and multi-factor authentication',
        priority: 70,
      },
      {
        category: 'Patch Management',
        severity: 'critical',
        description: 'Critical security updates missing',
        remediation: 'Apply all critical security patches immediately',
        priority: 95,
      },
    ];

    const recommendations = [
      'Implement comprehensive security awareness training',
      'Deploy endpoint detection and response (EDR) solutions',
      'Establish incident response procedures',
      'Conduct regular security assessments',
      'Implement data loss prevention (DLP) controls',
    ];

    const riskSummary = `Organization shows moderate security posture with ${threatScore.overall}% overall threat level. Key concerns include network security and patch management. Immediate attention required for critical vulnerabilities.`;

    return {
      threatScore,
      vulnerabilities,
      recommendations,
      riskSummary,
    };
  }
}
