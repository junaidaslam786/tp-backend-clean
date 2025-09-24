import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../core/database/database.module';
import { PartnersController } from './controllers/partners.controller';
import { PartnersService } from './services/partners.service';
import { PartnerRepository, PartnerCodeRepository } from './repositories';

@Module({
  imports: [DatabaseModule],
  controllers: [PartnersController],
  providers: [PartnersService, PartnerRepository, PartnerCodeRepository],
  exports: [PartnersService, PartnerRepository, PartnerCodeRepository],
})
export class PartnersModule {}
