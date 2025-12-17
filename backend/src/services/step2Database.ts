import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
  Step2LoanData,
  Step2LoanDocuments,
  Step2LoanStatus,
  Step2DocumentFile,
  Step2DocumentCategory,
  SaveStep2DataRequest
} from '../../../shared/types';

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

export class Step2DatabaseService {
  private readonly step2Table = process.env.CLIENT_STEP2_TABLE || 'call-management-backend-dev-client-step2-data';

  /**
   * Get Step 2 data for a client
   */
  async getStep2Data(clientId: string): Promise<Step2LoanData | null> {
    try {
      const result = await dynamodb.get({
        TableName: this.step2Table,
        Key: { clientId },
      }).promise();

      return result.Item as Step2LoanData || null;
    } catch (error) {
      console.error('Error getting Step 2 data:', error);
      throw error;
    }
  }

  /**
   * Create initial Step 2 data for a client
   */
  async createStep2Data(clientId: string, createdBy: string): Promise<Step2LoanData> {
    const now = new Date().toISOString();
    
    const initialData: Step2LoanData = {
      clientId,
      loanDocuments: {
        loanApplications: [],
        incomeProofs: [],
        collateralDocuments: [],
        bankStatements: [],
        otherLoanDocs: []
      },
      loanStatus: {
        loanRegistrationDone: false,
        fileSubmittedToBranch: false,
        loanApprovedAndSigned: false,
        loanDisbursed: false
      },
      notes: '',
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy
    };

    try {
      await dynamodb.put({
        TableName: this.step2Table,
        Item: initialData,
      }).promise();

      return initialData;
    } catch (error) {
      console.error('Error creating Step 2 data:', error);
      throw error;
    }
  }

  /**
   * Update Step 2 data (partial update)
   */
  async updateStep2Data(
    clientId: string, 
    updates: SaveStep2DataRequest, 
    updatedBy: string
  ): Promise<Step2LoanData | null> {
    try {
      // Get existing data first
      const existingData = await this.getStep2Data(clientId);
      if (!existingData) {
        throw new Error('Step 2 data not found for client');
      }

      // Build update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Handle loan status updates
      if (updates.loanStatus) {
        for (const [key, value] of Object.entries(updates.loanStatus)) {
          if (value !== undefined) {
            updateExpression.push(`loanStatus.#${key} = :loanStatus_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:loanStatus_${key}`] = value;
          }
        }
      }

      // Handle notes update
      if (updates.notes !== undefined) {
        updateExpression.push('notes = :notes');
        expressionAttributeValues[':notes'] = updates.notes;
      }

      // Always update the updatedAt and updatedBy fields
      updateExpression.push('updatedAt = :updatedAt', 'updatedBy = :updatedBy');
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      expressionAttributeValues[':updatedBy'] = updatedBy;

      if (updateExpression.length === 2) { // Only updatedAt and updatedBy
        return existingData;
      }

      const result = await dynamodb.update({
        TableName: this.step2Table,
        Key: { clientId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step2LoanData;
    } catch (error) {
      console.error('Error updating Step 2 data:', error);
      throw error;
    }
  }

  /**
   * Add document to Step 2 data
   */
  async addDocument(
    clientId: string,
    category: Step2DocumentCategory,
    documentFile: Step2DocumentFile,
    updatedBy: string
  ): Promise<Step2LoanData | null> {
    try {
      const result = await dynamodb.update({
        TableName: this.step2Table,
        Key: { clientId },
        UpdateExpression: `SET loanDocuments.#category = list_append(if_not_exists(loanDocuments.#category, :empty_list), :new_document), updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#category': category
        },
        ExpressionAttributeValues: {
          ':new_document': [documentFile],
          ':empty_list': [],
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step2LoanData;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  /**
   * Remove document from Step 2 data
   */
  async removeDocument(
    clientId: string,
    category: Step2DocumentCategory,
    documentId: string,
    updatedBy: string
  ): Promise<Step2LoanData | null> {
    try {
      // Get current data to find document index
      const currentData = await this.getStep2Data(clientId);
      if (!currentData) {
        throw new Error('Step 2 data not found');
      }

      const documents = currentData.loanDocuments[category];
      const documentIndex = documents.findIndex(doc => doc.documentId === documentId);
      
      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const result = await dynamodb.update({
        TableName: this.step2Table,
        Key: { clientId },
        UpdateExpression: `REMOVE loanDocuments.#category[${documentIndex}] SET updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#category': category
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step2LoanData;
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  }

  /**
   * Delete Step 2 data (admin only)
   */
  async deleteStep2Data(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.step2Table,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting Step 2 data:', error);
      throw error;
    }
  }

  /**
   * Get all Step 2 data for a user (for admin dashboard)
   */
  async getAllStep2DataByUser(createdBy: string): Promise<Step2LoanData[]> {
    try {
      const result = await dynamodb.query({
        TableName: this.step2Table,
        IndexName: 'createdBy-updatedAt-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: {
          ':createdBy': createdBy,
        },
        ScanIndexForward: false, // Sort by updatedAt descending
      }).promise();

      return result.Items as Step2LoanData[] || [];
    } catch (error) {
      console.error('Error getting all Step 2 data by user:', error);
      throw error;
    }
  }

  /**
   * Check if Step 2 data exists for a client
   */
  async step2DataExists(clientId: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: this.step2Table,
        Key: { clientId },
        ProjectionExpression: 'clientId'
      }).promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking Step 2 data existence:', error);
      return false;
    }
  }
}

export const step2Db = new Step2DatabaseService();
