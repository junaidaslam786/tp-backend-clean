import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsBoolean } from 'class-validator';
import { NotificationType, NotificationStatus } from './notification.dto';

export class NotificationTemplateDto {
  @ApiProperty({ description: 'Template unique identifier' })
  @IsString()
  templateId: string;

  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Notification type for this template',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template subject with placeholders' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Template body with placeholders' })
  @IsString()
  body: string;

  @ApiProperty({ description: 'Whether template is active' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: 'Template creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Last update timestamp' })
  @IsString()
  updatedAt: string;
}

export class CreateNotificationTemplateDto {
  @ApiProperty({ description: 'Template name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Template description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Notification type for this template',
    enum: NotificationType,
  })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: 'Template subject with placeholders' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Template body with placeholders' })
  @IsString()
  body: string;
}
