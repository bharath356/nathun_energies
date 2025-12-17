import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
  Step3SiteSurveyData,
  Step3SiteMeasurement,
  Step3LegalAgreements,
  Step3PlantDetailsUpdate,
  Step3InstallationProgress,
  Step3DocumentFile,
  Step3DocumentCategory,
  SaveStep3DataRequest
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

export class Step3DatabaseService {
  private readonly step3Table = process.env.CLIENT_STEP3_TABLE || 'call-management-backend-dev-client-step3-data';

  /**
   * Get Step 3 data for a client
   */
  async getStep3Data(clientId: string): Promise<Step3SiteSurveyData | null> {
    try {
      const result = await dynamodb.get({
        TableName: this.step3Table,
        Key: { clientId },
      }).promise();

      return result.Item as Step3SiteSurveyData || null;
    } catch (error) {
      console.error('Error getting Step 3 data:', error);
      throw error;
    }
  }

  /**
   * Create initial Step 3 data for a client
   */
  async createStep3Data(clientId: string, createdBy: string): Promise<Step3SiteSurveyData> {
    const now = new Date().toISOString();
    
    const initialData: Step3SiteSurveyData = {
      clientId,
      siteMeasurement: {
        numberOfLegs: 0,
        legDimensions: [],
        notes: ''
      },
      installationProgress: {
        materialDispatchedOnSite: false,
        structureAssemblyDone: false,
        panelInstalled: false,
        invertorConnected: false,
        dualSignNetMeteringAgreementDone: false,
        plantStarted: false,
        gpsImages: {
          materialDispatch: [],
          structureAssembly: [],
          panelInstallation: [],
          invertorConnection: [],
          netMeteringAgreement: [],
          plantStarted: []
        }
      },
      legalAgreements: {
        modalAgreement: [],
        netMeteringAgreement: [],
        meterPaymentReceipt: [],
        workCompletionReport: [],
        jointInspectionReport: [],
        commissioningCertificate: [],
        dcrSelfUndertaking: [],
        almmDeclaration: [],
        otherAgreements: []
      },
      plantDetailsUpdate: {
        panelDetailsUpdated: false,
        invertorDetailsUpdated: false,
        lastUpdatedAt: '',
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
        TableName: this.step3Table,
        Item: initialData,
      }).promise();

      return initialData;
    } catch (error) {
      console.error('Error creating Step 3 data:', error);
      throw error;
    }
  }

  /**
   * Update Step 3 data (partial update)
   */
  async updateStep3Data(
    clientId: string, 
    updates: SaveStep3DataRequest, 
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      // Get existing data first
      const existingData = await this.getStep3Data(clientId);
      if (!existingData) {
        throw new Error('Step 3 data not found for client');
      }

      // Build update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Handle site measurement updates
      if (updates.siteMeasurement) {
        for (const [key, value] of Object.entries(updates.siteMeasurement)) {
          if (value !== undefined) {
            updateExpression.push(`siteMeasurement.#${key} = :siteMeasurement_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:siteMeasurement_${key}`] = value;
          }
        }
      }

      // Handle installation progress updates
      if (updates.installationProgress) {
        for (const [key, value] of Object.entries(updates.installationProgress)) {
          if (value !== undefined) {
            updateExpression.push(`installationProgress.#${key} = :installationProgress_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:installationProgress_${key}`] = value;
          }
        }
      }

      // Handle plant details update
      if (updates.plantDetailsUpdate) {
        for (const [key, value] of Object.entries(updates.plantDetailsUpdate)) {
          if (value !== undefined) {
            updateExpression.push(`plantDetailsUpdate.#${key} = :plantDetailsUpdate_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:plantDetailsUpdate_${key}`] = value;
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
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error updating Step 3 data:', error);
      throw error;
    }
  }

  /**
   * Add document to Step 3 data
   */
  async addDocument(
    clientId: string,
    category: Step3DocumentCategory,
    documentFile: Step3DocumentFile,
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      const result = await dynamodb.update({
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `SET legalAgreements.#category = list_append(if_not_exists(legalAgreements.#category, :empty_list), :new_document), updatedAt = :updatedAt, updatedBy = :updatedBy`,
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

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  /**
   * Remove document from Step 3 data
   */
  async removeDocument(
    clientId: string,
    category: Step3DocumentCategory,
    documentId: string,
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      // Get current data to find document index
      const currentData = await this.getStep3Data(clientId);
      if (!currentData) {
        throw new Error('Step 3 data not found');
      }

      const documents = currentData.legalAgreements[category];
      const documentIndex = documents.findIndex(doc => doc.documentId === documentId);
      
      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const result = await dynamodb.update({
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `REMOVE legalAgreements.#category[${documentIndex}] SET updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#category': category
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  }

  /**
   * Delete Step 3 data (admin only)
   */
  async deleteStep3Data(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.step3Table,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting Step 3 data:', error);
      throw error;
    }
  }

  /**
   * Get all Step 3 data for a user (for admin dashboard)
   */
  async getAllStep3DataByUser(createdBy: string): Promise<Step3SiteSurveyData[]> {
    try {
      const result = await dynamodb.query({
        TableName: this.step3Table,
        IndexName: 'createdBy-updatedAt-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: {
          ':createdBy': createdBy,
        },
        ScanIndexForward: false, // Sort by updatedAt descending
      }).promise();

      return result.Items as Step3SiteSurveyData[] || [];
    } catch (error) {
      console.error('Error getting all Step 3 data by user:', error);
      throw error;
    }
  }

  /**
   * Check if Step 3 data exists for a client
   */
  async step3DataExists(clientId: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: this.step3Table,
        Key: { clientId },
        ProjectionExpression: 'clientId'
      }).promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking Step 3 data existence:', error);
      return false;
    }
  }

  /**
   * Add GPS image for a specific installation step
   */
  async addGpsImage(
    clientId: string,
    stepName: string,
    gpsImage: any,
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      const result = await dynamodb.update({
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `SET installationProgress.gpsImages.#stepName = list_append(if_not_exists(installationProgress.gpsImages.#stepName, :empty_list), :new_image), updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#stepName': stepName
        },
        ExpressionAttributeValues: {
          ':new_image': [gpsImage],
          ':empty_list': [],
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error adding GPS image:', error);
      throw error;
    }
  }

  /**
   * Remove GPS image for a specific installation step by document ID
   */
  async removeGpsImage(
    clientId: string,
    stepName: string,
    documentId: string,
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      // Get current data to find image index
      const currentData = await this.getStep3Data(clientId);
      if (!currentData) {
        throw new Error('Step 3 data not found');
      }

      const gpsImages = currentData.installationProgress.gpsImages[stepName as keyof typeof currentData.installationProgress.gpsImages];
      const imageIndex = gpsImages.findIndex(img => img.documentId === documentId);
      
      if (imageIndex === -1) {
        throw new Error('GPS image not found');
      }

      const result = await dynamodb.update({
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `REMOVE installationProgress.gpsImages.#stepName[${imageIndex}] SET updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#stepName': stepName
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error removing GPS image:', error);
      throw error;
    }
  }

  /**
   * Remove all GPS images for a specific installation step
   */
  async removeAllGpsImages(
    clientId: string,
    stepName: string,
    updatedBy: string
  ): Promise<Step3SiteSurveyData | null> {
    try {
      const result = await dynamodb.update({
        TableName: this.step3Table,
        Key: { clientId },
        UpdateExpression: `SET installationProgress.gpsImages.#stepName = :empty_list, updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#stepName': stepName
        },
        ExpressionAttributeValues: {
          ':empty_list': [],
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step3SiteSurveyData;
    } catch (error) {
      console.error('Error removing all GPS images:', error);
      throw error;
    }
  }

}

export const step3Db = new Step3DatabaseService();
