import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CognitoService } from '../services/cognito.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('cognito-jwt') {
  constructor(private cognitoService: CognitoService) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Extract token from Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('No valid authorization header');
      }

      const token = authHeader.replace('Bearer ', '');

      // Validate token using CognitoService
      const payload = await this.cognitoService.verifyToken(token);

      // Set user in request object
      request.user = {
        id: payload.sub,
        email: payload.email,
        username: (payload as any).cognitoUsername || payload.username,
        name: payload.name,
        fullName: (payload as any).fullName,
        tokenType: (payload as any).tokenType,
        emailVerified: (payload as any).emailVerified,
      };

      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  handleRequest(err: any, user: any) {
    if (err || !user) {
      throw err || new UnauthorizedException('Authentication failed');
    }
    return user;
  }
}
