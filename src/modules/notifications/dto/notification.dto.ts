import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsDateString, IsArray } from 'class-validator';

export enum NotificationType {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  IN_APP = 'IN_APP',
}

export enum NotificationStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export class NotificationDto {
  @ApiProperty({ description: 'Notification unique identifier' })
  @IsString()
  notificationId: string;

  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  userId: string;

  @ApiProperty({ description: 'Type of notification', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Notification status', enum: NotificationStatus })
  @IsEnum(NotificationStatus)
  status: NotificationStatus;

  @ApiProperty({ description: 'Notification subject/title' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Notification message body' })
  @IsString()
  message: string;

  @ApiProperty({ description: 'Optional: List of recipient emails', required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  recipients?: string[];

  @ApiProperty({ description: 'Notification creation timestamp' })
  @IsDateString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsDateString()
  updatedAt: string;
}
