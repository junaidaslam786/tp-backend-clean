import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { CognitoService } from '../services/cognito.service';
import * as jwks from 'jwks-rsa';

@Injectable()
export class CognitoJwtStrategy extends PassportStrategy(
  Strategy,
  'cognito-jwt',
) {
  constructor(
    private configService: ConfigService,
    private cognitoService: CognitoService,
  ) {
    const region = configService.get<string>('AWS_REGION');
    const userPoolId = configService.get<string>('COGNITO_USER_POOL_ID');
    const issuer = `https://cognito-idp.${region}.amazonaws.com/${userPoolId}`;

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: issuer,
      algorithms: ['RS256'],
      secretOrKeyProvider: (request, rawJwtToken, done) => {
        const client = jwks({
          jwksUri: `${issuer}/.well-known/jwks.json`,
          cache: true,
          cacheMaxEntries: 10,
          cacheMaxAge: 600000, // 10 minutes
        });

        const header = JSON.parse(
          Buffer.from(rawJwtToken.split('.')[0], 'base64').toString(),
        );

        client.getSigningKey(header.kid, (err, key) => {
          if (err) {
            return done(err, null);
          }
          const signingKey = key.getPublicKey();
          done(null, signingKey);
        });
      },
    });
  }

  async validate(payload: any) {
    try {
      // Validate the token payload
      if (payload.token_use !== 'access' && payload.token_use !== 'id') {
        throw new UnauthorizedException('Invalid token type');
      }

      const clientId = this.configService.get<string>('COGNITO_CLIENT_ID');
      if (payload.aud !== clientId && payload.client_id !== clientId) {
        throw new UnauthorizedException('Invalid audience');
      }

      // Create user object from Cognito payload
      const user = {
        id: payload.sub,
        email: payload.email,
        username: payload['cognito:username'] || payload.username,
        name: payload.name || payload['custom:full_name'] || 'User',
        fullName: payload['custom:full_name'] || payload.name,
        tokenType: payload.token_use,
        emailVerified: payload.email_verified,
        cognitoUsername: payload['cognito:username'],
      };

      return user;
    } catch (error) {
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
