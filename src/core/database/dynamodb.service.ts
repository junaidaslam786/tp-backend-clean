import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
  BatchGetCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';
import { DatabaseConfig } from '../../config/database.config';
import { AwsConfig } from '../../config/aws.config';

export interface TableOperationOptions {
  tableName?: string;
  indexName?: string;
  filterExpression?: string;
  expressionAttributeNames?: Record<string, string>;
  expressionAttributeValues?: Record<string, any>;
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: Record<string, any>;
}

@Injectable()
export class DynamoDbService {
  private readonly logger = new Logger(DynamoDbService.name);
  private readonly client: DynamoDBClient;
  private readonly docClient: DynamoDBDocumentClient;
  private readonly config: DatabaseConfig;

  constructor(private readonly configService: ConfigService) {
    const awsConfig = this.configService.get<AwsConfig>('aws');
    this.config = this.configService.get<DatabaseConfig>('database');

    if (!awsConfig || !this.config) {
      throw new Error('AWS or Database configuration not found');
    }

    // Initialize DynamoDB client
    this.client = new DynamoDBClient({
      region: awsConfig.region,
      endpoint: awsConfig.dynamodbEndpoint,
      credentials:
        awsConfig.accessKeyId && awsConfig.secretAccessKey
          ? {
              accessKeyId: awsConfig.accessKeyId,
              secretAccessKey: awsConfig.secretAccessKey,
            }
          : undefined,
    });

    this.docClient = DynamoDBDocumentClient.from(this.client);

    this.logger.log(
      `DynamoDB service initialized with ${Object.keys(this.config.tables).length} tables`,
    );
  }

  // ===============================
  // GENERIC TABLE OPERATIONS
  // ===============================

  /**
   * Put an item into any table
   */
  async putItem(item: Record<string, any>, tableName: string): Promise<void> {
    const command = new PutCommand({
      TableName: tableName,
      Item: item,
    });

    try {
      await this.docClient.send(command);
      this.logger.debug(
        `Item put successfully in ${tableName}: ${JSON.stringify(item)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error putting item in ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get an item from any table
   */
  async getItem(
    key: Record<string, any>,
    tableName: string,
  ): Promise<Record<string, any> | null> {
    const command = new GetCommand({
      TableName: tableName,
      Key: key,
    });

    try {
      const result = await this.docClient.send(command);
      return result.Item || null;
    } catch (error) {
      this.logger.error(
        `Error getting item from ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Update an item in any table
   */
  async updateItem(
    key: Record<string, any>,
    updateExpression: string,
    expressionAttributeValues: Record<string, any>,
    tableName: string,
    expressionAttributeNames?: Record<string, string>,
    conditionExpression?: string,
  ): Promise<Record<string, any> | null> {
    const command = new UpdateCommand({
      TableName: tableName,
      Key: key,
      UpdateExpression: updateExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ExpressionAttributeNames: expressionAttributeNames,
      ConditionExpression: conditionExpression,
      ReturnValues: 'ALL_NEW',
    });

    try {
      const result = await this.docClient.send(command);
      return result.Attributes || null;
    } catch (error) {
      this.logger.error(
        `Error updating item in ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Delete an item from any table
   */
  async deleteItem(key: Record<string, any>, tableName: string): Promise<void> {
    const command = new DeleteCommand({
      TableName: tableName,
      Key: key,
    });

    try {
      await this.docClient.send(command);
      this.logger.debug(
        `Item deleted successfully from ${tableName}: ${JSON.stringify(key)}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting item from ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Query items from any table
   */
  async queryItems(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    tableName: string,
    options: TableOperationOptions = {},
  ): Promise<Record<string, any>[]> {
    const command = new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      IndexName: options.indexName,
      FilterExpression: options.filterExpression,
      ExpressionAttributeNames: options.expressionAttributeNames,
      Limit: options.limit,
      ScanIndexForward: options.scanIndexForward,
      ExclusiveStartKey: options.exclusiveStartKey,
    });

    try {
      const result = await this.docClient.send(command);
      return result.Items || [];
    } catch (error) {
      this.logger.error(
        `Error querying items from ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Scan items from any table
   */
  async scanItems(
    tableName: string,
    options: TableOperationOptions = {},
  ): Promise<Record<string, any>[]> {
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: options.filterExpression,
      ExpressionAttributeValues: options.expressionAttributeValues,
      ExpressionAttributeNames: options.expressionAttributeNames,
      Limit: options.limit,
      ExclusiveStartKey: options.exclusiveStartKey,
    });

    try {
      const result = await this.docClient.send(command);
      return result.Items || [];
    } catch (error) {
      this.logger.error(
        `Error scanning items from ${tableName}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ===============================
  // USERS TABLE OPERATIONS
  // ===============================

  async createUser(user: Record<string, any>): Promise<void> {
    return this.putItem(user, this.config.tables.users);
  }

  async getUserByEmail(email: string): Promise<Record<string, any> | null> {
    return this.getItem({ email }, this.config.tables.users);
  }

  async getUsersByStatus(status: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      '#status = :status',
      { ':status': status },
      this.config.tables.users,
      {
        indexName: this.config.gsiByTable.users.byStatus,
        expressionAttributeNames: { '#status': 'status' },
      },
    );
  }

  async getUsersByPartnerCode(
    partnerCode: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'partner_code = :partnerCode',
      { ':partnerCode': partnerCode },
      this.config.tables.users,
      { indexName: this.config.gsiByTable.users.byPartnerCode },
    );
  }

  async getUsersByRole(role: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      '#role = :role',
      { ':role': role },
      this.config.tables.users,
      {
        indexName: this.config.gsiByTable.users.byRole,
        expressionAttributeNames: { '#role': 'role' },
      },
    );
  }

  // ===============================
  // APPS TABLE OPERATIONS
  // ===============================

  async createApp(app: Record<string, any>): Promise<void> {
    return this.putItem(app, this.config.tables.apps);
  }

  async getAppByClientAndName(
    clientName: string,
    applicationName: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { client_name: clientName, application_name: applicationName },
      this.config.tables.apps,
    );
  }

  async getAppsByClient(clientName: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      'client_name = :clientName',
      { ':clientName': clientName },
      this.config.tables.apps,
    );
  }

  async getAppsByVisibility(isHidden: boolean): Promise<Record<string, any>[]> {
    return this.queryItems(
      'isHidden = :isHidden',
      { ':isHidden': isHidden.toString() },
      this.config.tables.apps,
      { indexName: this.config.gsiByTable.apps.byVisibility },
    );
  }

  // ===============================
  // CLIENTS DATA OPERATIONS
  // ===============================

  async createClientData(clientData: Record<string, any>): Promise<void> {
    return this.putItem(clientData, this.config.tables.clientsData);
  }

  async getClientData(
    clientName: string,
    organizationName: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { client_name: clientName, organization_name: organizationName },
      this.config.tables.clientsData,
    );
  }

  async getClientsByDomain(orgDomain: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      'org_domain = :orgDomain',
      { ':orgDomain': orgDomain },
      this.config.tables.clientsData,
      { indexName: this.config.gsiByTable.clientsData.byDomain },
    );
  }

  async getClientsByIndustry(
    industrySector: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'industry_sector = :industrySector',
      { ':industrySector': industrySector },
      this.config.tables.clientsData,
      { indexName: this.config.gsiByTable.clientsData.byIndustry },
    );
  }

  // ===============================
  // SUBSCRIPTIONS OPERATIONS
  // ===============================

  async createClientSubscription(
    subscription: Record<string, any>,
  ): Promise<void> {
    return this.putItem(subscription, this.config.tables.clientsSubs);
  }

  async getClientSubscription(
    clientName: string,
    subLevel: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { client_name: clientName, sub_level: subLevel },
      this.config.tables.clientsSubs,
    );
  }

  async getSubscriptionsByTier(
    subLevel: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'sub_level = :subLevel',
      { ':subLevel': subLevel },
      this.config.tables.clientsSubs,
      { indexName: this.config.gsiByTable.clientsSubs.byTier },
    );
  }

  async getSubscriptionsByPaymentStatus(
    paymentStatus: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'payment_status = :paymentStatus',
      { ':paymentStatus': paymentStatus },
      this.config.tables.clientsSubs,
      { indexName: this.config.gsiByTable.clientsSubs.byPaymentStatus },
    );
  }

  // ===============================
  // PAYMENTS OPERATIONS
  // ===============================

  async createPayment(payment: Record<string, any>): Promise<void> {
    return this.putItem(payment, this.config.tables.payments);
  }

  async getPaymentById(paymentId: string): Promise<Record<string, any> | null> {
    return this.getItem({ payment_id: paymentId }, this.config.tables.payments);
  }

  async getPaymentsByClient(
    clientName: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'client_name = :clientName',
      { ':clientName': clientName },
      this.config.tables.payments,
      { indexName: this.config.gsiByTable.payments.byClient },
    );
  }

  async getPaymentsByUser(userEmail: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      'user_email = :userEmail',
      { ':userEmail': userEmail },
      this.config.tables.payments,
      { indexName: this.config.gsiByTable.payments.byUser },
    );
  }

  async getPaymentsByStatus(
    paymentStatus: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'payment_status = :paymentStatus',
      { ':paymentStatus': paymentStatus },
      this.config.tables.payments,
      { indexName: this.config.gsiByTable.payments.byStatus },
    );
  }

  async getPaymentByStripeIntent(
    stripePaymentIntentId: string,
  ): Promise<Record<string, any> | null> {
    const results = await this.queryItems(
      'stripe_payment_intent_id = :stripePaymentIntentId',
      { ':stripePaymentIntentId': stripePaymentIntentId },
      this.config.tables.payments,
      { indexName: this.config.gsiByTable.payments.byStripeIntent },
    );
    return results.length > 0 ? results[0] : null;
  }

  // ===============================
  // PARTNERS & PARTNER CODES
  // ===============================

  async createPartnerCode(partnerCode: Record<string, any>): Promise<void> {
    return this.putItem(partnerCode, this.config.tables.partnersCode);
  }

  async getPartnerCode(
    partnerCode: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { partner_code: partnerCode },
      this.config.tables.partnersCode,
    );
  }

  async getPartnerCodesByPartner(
    partnerEmail: string,
  ): Promise<Record<string, any>[]> {
    return this.queryItems(
      'partner_email = :partnerEmail',
      { ':partnerEmail': partnerEmail },
      this.config.tables.partnersCode,
      { indexName: this.config.gsiByTable.partnersCode.byPartner },
    );
  }

  async createPartner(partner: Record<string, any>): Promise<void> {
    return this.putItem(partner, this.config.tables.partners);
  }

  async getPartnerByEmail(
    partnerEmail: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { partner_email: partnerEmail },
      this.config.tables.partners,
    );
  }

  async getPartnerByName(
    partnerName: string,
  ): Promise<Record<string, any> | null> {
    const results = await this.queryItems(
      'partner_name = :partnerName',
      { ':partnerName': partnerName },
      this.config.tables.partners,
      { indexName: this.config.gsiByTable.partners.byName },
    );
    return results.length > 0 ? results[0] : null;
  }

  // ===============================
  // PENDING JOINS
  // ===============================

  async createPendingJoin(pendingJoin: Record<string, any>): Promise<void> {
    return this.putItem(pendingJoin, this.config.tables.pendingJoins);
  }

  async getPendingJoin(
    organizationName: string,
    email: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { organization_name: organizationName, email },
      this.config.tables.pendingJoins,
    );
  }

  async getPendingJoinsByEmail(email: string): Promise<Record<string, any>[]> {
    return this.queryItems(
      'email = :email',
      { ':email': email },
      this.config.tables.pendingJoins,
      { indexName: this.config.gsiByTable.pendingJoins.byEmail },
    );
  }

  // ===============================
  // SUBSCRIPTION TIERS
  // ===============================

  async createSubscriptionTier(tier: Record<string, any>): Promise<void> {
    return this.putItem(tier, this.config.tables.subscriptionTiers);
  }

  async getSubscriptionTier(
    subLevel: string,
  ): Promise<Record<string, any> | null> {
    return this.getItem(
      { sub_level: subLevel },
      this.config.tables.subscriptionTiers,
    );
  }

  async getActiveSubscriptionTiers(): Promise<Record<string, any>[]> {
    return this.queryItems(
      'is_active = :isActive',
      { ':isActive': 'true' },
      this.config.tables.subscriptionTiers,
      { indexName: this.config.gsiByTable.subscriptionTiers.byStatus },
    );
  }

  // ===============================
  // LEGACY OPERATIONS (BACKWARD COMPATIBILITY)
  // ===============================

  async batchGetItems(
    keys: Record<string, any>[],
  ): Promise<Record<string, any>[]> {
    const command = new BatchGetCommand({
      RequestItems: {
        [this.config.tableName]: {
          Keys: keys,
        },
      },
    });

    try {
      const result = await this.docClient.send(command);
      return result.Responses?.[this.config.tableName] || [];
    } catch (error) {
      this.logger.error(
        `Error batch getting items: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async batchWriteItems(
    putItems?: Record<string, any>[],
    deleteKeys?: Record<string, any>[],
  ): Promise<void> {
    const writeRequests = [];

    if (putItems) {
      putItems.forEach((item) => {
        writeRequests.push({
          PutRequest: {
            Item: item,
          },
        });
      });
    }

    if (deleteKeys) {
      deleteKeys.forEach((key) => {
        writeRequests.push({
          DeleteRequest: {
            Key: key,
          },
        });
      });
    }

    const command = new BatchWriteCommand({
      RequestItems: {
        [this.config.tableName]: writeRequests,
      },
    });

    try {
      await this.docClient.send(command);
      this.logger.debug(`Batch write completed successfully`);
    } catch (error) {
      this.logger.error(
        `Error batch writing items: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get the DynamoDB document client for advanced operations
   */
  getDocumentClient(): DynamoDBDocumentClient {
    return this.docClient;
  }

  /**
   * Get table name by key
   */
  getTableName(tableKey: keyof DatabaseConfig['tables']): string {
    return this.config.tables[tableKey];
  }

  /**
   * Get all table names
   */
  getAllTableNames(): Record<string, string> {
    return { ...this.config.tables };
  }

  /**
   * Get GSI name for a specific table and index
   */
  getGSIName(table: keyof DatabaseConfig['gsiByTable'], index: string): string {
    return this.config.gsiByTable[table]?.[index] || '';
  }

  /**
   * Legacy method - Get the payments table name
   */
  getPaymentsTableName(): string {
    return this.config.paymentsTableName;
  }

  /**
   * Legacy method - Get the main table name
   */
  getMainTableName(): string {
    return this.config.tableName;
  }
}
