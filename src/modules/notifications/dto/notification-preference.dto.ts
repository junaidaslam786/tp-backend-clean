import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NotificationType } from './notification.dto';
import { NotificationCategory } from './create-notification.dto';

export class NotificationPreferenceDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Notification category',
    enum: NotificationCategory,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  @IsBoolean()
  enabled: boolean;

  @ApiProperty({ description: 'Preference creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsString()
  updatedAt: string;
}

export class UpdateNotificationPreferenceDto {
  @ApiProperty({
    description: 'Notification category',
    enum: NotificationCategory,
  })
  @IsEnum(NotificationCategory)
  category: NotificationCategory;

  @ApiProperty({
    description: 'Notification type',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Whether notifications are enabled' })
  @IsBoolean()
  enabled: boolean;
}

export class NotificationPreferencesResponseDto {
  @ApiProperty({ description: 'User ID' })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'List of notification preferences',
    type: [NotificationPreferenceDto],
  })
  preferences: NotificationPreferenceDto[];
}
