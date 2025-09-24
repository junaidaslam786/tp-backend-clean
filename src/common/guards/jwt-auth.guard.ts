import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { verify } from 'jsonwebtoken';

/**
 * JWT Authentication Guard
 * Validates JWT tokens from AWS Cognito User Pool
 * Extracts user information and adds to request context
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  /**
   * Validates the request has valid JWT token
   * @param context - The execution context
   * @returns Promise<boolean> - True if request is authenticated
   * @throws UnauthorizedException - If token is invalid or missing
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      // Verify the JWT token
      const payload = await this.verifyToken(token);
      
      // Add user information to request context
      request['user'] = {
        sub: payload.sub,
        email: payload.email,
        cognitoGroups: payload['cognito:groups'] || [],
        organizationId: payload.organizationId,
        role: payload.role,
        subscriptionTier: payload.subscriptionTier,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Extracts JWT token from Authorization header
   * @param request - The HTTP request
   * @returns string | undefined - The extracted token
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [type, token] = authHeader.split(' ');
    return type === 'Bearer' ? token : undefined;
  }

  /**
   * Verifies JWT token using Cognito public keys
   * @param token - The JWT token to verify
   * @returns Promise<any> - The decoded token payload
   * @throws Error - If token verification fails
   */
  private async verifyToken(token: string): Promise<any> {
    // In production, this would fetch and cache Cognito public keys
    // For now, using a simplified verification approach
    const cognitoRegion = this.configService.get<string>('AWS_REGION');
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID');
    
    if (!cognitoRegion || !userPoolId) {
      throw new Error('Cognito configuration is missing');
    }

    // TODO: Implement proper JWT verification with Cognito public keys
    // For now, using a basic verify approach - needs enhancement
    const decoded = verify(token, 'temporary-secret', {
      algorithms: ['RS256'],
      // In production, add proper issuer and audience validation
    });

    return decoded;
  }
}

/**
 * Extended request interface with user context
 * Used for type safety when accessing user information
 */
export interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    email: string;
    cognitoGroups: string[];
    organizationId?: string;
    role: string;
    subscriptionTier?: string;
  };
}
