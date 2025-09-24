import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationsService } from './services/organizations.service';
import { ClientsDataRepository } from './repositories/clients-data.repository';
import { PendingJoinsRepository } from './repositories/pending-joins.repository';

/**
 * Organizations Module
 * Handles multi-tenant organization management and member operations
 */
@Module({
  imports: [DatabaseModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService, ClientsDataRepository, PendingJoinsRepository],
  exports: [OrganizationsService, ClientsDataRepository, PendingJoinsRepository],
})
export class OrganizationsModule {}
