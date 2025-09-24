import { DynamoDbService } from '../dynamodb.service';

export interface BaseEntity {
  createdAt: string;
  updatedAt: string;
  version?: number;
}

export interface QueryOptions {
  limit?: number;
  scanIndexForward?: boolean;
  exclusiveStartKey?: Record<string, any>;
  filterExpression?: string;
  expressionAttributeValues?: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
  indexName?: string;
}

export interface UpdateOptions {
  conditionExpression?: string;
  expressionAttributeValues?: Record<string, any>;
  expressionAttributeNames?: Record<string, string>;
}

export interface BatchWriteOptions {
  tableName?: string;
}

export abstract class BaseRepository<T extends BaseEntity> {
  constructor(
    protected readonly dynamoDbService: DynamoDbService,
    protected readonly tableName: string,
  ) {}

  /**
   * Get the table name for this repository
   */
  protected getTableName(): string {
    return this.tableName;
  }

  /**
   * Create a new entity
   */
  async create(
    entity: Omit<T, 'createdAt' | 'updatedAt' | 'version'>,
  ): Promise<T> {
    const now = new Date().toISOString();
    const newEntity = {
      ...entity,
      createdAt: now,
      updatedAt: now,
      version: 1,
    } as T;

    await this.dynamoDbService.putItem(newEntity, this.getTableName());
    return newEntity;
  }

  /**
   * Find entity by primary key
   */
  async findByKey(key: Record<string, any>): Promise<T | null> {
    const item = await this.dynamoDbService.getItem(key, this.getTableName());
    return item ? (item as T) : null;
  }

  /**
   * Update an entity
   */
  async update(
    key: Record<string, any>,
    updates: Partial<Omit<T, 'createdAt' | 'version'>>,
    options?: UpdateOptions,
  ): Promise<T | null> {
    const updateExpressions: string[] = [];
    const expressionAttributeValues: Record<string, any> = {};
    const expressionAttributeNames: Record<string, string> = {};

    // Add updatedAt
    updateExpressions.push('#updatedAt = :updatedAt');
    expressionAttributeNames['#updatedAt'] = 'updatedAt';
    expressionAttributeValues[':updatedAt'] = new Date().toISOString();

    // Add version increment
    updateExpressions.push('#version = if_not_exists(#version, :zero) + :one');
    expressionAttributeNames['#version'] = 'version';
    expressionAttributeValues[':zero'] = 0;
    expressionAttributeValues[':one'] = 1;

    // Add other updates
    Object.entries(updates).forEach(([fieldKey, value]) => {
      if (
        value !== undefined &&
        fieldKey !== 'updatedAt' &&
        fieldKey !== 'version'
      ) {
        const attrName = `#${fieldKey}`;
        const attrValue = `:${fieldKey}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = fieldKey;
        expressionAttributeValues[attrValue] = value;
      }
    });

    const updateExpression = `SET ${updateExpressions.join(', ')}`;

    // Merge with provided options
    const finalExpressionAttributeValues = {
      ...expressionAttributeValues,
      ...options?.expressionAttributeValues,
    };
    const finalExpressionAttributeNames = {
      ...expressionAttributeNames,
      ...options?.expressionAttributeNames,
    };

    const updatedItem = await this.dynamoDbService.updateItem(
      key,
      updateExpression,
      finalExpressionAttributeValues,
      this.getTableName(),
      finalExpressionAttributeNames,
      options?.conditionExpression,
    );

    return updatedItem ? (updatedItem as T) : null;
  }

  /**
   * Delete an entity
   */
  async delete(key: Record<string, any>): Promise<void> {
    await this.dynamoDbService.deleteItem(key, this.getTableName());
  }

  /**
   * Query entities
   */
  async query(
    keyConditionExpression: string,
    expressionAttributeValues: Record<string, any>,
    options?: QueryOptions,
  ): Promise<T[]> {
    const items = await this.dynamoDbService.queryItems(
      keyConditionExpression,
      expressionAttributeValues,
      this.getTableName(),
      {
        indexName: options?.indexName,
        filterExpression: options?.filterExpression,
        expressionAttributeNames: options?.expressionAttributeNames,
        expressionAttributeValues: options?.expressionAttributeValues,
        limit: options?.limit,
        scanIndexForward: options?.scanIndexForward,
        exclusiveStartKey: options?.exclusiveStartKey,
      },
    );

    return items as T[];
  }

  /**
   * Scan entities
   */
  async scan(options?: QueryOptions): Promise<T[]> {
    const items = await this.dynamoDbService.scanItems(this.getTableName(), {
      filterExpression: options?.filterExpression,
      expressionAttributeNames: options?.expressionAttributeNames,
      expressionAttributeValues: options?.expressionAttributeValues,
      limit: options?.limit,
      exclusiveStartKey: options?.exclusiveStartKey,
    });

    return items as T[];
  }

  /**
   * Find all entities (scan with no filter)
   */
  async findAll(options?: QueryOptions): Promise<T[]> {
    return this.scan(options);
  }

  /**
   * Check if entity exists
   */
  async exists(key: Record<string, any>): Promise<boolean> {
    const item = await this.findByKey(key);
    return item !== null;
  }

  /**
   * Count entities by scanning
   */
  async count(options?: QueryOptions): Promise<number> {
    const items = await this.scan(options);
    return items.length;
  }

  async batchCreate(
    entities: Array<Omit<T, 'createdAt' | 'updatedAt' | 'version'>>,
    batchSize: number = 25,
  ): Promise<T[]> {
    const now = new Date().toISOString();
    const newEntities = entities.map((entity) => ({
      ...entity,
      createdAt: now,
      updatedAt: now,
      version: 1,
    })) as T[];

    // DynamoDB batch write limit is 25 items
    const batches = this.chunkArray(newEntities, batchSize);

    for (const batch of batches) {
      // Pass the items directly as putItems array
      await this.dynamoDbService.batchWriteItems(batch);
    }

    return newEntities;
  }

  /**
   * Batch delete entities
   */
  async batchDelete(
    keys: Array<Record<string, any>>,
    batchSize: number = 25,
  ): Promise<void> {
    // DynamoDB batch write limit is 25 items
    const batches = this.chunkArray(keys, batchSize);

    for (const batch of batches) {
      // Pass undefined for putItems and the keys as deleteKeys
      await this.dynamoDbService.batchWriteItems(undefined, batch);
    }
  }
  /**
   * Batch get entities
   */
  async batchGet(
    keys: Array<Record<string, any>>,
    batchSize: number = 100,
  ): Promise<T[]> {
    // DynamoDB batch get limit is 100 items
    const batches = this.chunkArray(keys, batchSize);
    const allItems: T[] = [];

    for (const batch of batches) {
      const items = await this.dynamoDbService.batchGetItems(batch);
      allItems.push(...(items as T[]));
    }

    return allItems;
  }

  /**
   * Find entities with pagination
   */
  async findWithPagination(
    keyConditionExpression?: string,
    expressionAttributeValues?: Record<string, any>,
    options?: QueryOptions & { pageSize?: number },
  ): Promise<{
    items: T[];
    lastEvaluatedKey?: Record<string, any>;
    hasMore: boolean;
  }> {
    const pageSize = options?.pageSize || 20;

    let items: T[];
    let lastEvaluatedKey: Record<string, any> | undefined;

    if (keyConditionExpression && expressionAttributeValues) {
      const result = await this.dynamoDbService.queryItems(
        keyConditionExpression,
        expressionAttributeValues,
        this.getTableName(),
        {
          ...options,
          limit: pageSize,
        },
      );
      items = result as T[];
      // Note: You'd need to modify queryItems to return lastEvaluatedKey
    } else {
      const result = await this.dynamoDbService.scanItems(this.getTableName(), {
        ...options,
        limit: pageSize,
      });
      items = result as T[];
      // Note: You'd need to modify scanItems to return lastEvaluatedKey
    }

    return {
      items,
      lastEvaluatedKey,
      hasMore: !!lastEvaluatedKey,
    };
  }

  /**
   * Utility method to chunk arrays for batch operations
   */
  private chunkArray<U>(array: U[], size: number): U[][] {
    const chunks: U[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Generate a unique ID with timestamp and random component
   */
  protected generateUniqueId(prefix?: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 9);
    return prefix
      ? `${prefix}_${timestamp}_${random}`
      : `${timestamp}_${random}`;
  }

  /**
   * Validate required fields
   */
  protected validateRequiredFields(
    entity: Record<string, any>,
    requiredFields: string[],
  ): void {
    const missingFields = requiredFields.filter(
      (field) => entity[field] === undefined || entity[field] === null,
    );

    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
    }
  }

  /**
   * Create condition expression for optimistic locking
   */
  protected createVersionCondition(version?: number): {
    conditionExpression: string;
    expressionAttributeNames: Record<string, string>;
    expressionAttributeValues: Record<string, any>;
  } {
    if (version === undefined) {
      // For new items, ensure they don't exist
      return {
        conditionExpression: 'attribute_not_exists(#version)',
        expressionAttributeNames: { '#version': 'version' },
        expressionAttributeValues: {},
      };
    } else {
      // For updates, check version matches
      return {
        conditionExpression: '#version = :expectedVersion',
        expressionAttributeNames: { '#version': 'version' },
        expressionAttributeValues: { ':expectedVersion': version },
      };
    }
  }

  /**
   * Safe update with optimistic locking
   */
  async safeUpdate(
    key: Record<string, any>,
    updates: Partial<Omit<T, 'createdAt' | 'version'>>,
    expectedVersion: number,
  ): Promise<T | null> {
    const versionCondition = this.createVersionCondition(expectedVersion);

    return this.update(key, updates, {
      conditionExpression: versionCondition.conditionExpression,
      expressionAttributeNames: versionCondition.expressionAttributeNames,
      expressionAttributeValues: versionCondition.expressionAttributeValues,
    });
  }

  /**
   * Soft delete (mark as deleted instead of removing)
   */
  async softDelete(
    key: Record<string, any>,
    deletedBy?: string,
  ): Promise<T | null> {
    const updates = {
      isDeleted: true,
      deletedAt: new Date().toISOString(),
      ...(deletedBy && { deletedBy }),
    } as unknown as Partial<T>;

    return this.update(key, updates);
  }

  /**
   * Find non-deleted entities
   */
  async findActive(options?: QueryOptions): Promise<T[]> {
    const activeOptions: QueryOptions = {
      ...options,
      filterExpression: options?.filterExpression
        ? `(${options.filterExpression}) AND attribute_not_exists(isDeleted)`
        : 'attribute_not_exists(isDeleted)',
    };

    return this.scan(activeOptions);
  }
}
