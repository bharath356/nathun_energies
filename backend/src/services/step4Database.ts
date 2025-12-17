import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
  Step4DiscomData,
  Step4FilePreparation,
  Step4DiscomDocuments,
  Step4PaymentTracking,
  Step4DcrCertificates,
  Step4DispatchTracking,
  Step4NetMeteringAgreement,
  Step4DocumentFile,
  Step4DocumentCategory,
  SaveStep4DataRequest
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

export class Step4DatabaseService {
  private readonly step4Table = process.env.CLIENT_STEP4_TABLE || 'call-management-backend-dev-client-step4-data';

  /**
   * Get Step 4 data for a client
   */
  async getStep4Data(clientId: string): Promise<Step4DiscomData | null> {
    try {
      const result = await dynamodb.get({
        TableName: this.step4Table,
        Key: { clientId },
      }).promise();

      return result.Item as Step4DiscomData || null;
    } catch (error) {
      console.error('Error getting Step 4 data:', error);
      throw error;
    }
  }

  /**
   * Create initial Step 4 data for a client
   */
  async createStep4Data(clientId: string, createdBy: string): Promise<Step4DiscomData> {
    const now = new Date().toISOString();
    
    const initialData: Step4DiscomData = {
      clientId,
      filePreparation: {
        dualSignFilePrepared: false,
        dualSignFiles: [],
        notes: ''
      },
      discomDocuments: {
        wcrDocuments: [],
        jointInspectionDocuments: [],
        commissioningUndertakingDocuments: [],
        almmCertificateDocuments: []
      },
      paymentTracking: {
        meterReplacementPaymentDone: false,
        notes: ''
      },
      dcrCertificates: {
        dcrCertificatesGenerated: false,
        certificateNumbers: [],
        certificateFiles: [],
        notes: ''
      },
      dispatchTracking: {
        fileSentToDiscom: false,
        acknowledgmentReceived: false,
        notes: ''
      },
      netMeteringAgreement: {
        dualSignNetMeteringFile: false,
        agreementFiles: [],
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
        TableName: this.step4Table,
        Item: initialData,
      }).promise();

      return initialData;
    } catch (error) {
      console.error('Error creating Step 4 data:', error);
      throw error;
    }
  }

  /**
   * Update Step 4 data (partial update)
   */
  async updateStep4Data(
    clientId: string, 
    updates: SaveStep4DataRequest, 
    updatedBy: string
  ): Promise<Step4DiscomData | null> {
    try {
      // Get existing data first
      const existingData = await this.getStep4Data(clientId);
      if (!existingData) {
        throw new Error('Step 4 data not found for client');
      }

      // Build update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Handle file preparation updates
      if (updates.filePreparation) {
        for (const [key, value] of Object.entries(updates.filePreparation)) {
          if (value !== undefined) {
            updateExpression.push(`filePreparation.#${key} = :filePreparation_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:filePreparation_${key}`] = value;
          }
        }
      }

      // Handle DISCOM documents updates
      if (updates.discomDocuments) {
        for (const [key, value] of Object.entries(updates.discomDocuments)) {
          if (value !== undefined) {
            updateExpression.push(`discomDocuments.#${key} = :discomDocuments_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:discomDocuments_${key}`] = value;
          }
        }
      }

      // Handle payment tracking updates
      if (updates.paymentTracking) {
        for (const [key, value] of Object.entries(updates.paymentTracking)) {
          if (value !== undefined) {
            updateExpression.push(`paymentTracking.#${key} = :paymentTracking_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:paymentTracking_${key}`] = value;
          }
        }
      }

      // Handle DCR certificates updates
      if (updates.dcrCertificates) {
        for (const [key, value] of Object.entries(updates.dcrCertificates)) {
          if (value !== undefined) {
            updateExpression.push(`dcrCertificates.#${key} = :dcrCertificates_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:dcrCertificates_${key}`] = value;
          }
        }
      }

      // Handle dispatch tracking updates
      if (updates.dispatchTracking) {
        for (const [key, value] of Object.entries(updates.dispatchTracking)) {
          if (value !== undefined) {
            updateExpression.push(`dispatchTracking.#${key} = :dispatchTracking_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:dispatchTracking_${key}`] = value;
          }
        }
      }

      // Handle net metering agreement updates
      if (updates.netMeteringAgreement) {
        for (const [key, value] of Object.entries(updates.netMeteringAgreement)) {
          if (value !== undefined) {
            updateExpression.push(`netMeteringAgreement.#${key} = :netMeteringAgreement_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:netMeteringAgreement_${key}`] = value;
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
        TableName: this.step4Table,
        Key: { clientId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step4DiscomData;
    } catch (error) {
      console.error('Error updating Step 4 data:', error);
      throw error;
    }
  }

  /**
   * Add document to Step 4 data
   */
  async addDocument(
    clientId: string,
    category: Step4DocumentCategory,
    documentFile: Step4DocumentFile,
    updatedBy: string
  ): Promise<Step4DiscomData | null> {
    try {
      // Map category to the correct path
      const categoryPaths: Record<Step4DocumentCategory, string> = {
        dualSignFiles: 'filePreparation.dualSignFiles',
        wcrDocuments: 'discomDocuments.wcrDocuments',
        jointInspectionDocuments: 'discomDocuments.jointInspectionDocuments',
        commissioningUndertakingDocuments: 'discomDocuments.commissioningUndertakingDocuments',
        almmCertificateDocuments: 'discomDocuments.almmCertificateDocuments',
        dcrCertificateDocuments: 'dcrCertificates.certificateFiles',
        agreementFiles: 'netMeteringAgreement.agreementFiles'
      };

      const documentPath = categoryPaths[category];
      if (!documentPath) {
        throw new Error(`Invalid document category: ${category}`);
      }

      const result = await dynamodb.update({
        TableName: this.step4Table,
        Key: { clientId },
        UpdateExpression: `SET ${documentPath} = list_append(if_not_exists(${documentPath}, :empty_list), :new_document), updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeValues: {
          ':new_document': [documentFile],
          ':empty_list': [],
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step4DiscomData;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  /**
   * Remove document from Step 4 data
   */
  async removeDocument(
    clientId: string,
    category: Step4DocumentCategory,
    documentId: string,
    updatedBy: string
  ): Promise<Step4DiscomData | null> {
    try {
      // Get current data to find document index
      const currentData = await this.getStep4Data(clientId);
      if (!currentData) {
        throw new Error('Step 4 data not found');
      }

      // Find the document array based on category
      let documents: Step4DocumentFile[] = [];
      let documentPath = '';

      switch (category) {
        case 'dualSignFiles':
          documents = currentData.filePreparation.dualSignFiles;
          documentPath = 'filePreparation.dualSignFiles';
          break;
        case 'wcrDocuments':
          documents = currentData.discomDocuments.wcrDocuments;
          documentPath = 'discomDocuments.wcrDocuments';
          break;
        case 'jointInspectionDocuments':
          documents = currentData.discomDocuments.jointInspectionDocuments;
          documentPath = 'discomDocuments.jointInspectionDocuments';
          break;
        case 'commissioningUndertakingDocuments':
          documents = currentData.discomDocuments.commissioningUndertakingDocuments;
          documentPath = 'discomDocuments.commissioningUndertakingDocuments';
          break;
        case 'almmCertificateDocuments':
          documents = currentData.discomDocuments.almmCertificateDocuments;
          documentPath = 'discomDocuments.almmCertificateDocuments';
          break;
        case 'dcrCertificateDocuments':
          documents = currentData.dcrCertificates.certificateFiles;
          documentPath = 'dcrCertificates.certificateFiles';
          break;
        case 'agreementFiles':
          documents = currentData.netMeteringAgreement.agreementFiles;
          documentPath = 'netMeteringAgreement.agreementFiles';
          break;
        default:
          throw new Error(`Invalid document category: ${category}`);
      }

      const documentIndex = documents.findIndex(doc => doc.documentId === documentId);
      
      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const result = await dynamodb.update({
        TableName: this.step4Table,
        Key: { clientId },
        UpdateExpression: `REMOVE ${documentPath}[${documentIndex}] SET updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step4DiscomData;
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  }

  /**
   * Delete Step 4 data (admin only)
   */
  async deleteStep4Data(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.step4Table,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting Step 4 data:', error);
      throw error;
    }
  }

  /**
   * Get all Step 4 data for a user (for admin dashboard)
   */
  async getAllStep4DataByUser(createdBy: string): Promise<Step4DiscomData[]> {
    try {
      const result = await dynamodb.query({
        TableName: this.step4Table,
        IndexName: 'createdBy-updatedAt-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: {
          ':createdBy': createdBy,
        },
        ScanIndexForward: false, // Sort by updatedAt descending
      }).promise();

      return result.Items as Step4DiscomData[] || [];
    } catch (error) {
      console.error('Error getting all Step 4 data by user:', error);
      throw error;
    }
  }

  /**
   * Check if Step 4 data exists for a client
   */
  async step4DataExists(clientId: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: this.step4Table,
        Key: { clientId },
        ProjectionExpression: 'clientId'
      }).promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking Step 4 data existence:', error);
      return false;
    }
  }
}

export const step4Db = new Step4DatabaseService();
