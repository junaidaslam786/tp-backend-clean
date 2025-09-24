import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import * as jwks from 'jwks-rsa';
import * as https from 'https';
// import * as crypto from 'crypto';
import { URL } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthConfig } from '../../../config/auth.config';
import {
  CognitoHostedUIConfig,
  CognitoTokens,
  CognitoUserInfo,
  TokenPayload,
  NetworkStatus,
} from '../interfaces/auth.interfaces';

const execAsync = promisify(exec);

@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private client: jwks.JwksClient;
  private issuer: string;
  private authConfig: AuthConfig;
  private networkIssueCount = 0;
  private lastNetworkIssue: Date | null = null;

  constructor(private configService: ConfigService) {
    this.authConfig = this.configService.get<AuthConfig>('auth')!;
    this.issuer = `https://cognito-idp.${this.authConfig.cognitoRegion}.amazonaws.com/${this.authConfig.cognitoUserPoolId}`;

    this.client = jwks({
      jwksUri: `${this.issuer}/.well-known/jwks.json`,
      cache: true,
      cacheMaxEntries: 10,
      cacheMaxAge: 30 * 60 * 1000,
      rateLimit: true,
      jwksRequestsPerMinute: 20,
      timeout: 15000,
      fetcher: this.customHttpsFetcher.bind(this),
    });

    this.logger.log('✅ CognitoService initialized');
    this.validateConfiguration();
  }

  private validateConfiguration(): void {
    const required = [
      'cognitoUserPoolId',
      'cognitoClientId',
      'cognitoDomain',
      'cognitoRedirectUri',
    ];
    const missing = required.filter((field) => !this.authConfig[field]);

    if (missing.length > 0) {
      this.logger.error(
        `❌ Missing required configuration: ${missing.join(', ')}`,
      );
      throw new Error(`Missing required configuration: ${missing.join(', ')}`);
    }
  }

  private async customHttpsFetcher(uri: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const url = new URL(uri);
        const options: https.RequestOptions = {
          hostname: url.hostname,
          port: url.port || 443,
          path: url.pathname + url.search,
          method: 'GET',
          headers: {
            'User-Agent': 'threat-profiling-backend/1.0',
            Accept: 'application/json',
            Connection: 'close',
          },
          timeout: 10000,
          family: 4,
        };

        const req = https.request(options, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              if (res.statusCode >= 200 && res.statusCode < 300) {
                resolve(JSON.parse(data));
              } else {
                reject(
                  new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`),
                );
              }
            } catch (parseError) {
              reject(new Error(`JSON parse error: ${parseError.message}`));
            }
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  private async httpsRequest(url: string, options: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const requestOptions: https.RequestOptions = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          path: urlObj.pathname + urlObj.search,
          method: options.method || 'GET',
          headers: {
            'User-Agent': 'threat-profiling-backend/1.0',
            Accept: 'application/json',
            ...options.headers,
          },
          timeout: options.timeout || 10000,
          family: 4,
        };

        const req = https.request(requestOptions, (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            const response = {
              ok: res.statusCode >= 200 && res.statusCode < 300,
              status: res.statusCode,
              statusText: res.statusMessage,
              headers: res.headers,
              json: () => {
                try {
                  return Promise.resolve(JSON.parse(data));
                } catch (e) {
                  return Promise.reject(new Error('Invalid JSON'));
                }
              },
              text: () => Promise.resolve(data),
            };
            resolve(response);
          });
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('Request timeout'));
        });

        if (options.body) {
          req.write(options.body);
        }

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  getHostedUIConfig(): CognitoHostedUIConfig {
    const domain = this.authConfig.cognitoDomain.replace(/^https?:\/\//, '');
    const isProduction = process.env.NODE_ENV === 'production';

    const currentRedirectUri = isProduction
      ? process.env.PRODUCTION_COGNITO_REDIRECT_URI ||
        this.authConfig.cognitoRedirectUri
      : this.authConfig.cognitoRedirectUri;

    const currentLogoutUri = isProduction
      ? process.env.PRODUCTION_COGNITO_LOGOUT_URI ||
        this.authConfig.cognitoLogoutUri
      : this.authConfig.cognitoLogoutUri;

    const baseParams = {
      client_id: this.authConfig.cognitoClientId,
      response_type: 'token',
      scope: 'openid',
      redirect_uri: currentRedirectUri,
    };

    const signInParams = new URLSearchParams(baseParams);
    const signUpParams = new URLSearchParams(baseParams);
    const signOutParams = new URLSearchParams({
      client_id: this.authConfig.cognitoClientId,
      logout_uri: currentLogoutUri,
    });

    return {
      signInUrl: `https://${domain}/oauth2/authorize?${signInParams.toString()}`,
      signUpUrl: `https://${domain}/signup?${signUpParams.toString()}`,
      signOutUrl: `https://${domain}/logout?${signOutParams.toString()}`,
      domain: `https://${domain}`,
      clientId: this.authConfig.cognitoClientId,
      redirectUri: currentRedirectUri,
      logoutUri: currentLogoutUri,
      userPoolId: this.authConfig.cognitoUserPoolId,
      region: this.authConfig.cognitoRegion,
    };
  }

  async exchangeCodeForTokens(code: string): Promise<CognitoTokens> {
    const domain = this.authConfig.cognitoDomain.replace(/^https?:\/\//, '');
    const tokenEndpoint = `https://${domain}/oauth2/token`;

    const isProduction = process.env.NODE_ENV === 'production';
    const currentRedirectUri = isProduction
      ? process.env.PRODUCTION_COGNITO_REDIRECT_URI ||
        this.authConfig.cognitoRedirectUri
      : this.authConfig.cognitoRedirectUri;

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.authConfig.cognitoClientId,
      code: code,
      redirect_uri: currentRedirectUri,
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    if (this.authConfig.cognitoClientSecret) {
      const authString = Buffer.from(
        `${this.authConfig.cognitoClientId}:${this.authConfig.cognitoClientSecret}`,
      ).toString('base64');
      headers['Authorization'] = `Basic ${authString}`;
    }

    try {
      const response = await fetch(tokenEndpoint, {
        method: 'POST',
        headers,
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error('❌ Token exchange error:', {
          status: response.status,
          error: errorText,
        });
        throw new Error(
          `Token exchange failed: ${response.status} - ${errorText}`,
        );
      }

      const tokens = await response.json();
      this.logger.log('✅ Successfully exchanged code for tokens');
      return tokens;
    } catch (error) {
      this.logger.error('❌ Token exchange failed:', error.message);
      throw new Error(
        `Failed to exchange authorization code: ${error.message}`,
      );
    }
  }

  async getUserInfo(accessToken: string): Promise<CognitoUserInfo> {
    const domain = this.authConfig.cognitoDomain.replace(/^https?:\/\//, '');
    const userInfoEndpoint = `https://${domain}/oauth2/userInfo`;

    try {
      const response = await fetch(userInfoEndpoint, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`UserInfo request failed: ${response.status}`);
      }

      const userInfo = await response.json();
      this.logger.log('✅ Successfully retrieved user info');
      return userInfo;
    } catch (error) {
      this.logger.error('❌ UserInfo request failed:', error.message);
      throw new Error(`Failed to get user info: ${error.message}`);
    }
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    return new Promise((resolve, reject) => {
      jwt.verify(
        token,
        this.getKey.bind(this),
        {
          algorithms: ['RS256'],
          issuer: this.issuer,
          ignoreExpiration: false,
          clockTolerance: 300,
        },
        (err, decoded: any) => {
          if (err) {
            this.logger.error('❌ JWT verify error:', err.message);

            if (err.name === 'TokenExpiredError') {
              reject(new Error('TOKEN_EXPIRED'));
            } else if (err.name === 'JsonWebTokenError') {
              reject(new Error('INVALID_TOKEN'));
            } else {
              reject(new Error('TOKEN_VERIFICATION_FAILED'));
            }
            return;
          }

          // Validate token type and audience
          if (decoded.token_use !== 'id' && decoded.token_use !== 'access') {
            reject(new Error('INVALID_TOKEN_TYPE'));
            return;
          }

          const tokenClientId = decoded.aud || decoded.client_id;
          if (tokenClientId !== this.authConfig.cognitoClientId) {
            reject(new Error('INVALID_AUDIENCE'));
            return;
          }

          // Enrich payload
          const enrichedPayload = this.enrichTokenPayload(decoded);
          resolve(enrichedPayload);
        },
      );
    });
  }

  private enrichTokenPayload(decoded: any): any {
    const enriched = { ...decoded };

    if (decoded.token_use === 'id') {
      enriched.email = decoded.email;
      enriched.name =
        decoded.name ||
        decoded['custom:full_name'] ||
        decoded['cognito:username'] ||
        'User';
      enriched.fullName =
        decoded['custom:full_name'] ||
        decoded.name ||
        (decoded.given_name && decoded.family_name
          ? `${decoded.given_name} ${decoded.family_name}`
          : '');
      enriched.emailVerified = decoded.email_verified;
      enriched.givenName = decoded.given_name;
      enriched.familyName = decoded.family_name;
    } else if (decoded.token_use === 'access') {
      enriched.username = decoded.username;
      enriched.name = decoded.username || 'User';
    }

    enriched.userId = decoded.sub;
    enriched.cognitoUsername = decoded['cognito:username'] || decoded.username;
    enriched.tokenType = decoded.token_use;

    return enriched;
  }

  private getKey(
    header: jwt.JwtHeader,
    callback: jwt.SigningKeyCallback,
  ): void {
    if (!header.kid) {
      return callback(new Error('JWT header missing kid'), undefined);
    }

    this.client.getSigningKey(header.kid, (err, key) => {
      if (err) {
        this.recordNetworkIssue();
        this.logger.error(`❌ Error fetching signing key: ${err.message}`);
        callback(err, undefined);
      } else {
        const signingKey = key.getPublicKey();
        callback(null, signingKey);
      }
    });
  }

  private recordNetworkIssue(): void {
    this.networkIssueCount++;
    this.lastNetworkIssue = new Date();
  }

  getNetworkStatus(): NetworkStatus {
    const isHealthy =
      this.networkIssueCount === 0 ||
      (this.lastNetworkIssue &&
        Date.now() - this.lastNetworkIssue.getTime() > 300000);

    return {
      isHealthy,
      issueCount: this.networkIssueCount,
      lastIssue: this.lastNetworkIssue,
      message: !isHealthy
        ? 'Server experiencing connectivity issues'
        : undefined,
      recommendation: !isHealthy
        ? 'Authentication may take longer than usual'
        : undefined,
    };
  }

  // === ADDITIONAL METHODS FROM ORIGINAL IMPLEMENTATION ===

  async testCognitoConfiguration(): Promise<any> {
    const customDomain = this.authConfig.cognitoDomain.replace(
      /^https?:\/\//,
      '',
    );
    const defaultDomain = `${this.authConfig.cognitoUserPoolId}.auth.${this.authConfig.cognitoRegion}.amazoncognito.com`;

    try {
      const customWellKnownUrl = `https://${customDomain}/.well-known/openid-configuration`;
      const defaultWellKnownUrl = `https://${defaultDomain}/.well-known/openid-configuration`;

      let customDomainResult = { reachable: false, error: null, data: null };
      let defaultDomainResult = { reachable: false, error: null, data: null };

      // Test custom domain
      try {
        const customResponse = await fetch(customWellKnownUrl);
        if (customResponse.ok) {
          customDomainResult = {
            reachable: true,
            error: null,
            data: await customResponse.json(),
          };
        } else {
          customDomainResult.error = `HTTP ${customResponse.status}`;
        }
      } catch (error) {
        customDomainResult.error = error.message;
      }

      // Test default domain
      try {
        const defaultResponse = await fetch(defaultWellKnownUrl);
        if (defaultResponse.ok) {
          defaultDomainResult = {
            reachable: true,
            error: null,
            data: await defaultResponse.json(),
          };
        } else {
          defaultDomainResult.error = `HTTP ${defaultResponse.status}`;
        }
      } catch (error) {
        defaultDomainResult.error = error.message;
      }

      return {
        status: customDomainResult.reachable
          ? 'success'
          : 'custom_domain_issue',
        domains: {
          custom: {
            domain: customDomain,
            url: customWellKnownUrl,
            result: customDomainResult,
          },
          default: {
            domain: defaultDomain,
            url: defaultWellKnownUrl,
            result: defaultDomainResult,
          },
        },
        configuration: {
          environment: process.env.NODE_ENV,
          currentDomain: customDomain,
          shouldUseDefault:
            !customDomainResult.reachable && defaultDomainResult.reachable,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        domains: { custom: customDomain, default: defaultDomain },
      };
    }
  }

  async testJWKSConnectivity(): Promise<any> {
    const results = [];
    const jwksUrl = `${this.issuer}/.well-known/jwks.json`;

    // Test 1: Node.js fetch
    try {
      const response = await fetch(jwksUrl, {
        signal: AbortSignal.timeout(8000),
      });
      if (response.ok) {
        const jwks = await response.json();
        results.push({
          method: 'nodejs_fetch',
          status: 'success',
          keysCount: jwks.keys?.length || 0,
        });
      } else {
        results.push({
          method: 'nodejs_fetch',
          status: 'failed',
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      results.push({
        method: 'nodejs_fetch',
        status: 'error',
        error: error.message,
      });
    }

    // Test 2: Custom HTTPS
    try {
      const response = await this.httpsRequest(jwksUrl);
      if (response.ok) {
        const jwks = await response.json();
        results.push({
          method: 'custom_https',
          status: 'success',
          keysCount: jwks.keys?.length || 0,
        });
      } else {
        results.push({
          method: 'custom_https',
          status: 'failed',
          error: `HTTP ${response.status}`,
        });
      }
    } catch (error) {
      results.push({
        method: 'custom_https',
        status: 'error',
        error: error.message,
      });
    }

    // Test 3: JWKS client
    try {
      const testResponse = await this.httpsRequest(jwksUrl);
      const testJwks = await testResponse.json();
      const firstKey = testJwks.keys?.[0];

      if (firstKey?.kid) {
        await new Promise((resolve, reject) => {
          this.client.getSigningKey(firstKey.kid, (err, key) => {
            if (err) reject(err);
            else resolve(key);
          });
        });
        results.push({
          method: 'jwks_client_custom',
          status: 'success',
          tested_kid: firstKey.kid,
        });
      }
    } catch (error) {
      results.push({
        method: 'jwks_client_custom',
        status: 'error',
        error: error.message,
      });
    }

    // Test 4: Curl
    try {
      const { stdout } = await execAsync(`curl -s -m 10 "${jwksUrl}"`);
      const curlData = JSON.parse(stdout);
      results.push({
        method: 'curl_execution',
        status: 'success',
        keysCount: curlData.keys?.length || 0,
      });
    } catch (error) {
      results.push({
        method: 'curl_execution',
        status: 'error',
        error: error.message,
      });
    }

    return {
      status: results.some((r) => r.status === 'success')
        ? 'success'
        : 'failed',
      url: jwksUrl,
      tests: results,
      network_status: this.getNetworkStatus(),
    };
  }
}
