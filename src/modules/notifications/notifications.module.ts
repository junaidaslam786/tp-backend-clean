import { Module } from '@nestjs/common';
import { NotificationController } from './controllers/notification.controller';
import { NotificationService } from './services/notification.service';
import { NotificationRepository } from './repositories/notification.repository';
import { DatabaseModule } from '../../core/database/database.module';
import { AwsModule } from '../../core/aws/aws.module';

@Module({
  imports: [DatabaseModule, AwsModule],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepository],
  exports: [NotificationService],
})
export class NotificationsModule {}
