import { registerAs } from '@nestjs/config';
import * as Joi from 'joi';

export interface AwsConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  dynamodbEndpoint?: string;
  s3Bucket: string;
  cognitoUserPoolId: string;
  cognitoClientId: string;
}

export const awsConfigValidationSchema = Joi.object({
  AWS_REGION: Joi.string().default('ap-southeast-2'),
  AWS_ACCESS_KEY_ID: Joi.string().optional(),
  AWS_SECRET_ACCESS_KEY: Joi.string().optional(),
  DYNAMODB_ENDPOINT: Joi.string().optional(),
  S3_BUCKET: Joi.string().required(),
  COGNITO_USER_POOL_ID: Joi.string().required(),
  COGNITO_CLIENT_ID: Joi.string().required(),
});

export const awsConfig = registerAs(
  'aws',
  (): AwsConfig => ({
    region: process.env.AWS_REGION || 'ap-southeast-2',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    dynamodbEndpoint: process.env.DYNAMODB_ENDPOINT,
    s3Bucket: process.env.S3_BUCKET || '',
    cognitoUserPoolId: process.env.COGNITO_USER_POOL_ID || '',
    cognitoClientId: process.env.COGNITO_CLIENT_ID || '',
  }),
);
