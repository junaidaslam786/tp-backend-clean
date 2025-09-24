import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { NotificationRepository } from '../repositories/notification.repository';
import { NotificationDto, NotificationStatus, NotificationType } from '../dto/notification.dto';
import { 
  CreateNotificationDto, 
  BulkNotificationDto,
  NotificationCategory,
  NotificationPriority 
} from '../dto/create-notification.dto';
import { 
  NotificationPreferenceDto, 
  UpdateNotificationPreferenceDto,
  NotificationPreferencesResponseDto 
} from '../dto/notification-preference.dto';
import { NotificationTemplateDto } from '../dto/notification-template.dto';
import { SesService } from '../../../core/aws/ses.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly notificationRepository: NotificationRepository,
    private readonly sesService: SesService,
  ) {}

  async createNotification(dto: NotificationDto): Promise<NotificationDto> {
    return this.notificationRepository.createNotification(dto);
  }

  async getNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto | null> {
    return this.notificationRepository.findNotificationById(
      userId,
      notificationId,
    );
  }

  async updateNotification(dto: NotificationDto): Promise<NotificationDto> {
    return this.notificationRepository.updateNotification(dto);
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    return this.notificationRepository.deleteNotification(
      userId,
      notificationId,
    );
  }

  async listNotificationsByUser(userId: string): Promise<NotificationDto[]> {
    return this.notificationRepository.listNotificationsByUser(userId);
  }

  /**
   * Send platform notifications based on event type
   */
  async sendThreatAssessmentNotification(
    userId: string,
    organizationId: string,
    assessmentId: string,
    assessmentResult: 'completed' | 'failed',
  ): Promise<void> {
    const subject = assessmentResult === 'completed' 
      ? 'Threat Assessment Completed' 
      : 'Threat Assessment Failed';
    
    const message = assessmentResult === 'completed'
      ? `Your threat assessment for organization ${organizationId} has been completed successfully. You can view the results in your dashboard.`
      : `Your threat assessment for organization ${organizationId} has encountered an error. Please try again or contact support.`;

    await this.createAndSendNotification({
      recipient: userId,
      types: [NotificationType.EMAIL, NotificationType.IN_APP],
      category: NotificationCategory.THREAT_ASSESSMENT,
      priority: NotificationPriority.NORMAL,
      subject,
      message,
      metadata: {
        organizationId,
        assessmentId,
      },
    });
  }

  async sendSubscriptionNotification(
    userId: string,
    organizationId: string,
    subscriptionId: string,
    eventType: 'upgrade' | 'downgrade' | 'renewal' | 'cancellation' | 'payment_failed',
  ): Promise<void> {
    const eventMessages = {
      upgrade: 'Your subscription has been successfully upgraded.',
      downgrade: 'Your subscription has been changed to a lower tier.',
      renewal: 'Your subscription has been renewed successfully.',
      cancellation: 'Your subscription has been cancelled.',
      payment_failed: 'Your subscription payment has failed. Please update your payment method.',
    };

    const subject = `Subscription ${eventType.replace('_', ' ').toUpperCase()}`;
    const message = `${eventMessages[eventType]} Organization: ${organizationId}`;
    const priority = eventType === 'payment_failed' 
      ? NotificationPriority.HIGH 
      : NotificationPriority.NORMAL;

    await this.createAndSendNotification({
      recipient: userId,
      types: [NotificationType.EMAIL, NotificationType.IN_APP],
      category: NotificationCategory.SUBSCRIPTION,
      priority,
      subject,
      message,
      metadata: {
        organizationId,
        subscriptionId,
      },
    });
  }

  async sendQuotaWarningNotification(
    userId: string,
    organizationId: string,
    warningType: 'approaching_limit' | 'limit_exceeded',
    resourceType: 'runs' | 'exports' | 'storage' | 'api_calls',
    currentUsage: number,
    limit: number,
  ): Promise<void> {
    const subject = warningType === 'approaching_limit'
      ? `Quota Warning: ${resourceType.toUpperCase()} Limit Approaching`
      : `Quota Exceeded: ${resourceType.toUpperCase()} Limit Reached`;

    const message = warningType === 'approaching_limit'
      ? `Your organization "${organizationId}" is approaching the ${resourceType} limit. Current usage: ${currentUsage}/${limit}. Consider upgrading your subscription to avoid service interruption.`
      : `Your organization "${organizationId}" has exceeded the ${resourceType} limit (${currentUsage}/${limit}). Please upgrade your subscription or reduce usage.`;

    const priority = warningType === 'limit_exceeded' 
      ? NotificationPriority.HIGH 
      : NotificationPriority.NORMAL;

    await this.createAndSendNotification({
      recipient: userId,
      types: [NotificationType.EMAIL, NotificationType.IN_APP],
      category: NotificationCategory.QUOTA_WARNING,
      priority,
      subject,
      message,
      metadata: {
        organizationId,
        additionalData: {
          resourceType,
          currentUsage,
          limit,
          warningType,
        },
      },
    });
  }

  async sendSystemAlertNotification(
    recipients: string[],
    alertType: 'maintenance' | 'security' | 'outage' | 'update',
    title: string,
    description: string,
    priority: NotificationPriority = NotificationPriority.HIGH,
  ): Promise<void> {
    const subject = `System Alert: ${title}`;
    
    // Send to all recipients
    for (const recipient of recipients) {
      await this.createAndSendNotification({
        recipient,
        types: [NotificationType.EMAIL, NotificationType.IN_APP],
        category: NotificationCategory.SYSTEM_ALERT,
        priority,
        subject,
        message: description,
        metadata: {
          additionalData: {
            alertType,
          },
        },
      });
    }
  }

  async sendSecurityNotification(
    userId: string,
    organizationId: string,
    eventType: 'login_attempt' | 'password_change' | 'suspicious_activity' | 'account_locked',
    details: string,
  ): Promise<void> {
    const eventTitles = {
      login_attempt: 'New Login Detected',
      password_change: 'Password Changed',
      suspicious_activity: 'Suspicious Activity Detected',
      account_locked: 'Account Locked',
    };

    const subject = `Security Alert: ${eventTitles[eventType]}`;
    const message = `Security event for organization "${organizationId}": ${details}`;

    await this.createAndSendNotification({
      recipient: userId,
      types: [NotificationType.EMAIL, NotificationType.IN_APP],
      category: NotificationCategory.SECURITY,
      priority: NotificationPriority.URGENT,
      subject,
      message,
      metadata: {
        organizationId,
        additionalData: {
          eventType,
        },
      },
    });
  }

  async sendComplianceNotification(
    userId: string,
    organizationId: string,
    complianceType: 'report_ready' | 'audit_required' | 'certification_expiring',
    details: string,
  ): Promise<void> {
    const subject = `Compliance Notice: ${complianceType.replace('_', ' ').toUpperCase()}`;
    const message = `Compliance notification for organization "${organizationId}": ${details}`;

    await this.createAndSendNotification({
      recipient: userId,
      types: [NotificationType.EMAIL, NotificationType.IN_APP],
      category: NotificationCategory.COMPLIANCE,
      priority: NotificationPriority.NORMAL,
      subject,
      message,
      metadata: {
        organizationId,
        additionalData: {
          complianceType,
        },
      },
    });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotification(bulkDto: BulkNotificationDto): Promise<void> {
    this.logger.log(`Sending bulk notification to ${bulkDto.recipients.length} recipients`);
    
    for (const recipient of bulkDto.recipients) {
      try {
        await this.createAndSendNotification({
          recipient,
          types: bulkDto.types,
          category: bulkDto.category,
          priority: bulkDto.priority,
          subject: bulkDto.subject,
          message: bulkDto.message,
          metadata: bulkDto.metadata,
        });
      } catch (error) {
        this.logger.error(`Failed to send notification to ${recipient}:`, error);
      }
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.getNotificationById(userId, notificationId);
    if (notification) {
      notification.status = NotificationStatus.READ;
      await this.updateNotification(notification);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    const notifications = await this.listNotificationsByUser(userId);
    const unreadNotifications = notifications.filter(n => n.status !== NotificationStatus.READ);
    
    for (const notification of unreadNotifications) {
      notification.status = NotificationStatus.READ;
      await this.updateNotification(notification);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    const notifications = await this.listNotificationsByUser(userId);
    return notifications.filter(n => n.status !== NotificationStatus.READ).length;
  }

  async createAndSendNotification(createDto: CreateNotificationDto): Promise<void> {
    const notificationId = uuidv4();
    const now = new Date().toISOString();

    // Create notifications for each type
    for (const type of createDto.types) {
      const notification: NotificationDto = {
        notificationId: `${notificationId}_${type}`,
        userId: createDto.recipient,
        type,
        status: NotificationStatus.PENDING,
        subject: createDto.subject,
        message: createDto.message,
        createdAt: now,
        updatedAt: now,
      };

      // Save notification to database
      await this.createNotification(notification);

      // Send notification based on type
      try {
        if (type === NotificationType.EMAIL) {
          await this.sendEmailNotification(notification);
        }
        // SMS and IN_APP notifications would be handled here
        
        // Update status to sent
        notification.status = NotificationStatus.SENT;
        notification.updatedAt = new Date().toISOString();
        await this.updateNotification(notification);

      } catch (error) {
        this.logger.error(`Failed to send ${type} notification:`, error);
        notification.status = NotificationStatus.FAILED;
        notification.updatedAt = new Date().toISOString();
        await this.updateNotification(notification);
      }
    }
  }

  private async sendEmailNotification(notification: NotificationDto): Promise<void> {
    await this.sesService.sendEmail({
      to: [notification.userId], // Assuming userId is email
      subject: notification.subject,
      htmlBody: notification.message,
    });
  }
}
