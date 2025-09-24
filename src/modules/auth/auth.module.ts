import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { RoleOnboardingController } from './controllers/role-onboarding.controller';
import { AuthService } from './services/auth.service';
import { OnboardingService } from './services/onboarding.service';
import { RoleBasedOnboardingService } from './services/role-based-onboarding.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CognitoService } from './services/cognito.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { UsersModule } from '../users/users.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { DatabaseModule } from '../../core/database/database.module';

/**
 * Auth Module
 * Handles user authentication, registration, and JWT token management
 * Integrates with AWS Cognito for user pool management
 * Includes role-based onboarding for platform admins, organization admins, and viewers
 */
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'cognito-jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '24h'),
        },
      }),
    }),
    UsersModule,
    OrganizationsModule,
    DatabaseModule,
  ],
  controllers: [AuthController, RoleOnboardingController],
  providers: [
    AuthService,
    CognitoService,
    OnboardingService,
    RoleBasedOnboardingService,
    JwtStrategy,
    JwtAuthGuard,
  ],
  exports: [
    AuthService,
    PassportModule,
    CognitoService,
    OnboardingService,
    RoleBasedOnboardingService,
    JwtAuthGuard,
  ],
})
export class AuthModule {}
