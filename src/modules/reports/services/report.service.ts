import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { ReportRepository } from '../repositories/report.repository';
import { ReportDto, ReportType, ReportFormat, ReportStatus } from '../dto/report.dto';
import { SubscriptionTier } from '../../../common/enums';

@Injectable()
export class ReportService {
  private readonly logger = new Logger(ReportService.name);

  constructor(private readonly reportRepository: ReportRepository) {}

  /**
   * Core Report Management
   */
  async createReport(dto: ReportDto): Promise<ReportDto> {
    return this.reportRepository.createReport(dto);
  }

  // Deprecated: Use getReportByOrgAndId for efficient lookup
  async getReportById_deprecated(reportId: string): Promise<ReportDto | null> {
    throw new Error('getReportById requires organizationId. Use getReportByOrgAndId.');
  }

  async getReportByOrgAndId(organizationId: string, reportId: string): Promise<ReportDto | null> {
    return this.reportRepository.findReportByOrgAndId(organizationId, reportId);
  }

  async updateReport(dto: ReportDto): Promise<ReportDto> {
    return this.reportRepository.updateReport(dto);
  }

  // Deprecated: Use deleteReportByOrg for correct usage
  async deleteReport_deprecated(reportId: string): Promise<void> {
    throw new Error('deleteReport requires organizationId. Use deleteReportByOrg.');
  }

  async deleteReportByOrg(organizationId: string, reportId: string): Promise<void> {
    return this.reportRepository.deleteReport(organizationId, reportId);
  }

  async listReportsByOrg(organizationId: string): Promise<ReportDto[]> {
    return this.reportRepository.listReportsByOrg(organizationId);
  }

  /**
   * Enhanced Report Generation with Subscription Tier Enforcement
   */
  async generateThreatAssessmentReport(
    organizationId: string,
    userId: string,
    assessmentId: string,
    format: ReportFormat = ReportFormat.PDF,
    subscriptionTier: SubscriptionTier,
  ): Promise<ReportDto> {
    this.logger.log(`Generating threat assessment report for org: ${organizationId}, assessment: ${assessmentId}`);

    // Subscription tier enforcement
    if (!this.canGenerateReportType(ReportType.ASSESSMENT, subscriptionTier)) {
      throw new BadRequestException('Threat assessment reports require Premium or Enterprise subscription');
    }

    const reportId = `threat_${assessmentId}_${Date.now()}`;
    const fileName = `threat-assessment-${assessmentId}.${format.toLowerCase()}`;
    
    const report: ReportDto = {
      reportId,
      organizationId,
      userId,
      type: ReportType.ASSESSMENT,
      format,
      status: ReportStatus.GENERATING,
      fileName,
      s3Key: `reports/${organizationId}/${reportId}`,
      s3Bucket: 'threat-readiness-reports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      sourceId: assessmentId,
    };

    const createdReport = await this.createReport(report);

    // Simulate report generation (in production, this would be async background job)
    setTimeout(async () => {
      try {
        await this.generateThreatAssessmentData(assessmentId, format);
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.READY,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      } catch (error) {
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.FAILED,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      }
    }, 5000);

    return createdReport;
  }

  async generateComplianceReport(
    organizationId: string,
    userId: string,
    frameworkType: 'nist' | 'iso27001' | 'sox' | 'gdpr' | 'hipaa',
    format: ReportFormat = ReportFormat.PDF,
    subscriptionTier: SubscriptionTier,
    dateRange?: { start: string; end: string },
  ): Promise<ReportDto> {
    this.logger.log(`Generating compliance report for org: ${organizationId}, framework: ${frameworkType}`);

    // Subscription tier enforcement
    if (!this.canGenerateReportType(ReportType.COMPLIANCE, subscriptionTier)) {
      throw new BadRequestException('Compliance reports require Premium or Enterprise subscription');
    }

    const reportId = `compliance_${frameworkType}_${Date.now()}`;
    const fileName = `compliance-${frameworkType}-report.${format.toLowerCase()}`;
    
    const report: ReportDto = {
      reportId,
      organizationId,
      userId,
      type: ReportType.COMPLIANCE,
      format,
      status: ReportStatus.GENERATING,
      fileName,
      s3Key: `reports/${organizationId}/${reportId}`,
      s3Bucket: 'threat-readiness-reports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      sourceId: frameworkType,
      dateRange: dateRange ? [dateRange.start, dateRange.end] : undefined,
    };

    const createdReport = await this.createReport(report);

    // Simulate report generation
    setTimeout(async () => {
      try {
        await this.generateComplianceData(frameworkType, dateRange, format);
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.READY,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      } catch (error) {
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.FAILED,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      }
    }, 7000);

    return createdReport;
  }

  async generateExecutiveReport(
    organizationId: string,
    userId: string,
    format: ReportFormat = ReportFormat.PDF,
    subscriptionTier: SubscriptionTier,
    dateRange: { start: string; end: string },
  ): Promise<ReportDto> {
    this.logger.log(`Generating executive report for org: ${organizationId}`);

    // Subscription tier enforcement
    if (!this.canGenerateReportType(ReportType.EXECUTIVE, subscriptionTier)) {
      throw new BadRequestException('Executive reports require Enterprise subscription');
    }

    const reportId = `executive_${Date.now()}`;
    const fileName = `executive-summary-report.${format.toLowerCase()}`;
    
    const report: ReportDto = {
      reportId,
      organizationId,
      userId,
      type: ReportType.EXECUTIVE,
      format,
      status: ReportStatus.GENERATING,
      fileName,
      s3Key: `reports/${organizationId}/${reportId}`,
      s3Bucket: 'threat-readiness-reports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      dateRange: [dateRange.start, dateRange.end],
    };

    const createdReport = await this.createReport(report);

    // Simulate report generation
    setTimeout(async () => {
      try {
        await this.generateExecutiveData(organizationId, dateRange, format);
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.READY,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      } catch (error) {
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.FAILED,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      }
    }, 10000);

    return createdReport;
  }

  async generateAuditTrailReport(
    organizationId: string,
    userId: string,
    format: ReportFormat = ReportFormat.CSV,
    subscriptionTier: SubscriptionTier,
    dateRange: { start: string; end: string },
  ): Promise<ReportDto> {
    this.logger.log(`Generating audit trail report for org: ${organizationId}`);

    // Subscription tier enforcement
    if (!this.canGenerateReportType(ReportType.AUDIT, subscriptionTier)) {
      throw new BadRequestException('Audit trail reports require Premium or Enterprise subscription');
    }

    const reportId = `audit_${Date.now()}`;
    const fileName = `audit-trail-report.${format.toLowerCase()}`;
    
    const report: ReportDto = {
      reportId,
      organizationId,
      userId,
      type: ReportType.AUDIT,
      format,
      status: ReportStatus.GENERATING,
      fileName,
      s3Key: `reports/${organizationId}/${reportId}`,
      s3Bucket: 'threat-readiness-reports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      dateRange: [dateRange.start, dateRange.end],
    };

    const createdReport = await this.createReport(report);

    // Simulate report generation
    setTimeout(async () => {
      try {
        await this.generateAuditData(organizationId, dateRange, format);
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.READY,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      } catch (error) {
        await this.updateReport({
          ...createdReport,
          status: ReportStatus.FAILED,
          updatedAt: new Date().toISOString(),
          version: createdReport.version + 1,
        });
      }
    }, 6000);

    return createdReport;
  }

  /**
   * Advanced Analytics Reports
   */
  async generateUserActivityReport(
    organizationId: string,
    userId: string,
    format: ReportFormat = ReportFormat.CSV,
    subscriptionTier: SubscriptionTier,
    dateRange: { start: string; end: string },
  ): Promise<ReportDto> {
    this.logger.log(`Generating user activity report for org: ${organizationId}`);

    if (subscriptionTier === SubscriptionTier.BASIC) {
      throw new BadRequestException('User activity reports require Premium or Enterprise subscription');
    }

    const reportId = `user_activity_${Date.now()}`;
    const fileName = `user-activity-report.${format.toLowerCase()}`;
    
    const report: ReportDto = {
      reportId,
      organizationId,
      userId,
      type: ReportType.CUSTOM,
      format,
      status: ReportStatus.GENERATING,
      fileName,
      s3Key: `reports/${organizationId}/${reportId}`,
      s3Bucket: 'threat-readiness-reports',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
      dateRange: [dateRange.start, dateRange.end],
    };

    return this.createReport(report);
  }

  async generatePlatformAnalyticsReport(
    subscriptionTier: SubscriptionTier,
    dateRange: { start: string; end: string },
  ): Promise<any> {
    if (subscriptionTier !== SubscriptionTier.ENTERPRISE) {
      throw new BadRequestException('Platform analytics require Enterprise subscription');
    }

    // Mock analytics data for admin dashboard
    return {
      period: dateRange,
      organizationMetrics: {
        totalOrganizations: 150,
        activeOrganizations: 135,
        newSignups: 12,
        churnRate: 3.2,
      },
      subscriptionMetrics: {
        basic: 45,
        premium: 75,
        enterprise: 30,
        conversionRate: 15.8,
      },
      threatMetrics: {
        totalAssessments: 2340,
        completedAssessments: 2180,
        averageRiskScore: 7.2,
        criticalThreats: 89,
      },
      usageMetrics: {
        dailyActiveUsers: 450,
        monthlyActiveUsers: 1250,
        averageSessionDuration: '24 minutes',
        topFeatures: [
          'Threat Assessment',
          'Compliance Reporting',
          'Risk Dashboard',
          'Audit Trails',
        ],
      },
    };
  }

  /**
   * Report Download and Access
   */
  async getReportDownloadUrl(
    organizationId: string,
    reportId: string,
    userId: string,
  ): Promise<{ downloadUrl: string; expiresAt: string }> {
    const report = await this.getReportByOrgAndId(organizationId, reportId);
    if (!report) {
      throw new NotFoundException('Report not found');
    }

    if (report.status !== ReportStatus.READY) {
      throw new BadRequestException('Report is not ready for download');
    }

    // Mock S3 signed URL (in production, this would generate actual signed URL)
    const downloadUrl = `https://threat-readiness-reports.s3.amazonaws.com/${report.s3Key}?signature=mock_signature`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    return { downloadUrl, expiresAt };
  }

  /**
   * Subscription Tier Enforcement
   */
  private canGenerateReportType(
    reportType: ReportType,
    subscriptionTier: SubscriptionTier,
  ): boolean {
    switch (reportType) {
      case ReportType.ASSESSMENT:
        return subscriptionTier !== SubscriptionTier.BASIC;
      case ReportType.COMPLIANCE:
        return subscriptionTier !== SubscriptionTier.BASIC;
      case ReportType.EXECUTIVE:
        return subscriptionTier === SubscriptionTier.ENTERPRISE;
      case ReportType.AUDIT:
        return subscriptionTier !== SubscriptionTier.BASIC;
      case ReportType.CUSTOM:
        return subscriptionTier !== SubscriptionTier.BASIC;
      default:
        return false;
    }
  }

  /**
   * Report Generation Helpers (Mock Implementation)
   */
  private async generateThreatAssessmentData(
    assessmentId: string,
    format: ReportFormat,
  ): Promise<void> {
    // Mock threat assessment report generation
    this.logger.log(`Generating threat assessment data for ${assessmentId} in ${format} format`);
    
    const reportData = {
      assessmentId,
      organizationName: 'Sample Organization',
      assessmentDate: new Date().toISOString(),
      overallRiskScore: 7.5,
      criticalFindings: 5,
      highRiskItems: 12,
      mediumRiskItems: 28,
      lowRiskItems: 45,
      recommendations: [
        'Implement multi-factor authentication',
        'Update security policies',
        'Conduct regular security training',
      ],
      compliance: {
        nist: 75,
        iso27001: 68,
        gdpr: 85,
      },
    };

    // In production, this would generate actual PDF/CSV files and upload to S3
    return Promise.resolve();
  }

  private async generateComplianceData(
    frameworkType: string,
    dateRange: { start: string; end: string } | undefined,
    format: ReportFormat,
  ): Promise<void> {
    this.logger.log(`Generating compliance data for ${frameworkType} in ${format} format`);
    // Mock compliance report generation
    return Promise.resolve();
  }

  private async generateExecutiveData(
    organizationId: string,
    dateRange: { start: string; end: string },
    format: ReportFormat,
  ): Promise<void> {
    this.logger.log(`Generating executive data for org ${organizationId} in ${format} format`);
    // Mock executive report generation
    return Promise.resolve();
  }

  private async generateAuditData(
    organizationId: string,
    dateRange: { start: string; end: string },
    format: ReportFormat,
  ): Promise<void> {
    this.logger.log(`Generating audit data for org ${organizationId} in ${format} format`);
    // Mock audit report generation
    return Promise.resolve();
  }
}
