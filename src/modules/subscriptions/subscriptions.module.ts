import { Module } from '@nestjs/common';
import { SubscriptionsController } from './controllers/subscriptions.controller';
import { SubscriptionsService } from './services/subscriptions.service';
import { SubscriptionRepository } from './repositories/subscription.repository';
import { DatabaseModule } from '../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionRepository],
  exports: [SubscriptionsService, SubscriptionRepository],
})
export class SubscriptionsModule {}
