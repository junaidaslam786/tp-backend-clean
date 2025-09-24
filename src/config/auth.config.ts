import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AuthConfig {
  jwtSecret: string;
  jwtExpiresIn: string;
  jwtRefreshSecret: string;
  jwtRefreshExpiresIn: string;
  bcryptRounds: number;
  cognitoUserPoolId: string;
  cognitoClientId: string;
  cognitoClientSecret?: string;
  cognitoRegion: string;
  cognitoDomain: string;
  cognitoRedirectUri: string;
  cognitoLogoutUri: string;
}

export const authConfigValidationSchema = Joi.object({
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().default('1h'),
  JWT_REFRESH_SECRET: Joi.string().required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  BCRYPT_ROUNDS: Joi.number().integer().min(8).max(15).default(12),
  COGNITO_USER_POOL_ID: Joi.string().required(),
  COGNITO_CLIENT_ID: Joi.string().required(),
  COGNITO_CLIENT_SECRET: Joi.string().optional(),
  COGNITO_REGION: Joi.string().default('ap-southeast-2'),
  COGNITO_DOMAIN: Joi.string().required(),
  COGNITO_REDIRECT_URI: Joi.string().required(),
  COGNITO_LOGOUT_URI: Joi.string().optional(),
});

export const authConfig = registerAs(
  'auth',
  (): AuthConfig => ({
    jwtSecret: process.env.JWT_SECRET || '',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || '',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
    cognitoClientSecret: process.env.COGNITO_CLIENT_SECRET,
    cognitoRegion: process.env.COGNITO_REGION || 'ap-southeast-2',
    cognitoDomain: process.env.COGNITO_DOMAIN || '',
    cognitoRedirectUri: process.env.COGNITO_REDIRECT_URI || '',
    cognitoLogoutUri:
      process.env.COGNITO_LOGOUT_URI ||
      process.env.FRONTEND_URL + '/' ||
      'http://localhost:5173/',
  }),
);
