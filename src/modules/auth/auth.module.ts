import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CognitoService } from './services/cognito.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

/**
 * Auth Module
 * Handles user authentication, registration, and JWT token management
 * Integrates with AWS Cognito for user pool management
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
  ],
  controllers: [AuthController],
  providers: [AuthService, CognitoService, JwtStrategy, JwtAuthGuard],
  exports: [AuthService, PassportModule, CognitoService, JwtAuthGuard],
})
export class AuthModule {}
