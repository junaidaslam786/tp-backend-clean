import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './modules/auth';
import { UsersModule } from './modules/users/users.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { DatabaseModule } from './core/database/database.module';
import { AwsModule } from './core/aws/aws.module';

// Module imports
import { PaymentsModule } from './modules/payments/payments.module';
import { PartnersModule } from './modules/partners/partners.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { ProfilingModule } from './modules/profiling/profiling.module';
import { ReportsModule } from './modules/reports/reports.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { AdminModule } from './modules/admin/admin.module';

// Configuration imports
import { appConfig } from './config/app.config';
import { authConfig } from './config/auth.config';
import { databaseConfig } from './config/database.config';
import { awsConfig } from './config/aws.config';
import { paymentConfig } from './config/payment.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, authConfig, databaseConfig, awsConfig, paymentConfig],
    }),
    DatabaseModule,
    AwsModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    PaymentsModule,
    PartnersModule,
    SubscriptionsModule,
    ProfilingModule,
    ReportsModule,
    NotificationsModule,
    ComplianceModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
