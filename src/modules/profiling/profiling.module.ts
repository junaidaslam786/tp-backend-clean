import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { ProfilingController } from './controllers/profiling.controller';
import { ProfilingService } from './services/profiling.service';
import { ProfilingRepository } from './repositories/profiling.repository';
import { QuotaValidationService } from './services/quota-validation.service';

@Module({
  imports: [DatabaseModule],
  controllers: [ProfilingController],
  providers: [
    ProfilingService, 
    ProfilingRepository, 
    QuotaValidationService,
  ],
  exports: [
    ProfilingService, 
    ProfilingRepository, 
    QuotaValidationService,
  ],
})
export class ProfilingModule {}
