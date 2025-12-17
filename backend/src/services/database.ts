import { DynamoDB } from 'aws-sdk';
import { User, PhoneNumber, Call, FollowUp, PaginatedPhoneNumbersResponse, PhoneNumberStats, PhoneNumbersQueryParams, ClientExpense, ExpenseSummary } from '@shared/types';

// Constants for phone number assignment
const UNASSIGNED_PHONE_NUMBER = 'UNASSIGNED';

// Configure DynamoDB client for local development
const dynamoConfig: DynamoDB.DocumentClient.DocumentClientOptions & DynamoDB.Types.ClientConfiguration = {
  region: process.env.REGION || 'us-east-1',
};

// For local development, use dummy credentials and local endpoint
if (process.env.STAGE === 'dev' || process.env.IS_OFFLINE) {
  dynamoConfig.endpoint = 'http://localhost:8000';
  dynamoConfig.accessKeyId = 'dummy';
  dynamoConfig.secretAccessKey = 'dummy';
}

const dynamodb = new DynamoDB.DocumentClient(dynamoConfig);

export class DatabaseService {
  private readonly usersTable = process.env.USERS_TABLE!;
  private readonly phoneNumbersTable = process.env.PHONE_NUMBERS_TABLE!;
  private readonly callsTable = process.env.CALLS_TABLE!;
  private readonly followUpsTable = process.env.FOLLOWUPS_TABLE!;
  private readonly clientExpensesTable = process.env.CLIENT_EXPENSES_TABLE || 'call-management-backend-dev-client-expenses';

  // Helper method to handle DynamoDB scan pagination
  private async scanAllItems(params: DynamoDB.DocumentClient.ScanInput): Promise<DynamoDB.DocumentClient.AttributeMap[]> {
    const allItems: DynamoDB.DocumentClient.AttributeMap[] = [];
    let lastEvaluatedKey: DynamoDB.DocumentClient.Key | undefined;

    do {
      const scanParams = {
        ...params,
        ...(lastEvaluatedKey && { ExclusiveStartKey: lastEvaluatedKey })
      };

      const result = await dynamodb.scan(scanParams).promise();
      
      if (result.Items) {
        allItems.push(...result.Items);
      }
      
      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    return allItems;
  }

  // User operations
  async createUser(user: User): Promise<User> {
    await dynamodb.put({
      TableName: this.usersTable,
      Item: user,
    }).promise();
    return user;
  }

  async getUserById(userId: string): Promise<User | null> {
    const result = await dynamodb.get({
      TableName: this.usersTable,
      Key: { userId },
    }).promise();
    return result.Item as User || null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const result = await dynamodb.query({
      TableName: this.usersTable,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :email',
      ExpressionAttributeValues: {
        ':email': email,
      },
    }).promise();
    return result.Items?.[0] as User || null;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'userId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getUserById(userId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.usersTable,
      Key: { userId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as User || null;
  }

  async getAllUsers(): Promise<User[]> {
    const items = await this.scanAllItems({
      TableName: this.usersTable,
    });
    return items as User[] || [];
  }

  async getActiveUsers(): Promise<User[]> {
    const items = await this.scanAllItems({
      TableName: this.usersTable,
      FilterExpression: 'isActive = :isActive',
      ExpressionAttributeValues: {
        ':isActive': true,
      },
    });
    return items as User[] || [];
  }

  // Phone Number operations
  async createPhoneNumber(phoneNumber: PhoneNumber): Promise<PhoneNumber> {
    await dynamodb.put({
      TableName: this.phoneNumbersTable,
      Item: phoneNumber,
    }).promise();
    return phoneNumber;
  }

  async getPhoneNumber(phoneNumber: string): Promise<PhoneNumber | null> {
    const result = await dynamodb.get({
      TableName: this.phoneNumbersTable,
      Key: { phoneNumber },
    }).promise();
    const item = result.Item as PhoneNumber || null;
    
    // Add backward compatibility for existing records without areaCode
    if (item && !item.areaCode) {
      item.areaCode = 'DEFAULT001';
    }
    
    return item;
  }

  async getAvailablePhoneNumbers(limit: number = 10): Promise<PhoneNumber[]> {
    const items = await this.scanAllItems({
      TableName: this.phoneNumbersTable,
      FilterExpression: '#status = :status AND (assignedTo = :unassigned OR attribute_not_exists(assignedTo))',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'available',
        ':unassigned': UNASSIGNED_PHONE_NUMBER,
      },
    });
    
    const availableNumbers = items as PhoneNumber[] || [];
    
    // Return up to the requested limit of available numbers
    return availableNumbers.slice(0, limit);
  }

  async getAvailablePhoneNumbersByAreaCode(areaCode: string, limit: number = 10): Promise<PhoneNumber[]> {
    const items = await this.scanAllItems({
      TableName: this.phoneNumbersTable,
      FilterExpression: '#status = :status AND #areaCode = :areaCode AND (assignedTo = :unassigned OR attribute_not_exists(assignedTo))',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#areaCode': 'areaCode',
      },
      ExpressionAttributeValues: {
        ':status': 'available',
        ':areaCode': areaCode,
        ':unassigned': UNASSIGNED_PHONE_NUMBER,
      },
    });
    
    const availableNumbers = items as PhoneNumber[] || [];
    
    // Return up to the requested limit of available numbers
    return availableNumbers.slice(0, limit);
  }

  async getAvailableAreaCodes(): Promise<{ areaCode: string; count: number }[]> {
    const items = await this.scanAllItems({
      TableName: this.phoneNumbersTable,
      FilterExpression: '#status = :status AND (assignedTo = :unassigned OR attribute_not_exists(assignedTo))',
      ExpressionAttributeNames: {
        '#status': 'status',
      },
      ExpressionAttributeValues: {
        ':status': 'available',
        ':unassigned': UNASSIGNED_PHONE_NUMBER,
      },
    });
    
    const availableNumbers = items as PhoneNumber[] || [];
    
    // Group by area code and count
    const areaCodeCounts: { [areaCode: string]: number } = {};
    availableNumbers.forEach(number => {
      const areaCode = number.areaCode || 'DEFAULT001';
      areaCodeCounts[areaCode] = (areaCodeCounts[areaCode] || 0) + 1;
    });
    
    // Convert to array and sort by area code
    return Object.entries(areaCodeCounts)
      .map(([areaCode, count]) => ({ areaCode, count }))
      .sort((a, b) => a.areaCode.localeCompare(b.areaCode));
  }

  async getPhoneNumbersByUser(userId: string): Promise<PhoneNumber[]> {
    // Use filtered scan instead of GSI query for better data consistency
    // This ensures we capture all assigned numbers regardless of GSI indexing issues
    const items = await this.scanAllItems({
      TableName: this.phoneNumbersTable,
      FilterExpression: 'assignedTo = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
    });
    
    const phoneNumbers = items as PhoneNumber[] || [];
    
    // Add backward compatibility for existing records without areaCode
    return phoneNumbers.map(item => ({
      ...item,
      areaCode: item.areaCode || 'DEFAULT001'
    }));
  }

  async getPhoneNumbersWithoutCalls(userId: string): Promise<PhoneNumber[]> {
    // Get all phone numbers assigned to the user
    const phoneNumbers = await this.getPhoneNumbersByUser(userId);
    
    // Get all calls made by this user to get the phone numbers that have been called
    const calls = await this.getCallsByUser(userId);
    const calledPhoneNumbers = new Set(calls.map(call => call.phoneNumber));
    
    // Filter out phone numbers that have already been called
    const uncalledPhoneNumbers = phoneNumbers.filter(phoneNumber => 
      !calledPhoneNumbers.has(phoneNumber.phoneNumber) &&
      (phoneNumber.status === 'assigned' || phoneNumber.status === 'available')
    );
    
    return uncalledPhoneNumbers;
  }

  async getAvailablePhoneNumbersForUser(userId: string, isAdmin: boolean = false): Promise<PhoneNumber[]> {
    if (isAdmin) {
      // Admin can use any available phone number, but still exclude already called ones
      const allAvailableNumbers = await this.getAvailablePhoneNumbers(1000);
      
      // Get all calls to determine which numbers have been called
      const allCalls = await this.getAllCalls();
      const calledPhoneNumbers = new Set(allCalls.map(call => call.phoneNumber));
      
      // Filter out phone numbers that have already been called
      return allAvailableNumbers.filter(phoneNumber => 
        !calledPhoneNumbers.has(phoneNumber.phoneNumber)
      );
    } else {
      // Regular users can only use their assigned numbers that haven't been called
      return this.getPhoneNumbersWithoutCalls(userId);
    }
  }

  async getAllPhoneNumbers(): Promise<PhoneNumber[]> {
    const items = await this.scanAllItems({
      TableName: this.phoneNumbersTable,
    });
    const phoneNumbers = items as PhoneNumber[] || [];
    
    // Add backward compatibility for existing records without areaCode
    return phoneNumbers.map(item => ({
      ...item,
      areaCode: item.areaCode || 'DEFAULT001' // Default area code for existing records
    }));
  }

  // New paginated phone numbers method
  async getPhoneNumbersPaginated(
    page: number = 1,
    limit: number = 50,
    userId?: string,
    filters?: PhoneNumbersQueryParams
  ): Promise<PaginatedPhoneNumbersResponse> {
    try {
      let allItems: PhoneNumber[] = [];
      
      if (userId && !filters?.assignedTo) {
        // For regular users, get only their assigned numbers
        allItems = await this.getPhoneNumbersByUser(userId);
      } else {
        // For admin or when filtering by specific user, get all numbers
        allItems = await this.getAllPhoneNumbers();
      }

      // Apply filters
      let filteredItems = allItems;
      
      if (filters) {
        filteredItems = allItems.filter(item => {
          // Status filter
          if (filters.status && item.status !== filters.status) return false;
          
          // Assigned to filter
          if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
          
          // Area code filter
          if (filters.areaCode && !(item.areaCode || '').toLowerCase().includes(filters.areaCode.toLowerCase())) return false;
          
          // Name filter
          if (filters.name && item.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
          
          // Address filter
          if (filters.address && item.address && !item.address.toLowerCase().includes(filters.address.toLowerCase())) return false;
          
          // Batch ID filter
          if (filters.batchId && item.batchId && !item.batchId.toLowerCase().includes(filters.batchId.toLowerCase())) return false;
          
          // Assigned date range filter
          if (filters.assignedAtStart && item.assignedAt) {
            const assignedDate = new Date(item.assignedAt).toISOString().split('T')[0];
            if (assignedDate < filters.assignedAtStart) return false;
          }
          if (filters.assignedAtEnd && item.assignedAt) {
            const assignedDate = new Date(item.assignedAt).toISOString().split('T')[0];
            if (assignedDate > filters.assignedAtEnd) return false;
          }
          
          // Created date range filter
          if (filters.createdAtStart) {
            const createdDate = new Date(item.createdAt).toISOString().split('T')[0];
            if (createdDate < filters.createdAtStart) return false;
          }
          if (filters.createdAtEnd) {
            const createdDate = new Date(item.createdAt).toISOString().split('T')[0];
            if (createdDate > filters.createdAtEnd) return false;
          }
          
          return true;
        });
      }

      // Sort by creation date (newest first)
      filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Calculate pagination
      const total = filteredItems.length;
      const totalPages = Math.ceil(total / limit);
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const items = filteredItems.slice(startIndex, endIndex);
      const hasMore = endIndex < total;

      return {
        items,
        total,
        page,
        limit,
        hasMore,
        totalPages
      };
    } catch (error) {
      console.error('Error getting paginated phone numbers:', error);
      throw error;
    }
  }

  // New phone number statistics method
  async getPhoneNumberStats(userId?: string): Promise<PhoneNumberStats> {
    try {
      let phoneNumbers: PhoneNumber[];
      
      if (userId) {
        // For regular users, get only their assigned numbers
        phoneNumbers = await this.getPhoneNumbersByUser(userId);
      } else {
        // For admin, get all numbers
        phoneNumbers = await this.getAllPhoneNumbers();
      }

      const total = phoneNumbers.length;
      const available = phoneNumbers.filter(p => p.status === 'available').length;
      const assigned = phoneNumbers.filter(p => p.status === 'assigned').length;
      const inUse = phoneNumbers.filter(p => p.status === 'in-use').length;
      const completed = phoneNumbers.filter(p => p.status === 'completed').length;

      return {
        total,
        available,
        assigned,
        inUse,
        completed
      };
    } catch (error) {
      console.error('Error getting phone number stats:', error);
      throw error;
    }
  }

  async updatePhoneNumber(phoneNumber: string, updates: Partial<PhoneNumber>): Promise<PhoneNumber | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'phoneNumber') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getPhoneNumber(phoneNumber);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.phoneNumbersTable,
      Key: { phoneNumber },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as PhoneNumber || null;
  }

  async deletePhoneNumber(phoneNumber: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.phoneNumbersTable,
        Key: { phoneNumber },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting phone number:', error);
      throw error;
    }
  }

  async canDeletePhoneNumber(phoneNumber: string): Promise<{ canDelete: boolean; reason?: string }> {
    try {
      // Get the phone number details
      const phoneNumberRecord = await this.getPhoneNumber(phoneNumber);
      if (!phoneNumberRecord) {
        return { canDelete: false, reason: 'Phone number not found' };
      }

      // Check if number is currently in use
      if (phoneNumberRecord.status === 'in-use') {
        return { canDelete: false, reason: 'Phone number is currently in use' };
      }

      // Check for recent calls (within last 24 hours)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const recentCalls = await dynamodb.scan({
        TableName: this.callsTable,
        FilterExpression: 'phoneNumber = :phoneNumber AND createdAt > :oneDayAgo',
        ExpressionAttributeValues: {
          ':phoneNumber': phoneNumber,
          ':oneDayAgo': oneDayAgo,
        },
      }).promise();

      if (recentCalls.Items && recentCalls.Items.length > 0) {
        return { canDelete: false, reason: 'Phone number has recent calls (within 24 hours)' };
      }

      return { canDelete: true };
    } catch (error) {
      console.error('Error checking if phone number can be deleted:', error);
      return { canDelete: false, reason: 'Error checking deletion eligibility' };
    }
  }

  async deletePhoneNumbersByAreaCode(areaCode: string, force: boolean = false): Promise<{
    areaCode: string;
    totalNumbers: number;
    deletedCount: number;
    skippedCount: number;
    errorCount: number;
    deletedNumbers: string[];
    skippedNumbers: { phoneNumber: string; reason: string }[];
    errors: { phoneNumber: string; error: string }[];
  }> {
    try {
      // Get all phone numbers for the area code
      const result = await dynamodb.scan({
        TableName: this.phoneNumbersTable,
        FilterExpression: '#areaCode = :areaCode',
        ExpressionAttributeNames: {
          '#areaCode': 'areaCode',
        },
        ExpressionAttributeValues: {
          ':areaCode': areaCode,
        },
      }).promise();

      const phoneNumbers = result.Items as PhoneNumber[] || [];
      const totalNumbers = phoneNumbers.length;
      const deletedNumbers: string[] = [];
      const skippedNumbers: { phoneNumber: string; reason: string }[] = [];
      const errors: { phoneNumber: string; error: string }[] = [];

      // Process each phone number
      for (const phoneNumber of phoneNumbers) {
        try {
          if (!force) {
            // Check if number can be safely deleted
            const canDelete = await this.canDeletePhoneNumber(phoneNumber.phoneNumber);
            if (!canDelete.canDelete) {
              skippedNumbers.push({
                phoneNumber: phoneNumber.phoneNumber,
                reason: canDelete.reason || 'Cannot delete'
              });
              continue;
            }
          }

          // Delete the phone number
          await this.deletePhoneNumber(phoneNumber.phoneNumber);
          deletedNumbers.push(phoneNumber.phoneNumber);
        } catch (error) {
          console.error(`Error deleting phone number ${phoneNumber.phoneNumber}:`, error);
          errors.push({
            phoneNumber: phoneNumber.phoneNumber,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return {
        areaCode,
        totalNumbers,
        deletedCount: deletedNumbers.length,
        skippedCount: skippedNumbers.length,
        errorCount: errors.length,
        deletedNumbers,
        skippedNumbers,
        errors,
      };
    } catch (error) {
      console.error('Error in bulk delete by area code:', error);
      throw error;
    }
  }

  // Call operations
  async createCall(call: Call): Promise<Call> {
    await dynamodb.put({
      TableName: this.callsTable,
      Item: call,
    }).promise();
    return call;
  }

  async getCall(callId: string): Promise<Call | null> {
    const result = await dynamodb.get({
      TableName: this.callsTable,
      Key: { callId },
    }).promise();
    return result.Item as Call || null;
  }

  async getCallsByUser(userId: string, limit?: number): Promise<Call[]> {
    const queryParams: any = {
      TableName: this.callsTable,
      IndexName: 'userId-createdAt-index',
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: {
        ':userId': userId,
      },
      ScanIndexForward: false, // Sort by createdAt descending
    };

    if (limit) {
      queryParams.Limit = limit;
    }

    const result = await dynamodb.query(queryParams).promise();
    return result.Items as Call[] || [];
  }

  async getAllCalls(limit?: number): Promise<Call[]> {
    if (limit) {
      // If limit is specified, use the original scan with limit for performance
      const scanParams: any = {
        TableName: this.callsTable,
        Limit: limit,
      };
      const result = await dynamodb.scan(scanParams).promise();
      return result.Items as Call[] || [];
    } else {
      // If no limit, use pagination to get all items
      const items = await this.scanAllItems({
        TableName: this.callsTable,
      });
      return items as Call[] || [];
    }
  }

  async getAllCallsWithCallerInfo(limit?: number): Promise<Call[]> {
    // First get all calls
    const calls = await this.getAllCalls(limit);
    
    // Get unique user IDs
    const userIds = [...new Set(calls.map(call => call.userId))];
    
    // Fetch user information for all unique user IDs
    const users: { [userId: string]: User } = {};
    for (const userId of userIds) {
      const user = await this.getUserById(userId);
      if (user) {
        users[userId] = user;
      }
    }
    
    // Enhance calls with caller information
    return calls.map(call => ({
      ...call,
      callerInfo: users[call.userId] ? {
        firstName: users[call.userId].firstName,
        lastName: users[call.userId].lastName,
        email: users[call.userId].email
      } : undefined
    }));
  }

  async getCallsByUserWithCallerInfo(userId: string, limit: number = 50): Promise<Call[]> {
    // For regular users, just get their calls without caller info (they know who they are)
    return this.getCallsByUser(userId, limit);
  }

  async updateCall(callId: string, updates: Partial<Call>): Promise<Call | null> {
    console.log('Database updateCall called with:', { callId, updates });
    
    const setExpressions = [];
    const removeExpressions = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'callId') {
        if (value === null || value === undefined) {
          // Remove the attribute if value is null or undefined
          removeExpressions.push(`#${key}`);
          expressionAttributeNames[`#${key}`] = key;
          console.log(`Will REMOVE attribute: ${key}`);
        } else {
          // Set the attribute to the new value
          setExpressions.push(`#${key} = :${key}`);
          expressionAttributeNames[`#${key}`] = key;
          expressionAttributeValues[`:${key}`] = value;
          console.log(`Will SET attribute: ${key} = ${value}`);
        }
      }
    }

    if (setExpressions.length === 0 && removeExpressions.length === 0) {
      console.log('No updates to perform, returning existing call');
      return this.getCall(callId);
    }

    // Always update the updatedAt timestamp (avoid duplicate if already in updates)
    if (!expressionAttributeNames['#updatedAt']) {
      setExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
    }

    // Set completedAt when status changes to 'completed' (avoid duplicate if already in updates)
    if (updates.status === 'completed' && !expressionAttributeNames['#completedAt']) {
      setExpressions.push('#completedAt = :completedAt');
      expressionAttributeNames['#completedAt'] = 'completedAt';
      expressionAttributeValues[':completedAt'] = new Date().toISOString();
      console.log('Will SET completedAt timestamp for completed status');
    }

    // Build the update expression
    let updateExpression = '';
    if (setExpressions.length > 0) {
      updateExpression += `SET ${setExpressions.join(', ')}`;
    }
    if (removeExpressions.length > 0) {
      if (updateExpression) updateExpression += ' ';
      updateExpression += `REMOVE ${removeExpressions.join(', ')}`;
    }

    console.log('DynamoDB update parameters:', {
      TableName: this.callsTable,
      Key: { callId },
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });

    try {
      const result = await dynamodb.update({
        TableName: this.callsTable,
        Key: { callId },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: expressionAttributeNames,
        ...(Object.keys(expressionAttributeValues).length > 0 && { ExpressionAttributeValues: expressionAttributeValues }),
        ReturnValues: 'ALL_NEW',
      }).promise();

      console.log('DynamoDB update result:', result);
      return result.Attributes as Call || null;
    } catch (error) {
      console.error('DynamoDB update error:', error);
      throw error;
    }
  }

  async deleteCall(callId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.callsTable,
        Key: { callId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting call:', error);
      throw error;
    }
  }

  // Efficient stats methods that count records without fetching all data
  async getCallStats(userId?: string): Promise<{
    totalCalls: number;
    completedCalls: number;
    pendingCalls: number;
    inProgressCalls: number;
    successfulCalls: number;
    callbackRequests: number;
    noAnswerCalls: number;
    averageDuration: number;
    successRate: number;
  }> {
    try {
      let calls: Call[];
      
      if (userId) {
        // Get calls for specific user
        calls = await this.getCallsByUser(userId);
      } else {
        // Get all calls
        calls = await this.getAllCalls();
      }

      const totalCalls = calls.length;
      const completedCalls = calls.filter(call => call.status === 'completed').length;
      const pendingCalls = calls.filter(call => call.status === 'pending').length;
      const inProgressCalls = calls.filter(call => call.status === 'in-progress').length;
      const successfulCalls = calls.filter(call => call.outcome === 'interested').length;
      const callbackRequests = calls.filter(call => call.outcome === 'callback').length;
      const noAnswerCalls = calls.filter(call => call.outcome === 'no-answer').length;
      
      // Calculate average duration
      const callsWithDuration = calls.filter(call => call.duration && call.duration > 0);
      const averageDuration = callsWithDuration.length > 0 
        ? callsWithDuration.reduce((sum, call) => sum + (call.duration || 0), 0) / callsWithDuration.length 
        : 0;
      
      // Calculate success rate
      const successRate = completedCalls > 0 ? (successfulCalls / completedCalls) * 100 : 0;

      return {
        totalCalls,
        completedCalls,
        pendingCalls,
        inProgressCalls,
        successfulCalls,
        callbackRequests,
        noAnswerCalls,
        averageDuration,
        successRate,
      };
    } catch (error) {
      console.error('Error getting call stats:', error);
      throw error;
    }
  }

  // Follow-up operations
  async createFollowUp(followUp: FollowUp): Promise<FollowUp> {
    await dynamodb.put({
      TableName: this.followUpsTable,
      Item: followUp,
    }).promise();
    return followUp;
  }

  async getFollowUp(followUpId: string): Promise<FollowUp | null> {
    const result = await dynamodb.get({
      TableName: this.followUpsTable,
      Key: { followUpId },
    }).promise();
    return result.Item as FollowUp || null;
  }

  async getFollowUpsByUser(userId: string, limit?: number, filters?: {
    startDate?: string;
    endDate?: string;
    status?: FollowUp['status'];
    priority?: number;
    overdue?: boolean;
  }): Promise<FollowUp[]> {
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {
      ':userId': userId,
    };

    // Build KeyConditionExpression for date range
    let keyConditionExpression = 'userId = :userId';
    
    // Handle date range in KeyConditionExpression since scheduledDate is the sort key
    if (filters?.startDate && filters?.endDate) {
      // Both start and end date provided - convert to full datetime range
      const startDateTime = this.convertDateToStartOfDay(filters.startDate);
      const endDateTime = this.convertDateToEndOfDay(filters.endDate);
      keyConditionExpression += ' AND scheduledDate BETWEEN :startDate AND :endDate';
      expressionAttributeValues[':startDate'] = startDateTime;
      expressionAttributeValues[':endDate'] = endDateTime;
    } else if (filters?.startDate) {
      // Only start date provided - convert to start of day
      const startDateTime = this.convertDateToStartOfDay(filters.startDate);
      keyConditionExpression += ' AND scheduledDate >= :startDate';
      expressionAttributeValues[':startDate'] = startDateTime;
    } else if (filters?.endDate) {
      // Only end date provided - convert to end of day
      const endDateTime = this.convertDateToEndOfDay(filters.endDate);
      keyConditionExpression += ' AND scheduledDate <= :endDate';
      expressionAttributeValues[':endDate'] = endDateTime;
    }

    // Build FilterExpression for non-key attributes
    const filterConditions: string[] = [];

    if (filters?.status) {
      filterConditions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = filters.status;
    }

    if (filters?.priority) {
      filterConditions.push('priority = :priority');
      expressionAttributeValues[':priority'] = filters.priority;
    }

    if (filters?.overdue) {
      const now = new Date().toISOString();
      // For overdue filter, we need to handle it differently since scheduledDate is in the key
      // We'll override the KeyConditionExpression to only get items before now
      if (!filters?.startDate && !filters?.endDate) {
        // If no other date filters, modify the key condition to get overdue items
        keyConditionExpression = 'userId = :userId AND scheduledDate < :now';
        expressionAttributeValues[':now'] = now;
      }
      // Always add status filter for pending items
      filterConditions.push('#status = :pendingStatus');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':pendingStatus'] = 'pending';
    }

    const queryParams: any = {
      TableName: this.followUpsTable,
      IndexName: 'userId-scheduledDate-index',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: true, // Sort by scheduledDate ascending
    };

    if (limit) {
      queryParams.Limit = limit;
    }

    if (filterConditions.length > 0) {
      queryParams.FilterExpression = filterConditions.join(' AND ');
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      queryParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    const result = await dynamodb.query(queryParams).promise();
    const followUps = result.Items as FollowUp[] || [];
    return this.sortFollowUpsByPriority(followUps);
  }

  async getAllFollowUps(limit?: number): Promise<FollowUp[]> {
    if (limit) {
      // If limit is specified, use the original scan with limit for performance
      const scanParams: any = {
        TableName: this.followUpsTable,
        Limit: limit,
      };
      const result = await dynamodb.scan(scanParams).promise();
      const followUps = result.Items as FollowUp[] || [];
      return this.sortFollowUpsByPriority(followUps);
    } else {
      // If no limit, use pagination to get all items
      const items = await this.scanAllItems({
        TableName: this.followUpsTable,
      });
      const followUps = items as FollowUp[] || [];
      return this.sortFollowUpsByPriority(followUps);
    }
  }

  async getAllFollowUpsWithCallerInfo(limit?: number, filters?: {
    startDate?: string;
    endDate?: string;
    status?: FollowUp['status'];
    priority?: number;
    overdue?: boolean;
  }): Promise<FollowUp[]> {
    // Build filter expressions for scan operation
    let filterExpression = '';
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};
    const filterConditions: string[] = [];

    if (filters?.startDate) {
      const startDateTime = this.convertDateToStartOfDay(filters.startDate);
      filterConditions.push('scheduledDate >= :startDate');
      expressionAttributeValues[':startDate'] = startDateTime;
    }

    if (filters?.endDate) {
      const endDateTime = this.convertDateToEndOfDay(filters.endDate);
      filterConditions.push('scheduledDate <= :endDate');
      expressionAttributeValues[':endDate'] = endDateTime;
    }

    if (filters?.status) {
      filterConditions.push('#status = :status');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':status'] = filters.status;
    }

    if (filters?.priority) {
      filterConditions.push('priority = :priority');
      expressionAttributeValues[':priority'] = filters.priority;
    }

    if (filters?.overdue) {
      const now = new Date().toISOString();
      filterConditions.push('scheduledDate < :now AND #status = :pendingStatus');
      expressionAttributeNames['#status'] = 'status';
      expressionAttributeValues[':now'] = now;
      expressionAttributeValues[':pendingStatus'] = 'pending';
    }

    if (filterConditions.length > 0) {
      filterExpression = filterConditions.join(' AND ');
    }

    // Scan with filters
    const scanParams: any = {
      TableName: this.followUpsTable,
    };

    if (limit) {
      scanParams.Limit = limit;
    }

    if (filterExpression) {
      scanParams.FilterExpression = filterExpression;
      scanParams.ExpressionAttributeValues = expressionAttributeValues;
    }

    if (Object.keys(expressionAttributeNames).length > 0) {
      scanParams.ExpressionAttributeNames = expressionAttributeNames;
    }

    let followUps: FollowUp[];
    if (limit) {
      // If limit is specified, use the original scan with limit for performance
      const result = await dynamodb.scan(scanParams).promise();
      followUps = result.Items as FollowUp[] || [];
    } else {
      // If no limit, use pagination to get all items
      const items = await this.scanAllItems(scanParams);
      followUps = items as FollowUp[] || [];
    }
    
    // Get unique user IDs
    const userIds = [...new Set(followUps.map(followUp => followUp.userId))];
    
    // Fetch user information for all unique user IDs
    const users: { [userId: string]: User } = {};
    for (const userId of userIds) {
      const user = await this.getUserById(userId);
      if (user) {
        users[userId] = user;
      }
    }
    
    // Enhance follow-ups with caller information
    const enhancedFollowUps = followUps.map(followUp => ({
      ...followUp,
      callerInfo: users[followUp.userId] ? {
        firstName: users[followUp.userId].firstName,
        lastName: users[followUp.userId].lastName,
        email: users[followUp.userId].email
      } : undefined
    }));

    return this.sortFollowUpsByPriority(enhancedFollowUps);
  }

  async getFollowUpsByUserWithCallerInfo(userId: string, limit?: number): Promise<FollowUp[]> {
    // For regular users, just get their follow-ups without caller info (they know who they are)
    return this.getFollowUpsByUser(userId, limit);
  }

  async updateFollowUp(followUpId: string, updates: Partial<FollowUp>): Promise<FollowUp | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'followUpId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getFollowUp(followUpId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.followUpsTable,
      Key: { followUpId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as FollowUp || null;
  }

  async deleteFollowUp(followUpId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.followUpsTable,
        Key: { followUpId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting follow-up:', error);
      throw error;
    }
  }

  // Helper method to sort follow-ups by priority (highest star rating first, then by status)
  private sortFollowUpsByPriority(followUps: FollowUp[]): FollowUp[] {
    const now = new Date();
    
    return followUps.sort((a, b) => {
      // Primary sort: User-defined priority (5 stars first, then 4, 3, 2, 1)
      const priorityA = a.priority || 2; // Default to 2 stars
      const priorityB = b.priority || 2; // Default to 2 stars
      
      if (priorityA !== priorityB) {
        return priorityB - priorityA; // Higher priority (more stars) first
      }
      
      // Secondary sort: Status-based priority scores (lower score = higher priority)
      const statusScoreA = this.getFollowUpStatusScore(a, now);
      const statusScoreB = this.getFollowUpStatusScore(b, now);
      
      if (statusScoreA !== statusScoreB) {
        return statusScoreA - statusScoreB; // Lower score first
      }
      
      // Tertiary sort: Within same priority and status, sort by scheduled date
      if (a.status === 'pending' && b.status === 'pending') {
        const dateA = new Date(a.scheduledDate);
        const dateB = new Date(b.scheduledDate);
        
        // For overdue items, most overdue first (oldest scheduled date first)
        if (dateA < now && dateB < now) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // For pending items, soonest scheduled date first
        if (dateA >= now && dateB >= now) {
          return dateA.getTime() - dateB.getTime();
        }
      }
      
      // For completed items, most recently completed first
      if (a.status === 'completed' && b.status === 'completed') {
        const completedA = new Date(a.completedAt || a.updatedAt);
        const completedB = new Date(b.completedAt || b.updatedAt);
        return completedB.getTime() - completedA.getTime();
      }
      
      // Fallback to creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }

  // Helper method to calculate status-based priority score for a follow-up
  private getFollowUpStatusScore(followUp: FollowUp, now: Date): number {
    const scheduledDate = new Date(followUp.scheduledDate);
    
    switch (followUp.status) {
      case 'pending':
        if (scheduledDate < now) {
          return 1; // Overdue - highest priority within same star rating
        } else {
          return 2; // Pending - medium priority within same star rating
        }
      case 'completed':
        return 3; // Completed - low priority within same star rating
      case 'cancelled':
        return 4; // Cancelled - lowest priority within same star rating
      default:
        return 5; // Unknown status - lowest priority within same star rating
    }
  }

  // Helper method to convert date-only string to start of day ISO string
  private convertDateToStartOfDay(dateString: string): string {
    // If already a full ISO datetime string, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    // Convert YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss.sssZ (start of day)
    const date = new Date(dateString + 'T00:00:00.000Z');
    return date.toISOString();
  }

  // Helper method to convert date-only string to end of day ISO string
  private convertDateToEndOfDay(dateString: string): string {
    // If already a full ISO datetime string, return as is
    if (dateString.includes('T')) {
      return dateString;
    }
    
    // Convert YYYY-MM-DD to YYYY-MM-DDTHH:mm:ss.sssZ (end of day)
    const date = new Date(dateString + 'T23:59:59.999Z');
    return date.toISOString();
  }

  // Client Expense operations
  async createClientExpense(expense: ClientExpense): Promise<ClientExpense> {
    await dynamodb.put({
      TableName: this.clientExpensesTable,
      Item: expense,
    }).promise();
    return expense;
  }

  async getClientExpense(expenseId: string): Promise<ClientExpense | null> {
    const result = await dynamodb.get({
      TableName: this.clientExpensesTable,
      Key: { expenseId },
    }).promise();
    return result.Item as ClientExpense || null;
  }

  async getClientExpenses(clientId: string): Promise<ClientExpense[]> {
    const result = await dynamodb.query({
      TableName: this.clientExpensesTable,
      IndexName: 'clientId-createdAt-index',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
      ScanIndexForward: false, // Sort by createdAt descending (newest first)
    }).promise();
    return result.Items as ClientExpense[] || [];
  }

  async updateClientExpense(expenseId: string, updates: Partial<ClientExpense>): Promise<ClientExpense | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'expenseId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getClientExpense(expenseId);
    }

    // Always update the updatedAt timestamp
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.clientExpensesTable,
      Key: { expenseId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as ClientExpense || null;
  }

  async deleteClientExpense(expenseId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.clientExpensesTable,
        Key: { expenseId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting client expense:', error);
      throw error;
    }
  }

  async getClientExpenseSummary(clientId: string): Promise<ExpenseSummary> {
    try {
      const expenses = await this.getClientExpenses(clientId);
      
      const summary: ExpenseSummary = {
        totalExpenses: 0,
        expensesByType: {
          material_cost: 0,
          civil_work_cost: 0,
          labour_cost: 0,
          auto_cost: 0,
          other: 0,
        },
        expenseCount: expenses.length,
      };

      expenses.forEach(expense => {
        summary.totalExpenses += expense.amount;
        summary.expensesByType[expense.expenseType] += expense.amount;
      });

      return summary;
    } catch (error) {
      console.error('Error getting client expense summary:', error);
      throw error;
    }
  }
}

export const db = new DatabaseService();
