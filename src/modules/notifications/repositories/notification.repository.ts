import { Injectable } from '@nestjs/common';
import { NotificationDto, NotificationStatus } from '../dto/notification.dto';
import { DynamoDbService } from '../../../core/database/dynamodb.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class NotificationRepository {
  constructor(private readonly dynamoDbService: DynamoDbService) {}

  private toDynamoItem(dto: NotificationDto): Record<string, any> {
    return {
      pk: `USER#${dto.userId}`,
      sk: `NOTIFICATION#${dto.notificationId}`,
      type: 'NOTIFICATION',
      ...dto,
    };
  }

  private fromDynamoItem(item: Record<string, any>): NotificationDto {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { pk: _pk, sk: _sk, type: _type, ...rest } = item;
    return rest as NotificationDto;
  }

  async createNotification(dto: NotificationDto): Promise<NotificationDto> {
    const now = new Date().toISOString();
    const notificationId = dto.notificationId || uuidv4();
    const item = this.toDynamoItem({
      ...dto,
      notificationId,
      createdAt: now,
      updatedAt: now,
      status: dto.status || NotificationStatus.PENDING,
    });
    await this.dynamoDbService.putItem(item, 'users');
    return this.fromDynamoItem(item);
  }

  async findNotificationById(
    userId: string,
    notificationId: string,
  ): Promise<NotificationDto | null> {
    const key = {
      pk: `USER#${userId}`,
      sk: `NOTIFICATION#${notificationId}`,
    };
    const item = await this.dynamoDbService.getItem(key, 'users');
    return item ? this.fromDynamoItem(item) : null;
  }

  async updateNotification(dto: NotificationDto): Promise<NotificationDto> {
    if (!dto.userId || !dto.notificationId) {
      throw new Error('userId and notificationId are required for update');
    }
    const now = new Date().toISOString();
    const key = {
      pk: `USER#${dto.userId}`,
      sk: `NOTIFICATION#${dto.notificationId}`,
    };
    const updateExpression =
      'SET #status = :status, #subject = :subject, #message = :message, #updatedAt = :updatedAt';
    const expressionAttributeValues = {
      ':status': dto.status,
      ':subject': dto.subject,
      ':message': dto.message,
      ':updatedAt': now,
    };
    const expressionAttributeNames = {
      '#status': 'status',
      '#subject': 'subject',
      '#message': 'message',
      '#updatedAt': 'updatedAt',
    };
    const docClient = this.dynamoDbService.getDocumentClient();
    const tableName = this.dynamoDbService.getTableName('users');
    const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ReturnValues: 'ALL_NEW',
    });
    const result = await docClient.send(command);
    return this.fromDynamoItem(result.Attributes);
  }

  async deleteNotification(
    userId: string,
    notificationId: string,
  ): Promise<void> {
    const key = {
      pk: `USER#${userId}`,
      sk: `NOTIFICATION#${notificationId}`,
    };
    await this.dynamoDbService.deleteItem(key, 'users');
  }

  async listNotificationsByUser(userId: string): Promise<NotificationDto[]> {
    // Query by PK = USER#{userId}, SK begins_with NOTIFICATION#
    const keyConditionExpression = 'pk = :pk AND begins_with(sk, :skPrefix)';
    const expressionAttributeValues = {
      ':pk': `USER#${userId}`,
      ':skPrefix': 'NOTIFICATION#',
    };
    const items = await this.dynamoDbService.queryItems(
      keyConditionExpression,
      expressionAttributeValues,
      'users',
    );
    return items.map((item) => this.fromDynamoItem(item));
  }
}
