# Core Module

This directory contains the core infrastructure services for the Threatiligence Platform backend API.

## Modules

- `database/` - Database services and repository patterns
  - `dynamodb.service.ts` - DynamoDB client service with CRUD operations
  - `repositories/base.repository.ts` - Base repository pattern for entities
  - `database.module.ts` - Database module configuration

- `aws/` - AWS services integration
  - `s3.service.ts` - S3 file storage service (stub)
  - `cognito.service.ts` - Cognito authentication service (stub)
  - `ses.service.ts` - SES email service (stub)
  - `aws.module.ts` - AWS module configuration

## Usage

Import the modules in your application module:

```typescript
import { DatabaseModule } from './core/database/database.module';
import { AwsModule } from './core/aws/aws.module';

@Module({
  imports: [DatabaseModule, AwsModule],
})
export class AppModule {}
```
