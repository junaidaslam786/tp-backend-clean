import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CognitoService } from './cognito.service';
import { RoleBasedOnboardingService } from './role-based-onboarding.service';
import { UserRepository } from '../../users/repositories/user.repository';
import { AuthConfig } from '../../../config/auth.config';
import { AuthUser, AuthSession } from '../interfaces/auth.interfaces';
import { UserStatus } from '../../users/interfaces/user.interface';
import {
  ExchangeCodeDto,
  LoginDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyMfaDto,
} from '../dto/index';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private authConfig: AuthConfig;

  constructor(
    private configService: ConfigService,
    private cognitoService: CognitoService,
    private roleBasedOnboardingService: RoleBasedOnboardingService,
    private userRepository: UserRepository,
  ) {
    this.authConfig = this.configService.get<AuthConfig>('auth')!;
  }

  /**
   * Register new user (placeholder for future local auth)
   */
  async register(registerDto: RegisterDto): Promise<{ message: string }> {
    this.logger.warn(
      'Registration attempted - redirecting to Cognito Hosted UI',
      {
        email: registerDto.email,
      },
    );

    return {
      message:
        'Registration currently handled through Cognito Hosted UI. Please use the /auth/signup endpoint.',
    };
  }

  /**
   * Login user (placeholder for future local auth)
   */
  async login(loginDto: LoginDto): Promise<{ message: string }> {
    this.logger.warn('Login attempted - redirecting to Cognito Hosted UI', {
      email: loginDto.email,
    });

    return {
      message:
        'Login currently handled through Cognito Hosted UI. Please use the /auth/signin endpoint.',
    };
  }

  /**
   * Exchange authorization code for tokens with role-based onboarding
   */
  async exchangeCode(exchangeCodeDto: ExchangeCodeDto): Promise<AuthSession> {
    try {
      const tokens = await this.cognitoService.exchangeCodeForTokens(
        exchangeCodeDto.code,
      );
      const userInfo = await this.cognitoService.getUserInfo(
        tokens.access_token,
      );
      const idTokenPayload = await this.cognitoService.verifyToken(
        tokens.id_token,
      );

      const user: AuthUser = {
        id: userInfo.sub,
        email: userInfo.email,
        name:
          userInfo.name ||
          idTokenPayload.name ||
          userInfo['custom:full_name'] ||
          'User',
        fullName:
          userInfo['custom:full_name'] ||
          userInfo.name ||
          (userInfo.given_name && userInfo.family_name
            ? `${userInfo.given_name} ${userInfo.family_name}`
            : ''),
        username: userInfo['cognito:username'] || userInfo.username,
        tokenType: 'id',
        emailVerified: userInfo.email_verified,
        cognitoUsername: userInfo['cognito:username'],
        cognitoGroups: idTokenPayload['cognito:groups'] || [],
      };

      // Check if user exists in our system and handle onboarding
      let onboardingResult;
      if (user.email) {
        const existingUser = await this.userRepository.findByEmail(user.email);
        if (
          !existingUser ||
          existingUser.status === UserStatus.PENDING_APPROVAL ||
          existingUser.status === UserStatus.INACTIVE
        ) {
          // Check if role-based registration flow is enabled
          if (this.authConfig.defaultRegistrationFlow === 'role_based') {
            try {
              onboardingResult =
                await this.roleBasedOnboardingService.completeRoleBasedRegistration(
                  {
                    email: user.email,
                    fullName: user.fullName || user.name,
                    cognitoGroups: user.cognitoGroups,
                    cognitoUsername: user.username,
                  },
                );

              this.logger.log('✅ Role-based onboarding completed', {
                email: user.email,
                userType: onboardingResult.userType,
                needsApproval: onboardingResult.needsApproval,
              });
            } catch (error) {
              this.logger.warn(
                'Role-based onboarding failed, user can still authenticate',
                {
                  email: user.email,
                  error: error.message,
                },
              );
            }
          }
        }
      }

      const session: AuthSession = {
        user,
        tokens: {
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
        },
        loginTime: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + tokens.expires_in * 1000,
        ).toISOString(),
        onboardingResult, // Include onboarding result for frontend handling
      };

      this.logger.log('✅ User authenticated successfully', {
        userId: user.id,
        email: user.email,
        hasOnboardingResult: !!onboardingResult,
      });
      return session;
    } catch (error) {
      this.logger.error('❌ Code exchange failed:', error.message);
      throw new UnauthorizedException(
        `Authentication failed: ${error.message}`,
      );
    }
  }

  /**
   * Validate token and extract user information
   */
  async validateToken(token: string): Promise<AuthUser> {
    try {
      const payload = await this.cognitoService.verifyToken(token);

      const user: AuthUser = {
        id: payload.sub,
        email: payload.email,
        name: payload.name || payload.username || 'User',
        username: payload.username,
        tokenType: payload.token_use,
        emailVerified: true, // Assume verified from Cognito
      };

      return user;
    } catch (error) {
      this.logger.error('❌ Token validation failed:', error.message);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Refresh access token (placeholder)
   */
  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<{ message: string }> {
    this.logger.warn('Refresh token attempted - not yet implemented', {
      tokenLength: refreshTokenDto.refreshToken?.length || 0,
    });

    return {
      message:
        'Refresh token functionality not implemented yet. Please re-authenticate through Cognito.',
    };
  }

  /**
   * Verify MFA token (placeholder)
   */
  async verifyMfa(verifyMfaDto: VerifyMfaDto): Promise<{ message: string }> {
    this.logger.warn('MFA verification attempted - not yet implemented', {
      session: verifyMfaDto.session,
    });

    return {
      message: 'MFA verification not implemented yet.',
    };
  }

  /**
   * Initiate password reset (placeholder)
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    this.logger.warn('Password reset attempted - not yet implemented', {
      email,
    });

    return {
      message:
        'Password reset functionality not implemented yet. Please use Cognito Hosted UI.',
    };
  }

  /**
   * Complete password reset (placeholder)
   */
  async resetPassword(
    resetPasswordDto: ResetPasswordDto,
  ): Promise<{ message: string }> {
    this.logger.warn(
      'Password reset completion attempted - not yet implemented',
      {
        email: resetPasswordDto.email,
      },
    );

    return {
      message: 'Password reset completion not implemented yet.',
    };
  }

  /**
   * Logout user (placeholder)
   */
  async logout(userId: string): Promise<{ message: string }> {
    this.logger.log('User logged out', { userId });
    return { message: 'Logged out successfully' };
  }

  // === METHODS FROM ORIGINAL IMPLEMENTATION ===

  /**
   * Get user info from Cognito using access token (delegated to CognitoService)
   */
  async getUserInfo(accessToken: string): Promise<any> {
    return this.cognitoService.getUserInfo(accessToken);
  }

  /**
   * Verify ID token (delegated to CognitoService)
   */
  async verifyIdToken(token: string): Promise<any> {
    const payload = await this.cognitoService.verifyToken(token);

    if (payload.token_use !== 'id') {
      throw new Error('Expected ID token but received access token');
    }

    if (!payload.email) {
      throw new Error('ID token missing email claim');
    }

    return payload;
  }

  /**
   * Extract user info from token (delegated to CognitoService)
   */
  async extractUserInfo(token: string): Promise<{
    sub: string;
    email?: string;
    name: string;
    fullName?: string;
    username?: string;
    tokenType: 'id' | 'access';
  }> {
    const payload = await this.cognitoService.verifyToken(token);

    return {
      sub: payload.sub,
      email: payload.email || undefined,
      name:
        payload.name ||
        payload['cognito:username'] ||
        payload.username ||
        'User',
      fullName: payload.name,
      username: payload['cognito:username'] || payload.username,
      tokenType: payload.token_use,
    };
  }

  /**
   * Verify token (delegated to CognitoService)
   */
  async verifyToken(token: string): Promise<any> {
    return this.cognitoService.verifyToken(token);
  }

  /**
   * Test Cognito configuration (delegated to CognitoService)
   */
  async testCognitoConfiguration(): Promise<any> {
    return this.cognitoService.testCognitoConfiguration();
  }

  /**
   * Test JWKS connectivity (delegated to CognitoService)
   */
  async testJWKSConnectivity(): Promise<any> {
    return this.cognitoService.testJWKSConnectivity();
  }

  /**
   * Exchange code for tokens (delegated to CognitoService)
   */
  async exchangeCodeForTokens(code: string): Promise<any> {
    return this.cognitoService.exchangeCodeForTokens(code);
  }

  /**
   * Get Cognito Hosted UI configuration
   */
  getHostedUIConfig() {
    return this.cognitoService.getHostedUIConfig();
  }

  /**
   * Get network status
   */
  getNetworkStatus() {
    return this.cognitoService.getNetworkStatus();
  }
}
