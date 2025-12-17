import { DynamoDB } from 'aws-sdk';
import { v4 as uuidv4 } from 'uuid';
import { 
  Step1ClientData,
  Step1PersonalInfo,
  Step1Dates,
  Step1PlantDetails,
  Step1PricingDetails,
  Step1SpecialRequirements,
  Step1Documents,
  Step1DocumentFile,
  Step1DocumentCategory,
  Step1PaymentLog,
  SaveStep1DataRequest,
  AddPaymentLogRequest
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

export class Step1DatabaseService {
  private readonly step1Table = process.env.CLIENT_STEP1_TABLE || 'call-management-backend-dev-client-step1-data';

  /**
   * Get Step 1 data for a client
   */
  async getStep1Data(clientId: string): Promise<Step1ClientData | null> {
    try {
      const result = await dynamodb.get({
        TableName: this.step1Table,
        Key: { clientId },
      }).promise();

      return result.Item as Step1ClientData || null;
    } catch (error) {
      console.error('Error getting Step 1 data:', error);
      throw error;
    }
  }

  /**
   * Create initial Step 1 data for a client
   */
  async createStep1Data(clientId: string, createdBy: string, clientData?: { name: string; mobile: string; address: string; googleMapsUrl?: string; comments?: string }): Promise<Step1ClientData> {
    const now = new Date().toISOString();
    
    const initialData: Step1ClientData = {
      clientId,
      personalInfo: {
        name: clientData?.name || '',
        address: clientData?.address || '',
        googleMapsUrl: clientData?.googleMapsUrl || '',
        phone1: clientData?.mobile || '',
        phone2: '',
        referral: '',
        status: 'discussion in progress',
        comment: clientData?.comments || ''
      },
      dates: {
        firstContactDate: now.split('T')[0], // Today's date in YYYY-MM-DD format
        nextFollowUpDate: ''
      },
      paymentMode: 'CASH',
      plantDetails: {
        summary: {
          wattage: '2kw'
        },
        solarPanels: [],
        invertors: [],
        otherItems: {}
      },
      pricingDetails: {
        priceQuoted: 0,
        quotationPdfUrl: '',
        priceFinalized: 0,
        advanceReceived: 0,
        paymentLogs: []
      },
      specialRequirements: {
        nameTransferRequired: false,
        nameTransferComments: '',
        loadEnhancementRequired: false,
        loadEnhancementComments: '',
        otherPrerequisiteRequired: false,
        otherPrerequisiteDetails: '',
        nameTransferDocuments: []
      },
      documents: {
        electricityBill: [],
        aadhar: [],
        panCard: [],
        bankPassbook: [],
        feasibilityReport: [],
        sanctionedLoadDocument: [],
        loanApplicationForm: [],
        loanRequestLetter: [],
        propertyOwnershipProof: [],
        passportSizePhoto: [],
        quotation: [],
        otherDocs: []
      },
      createdAt: now,
      updatedAt: now,
      createdBy,
      updatedBy: createdBy
    };

    try {
      await dynamodb.put({
        TableName: this.step1Table,
        Item: initialData,
      }).promise();

      return initialData;
    } catch (error) {
      console.error('Error creating Step 1 data:', error);
      throw error;
    }
  }

  /**
   * Update Step 1 data (partial update)
   */
  async updateStep1Data(
    clientId: string, 
    updates: SaveStep1DataRequest, 
    updatedBy: string,
    userRole: string
  ): Promise<Step1ClientData | null> {
    try {
      // Get existing data first
      const existingData = await this.getStep1Data(clientId);
      if (!existingData) {
        throw new Error('Step 1 data not found for client');
      }

      // Build update expression
      const updateExpression: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      // Handle personal info updates
      if (updates.personalInfo) {
        for (const [key, value] of Object.entries(updates.personalInfo)) {
          if (value !== undefined) {
            updateExpression.push(`personalInfo.#${key} = :personalInfo_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:personalInfo_${key}`] = value;
          }
        }
      }

      // Handle dates updates
      if (updates.dates) {
        for (const [key, value] of Object.entries(updates.dates)) {
          if (value !== undefined) {
            updateExpression.push(`dates.#${key} = :dates_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:dates_${key}`] = value;
          }
        }
      }

      // Handle payment mode update
      if (updates.paymentMode) {
        updateExpression.push('paymentMode = :paymentMode');
        expressionAttributeValues[':paymentMode'] = updates.paymentMode;
      }

      // Handle plant details updates
      if (updates.plantDetails) {
        if (updates.plantDetails.summary) {
          for (const [key, value] of Object.entries(updates.plantDetails.summary)) {
            if (value !== undefined) {
              updateExpression.push(`plantDetails.summary.#${key} = :plantDetails_summary_${key}`);
              expressionAttributeNames[`#${key}`] = key;
              expressionAttributeValues[`:plantDetails_summary_${key}`] = value;
            }
          }
        }

        if (updates.plantDetails.solarPanels) {
          updateExpression.push('plantDetails.solarPanels = :solarPanels');
          expressionAttributeValues[':solarPanels'] = updates.plantDetails.solarPanels;
        }

        if (updates.plantDetails.invertors) {
          updateExpression.push('plantDetails.invertors = :invertors');
          expressionAttributeValues[':invertors'] = updates.plantDetails.invertors;
        }

        if (updates.plantDetails.otherItems) {
          updateExpression.push('plantDetails.otherItems = :otherItems');
          expressionAttributeValues[':otherItems'] = updates.plantDetails.otherItems;
        }
      }

      // Handle pricing details updates (admin only)
      if (updates.pricingDetails && userRole === 'admin') {
        for (const [key, value] of Object.entries(updates.pricingDetails)) {
          if (value !== undefined && key !== 'paymentLogs') {
            updateExpression.push(`pricingDetails.#${key} = :pricingDetails_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:pricingDetails_${key}`] = value;
          }
        }
      }

      // Handle special requirements updates
      if (updates.specialRequirements) {
        for (const [key, value] of Object.entries(updates.specialRequirements)) {
          if (value !== undefined) {
            updateExpression.push(`specialRequirements.#${key} = :specialRequirements_${key}`);
            expressionAttributeNames[`#${key}`] = key;
            expressionAttributeValues[`:specialRequirements_${key}`] = value;
          }
        }
      }

      // Always update the updatedAt and updatedBy fields
      updateExpression.push('updatedAt = :updatedAt', 'updatedBy = :updatedBy');
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      expressionAttributeValues[':updatedBy'] = updatedBy;

      if (updateExpression.length === 0) {
        return existingData;
      }

      const result = await dynamodb.update({
        TableName: this.step1Table,
        Key: { clientId },
        UpdateExpression: `SET ${updateExpression.join(', ')}`,
        ExpressionAttributeNames: Object.keys(expressionAttributeNames).length > 0 ? expressionAttributeNames : undefined,
        ExpressionAttributeValues: expressionAttributeValues,
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step1ClientData;
    } catch (error) {
      console.error('Error updating Step 1 data:', error);
      throw error;
    }
  }

  /**
   * Add document to Step 1 data
   */
  async addDocument(
    clientId: string,
    category: Step1DocumentCategory,
    documentFile: Step1DocumentFile,
    updatedBy: string
  ): Promise<Step1ClientData | null> {
    try {
      const result = await dynamodb.update({
        TableName: this.step1Table,
        Key: { clientId },
        UpdateExpression: `SET documents.#category = list_append(if_not_exists(documents.#category, :empty_list), :new_document), updatedAt = :updatedAt, updatedBy = :updatedBy`,
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

      return result.Attributes as Step1ClientData;
    } catch (error) {
      console.error('Error adding document:', error);
      throw error;
    }
  }

  /**
   * Remove document from Step 1 data
   */
  async removeDocument(
    clientId: string,
    category: Step1DocumentCategory,
    documentId: string,
    updatedBy: string
  ): Promise<Step1ClientData | null> {
    try {
      // Get current data to find document index
      const currentData = await this.getStep1Data(clientId);
      if (!currentData) {
        throw new Error('Step 1 data not found');
      }

      const documents = currentData.documents[category];
      const documentIndex = documents.findIndex(doc => doc.documentId === documentId);
      
      if (documentIndex === -1) {
        throw new Error('Document not found');
      }

      const result = await dynamodb.update({
        TableName: this.step1Table,
        Key: { clientId },
        UpdateExpression: `REMOVE documents.#category[${documentIndex}] SET updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeNames: {
          '#category': category
        },
        ExpressionAttributeValues: {
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': updatedBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step1ClientData;
    } catch (error) {
      console.error('Error removing document:', error);
      throw error;
    }
  }

  /**
   * Add payment log entry (admin only)
   */
  async addPaymentLog(
    clientId: string,
    paymentData: AddPaymentLogRequest,
    createdBy: string
  ): Promise<Step1ClientData | null> {
    try {
      // Use the provided payment date or current timestamp
      const paymentTimestamp = paymentData.paymentDate 
        ? new Date(paymentData.paymentDate).toISOString()
        : new Date().toISOString();

      const paymentLog: Step1PaymentLog = {
        id: uuidv4(),
        amount: paymentData.amount,
        receiver: paymentData.receiver,
        timestamp: paymentTimestamp,
        notes: paymentData.notes,
        createdBy
      };

      const result = await dynamodb.update({
        TableName: this.step1Table,
        Key: { clientId },
        UpdateExpression: `SET pricingDetails.paymentLogs = list_append(if_not_exists(pricingDetails.paymentLogs, :empty_list), :new_payment), updatedAt = :updatedAt, updatedBy = :updatedBy`,
        ExpressionAttributeValues: {
          ':new_payment': [paymentLog],
          ':empty_list': [],
          ':updatedAt': new Date().toISOString(),
          ':updatedBy': createdBy
        },
        ReturnValues: 'ALL_NEW',
      }).promise();

      return result.Attributes as Step1ClientData;
    } catch (error) {
      console.error('Error adding payment log:', error);
      throw error;
    }
  }

  /**
   * Get Step 1 data with role-based filtering
   */
  async getStep1DataForUser(clientId: string, userRole: string): Promise<Step1ClientData | null> {
    try {
      const data = await this.getStep1Data(clientId);
      
      if (!data) {
        return null;
      }

      // For non-admin users, remove pricing details
      if (userRole !== 'admin') {
        const { pricingDetails, ...dataWithoutPricing } = data;
        return dataWithoutPricing as Step1ClientData;
      }

      return data;
    } catch (error) {
      console.error('Error getting Step 1 data for user:', error);
      throw error;
    }
  }

  /**
   * Delete Step 1 data (admin only)
   */
  async deleteStep1Data(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.step1Table,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting Step 1 data:', error);
      throw error;
    }
  }

  /**
   * Get all Step 1 data for a user (for admin dashboard)
   */
  async getAllStep1DataByUser(createdBy: string): Promise<Step1ClientData[]> {
    try {
      const result = await dynamodb.query({
        TableName: this.step1Table,
        IndexName: 'createdBy-updatedAt-index',
        KeyConditionExpression: 'createdBy = :createdBy',
        ExpressionAttributeValues: {
          ':createdBy': createdBy,
        },
        ScanIndexForward: false, // Sort by updatedAt descending
      }).promise();

      return result.Items as Step1ClientData[] || [];
    } catch (error) {
      console.error('Error getting all Step 1 data by user:', error);
      throw error;
    }
  }

  /**
   * Check if Step 1 data exists for a client
   */
  async step1DataExists(clientId: string): Promise<boolean> {
    try {
      const result = await dynamodb.get({
        TableName: this.step1Table,
        Key: { clientId },
        ProjectionExpression: 'clientId'
      }).promise();

      return !!result.Item;
    } catch (error) {
      console.error('Error checking Step 1 data existence:', error);
      return false;
    }
  }
}

export const step1Db = new Step1DatabaseService();
