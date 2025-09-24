import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { NotificationService } from '../services/notification.service';
import { NotificationDto } from '../dto/notification.dto';
import { 
  CreateNotificationDto, 
  BulkNotificationDto,
  NotificationPriority 
} from '../dto/create-notification.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { UserRole } from '../../../common/enums/user-role.enum';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({ status: 201, description: 'Notification created successfully' })
  async createNotification(@Body() dto: NotificationDto): Promise<NotificationDto> {
    return this.notificationService.createNotification(dto);
  }

  @Post('send')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send notification to user(s)' })
  @HttpCode(HttpStatus.CREATED)
  async sendNotification(@Body() createDto: CreateNotificationDto): Promise<void> {
    await this.notificationService.createAndSendNotification(createDto);
  }

  @Post('bulk')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send bulk notifications' })
  @HttpCode(HttpStatus.CREATED)
  async sendBulkNotification(@Body() bulkDto: BulkNotificationDto): Promise<void> {
    await this.notificationService.sendBulkNotification(bulkDto);
  }

  @Get('my-notifications')
  @ApiOperation({ summary: 'Get current user notifications' })
  @ApiResponse({ status: 200, description: 'List of user notifications' })
  async getMyNotifications(@Request() req: any): Promise<NotificationDto[]> {
    return this.notificationService.listNotificationsByUser(req.user.email);
  }

  @Get('my-notifications/unread-count')
  @ApiOperation({ summary: 'Get unread notification count for current user' })
  @ApiResponse({ status: 200, description: 'Unread notification count' })
  async getUnreadCount(@Request() req: any): Promise<{ count: number }> {
    const count = await this.notificationService.getUnreadCount(req.user.email);
    return { count };
  }

  @Put('my-notifications/:id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('id') notificationId: string,
    @Request() req: any,
  ): Promise<void> {
    await this.notificationService.markAsRead(req.user.email, notificationId);
  }

  @Put('my-notifications/mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllAsRead(@Request() req: any): Promise<void> {
    await this.notificationService.markAllAsRead(req.user.email);
  }

  @Get(':id/user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Get specific notification (admin only)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async getNotification(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<NotificationDto | null> {
    return this.notificationService.getNotificationById(userId, id);
  }

  @Delete(':id/user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Delete notification (admin only)' })
  @ApiParam({ name: 'id', description: 'Notification ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteNotification(
    @Param('id') id: string,
    @Param('userId') userId: string,
  ): Promise<void> {
    await this.notificationService.deleteNotification(userId, id);
  }

  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'List notifications by user (admin only)' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  async listNotificationsByUser(
    @Param('userId') userId: string,
  ): Promise<NotificationDto[]> {
    return this.notificationService.listNotificationsByUser(userId);
  }

  // Platform event notification endpoints
  @Post('threat-assessment')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send threat assessment notification' })
  @HttpCode(HttpStatus.CREATED)
  async sendThreatAssessmentNotification(
    @Body() body: {
      userId: string;
      organizationId: string;
      assessmentId: string;
      result: 'completed' | 'failed';
    },
  ): Promise<void> {
    await this.notificationService.sendThreatAssessmentNotification(
      body.userId,
      body.organizationId,
      body.assessmentId,
      body.result,
    );
  }

  @Post('subscription')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send subscription notification' })
  @HttpCode(HttpStatus.CREATED)
  async sendSubscriptionNotification(
    @Body() body: {
      userId: string;
      organizationId: string;
      subscriptionId: string;
      eventType: 'upgrade' | 'downgrade' | 'renewal' | 'cancellation' | 'payment_failed';
    },
  ): Promise<void> {
    await this.notificationService.sendSubscriptionNotification(
      body.userId,
      body.organizationId,
      body.subscriptionId,
      body.eventType,
    );
  }

  @Post('quota-warning')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send quota warning notification' })
  @HttpCode(HttpStatus.CREATED)
  async sendQuotaWarningNotification(
    @Body() body: {
      userId: string;
      organizationId: string;
      warningType: 'approaching_limit' | 'limit_exceeded';
      resourceType: 'runs' | 'exports' | 'storage' | 'api_calls';
      currentUsage: number;
      limit: number;
    },
  ): Promise<void> {
    await this.notificationService.sendQuotaWarningNotification(
      body.userId,
      body.organizationId,
      body.warningType,
      body.resourceType,
      body.currentUsage,
      body.limit,
    );
  }

  @Post('system-alert')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send system alert notification' })
  @HttpCode(HttpStatus.CREATED)
  async sendSystemAlertNotification(
    @Body() body: {
      recipients: string[];
      alertType: 'maintenance' | 'security' | 'outage' | 'update';
      title: string;
      description: string;
      priority?: NotificationPriority;
    },
  ): Promise<void> {
    await this.notificationService.sendSystemAlertNotification(
      body.recipients,
      body.alertType,
      body.title,
      body.description,
      body.priority,
    );
  }

  @Post('security')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PLATFORM_ADMIN)
  @ApiOperation({ summary: 'Send security notification' })
  @HttpCode(HttpStatus.CREATED)
  async sendSecurityNotification(
    @Body() body: {
      userId: string;
      organizationId: string;
      eventType: 'login_attempt' | 'password_change' | 'suspicious_activity' | 'account_locked';
      details: string;
    },
  ): Promise<void> {
    await this.notificationService.sendSecurityNotification(
      body.userId,
      body.organizationId,
      body.eventType,
      body.details,
    );
  }
}
