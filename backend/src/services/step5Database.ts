import { DynamoDB } from 'aws-sdk';
import { 
  Step5BankSubsidyData,
  Step5RegistrationStatus,
  Step5DocumentUploadStatus,
  Step5SubsidyApplication,
  Step5DocumentFile,
  SaveStep5DataRequest
} from '../../../shared/types';
import { fileStorageService } from './fileStorageService';
import { v4 as uuidv4 } from 'uuid';

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

export class Step5DatabaseService {
  private readonly step5Table = process.env.CLIENT_STEP5_TABLE || 'call-management-backend-dev-client-step5-data';

  /**
   * Get Step 5 data for a client
   */
  async getStep5Data(clientId: string): Promise<Step5BankSubsidyData | null> {
    try {
      const result = await dynamodb.get({
        TableName: this.step5Table,
        Key: { clientId },
      }).promise();

      return result.Item as Step5BankSubsidyData || null;
    } catch (error) {
      console.error('Error getting Step 5 data:', error);
      throw error;
    }
  }

  /**
   * Create initial Step 5 data for a client
   */
  async createStep5Data(clientId: string, createdBy: string): Promise<Step5BankSubsidyData> {
    const now = new Date().toISOString();
    
    const initialData: Step5BankSubsidyData = {
      clientId,
      bankDisbursementLetter: [],
      marginReceipt: [],
      registrationStatus: {
        registrationDone: false,
        notes: ''
      },
      documentUploadStatus: {
        allDocumentsUploaded: false,
        notes: ''
      },
      subsidyApplication: {
        subsidyApplied: false,
        applicationStatus: 'submitted',
        notes: ''
      },
      notes: '',
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy
    };

    try {
      await dynamodb.put({
        TableName: this.step5Table,
        Item: initialData,
      }).promise();

      return initialData;
    } catch (error) {
      console.error('Error creating Step 5 data:', error);
      throw error;
    }
  }

  /**
   * Update Step 5 data (partial update)
   */
  async updateStep5Data(
    clientId: string, 
    updates: SaveStep5DataRequest, 
    updatedBy: string
  ): Promise<Step5BankSubsidyData | null> {
    try {
      // Get existing data first
      const existingData = await this.getStep5Data(clientId);
      if (!existingData) {
        throw new Error('Step 5 data not found for client');
      }

      // Build update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Handle registration status updates
      if (updates.registrationStatus) {
        for (const [key, value] of Object.entries(updates.registrationStatus)) {
          if (value !== undefined) {
            updateExpression.push(`registrationStatus.#${key} = :registrationStatus_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:registrationStatus_${key}`] = value;
          }
        }
      }

      // Handle document upload status updates
      if (updates.documentUploadStatus) {
        for (const [key, value] of Object.entries(updates.documentUploadStatus)) {
          if (value !== undefined) {
            updateExpression.push(`documentUploadStatus.#${key} = :documentUploadStatus_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:documentUploadStatus_${key}`] = value;
          }
        }
      }

      // Handle subsidy application updates
      if (updates.subsidyApplication) {
        for (const [key, value] of Object.entries(updates.subsidyApplication)) {
          if (value !== undefined) {
            updateExpression.push(`subsidyApplication.#${key} = :subsidyApplication_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:subsidyApplication_${key}`] = value;
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
        TableName: this.step5Table,
        Key: { clientId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step5BankSubsidyData;
    } catch (error) {
      console.error('Error updating Step 5 data:', error);
      throw error;
    }
  }

  /**
   * Delete Step 5 data (admin only)
   */
  async deleteStep5Data(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.step5Table,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting Step 5 data:', error);
      throw error;
    }
  }

  /**
   * Get all Step 5 data for a user (for admin dashboard)
   */
  async getAllStep5DataByUser(createdBy: string): Promise<Step5BankSubsidyData[]> {
    try {
      const result = await dynamodb.query({
        TableName: this.step5Table,
        IndexName: 'createdBy-updatedAt-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: {
          ':createdBy': createdBy,
        },
        ScanIndexForward: false, // Sort by updatedAt descending
      }).promise();

      return result.Items as Step5BankSubsidyData[] || [];
    } catch (error) {
      console.error('Error getting all Step 5 data by user:', error);
      throw error;
    }
  }

  /**
   * Check if Step 5 data exists for a client
   */
  async step5DataExists(clientId: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: this.step5Table,
        Key: { clientId },
        ProjectionExpression: 'clientId'
      }).promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking Step 5 data existence:', error);
      return false;
    }
  }

  /**
   * Upload documents for Step 5
   */
  async uploadDocuments(
    clientId: string,
    category: 'bankDisbursementLetter' | 'marginReceipt',
    files: Array<{
      fieldname: string;
      originalname: string;
      encoding: string;
      mimetype: string;
      size: number;
      buffer: Buffer;
    }>,
    uploadedBy: string
  ): Promise<Step5DocumentFile[]> {
    try {
      const result = await fileStorageService.uploadGenericFiles<Step5DocumentFile>(
        files,
        clientId,
        `step5/${category}`,
        uploadedBy,
        (baseFile) => ({
          documentId: baseFile.documentId,
          fileName: baseFile.fileName,
          originalName: baseFile.originalName,
          fileSize: baseFile.fileSize,
          mimeType: baseFile.mimeType,
          uploadedAt: baseFile.uploadedAt,
          uploadedBy: baseFile.uploadedBy,
          s3Key: baseFile.s3Key,
          s3Url: baseFile.s3Url,
          thumbnailUrl: baseFile.thumbnailUrl
        })
      );
      
      if (result.errors.length > 0) {
        console.warn('Some files failed to upload:', result.errors);
      }
      
      // Update the database with new documents
      const existingData = await this.getStep5Data(clientId);
      if (!existingData) {
        throw new Error('Step 5 data not found for client');
      }
      
      const currentDocuments = existingData[category] || [];
      const updatedDocuments = [...currentDocuments, ...result.uploadedFiles];
      
      await dynamodb.update({
        TableName: this.step5Table,
        Key: { clientId },
        UpdateExpression: `SET ${category} = :documents, updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeValues: {
          ':documents': updatedDocuments,
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': uploadedBy
        }
      }).promise();
      
      return result.uploadedFiles;
    } catch (error) {
      console.error('Error uploading Step 5 documents:', error);
      throw error;
    }
  }

  /**
   * Delete a document from Step 5
   */
  async deleteDocument(
    clientId: string,
    category: 'bankDisbursementLetter' | 'marginReceipt',
    documentId: string,
    deletedBy: string
  ): Promise<boolean> {
    try {
      const existingData = await this.getStep5Data(clientId);
      if (!existingData) {
        throw new Error('Step 5 data not found for client');
      }
      
      const documents = existingData[category] || [];
      const documentToDelete = documents.find(doc => doc.documentId === documentId);
      
      if (!documentToDelete) {
        throw new Error('Document not found');
      }
      
      // Delete from S3
      await fileStorageService.deleteFile(documentToDelete.s3Key);
      
      // Remove from database
      const updatedDocuments = documents.filter(doc => doc.documentId !== documentId);
      
      await dynamodb.update({
        TableName: this.step5Table,
        Key: { clientId },
        UpdateExpression: `SET ${category} = :documents, updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeValues: {
          ':documents': updatedDocuments,
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': deletedBy
        }
      }).promise();
      
      return true;
    } catch (error) {
      console.error('Error deleting Step 5 document:', error);
      throw error;
    }
  }

  /**
   * Get download URL for a document
   */
  async getDocumentDownloadUrl(
    clientId: string,
    category: 'bankDisbursementLetter' | 'marginReceipt',
    documentId: string
  ): Promise<{ downloadUrl: string } | null> {
    try {
      const existingData = await this.getStep5Data(clientId);
      if (!existingData) {
        throw new Error('Step 5 data not found for client');
      }
      
      const documents = existingData[category] || [];
      const document = documents.find(doc => doc.documentId === documentId);
      
      if (!document) {
        throw new Error('Document not found');
      }
      
      const downloadUrl = await fileStorageService.getDownloadUrl(document.s3Key);
      
      return { downloadUrl };
    } catch (error) {
      console.error('Error getting Step 5 document download URL:', error);
      throw error;
    }
  }
}

export const step5Db = new Step5DatabaseService();
