import { ApiProperty } from '@nestjs/swagger';
import { 
  IsString, 
  IsEnum, 
  IsOptional, 
  IsArray, 
  ValidateNested,
  IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from './notification.dto';

export enum NotificationPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationCategory {
  THREAT_ASSESSMENT = 'THREAT_ASSESSMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  QUOTA_WARNING = 'QUOTA_WARNING',
  SYSTEM_ALERT = 'SYSTEM_ALERT',
  SECURITY = 'SECURITY',
  COMPLIANCE = 'COMPLIANCE',
  ADMIN = 'ADMIN',
}

export class NotificationMetadata {
  @ApiProperty({ description: 'Organization ID if relevant' })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({ description: 'Subscription ID if relevant' })
  @IsOptional()
  @IsString()
  subscriptionId?: string;

  @ApiProperty({ description: 'Assessment ID if relevant' })
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiProperty({ description: 'Additional metadata as key-value pairs' })
  @IsOptional()
  @IsObject()
  additionalData?: Record<string, any>;
}

export class CreateNotificationDto {
  @ApiProperty({ description: 'Recipient user ID or email' })
  @IsString()
  recipient: string;

  @ApiProperty({ 
    description: 'List of notification types to send',
    enum: NotificationType,
    isArray: true
  })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types: NotificationType[];

  @ApiProperty({ 
    description: 'Notification category',
    enum: NotificationCategory 
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({ 
    description: 'Notification priority',
    enum: NotificationPriority 
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({ description: 'Notification subject/title' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Optional additional recipients',
    required: false 
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  additionalRecipients?: string[];

  @ApiProperty({ 
    description: 'Notification metadata',
    type: NotificationMetadata,
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationMetadata)
  metadata?: NotificationMetadata;

  @ApiProperty({ 
    description: 'Schedule notification for later (ISO string)',
    required: false 
  })
  @IsOptional()
  @IsString()
  scheduledFor?: string;
}

export class BulkNotificationDto {
  @ApiProperty({ 
    description: 'List of recipient user IDs or emails',
    isArray: true 
  })
  @IsArray()
  @IsString({ each: true })
  recipients: string[];

  @ApiProperty({ 
    description: 'Notification types to send',
    enum: NotificationType,
    isArray: true
  })
  @IsArray()
  @IsEnum(NotificationType, { each: true })
  types: NotificationType[];

  @ApiProperty({ 
    description: 'Notification category',
    enum: NotificationCategory 
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({ 
    description: 'Notification priority',
    enum: NotificationPriority 
  })
  @IsEnum(NotificationPriority)
  priority: NotificationPriority;

  @ApiProperty({ description: 'Notification subject/title' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message: string;

  @ApiProperty({ 
    description: 'Notification metadata',
    type: NotificationMetadata,
    required: false 
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => NotificationMetadata)
  metadata?: NotificationMetadata;
}
