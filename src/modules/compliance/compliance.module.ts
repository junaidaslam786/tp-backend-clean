import { Module } from '@nestjs/common';
import { ComplianceController } from './controllers/compliance.controller';
import { ComplianceService } from './services/compliance.service';
import { ComplianceRepository } from './repositories/compliance.repository';

@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, ComplianceRepository],
  exports: [ComplianceService],
})
export class ComplianceModule {}
