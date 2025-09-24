import { Module } from '@nestjs/common';
import { AdminController } from './controllers/admin.controller';
import { AdminService } from './services/admin.service';
import { SubscriptionAdminService } from './services/subscription-admin.service';
import { AdminRepository } from './repositories/admin.repository';
import { DatabaseModule } from '../../core/database/database.module';
import { ProfilingModule } from '../profiling/profiling.module';

@Module({
  imports: [DatabaseModule, ProfilingModule],
  controllers: [AdminController],
  providers: [AdminService, SubscriptionAdminService, AdminRepository],
  exports: [AdminService, SubscriptionAdminService],
})
export class AdminModule {}
