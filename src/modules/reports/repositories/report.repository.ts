import { Injectable } from '@nestjs/common';
import { ReportDto, ReportStatus } from '../dto/report.dto';
 import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ReportRepository {
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  private toDynamoItem(dto: ReportDto): Record<string, any> {
    return {
      pk: `ORG#${dto.organizationId}`,
      sk: `REPORT#${dto.reportId}`,
      type: 'REPORT',
      ...dto,
    };
  }

  private fromDynamoItem(item: Record<string, any>): ReportDto {
    // Remove pk, sk, type (ignore unused warning)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pk: _pk, sk: _sk, type: _type, ...rest } = item;
    return rest as ReportDto;
  }

  async createReport(dto: ReportDto): Promise<ReportDto> {
    // Assign new ID and timestamps if not present
    const now = new Date().toISOString();
    const reportId = dto.reportId || uuidv4();
    const item = this.toDynamoItem({
      ...dto,
      reportId,
      createdAt: now,
      updatedAt: now,
      version: 1,
      status: dto.status || ReportStatus.PENDING,
    });
    await this.dynamoDbService.putItem(item, this.dynamoDbService.getMainTableName());
    return this.fromDynamoItem(item);
  }

  // Deprecated: Use findReportByOrgAndId for efficiency
  // Deprecated: Use findReportByOrgAndId for efficiency
  // _reportId is intentionally unused
  async findReportById(_reportId: string): Promise<ReportDto | null> {
    throw new Error(
      'findReportById requires organizationId for efficient lookup. Use findReportByOrgAndId.',
    );
  }

  async findReportByOrgAndId(
    organizationId: string,
    reportId: string,
  ): Promise<ReportDto | null> {
    const key = {
      pk: `ORG#${organizationId}`,
      sk: `REPORT#${reportId}`,
    };
    const item = await this.dynamoDbService.getItem(key, this.dynamoDbService.getMainTableName());
    return item ? this.fromDynamoItem(item) : null;
  }

  async updateReport(dto: ReportDto): Promise<ReportDto> {
    // Optimistic concurrency: require version
    if (
      !dto.organizationId ||
      !dto.reportId ||
      typeof dto.version !== 'number'
    ) {
      throw new Error(
        'organizationId, reportId, and version are required for update',
      );
    }
    const now = new Date().toISOString();
    const key = {
      pk: `ORG#${dto.organizationId}`,
      sk: `REPORT#${dto.reportId}`,
    };
    // Only update if version matches
    const updateExpression =
      'SET #status = :status, #fileName = :fileName, #s3Key = :s3Key, #s3Bucket = :s3Bucket, #updatedAt = :updatedAt, #version = :newVersion';
    const expressionAttributeValues = {
      ':status': dto.status,
      ':fileName': dto.fileName,
      ':s3Key': dto.s3Key,
      ':s3Bucket': dto.s3Bucket,
      ':updatedAt': now,
      ':newVersion': dto.version + 1,
      ':currentVersion': dto.version,
    };
    const expressionAttributeNames = {
      '#status': 'status',
      '#fileName': 'fileName',
      '#s3Key': 's3Key',
      '#s3Bucket': 's3Bucket',
      '#updatedAt': 'updatedAt',
      '#version': 'version',
    };
    // Add ConditionExpression for optimistic concurrency
    const docClient = this.dynamoDbService.getDocumentClient();
    const tableName = this.dynamoDbService.getMainTableName();
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ConditionExpression: '#version = :currentVersion',
      ReturnValues: 'ALL_NEW',
    });
    try {
      const result = await docClient.send(command);
      return this.fromDynamoItem(result.Attributes);
    } catch (err) {
      if (err.name === 'ConditionalCheckFailedException') {
        throw new Error(
          'Version conflict: report was updated by another process',
        );
      }
      throw err;
    }
  }

  async deleteReport(organizationId: string, reportId: string): Promise<void> {
    const key = {
      pk: `ORG#${organizationId}`,
      sk: `REPORT#${reportId}`,
    };
    await this.dynamoDbService.deleteItem(key, this.dynamoDbService.getMainTableName());
  }

  async listReportsByOrg(organizationId: string): Promise<ReportDto[]> {
    // Query by PK = ORG#{organizationId}, SK begins_with REPORT#
    const keyConditionExpression = 'pk = :pk AND begins_with(sk, :skPrefix)';
    const expressionAttributeValues = {
      ':pk': `ORG#${organizationId}`,
      ':skPrefix': 'REPORT#',
    };
    const items = await this.dynamoDbService.queryItems(
      keyConditionExpression,
      expressionAttributeValues,
      this.dynamoDbService.getMainTableName(),
    );
    return items.map((item) => this.fromDynamoItem(item));
  }
}
