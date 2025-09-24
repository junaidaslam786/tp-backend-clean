# Configuration Module

This directory contains all configuration files for the Threatiligence Platform backend API.

## Configuration Files

- `app.config.ts` - Application configuration (port, environment, CORS)
- `aws.config.ts` - AWS services configuration (DynamoDB, S3, Cognito)
- `database.config.ts` - Database configuration (table names, GSI names)
- `auth.config.ts` - Authentication configuration (JWT, Cognito)
- `payment.config.ts` - Payment processing configuration (Stripe)

## Usage

All configuration files use the NestJS `registerAs` pattern with Joi validation schemas.

```typescript
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './config/app.config';

constructor(private configService: ConfigService) {
  const appConfig = this.configService.get<AppConfig>('app');
}
```

## Environment Variables

See the respective config files for required environment variables and their validation schemas.
