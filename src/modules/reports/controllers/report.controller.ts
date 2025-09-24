import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ReportService } from '../services/report.service';
import { ReportFormat } from '../dto/report.dto';
import {
  JwtAuthGuard,
  RolesGuard,
  SubscriptionGuard,
} from '../../../common/guards';
import { Roles } from '../../../common/decorators';
import { UserRole } from '../../../common/enums';

@ApiTags('reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportController {
  private readonly logger = new Logger(ReportController.name);

  constructor(private readonly reportService: ReportService) {}

  @Get('organization/:orgId')
  @ApiOperation({ summary: 'List all reports for organization' })
  @ApiParam({ name: 'orgId', description: 'Organization ID' })
  @ApiResponse({ status: 200, description: 'Reports retrieved successfully' })
  async listReportsByOrg(@Param('orgId') orgId: string, @Request() req) {
    if (
      req.user.organizationId !== orgId &&
      req.user.role !== UserRole.PLATFORM_ADMIN
    ) {
      throw new Error('Unauthorized access to organization reports');
    }

    const reports = await this.reportService.listReportsByOrg(orgId);
    return {
      success: true,
      message: 'Reports retrieved successfully',
      data: reports,
    };
  }

  @Get(':reportId')
  @ApiOperation({ summary: 'Get report by ID' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  @ApiResponse({ status: 200, description: 'Report retrieved successfully' })
  async getReport(@Param('reportId') reportId: string, @Request() req) {
    const organizationId = req.user.organizationId;
    const report = await this.reportService.getReportByOrgAndId(
      organizationId,
      reportId,
    );

    if (!report) {
      throw new Error('Report not found');
    }

    return {
      success: true,
      message: 'Report retrieved successfully',
      data: report,
    };
  }

  @Delete(':reportId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete report' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async deleteReport(@Param('reportId') reportId: string, @Request() req) {
    const organizationId = req.user.organizationId;
    this.logger.log(`Deleting report ${reportId} for org ${organizationId}`);
    await this.reportService.deleteReportByOrg(organizationId, reportId);
  }

  @Post('threat-assessment/:assessmentId')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'Generate threat assessment report' })
  @ApiParam({ name: 'assessmentId', description: 'Assessment ID' })
  async generateThreatAssessmentReport(
    @Param('assessmentId') assessmentId: string,
    @Request() req,
    @Query('format') format: ReportFormat = ReportFormat.PDF,
  ) {
    const { organizationId, userId, subscriptionTier } = req.user;

    this.logger.log(
      `Generating threat assessment report for assessment ${assessmentId}`,
    );
    const report = await this.reportService.generateThreatAssessmentReport(
      organizationId,
      userId,
      assessmentId,
      format,
      subscriptionTier,
    );

    return {
      success: true,
      message: 'Threat assessment report generation initiated',
      data: report,
    };
  }

  @Post('compliance/:framework')
  @UseGuards(SubscriptionGuard)
  @ApiOperation({ summary: 'Generate compliance framework report' })
  @ApiParam({ name: 'framework', description: 'Compliance framework' })
  async generateComplianceReport(
    @Param('framework')
    framework: 'nist' | 'iso27001' | 'sox' | 'gdpr' | 'hipaa',
    @Request() req,
    @Query('format') format: ReportFormat = ReportFormat.PDF,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, subscriptionTier } = req.user;

    const dateRange =
      startDate && endDate ? { start: startDate, end: endDate } : undefined;

    this.logger.log(
      `Generating compliance report for framework ${framework}`,
    );
    const report = await this.reportService.generateComplianceReport(
      organizationId,
      userId,
      framework,
      format,
      subscriptionTier,
      dateRange,
    );

    return {
      success: true,
      message: 'Compliance report generation initiated',
      data: report,
    };
  }

  @Post('executive')
  @UseGuards(SubscriptionGuard, RolesGuard)
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Generate executive summary report (Admin only)' })
  async generateExecutiveReport(
    @Request() req,
    @Query('format') format: ReportFormat = ReportFormat.PDF,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, subscriptionTier } = req.user;

    if (!startDate || !endDate) {
      throw new Error(
        'Start date and end date are required for executive reports',
      );
    }

    this.logger.log(`Generating executive report for org ${organizationId}`);
    const report = await this.reportService.generateExecutiveReport(
      organizationId,
      userId,
      format,
      subscriptionTier,
      { start: startDate, end: endDate },
    );

    return {
      success: true,
      message: 'Executive report generation initiated',
      data: report,
    };
  }

  @Post('audit-trail')
  @UseGuards(SubscriptionGuard, RolesGuard)
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Generate audit trail report (Admin only)' })
  async generateAuditTrailReport(
    @Request() req,
    @Query('format') format: ReportFormat = ReportFormat.CSV,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, subscriptionTier } = req.user;

    if (!startDate || !endDate) {
      throw new Error(
        'Start date and end date are required for audit reports',
      );
    }

    this.logger.log(`Generating audit trail report for org ${organizationId}`);
    const report = await this.reportService.generateAuditTrailReport(
      organizationId,
      userId,
      format,
      subscriptionTier,
      { start: startDate, end: endDate },
    );

    return {
      success: true,
      message: 'Audit trail report generation initiated',
      data: report,
    };
  }

  @Post('user-activity')
  @UseGuards(SubscriptionGuard, RolesGuard)
  @Roles(UserRole.ORG_ADMIN, UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Generate user activity report (Admin only)' })
  async generateUserActivityReport(
    @Request() req,
    @Query('format') format: ReportFormat = ReportFormat.CSV,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { organizationId, userId, subscriptionTier } = req.user;

    if (!startDate || !endDate) {
      throw new Error(
        'Start date and end date are required for user activity reports',
      );
    }

    this.logger.log(
      `Generating user activity report for org ${organizationId}`,
    );
    const report = await this.reportService.generateUserActivityReport(
      organizationId,
      userId,
      format,
      subscriptionTier,
      { start: startDate, end: endDate },
    );

    return {
      success: true,
      message: 'User activity report generation initiated',
      data: report,
    };
  }

  @Get('analytics/platform')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get platform analytics (Platform Admin only)' })
  async getPlatformAnalytics(
    @Request() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const { subscriptionTier } = req.user;

    if (!startDate || !endDate) {
      throw new Error(
        'Start date and end date are required for platform analytics',
      );
    }

    this.logger.log('Generating platform analytics report');
    const analytics = await this.reportService.generatePlatformAnalyticsReport(
      subscriptionTier,
      { start: startDate, end: endDate },
    );

    return {
      success: true,
      message: 'Platform analytics retrieved successfully',
      data: analytics,
    };
  }

  @Get(':reportId/download')
  @ApiOperation({ summary: 'Get report download URL' })
  @ApiParam({ name: 'reportId', description: 'Report ID' })
  async getReportDownloadUrl(
    @Param('reportId') reportId: string,
    @Request() req,
  ) {
    const { organizationId, userId } = req.user;

    this.logger.log(`Generating download URL for report ${reportId}`);
    const downloadInfo = await this.reportService.getReportDownloadUrl(
      organizationId,
      reportId,
      userId,
    );

    return {
      success: true,
      message: 'Download URL generated successfully',
      data: downloadInfo,
    };
  }
}
