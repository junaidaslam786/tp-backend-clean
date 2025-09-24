import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { S3Service } from './s3.service';
import { CognitoService } from './cognito.service';
import { SesService } from './ses.service';

@Module({
  imports: [ConfigModule],
  providers: [S3Service, CognitoService, SesService],
  exports: [S3Service, CognitoService, SesService],
})
export class AwsModule {}
