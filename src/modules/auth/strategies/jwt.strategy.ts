import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from '../services/auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      algorithms: ['RS256'], // Since we're using Cognito's RSA keys
    });
  }

  async validate(payload: any) {
    try {
      // For Cognito tokens, we need to validate against Cognito's public keys
      // The payload here is the decoded JWT from Cognito
      const user = {
        id: payload.sub,
        email: payload.email,
        username: payload['cognito:username'] || payload.username,
        name: payload.name || payload['custom:full_name'] || 'User',
        tokenType: payload.token_use,
      };

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
