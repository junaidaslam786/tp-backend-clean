import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Res,
  Query,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response, Request as ExpressRequest } from 'express';
import { AuthService } from '../services/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { BaseResponseDto } from '../../../common/dto/response.dto';
import {
  LoginDto,
  RegisterDto,
  RefreshTokenDto,
  VerifyMfaDto,
  ResetPasswordDto,
  AuthResponseDto,
} from '../dto/index';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

declare module 'express-serve-static-core' {
  interface Request {
    session?: any;
  }
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Get authentication configuration
   */
  @Get('config')
  @ApiOperation({ summary: 'Get authentication configuration and URLs' })
  @ApiResponse({
    status: 200,
    description: 'Authentication configuration retrieved successfully',
    type: BaseResponseDto,
  })
  async getConfig(): Promise<any> {
    const hostedUIConfig = this.authService.getHostedUIConfig();

    return {
      ...hostedUIConfig,
      instructions: {
        signUp:
          'Use signUpUrl for user registration with email, password, and full name',
        signIn: 'Use signInUrl for user login with email and password',
        flow: 'Frontend handles redirect, then calls /auth/exchange-code with the authorization code',
        fields: {
          signUp: ['email', 'password', 'confirm_password', 'name'],
          signIn: ['email', 'password'],
          custom: ['custom:full_name'],
        },
        endpoints: {
          config: 'GET /auth/config - Get authentication configuration',
          exchangeCode:
            'POST /auth/exchange-code - Exchange authorization code for tokens',
          validate: 'POST /auth/validate - Validate existing token',
          logout: 'POST /auth/logout - Logout user',
        },
        uiCustomization: {
          note: 'Cognito hosted UI fields are configured in AWS Console',
          signUpFields: 'Email, Password, Confirm Password, Name/Full Name',
          signInFields: 'Email, Password',
          customAttributes: 'configured in User Pool attributes',
        },
      },
    };
  }

  /**
   * Redirect to Cognito sign-in
   */
  @Get('signin')
  @ApiOperation({ summary: 'Redirect to Cognito hosted UI for sign-in' })
  @ApiResponse({ status: 302, description: 'Redirect to Cognito sign-in page' })
  redirectToSignIn(@Res() res: Response): void {
    const config = this.authService.getHostedUIConfig();
    res.redirect(302, config.signInUrl);
  }

  /**
   * Redirect to Cognito sign-up
   */
  @Get('signup')
  @ApiOperation({ summary: 'Redirect to Cognito hosted UI for sign-up' })
  @ApiResponse({ status: 302, description: 'Redirect to Cognito sign-up page' })
  redirectToSignUp(@Res() res: Response): void {
    const config = this.authService.getHostedUIConfig();
    res.redirect(302, config.signUpUrl);
  }

  /**
   * Exchange authorization code for tokens
   */
  @Post('exchange-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange authorization code for tokens' })
  @ApiResponse({
    status: 200,
    description: 'Code exchanged successfully',
    type: AuthResponseDto,
  })
  async exchangeCode(@Body() body: { code: string; state?: string }): Promise<{
    success: boolean;
    user: any;
    tokens: any;
    session: any;
  }> {
    // const startTime = Date.now();

    try {
      if (!body.code) {
        throw new BadRequestException('Authorization code missing');
      }

      // Exchange code for tokens
      const tokens = await this.authService.exchangeCodeForTokens(body.code);

      // Get user information
      const userInfo = await this.authService.getUserInfo(tokens.access_token);

      // Verify and enrich ID token
      const idTokenPayload = await this.authService.verifyIdToken(
        tokens.id_token,
      );

      // Prepare user data for frontend
      const userData = {
        user: {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || idTokenPayload.name || idTokenPayload.fullName,
          fullName:
            userInfo['custom:full_name'] ||
            userInfo.name ||
            (userInfo.given_name && userInfo.family_name
              ? `${userInfo.given_name} ${userInfo.family_name}`
              : ''),
          givenName: userInfo.given_name,
          familyName: userInfo.family_name,
          emailVerified: userInfo.email_verified,
        },
        tokens: {
          accessToken: tokens.access_token,
          idToken: tokens.id_token,
          refreshToken: tokens.refresh_token,
          expiresIn: tokens.expires_in,
          tokenType: tokens.token_type,
        },
        session: {
          loginTime: new Date().toISOString(),
          expiresAt: new Date(
            Date.now() + tokens.expires_in * 1000,
          ).toISOString(),
        },
      };

      return {
        success: true,
        ...userData,
      };
    } catch (error) {
      throw new BadRequestException(`Code exchange failed: ${error.message}`);
    }
  }

  /**
   * Handle OAuth callback from Cognito
   */
  @Get('callback')
  async handleCallback(
    @Query('code') code: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Query('state') state: string,
    @Res() res: Response,
  ): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      if (error) {
        const errorParams = new URLSearchParams({
          error: error,
          error_description: errorDescription || 'Authentication failed',
          ...(state && { state }),
        });
        return res.redirect(
          302,
          `${frontendUrl}/auth-redirect-handler?${errorParams.toString()}`,
        );
      }

      if (code) {
        const successParams = new URLSearchParams({
          code: code,
          ...(state && { state }),
        });
        return res.redirect(
          302,
          `${frontendUrl}/auth-redirect-handler?${successParams.toString()}`,
        );
      }

      const errorParams = new URLSearchParams({
        error: 'invalid_request',
        error_description: 'No authorization code or error provided',
      });
      return res.redirect(
        302,
        `${frontendUrl}/auth-redirect-handler?${errorParams.toString()}`,
      );
    } catch (error) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const errorParams = new URLSearchParams({
        error: 'callback_failed',
        error_description: error.message || 'Authentication callback failed',
      });
      res.redirect(
        302,
        `${frontendUrl}/auth-redirect-handler?${errorParams.toString()}`,
      );
    }
  }

  /**
   * Validate token endpoint for API calls
   */
  @Post('validate')
  async validateToken(@Request() req: ExpressRequest): Promise<{
    valid: boolean;
    user?: any;
    error?: string;
  }> {
    try {
      const authHeader = req.headers['authorization'];
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No valid authorization header');
      }

      const token = authHeader.replace('Bearer ', '');
      const userInfo = await this.authService.extractUserInfo(token);

      return {
        valid: true,
        user: {
          id: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name,
          fullName: userInfo.fullName,
          tokenType: userInfo.tokenType,
        },
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Register user (placeholder)
   */
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register new user' })
  async register(@Body() registerDto: RegisterDto): Promise<BaseResponseDto> {
    const result = await this.authService.register(registerDto);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Login user (placeholder)
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate user and get access token' })
  async login(@Body() loginDto: LoginDto): Promise<BaseResponseDto> {
    const result = await this.authService.login(loginDto);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Verify MFA token
   */
  @Post('verify-mfa')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify MFA token' })
  async verifyMfa(
    @Body() verifyMfaDto: VerifyMfaDto,
  ): Promise<BaseResponseDto> {
    const result = await this.authService.verifyMfa(verifyMfaDto);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Initiate password reset
   */
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Initiate password reset process' })
  async forgotPassword(
    @Body() body: { email: string },
  ): Promise<BaseResponseDto> {
    const result = await this.authService.forgotPassword(body.email);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Complete password reset
   */
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete password reset with verification code' })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<BaseResponseDto> {
    const result = await this.authService.resetPassword(resetPasswordDto);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Get current user profile
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any): Promise<BaseResponseDto> {
    const user = req.user;
    return new BaseResponseDto({ user }, `req_${Date.now()}`);
  }

  /**
   * Refresh JWT token
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token using refresh token' })
  async refreshToken(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<BaseResponseDto> {
    const result = await this.authService.refreshToken(refreshTokenDto);
    return new BaseResponseDto(result, `req_${Date.now()}`);
  }

  /**
   * Logout user
   */
  @Post('logout')
  @Get('logout')
  async logout(
    @Request() req: ExpressRequest,
    @Res() res: Response,
    @Query('global') global: string = 'true',
    @Query('redirect_uri') customRedirectUri?: string,
    @Query('local_only') localOnly: string = 'false',
    @Query('format') format?: 'json' | 'redirect',
  ) {
    const startTime = Date.now();
    let userInfo: any = null;

    try {
      // Extract user info if possible
      const authHeader = req.headers['authorization'];
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          userInfo = await this.authService.extractUserInfo(token);
        } catch (tokenError) {
          // Continue with logout even if token is invalid
        }
      }

      // Perform server-side cleanup
      if (req.session) {
        req.session.destroy((err) => {
          if (err) console.warn('Session destroy error:', err.message);
        });
      }

      // Handle local-only logout
      if (localOnly === 'true') {
        if (this.shouldReturnJson(req, format)) {
          return res.status(200).json({
            success: true,
            message: 'Local logout completed',
            type: 'local_only',
            user: userInfo
              ? { sub: userInfo.sub, email: userInfo.email }
              : null,
            timestamp: new Date().toISOString(),
            duration: Date.now() - startTime,
          });
        } else {
          const redirectTo =
            customRedirectUri || process.env.FRONTEND_URL || '/';
          return res.redirect(302, redirectTo);
        }
      }

      // Generate Cognito logout URL
      const cognitoLogoutUrl = this.generateLogoutUrl(
        customRedirectUri,
        global === 'true',
      );

      // Determine response type
      if (this.shouldReturnJson(req, format)) {
        return res.status(200).json({
          success: true,
          message: 'Logout initiated successfully',
          type: global === 'true' ? 'global' : 'standard',
          cognitoLogoutUrl,
          user: userInfo
            ? { sub: userInfo.sub, email: userInfo.email, name: userInfo.name }
            : null,
          instructions: {
            step1: 'Clear all local tokens immediately',
            step2: 'Redirect to cognitoLogoutUrl',
            step3: 'User will be redirected back after Cognito logout',
          },
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
      } else {
        return res.redirect(302, cognitoLogoutUrl);
      }
    } catch (error) {
      const fallbackUrl = this.generateLogoutUrl(customRedirectUri, false);

      if (this.shouldReturnJson(req, format)) {
        return res.status(500).json({
          success: false,
          message: 'Logout error occurred but session cleared',
          fallbackLogoutUrl: fallbackUrl,
          recommendation: 'Clear local tokens and use fallback URL',
          timestamp: new Date().toISOString(),
          duration: Date.now() - startTime,
        });
      } else {
        return res.redirect(302, fallbackUrl);
      }
    }
  }

  /**
   * Health check endpoint
   */
  @Get('health')
  @ApiOperation({ summary: 'Check authentication service health' })
  async healthCheck(): Promise<any> {
    try {
      const jwksTest = await this.authService.testJWKSConnectivity();
      const config = this.authService.getHostedUIConfig();

      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        auth_service: {
          issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
          client_id: process.env.COGNITO_CLIENT_ID,
          region: process.env.AWS_REGION,
          user_pool_id: process.env.COGNITO_USER_POOL_ID,
        },
        jwks_connectivity: jwksTest,
        network_status: this.authService.getNetworkStatus(),
        configuration: {
          domain: config.domain,
          redirectUri: config.redirectUri,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('test-cognito')
  async testCognito(): Promise<any> {
    return await this.authService.testCognitoConfiguration();
  }

  @Get('debug/detailed')
  async getDetailedDebug(): Promise<any> {
    const config = this.authService.getHostedUIConfig();

    const testResults = await Promise.allSettled([
      fetch('https://tpauth.cyorn.com/.well-known/openid-configuration'),
      fetch('https://tpauth.cyorn.com/oauth2/authorize?client_id=test'),
    ]);

    return {
      environment: {
        NODE_ENV: process.env.NODE_ENV,
        variables: {
          COGNITO_DOMAIN: process.env.COGNITO_DOMAIN,
          COGNITO_CLIENT_ID: process.env.COGNITO_CLIENT_ID,
          COGNITO_REDIRECT_URI: process.env.COGNITO_REDIRECT_URI,
          COGNITO_LOGOUT_URI: process.env.COGNITO_LOGOUT_URI,
          COGNITO_CLIENT_SECRET: process.env.COGNITO_CLIENT_SECRET
            ? '[CONFIGURED]'
            : '[NOT SET]',
        },
      },
      configuration: config,
      connectivity: {
        wellKnown:
          testResults[0].status === 'fulfilled' ? 'reachable' : 'failed',
        authorize:
          testResults[1].status === 'fulfilled' ? 'reachable' : 'failed',
      },
      troubleshooting: {
        mostLikelyIssues: [
          'App client secret required but not provided',
          'Callback URL mismatch in Cognito console',
          'OAuth flows not properly configured',
        ],
        checkThese: [
          'AWS Cognito Console → User Pool → App integration → App clients',
          'Verify "Authorization code grant" is enabled',
          'Check callback URLs match exactly',
          'Confirm app client secret configuration',
        ],
      },
    };
  }

  @Get('jwks-test')
  async testJWKS(): Promise<any> {
    try {
      const result = await this.authService.testJWKSConnectivity();
      return {
        timestamp: new Date().toISOString(),
        ...result,
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Get('debug/token-exchange-test')
  async testTokenExchangeSetup(): Promise<any> {
    const config = this.authService.getHostedUIConfig();
    const clientSecret = process.env.COGNITO_CLIENT_SECRET;

    return {
      status: 'Token Exchange Configuration Test',
      environment: process.env.NODE_ENV,
      configuration: {
        domain: config?.domain,
        clientId: config?.clientId,
        redirectUri: config?.redirectUri,
        hasClientSecret: !!clientSecret,
        clientSecretLength: clientSecret ? clientSecret.length : 0,
      },
      tokenEndpoint: `${config?.domain}/oauth2/token`,
      authMethod: clientSecret
        ? 'Basic Authentication (with client secret)'
        : 'Public Client',
      troubleshooting: {
        note: 'This endpoint shows configuration but does not perform actual token exchange',
        nextStep:
          'Try the actual authentication flow and check logs for detailed error messages',
        commonIssues: [
          'Client secret mismatch',
          'Redirect URI mismatch during token exchange',
          'App client not configured for authorization code grant',
        ],
      },
    };
  }

  @Get('network-diagnostics')
  async runNetworkDiagnostics(): Promise<any> {
    try {
      const jwksUrl = `https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_p9Cm0pLzR/.well-known/jwks.json`;
      const hostname = 'cognito-idp.eu-north-1.amazonaws.com';

      const tests = [];

      // Test 1: curl
      try {
        const { stdout: curlResult } = await execAsync(
          `curl -s -m 10 -w "\\nHTTP_CODE:%{http_code}" "${jwksUrl}"`,
        );
        tests.push({
          test: 'curl',
          status: curlResult.includes('HTTP_CODE:200') ? 'success' : 'failed',
          result: curlResult.substring(0, 200) + '...',
        });
      } catch (error) {
        tests.push({
          test: 'curl',
          status: 'error',
          error: error.message,
        });
      }

      // Test 2: Node.js fetch
      try {
        const response = await fetch(jwksUrl, {
          signal: AbortSignal.timeout(8000),
        });
        tests.push({
          test: 'nodejs_fetch',
          status: response.ok ? 'success' : 'failed',
          httpStatus: response.status,
        });
      } catch (error) {
        tests.push({
          test: 'nodejs_fetch',
          status: 'error',
          error: error.message,
        });
      }

      tests.push({
        test: 'node_info',
        status: 'info',
        version: process.version,
        platform: process.platform,
        arch: process.arch,
      });

      return {
        timestamp: new Date().toISOString(),
        target: { hostname, jwksUrl },
        tests,
        summary: {
          curl_works:
            tests.find((t) => t.test === 'curl')?.status === 'success',
          nodejs_fetch_works:
            tests.find((t) => t.test === 'nodejs_fetch')?.status === 'success',
          issue_identified:
            tests.find((t) => t.test === 'curl')?.status === 'success' &&
            tests.find((t) => t.test === 'nodejs_fetch')?.status !== 'success',
        },
        recommendation:
          tests.find((t) => t.test === 'curl')?.status === 'success' &&
          tests.find((t) => t.test === 'nodejs_fetch')?.status !== 'success'
            ? 'Node.js fetch is broken - use custom HTTPS implementation'
            : 'Further investigation needed',
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  @Post('debug-token')
  async debugToken(@Headers('authorization') authHeader: string): Promise<any> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        error: 'Missing or invalid authorization header',
        expected_format: 'Bearer <token>',
      };
    }

    const token = authHeader.replace('Bearer ', '');

    try {
      const verifiedPayload = await this.authService.verifyToken(token);

      return {
        status: 'success',
        message: 'Token verified successfully',
        payload: {
          sub: verifiedPayload.sub,
          email: verifiedPayload.email,
          token_use: verifiedPayload.token_use,
          aud: verifiedPayload.aud,
          client_id: verifiedPayload.client_id,
          exp: new Date(verifiedPayload.exp * 1000).toISOString(),
          iat: new Date(verifiedPayload.iat * 1000).toISOString(),
        },
      };
    } catch (error) {
      try {
        const [header, payload] = token.split('.');
        const decodedHeader = JSON.parse(
          Buffer.from(header, 'base64').toString(),
        );
        const decodedPayload = JSON.parse(
          Buffer.from(payload, 'base64').toString(),
        );

        return {
          status: 'failed',
          error: error.message,
          raw_token_info: {
            header: decodedHeader,
            payload: {
              sub: decodedPayload.sub,
              email: decodedPayload.email,
              token_use: decodedPayload.token_use,
              aud: decodedPayload.aud,
              client_id: decodedPayload.client_id,
              iss: decodedPayload.iss,
              exp: new Date(decodedPayload.exp * 1000).toISOString(),
              iat: new Date(decodedPayload.iat * 1000).toISOString(),
            },
          },
          expected_issuer: `https://cognito-idp.${process.env.AWS_REGION}.amazonaws.com/${process.env.COGNITO_USER_POOL_ID}`,
          expected_client_id: process.env.COGNITO_CLIENT_ID,
        };
      } catch (parseError) {
        return {
          status: 'failed',
          error: error.message,
          parse_error: 'Could not parse token structure',
        };
      }
    }
  }

  // === PRIVATE HELPER METHODS ===

  private generateLogoutUrl(
    customRedirectUri?: string,
    global: boolean = true,
  ): string {
    const clientId = process.env.COGNITO_CLIENT_ID;
    let cognitoDomain = process.env.COGNITO_DOMAIN;
    cognitoDomain = cognitoDomain.replace(/^https?:\/\//, '');

    const defaultRedirectUri =
      process.env.COGNITO_LOGOUT_URI || process.env.COGNITO_REDIRECT_URI;
    const logoutRedirectUri = customRedirectUri || defaultRedirectUri;

    const params = new URLSearchParams({
      client_id: clientId,
      logout_uri: logoutRedirectUri,
    });

    if (global) {
      params.append('response_type', 'code');
    }

    return `https://${cognitoDomain}/logout?${params.toString()}`;
  }

  private shouldReturnJson(req: ExpressRequest, formatParam?: string): boolean {
    if (formatParam === 'json') return true;
    if (formatParam === 'redirect') return false;

    const accept = req.headers.accept || '';
    const contentType = req.headers['content-type'] || '';

    return (
      accept.includes('application/json') ||
      contentType.includes('application/json') ||
      req.method === 'POST'
    );
  }
}
