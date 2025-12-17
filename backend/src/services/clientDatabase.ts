import { DynamoDB } from 'aws-sdk';
import { 
  Client, 
  ClientStep, 
  ClientSubStep, 
  StepDocument, 
  StepFormData,
  ClientsQueryParams,
  ClientStepsQueryParams,
  ClientSubStepsQueryParams,
  ClientDocumentsQueryParams,
  ClientFormDataQueryParams,
  ClientStats,
  PaginatedResponse,
  User
} from '../../../shared/types';

// Type aliases for backward compatibility
type ClientDocument = StepDocument;
type ClientFormData = StepFormData;

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

export class ClientDatabaseService {
  private readonly clientsTable = process.env.CLIENTS_TABLE || 'call-management-backend-dev-clients';
  private readonly clientStepsTable = process.env.CLIENT_STEPS_TABLE || 'call-management-backend-dev-client-steps';
  private readonly clientSubStepsTable = process.env.CLIENT_SUBSTEPS_TABLE || 'call-management-backend-dev-client-substeps';
  private readonly clientDocumentsTable = process.env.CLIENT_DOCUMENTS_TABLE || 'call-management-backend-dev-client-documents';
  private readonly clientFormDataTable = process.env.CLIENT_FORM_DATA_TABLE || 'call-management-backend-dev-client-form-data';
  private readonly usersTable = process.env.USERS_TABLE!;

  // Client operations
  async createClient(client: Client): Promise<Client> {
    await dynamodb.put({
      TableName: this.clientsTable,
      Item: client,
    }).promise();
    return client;
  }

  async getClient(clientId: string): Promise<Client | null> {
    const result = await dynamodb.get({
      TableName: this.clientsTable,
      Key: { clientId },
    }).promise();
    return result.Item as Client || null;
  }

  async getClientWithAssigneeInfo(clientId: string): Promise<Client | null> {
    const client = await this.getClient(clientId);
    if (!client) return null;

    // Get assignee information
    if (client.assignedTo) {
      const assignee = await this.getUserById(client.assignedTo);
      if (assignee) {
        client.assigneeInfo = {
          firstName: assignee.firstName,
          lastName: assignee.lastName,
          email: assignee.email
        };
      }
    }

    return client;
  }

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

  async getAllClients(): Promise<Client[]> {
    const items = await this.scanAllItems({
      TableName: this.clientsTable,
    });
    return items as Client[] || [];
  }

  async getClientsPaginated(
    page: number = 1,
    limit: number = 50,
    userId?: string,
    filters?: ClientsQueryParams
  ): Promise<PaginatedResponse<Client>> {
    try {
      let allItems: Client[] = [];
      
      if (userId && !filters?.assignedTo) {
        // For regular users, get clients where they have at least one step assigned
        allItems = await this.getClientsWithStepsAssignedToUser(userId);
      } else {
        // For admin or when filtering by specific user, get all clients
        allItems = await this.getAllClients();
      }

      // Apply filters
      let filteredItems = allItems;
      
      if (filters) {
        filteredItems = allItems.filter(item => {
          // Status filter
          if (filters.status && item.status !== filters.status) return false;
          
          // Assigned to filter
          if (filters.assignedTo && item.assignedTo !== filters.assignedTo) return false;
          
          // Current step filter
          if (filters.currentStep && item.currentStep !== filters.currentStep) return false;
          
          // Name filter
          if (filters.name && !item.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
          
          // Mobile filter
          if (filters.mobile && !item.mobile.includes(filters.mobile)) return false;
          
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
      console.error('Error getting paginated clients:', error);
      throw error;
    }
  }

  async getClientsByAssignee(assignedTo: string): Promise<Client[]> {
    const result = await dynamodb.query({
      TableName: this.clientsTable,
      IndexName: 'assignedTo-createdAt-index',
      KeyConditionExpression: 'assignedTo = :assignedTo',
      ExpressionAttributeValues: {
        ':assignedTo': assignedTo,
      },
      ScanIndexForward: false, // Sort by createdAt descending
    }).promise();
    return result.Items as Client[] || [];
  }

  async getClientsWithStepsAssignedToUser(userId: string): Promise<Client[]> {
    try {
      // Get all steps assigned to the user
      const userSteps = await this.getStepsByAssignee(userId);
      
      // Extract unique client IDs from the steps
      const clientIds = [...new Set(userSteps.map(step => step.clientId))];
      
      // Get client details for each unique client ID
      const clients: Client[] = [];
      for (const clientId of clientIds) {
        const client = await this.getClient(clientId);
        if (client) {
          clients.push(client);
        }
      }
      
      // Sort by creation date (newest first)
      clients.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      return clients;
    } catch (error) {
      console.error('Error getting clients with steps assigned to user:', error);
      throw error;
    }
  }

  async updateClient(clientId: string, updates: Partial<Client>): Promise<Client | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'clientId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getClient(clientId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.clientsTable,
      Key: { clientId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as Client || null;
  }

  async deleteClient(clientId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.clientsTable,
        Key: { clientId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting client:', error);
      throw error;
    }
  }

  // Client Step operations
  async createClientStep(step: ClientStep): Promise<ClientStep> {
    await dynamodb.put({
      TableName: this.clientStepsTable,
      Item: step,
    }).promise();
    return step;
  }

  async getClientStep(stepId: string): Promise<ClientStep | null> {
    const result = await dynamodb.get({
      TableName: this.clientStepsTable,
      Key: { stepId },
    }).promise();
    return result.Item as ClientStep || null;
  }

  async getClientSteps(clientId: string): Promise<ClientStep[]> {
    const result = await dynamodb.query({
      TableName: this.clientStepsTable,
      IndexName: 'clientId-stepNumber-index',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
      ScanIndexForward: true, // Sort by stepNumber ascending
    }).promise();
    return result.Items as ClientStep[] || [];
  }

  async getStepsByAssignee(assignedTo: string, filters?: { dueDateStart?: string; dueDateEnd?: string; overdue?: boolean }): Promise<ClientStep[]> {
    const expressionAttributeValues: Record<string, any> = {
      ':assignedTo': assignedTo,
    };

    let keyConditionExpression = 'assignedTo = :assignedTo';
    
    // Handle date range in KeyConditionExpression since dueDate is the sort key
    if (filters?.dueDateStart && filters?.dueDateEnd) {
      keyConditionExpression += ' AND dueDate BETWEEN :dueDateStart AND :dueDateEnd';
      expressionAttributeValues[':dueDateStart'] = filters.dueDateStart;
      expressionAttributeValues[':dueDateEnd'] = filters.dueDateEnd;
    } else if (filters?.dueDateStart) {
      keyConditionExpression += ' AND dueDate >= :dueDateStart';
      expressionAttributeValues[':dueDateStart'] = filters.dueDateStart;
    } else if (filters?.dueDateEnd) {
      keyConditionExpression += ' AND dueDate <= :dueDateEnd';
      expressionAttributeValues[':dueDateEnd'] = filters.dueDateEnd;
    }

    // For overdue filter, modify the key condition
    if (filters?.overdue) {
      const now = new Date().toISOString().split('T')[0]; // Get current date in YYYY-MM-DD format
      if (!filters?.dueDateStart && !filters?.dueDateEnd) {
        keyConditionExpression = 'assignedTo = :assignedTo AND dueDate < :now';
        expressionAttributeValues[':now'] = now;
      }
    }

    const result = await dynamodb.query({
      TableName: this.clientStepsTable,
      IndexName: 'assignedTo-dueDate-index',
      KeyConditionExpression: keyConditionExpression,
      ExpressionAttributeValues: expressionAttributeValues,
      ScanIndexForward: true, // Sort by dueDate ascending
    }).promise();

    let steps = result.Items as ClientStep[] || [];

    // Additional filtering for overdue if needed
    if (filters?.overdue) {
      const now = new Date().toISOString().split('T')[0];
      steps = steps.filter(step => step.dueDate < now && step.status !== 'completed');
    }

    return steps;
  }

  async updateClientStep(stepId: string, updates: Partial<ClientStep>): Promise<ClientStep | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'stepId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getClientStep(stepId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    // Set completedAt when status changes to 'completed'
    if (updates.status === 'completed' && !expressionAttributeNames['#completedAt']) {
      expressionAttributeNames['#completedAt'] = 'completedAt';
      expressionAttributeValues[':completedAt'] = new Date().toISOString();
      updateExpression.push('#completedAt = :completedAt');
    }

    const result = await dynamodb.update({
      TableName: this.clientStepsTable,
      Key: { stepId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as ClientStep || null;
  }

  // Client SubStep operations
  async createClientSubStep(subStep: ClientSubStep): Promise<ClientSubStep> {
    await dynamodb.put({
      TableName: this.clientSubStepsTable,
      Item: subStep,
    }).promise();
    return subStep;
  }

  async getClientSubStep(subStepId: string): Promise<ClientSubStep | null> {
    const result = await dynamodb.get({
      TableName: this.clientSubStepsTable,
      Key: { subStepId },
    }).promise();
    return result.Item as ClientSubStep || null;
  }

  async getClientSubSteps(stepId: string): Promise<ClientSubStep[]> {
    const result = await dynamodb.query({
      TableName: this.clientSubStepsTable,
      IndexName: 'stepId-subStepOrder-index',
      KeyConditionExpression: 'stepId = :stepId',
      ExpressionAttributeValues: {
        ':stepId': stepId,
      },
      ScanIndexForward: true, // Sort by subStepOrder ascending
    }).promise();
    return result.Items as ClientSubStep[] || [];
  }

  async updateClientSubStep(subStepId: string, updates: Partial<ClientSubStep>): Promise<ClientSubStep | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'subStepId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getClientSubStep(subStepId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    // Set completedAt when status changes to 'completed'
    if (updates.status === 'completed' && !expressionAttributeNames['#completedAt']) {
      expressionAttributeNames['#completedAt'] = 'completedAt';
      expressionAttributeValues[':completedAt'] = new Date().toISOString();
      updateExpression.push('#completedAt = :completedAt');
    }

    const result = await dynamodb.update({
      TableName: this.clientSubStepsTable,
      Key: { subStepId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as ClientSubStep || null;
  }

  // Client Document operations
  async createClientDocument(document: ClientDocument): Promise<ClientDocument> {
    await dynamodb.put({
      TableName: this.clientDocumentsTable,
      Item: document,
    }).promise();
    return document;
  }

  async getClientDocument(documentId: string): Promise<ClientDocument | null> {
    const result = await dynamodb.get({
      TableName: this.clientDocumentsTable,
      Key: { documentId },
    }).promise();
    return result.Item as ClientDocument || null;
  }

  async getClientDocuments(clientId: string): Promise<ClientDocument[]> {
    const result = await dynamodb.query({
      TableName: this.clientDocumentsTable,
      IndexName: 'clientId-uploadedAt-index',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
      ScanIndexForward: false, // Sort by uploadedAt descending
    }).promise();
    return result.Items as ClientDocument[] || [];
  }

  // Get all documents from all steps for a client with step and category information
  async getAllClientDocuments(clientId: string): Promise<any> {
    try {
      // Import step database services
      const { step1Db } = await import('./step1Database');
      const { step2Db } = await import('./step2Database');
      const { step3Db } = await import('./step3Database');
      const { step4Db } = await import('./step4Database');
      const { step5Db } = await import('./step5Database');

      const allDocuments = {
        step1: {
          stepName: 'Client Finalization & Loan Process',
          stepNumber: 1,
          documents: {} as any,
          totalFiles: 0,
          requiredCategories: 0,
          completedCategories: 0
        },
        step2: {
          stepName: 'Loan Process',
          stepNumber: 2,
          documents: {} as any,
          totalFiles: 0,
          requiredCategories: 0,
          completedCategories: 0
        },
        step3: {
          stepName: 'Site Survey and Installation',
          stepNumber: 3,
          documents: {} as any,
          gpsImages: {} as any,
          totalFiles: 0,
          requiredCategories: 0,
          completedCategories: 0
        },
        step4: {
          stepName: 'DISCOM Documentation',
          stepNumber: 4,
          documents: {} as any,
          totalFiles: 0,
          requiredCategories: 0,
          completedCategories: 0
        },
        step5: {
          stepName: 'Final Bank Process and Subsidy',
          stepNumber: 5,
          documents: {} as any,
          totalFiles: 0,
          requiredCategories: 0,
          completedCategories: 0
        }
      };

      // Get Step 1 documents
      try {
        const step1Data = await step1Db.getStep1Data(clientId);
        if (step1Data?.documents) {
          const { STEP1_DOCUMENT_CATEGORIES } = await import('../../../shared/types');
          allDocuments.step1.documents = step1Data.documents;
          
          // Calculate statistics
          Object.entries(STEP1_DOCUMENT_CATEGORIES).forEach(([category, config]) => {
            const files = (step1Data.documents as any)[category] || [];
            allDocuments.step1.totalFiles += files.length;
            if (config.required) {
              allDocuments.step1.requiredCategories++;
              if (files.length > 0) {
                allDocuments.step1.completedCategories++;
              }
            }
          });
        }
      } catch (error: any) {
        console.log('Step 1 data not found or error:', error?.message || 'Unknown error');
      }

      // Get Step 2 documents
      try {
        const step2Data = await step2Db.getStep2Data(clientId);
        if (step2Data?.loanDocuments) {
          const { STEP2_DOCUMENT_CATEGORIES } = await import('../../../shared/types');
          allDocuments.step2.documents = step2Data.loanDocuments;
          
          // Calculate statistics
          Object.entries(STEP2_DOCUMENT_CATEGORIES).forEach(([category, config]) => {
            const files = (step2Data.loanDocuments as any)[category] || [];
            allDocuments.step2.totalFiles += files.length;
            if (config.required) {
              allDocuments.step2.requiredCategories++;
              if (files.length > 0) {
                allDocuments.step2.completedCategories++;
              }
            }
          });
        }
      } catch (error: any) {
        console.log('Step 2 data not found or error:', error?.message || 'Unknown error');
      }

      // Get Step 3 documents
      try {
        const step3Data = await step3Db.getStep3Data(clientId);
        if (step3Data) {
          const { STEP3_DOCUMENT_CATEGORIES } = await import('../../../shared/types');
          
          // Legal agreements documents
          if (step3Data.legalAgreements) {
            allDocuments.step3.documents = step3Data.legalAgreements;
            
            Object.entries(STEP3_DOCUMENT_CATEGORIES).forEach(([category, config]) => {
              const files = (step3Data.legalAgreements as any)[category] || [];
              allDocuments.step3.totalFiles += files.length;
              if (config.required) {
                allDocuments.step3.requiredCategories++;
                if (files.length > 0) {
                  allDocuments.step3.completedCategories++;
                }
              }
            });
          }
          
          // GPS Images
          if (step3Data.installationProgress?.gpsImages) {
            allDocuments.step3.gpsImages = step3Data.installationProgress.gpsImages;
            Object.values(step3Data.installationProgress.gpsImages).forEach((images: any[]) => {
              allDocuments.step3.totalFiles += images.length;
            });
          }
          
        }
      } catch (error: any) {
        console.log('Step 3 data not found or error:', error?.message || 'Unknown error');
      }

      // Get Step 4 documents
      try {
        const step4Data = await step4Db.getStep4Data(clientId);
        if (step4Data) {
          const { STEP4_DOCUMENT_CATEGORIES } = await import('../../../shared/types');
          
          // Combine all document categories from step 4
          const step4Documents: any = {
            ...step4Data.filePreparation?.dualSignFiles ? { dualSignFiles: step4Data.filePreparation.dualSignFiles } : {},
            ...step4Data.discomDocuments || {},
            ...step4Data.dcrCertificates?.certificateFiles ? { dcrCertificateDocuments: step4Data.dcrCertificates.certificateFiles } : {},
            ...step4Data.netMeteringAgreement?.agreementFiles ? { agreementFiles: step4Data.netMeteringAgreement.agreementFiles } : {}
          };
          
          allDocuments.step4.documents = step4Documents;
          
          // Calculate statistics
          Object.entries(STEP4_DOCUMENT_CATEGORIES).forEach(([category, config]) => {
            const files = step4Documents[category] || [];
            allDocuments.step4.totalFiles += files.length;
            if (config.required) {
              allDocuments.step4.requiredCategories++;
              if (files.length > 0) {
                allDocuments.step4.completedCategories++;
              }
            }
          });
        }
      } catch (error: any) {
        console.log('Step 4 data not found or error:', error?.message || 'Unknown error');
      }

      // Get Step 5 documents
      try {
        const step5Data = await step5Db.getStep5Data(clientId);
        if (step5Data) {
          const { STEP5_DOCUMENT_CATEGORIES } = await import('../../../shared/types');
          
          const step5Documents: any = {
            bankDisbursementLetter: step5Data.bankDisbursementLetter || [],
            marginReceipt: step5Data.marginReceipt || []
          };
          
          allDocuments.step5.documents = step5Documents;
          
          // Calculate statistics
          Object.entries(STEP5_DOCUMENT_CATEGORIES).forEach(([category, config]) => {
            const files = step5Documents[category] || [];
            allDocuments.step5.totalFiles += files.length;
            if (config.required) {
              allDocuments.step5.requiredCategories++;
              if (files.length > 0) {
                allDocuments.step5.completedCategories++;
              }
            }
          });
        }
      } catch (error: any) {
        console.log('Step 5 data not found or error:', error?.message || 'Unknown error');
      }

      // Calculate overall statistics
      const totalFiles = Object.values(allDocuments).reduce((sum, step) => sum + step.totalFiles, 0);
      const totalRequiredCategories = Object.values(allDocuments).reduce((sum, step) => sum + step.requiredCategories, 0);
      const totalCompletedCategories = Object.values(allDocuments).reduce((sum, step) => sum + step.completedCategories, 0);
      const completionPercentage = totalRequiredCategories > 0 ? Math.round((totalCompletedCategories / totalRequiredCategories) * 100) : 0;

      return {
        clientId,
        steps: allDocuments,
        summary: {
          totalFiles,
          totalRequiredCategories,
          totalCompletedCategories,
          completionPercentage,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('Error getting all client documents:', error);
      throw error;
    }
  }

  async getStepDocuments(stepId: string): Promise<ClientDocument[]> {
    const result = await dynamodb.query({
      TableName: this.clientDocumentsTable,
      IndexName: 'stepId-uploadedAt-index',
      KeyConditionExpression: 'stepId = :stepId',
      ExpressionAttributeValues: {
        ':stepId': stepId,
      },
      ScanIndexForward: false, // Sort by uploadedAt descending
    }).promise();
    return result.Items as ClientDocument[] || [];
  }

  async deleteClientDocument(documentId: string): Promise<boolean> {
    try {
      await dynamodb.delete({
        TableName: this.clientDocumentsTable,
        Key: { documentId },
      }).promise();
      return true;
    } catch (error) {
      console.error('Error deleting client document:', error);
      throw error;
    }
  }

  // Client Form Data operations
  async createClientFormData(formData: ClientFormData): Promise<ClientFormData> {
    await dynamodb.put({
      TableName: this.clientFormDataTable,
      Item: formData,
    }).promise();
    return formData;
  }

  async getClientFormData(formDataId: string): Promise<ClientFormData | null> {
    const result = await dynamodb.get({
      TableName: this.clientFormDataTable,
      Key: { formDataId },
    }).promise();
    return result.Item as ClientFormData || null;
  }

  async getClientFormDataByField(clientId: string, stepId?: string, subStepId?: string, fieldName?: string): Promise<ClientFormData[]> {
    const result = await dynamodb.query({
      TableName: this.clientFormDataTable,
      IndexName: 'clientId-updatedAt-index',
      KeyConditionExpression: 'clientId = :clientId',
      ExpressionAttributeValues: {
        ':clientId': clientId,
      },
      ScanIndexForward: false, // Sort by updatedAt descending
    }).promise();
    
    let formData = result.Items as ClientFormData[] || [];
    
    // Apply additional filters
    if (stepId) {
      formData = formData.filter(item => item.stepId === stepId);
    }
    if (subStepId) {
      formData = formData.filter(item => item.subStepId === subStepId);
    }
    if (fieldName) {
      formData = formData.filter(item => item.fieldName === fieldName);
    }
    
    return formData;
  }

  async updateClientFormData(formDataId: string, updates: Partial<ClientFormData>): Promise<ClientFormData | null> {
    const updateExpression = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'formDataId') {
        updateExpression.push(`#${key} = :${key}`);
        expressionAttributeNames[`#${key}`] = key;
        expressionAttributeValues[`:${key}`] = value;
      }
    }

    if (updateExpression.length === 0) {
      return this.getClientFormData(formDataId);
    }

    // Only add updatedAt if it's not already in the updates
    if (!expressionAttributeNames['#updatedAt']) {
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();
      updateExpression.push('#updatedAt = :updatedAt');
    }

    const result = await dynamodb.update({
      TableName: this.clientFormDataTable,
      Key: { formDataId },
      UpdateExpression: `SET ${updateExpression.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    }).promise();

    return result.Attributes as ClientFormData || null;
  }

  // Statistics
  async getClientStats(userId?: string): Promise<ClientStats> {
    try {
      let clients: Client[];
      
      if (userId) {
        // For regular users, get only their assigned clients
        clients = await this.getClientsByAssignee(userId);
      } else {
        // For admin, get all clients
        clients = await this.getAllClients();
      }

      const totalClients = clients.length;
      const activeClients = clients.filter(c => c.status === 'active').length;
      const completedClients = clients.filter(c => c.status === 'completed').length;
      const onHoldClients = clients.filter(c => c.status === 'on-hold').length;
      const cancelledClients = clients.filter(c => c.status === 'cancelled').length;

      // Count clients by step
      const clientsByStep: { [stepNumber: number]: number } = {};
      clients.forEach(client => {
        if (client.status === 'active') {
          clientsByStep[client.currentStep] = (clientsByStep[client.currentStep] || 0) + 1;
        }
      });

      // Get overdue steps count
      const now = new Date().toISOString().split('T')[0];
      let overdueSteps = 0;
      let completedStepsThisWeek = 0;
      const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

      // This is a simplified calculation - in a real scenario, you'd want to optimize this
      for (const client of clients) {
        const steps = await this.getClientSteps(client.clientId);
        overdueSteps += steps.filter(step => step.dueDate < now && step.status !== 'completed').length;
        completedStepsThisWeek += steps.filter(step => 
          step.status === 'completed' && 
          step.completedAt && 
          step.completedAt > oneWeekAgo
        ).length;
      }

      return {
        totalClients,
        activeClients,
        completedClients,
        onHoldClients,
        cancelledClients,
        clientsByStep,
        overdueSteps,
        completedStepsThisWeek,
      };
    } catch (error) {
      console.error('Error getting client stats:', error);
      throw error;
    }
  }

  // Helper method to update client status based on all step statuses
  async updateClientStatusBasedOnSteps(clientId: string): Promise<Client | null> {
    try {
      // Get all steps for the client
      const allSteps = await this.getClientSteps(clientId);
      
      if (allSteps.length === 0) {
        // No steps exist, keep client as active
        return await this.updateClient(clientId, { status: 'active', currentStep: 1 });
      }

      // Sort steps by step number
      const sortedSteps = allSteps.sort((a, b) => a.stepNumber - b.stepNumber);
      
      // Check if all required (non-optional) steps are completed
      const requiredSteps = sortedSteps.filter(step => !step.isOptional);
      const allRequiredStepsCompleted = requiredSteps.every(step => step.status === 'completed');
      
      // Find the earliest incomplete step
      const firstIncompleteStep = sortedSteps.find(step => step.status !== 'completed');
      
      let clientStatus: 'active' | 'completed';
      let currentStep: number;
      
      if (allRequiredStepsCompleted && !firstIncompleteStep) {
        // All steps (including optional ones) are completed
        clientStatus = 'completed';
        currentStep = sortedSteps[sortedSteps.length - 1].stepNumber; // Last step number
      } else if (allRequiredStepsCompleted && firstIncompleteStep?.isOptional) {
        // All required steps completed, but some optional steps remain
        // Client can be considered completed if all required steps are done
        clientStatus = 'completed';
        currentStep = sortedSteps[sortedSteps.length - 1].stepNumber; // Last step number
      } else {
        // Some required steps are not completed
        clientStatus = 'active';
        currentStep = firstIncompleteStep ? firstIncompleteStep.stepNumber : 1;
      }
      
      // Update client status and current step
      return await this.updateClient(clientId, {
        status: clientStatus,
        currentStep: currentStep
      });
    } catch (error) {
      console.error('Error updating client status based on steps:', error);
      throw error;
    }
  }

  // Helper method to check if user has any steps assigned for a specific client
  async hasUserAnyStepForClient(userId: string, clientId: string): Promise<boolean> {
    try {
      // Get all steps for the client
      const clientSteps = await this.getClientSteps(clientId);
      
      // Check if any step is assigned to the user
      return clientSteps.some(step => step.assignedTo === userId);
    } catch (error) {
      console.error('Error checking user steps for client:', error);
      return false;
    }
  }

  // Financial Overview - Optimized method to get financial data for all clients
  async getClientsFinancialOverview(userId?: string, startDate?: string, endDate?: string): Promise<any> {
    try {
      // Get clients based on user role
      let clients: Client[];
      if (userId) {
        clients = await this.getClientsWithStepsAssignedToUser(userId);
      } else {
        clients = await this.getAllClients();
      }

      // Import required services
      const { step1Db } = await import('./step1Database');
      const { db } = await import('./database');

      const financialData = [];
      let totalPriceFinalized = 0;
      let totalPaymentsReceived = 0;
      let totalExpenses = 0;
      let paymentsInDateRange = [];
      let expensesInDateRange = [];

      // Process each client
      for (const client of clients) {
        try {
          // Get Step 1 data for pricing and payments
          const step1Data = await step1Db.getStep1Data(client.clientId);
          const priceFinalized = step1Data?.pricingDetails?.priceFinalized || 0;
          const paymentLogs = step1Data?.pricingDetails?.paymentLogs || [];
          
          // Calculate total payments received
          const totalReceived = paymentLogs.reduce((sum, payment) => sum + (payment.amount || 0), 0);
          
          // Get expenses for this client
          const expenses = await db.getClientExpenses(client.clientId);
          const totalClientExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
          
          // Filter payments by date range if provided
          let paymentsInRange = paymentLogs;
          if (startDate || endDate) {
            paymentsInRange = paymentLogs.filter(payment => {
              if (!payment.timestamp) return false;
              const paymentDate = new Date(payment.timestamp).toISOString().split('T')[0];
              
              if (startDate && paymentDate < startDate) return false;
              if (endDate && paymentDate > endDate) return false;
              return true;
            });
          }
          
          // Filter expenses by date range if provided
          let expensesInRange = expenses;
          if (startDate || endDate) {
            expensesInRange = expenses.filter(expense => {
              const expenseDate = new Date(expense.createdAt).toISOString().split('T')[0];
              
              if (startDate && expenseDate < startDate) return false;
              if (endDate && expenseDate > endDate) return false;
              return true;
            });
          }

          // Add to date range collections
          paymentsInDateRange.push(...paymentsInRange.map(p => ({
            ...p,
            clientId: client.clientId,
            clientName: client.name
          })));
          
          expensesInDateRange.push(...expensesInRange.map(e => ({
            ...e,
            clientName: client.name
          })));

          // Calculate balance and net profit/loss
          const outstandingBalance = priceFinalized - totalReceived;
          const netProfitLoss = totalReceived - totalClientExpenses;
          
          // Find last payment date
          const lastPaymentDate = paymentLogs.length > 0 
            ? paymentLogs.reduce((latest, payment) => {
                const paymentDate = new Date(payment.timestamp || 0);
                return paymentDate > latest ? paymentDate : latest;
              }, new Date(0)).toISOString().split('T')[0]
            : null;

          // Determine payment status
          let paymentStatus: 'fully_paid' | 'partial' | 'overdue' | 'no_payments' = 'no_payments';
          if (totalReceived === 0) {
            paymentStatus = 'no_payments';
          } else if (totalReceived >= priceFinalized) {
            paymentStatus = 'fully_paid';
          } else {
            paymentStatus = 'partial';
            // Could add overdue logic based on due dates if available
          }

          financialData.push({
            clientId: client.clientId,
            clientName: client.name,
            mobile: client.mobile,
            status: client.status,
            priceFinalized,
            totalPaymentsReceived: totalReceived,
            outstandingBalance,
            totalExpenses: totalClientExpenses,
            netProfitLoss,
            lastPaymentDate,
            paymentStatus,
            paymentCount: paymentLogs.length,
            expenseCount: expenses.length,
            paymentsInDateRange: paymentsInRange.length,
            expensesInDateRange: expensesInRange.length
          });

          // Add to totals
          totalPriceFinalized += priceFinalized;
          totalPaymentsReceived += totalReceived;
          totalExpenses += totalClientExpenses;

        } catch (error) {
          console.error(`Error processing financial data for client ${client.clientId}:`, error);
          // Continue with other clients even if one fails
        }
      }

      // Calculate summary statistics
      const totalOutstandingBalance = totalPriceFinalized - totalPaymentsReceived;
      const totalNetProfitLoss = totalPaymentsReceived - totalExpenses;
      const paymentsInRangeTotal = paymentsInDateRange.reduce((sum, p) => sum + (p.amount || 0), 0);
      const expensesInRangeTotal = expensesInDateRange.reduce((sum, e) => sum + e.amount, 0);

      return {
        clients: financialData,
        summary: {
          totalClients: clients.length,
          totalPriceFinalized,
          totalPaymentsReceived,
          totalOutstandingBalance,
          totalExpenses,
          totalNetProfitLoss,
          clientsWithPayments: financialData.filter(c => c.paymentCount > 0).length,
          clientsWithExpenses: financialData.filter(c => c.expenseCount > 0).length,
          fullyPaidClients: financialData.filter(c => c.paymentStatus === 'fully_paid').length,
          partiallyPaidClients: financialData.filter(c => c.paymentStatus === 'partial').length,
          unpaidClients: financialData.filter(c => c.paymentStatus === 'no_payments').length
        },
        dateRangeData: startDate || endDate ? {
          startDate,
          endDate,
          paymentsInRange: paymentsInDateRange.length,
          paymentsInRangeTotal,
          expensesInRange: expensesInDateRange.length,
          expensesInRangeTotal,
          netCashFlowInRange: paymentsInRangeTotal - expensesInRangeTotal,
          clientsWithPaymentsInRange: new Set(paymentsInDateRange.map(p => p.clientId)).size,
          clientsWithExpensesInRange: new Set(expensesInDateRange.map(e => e.clientId)).size,
          paymentDetails: paymentsInDateRange,
          expenseDetails: expensesInDateRange
        } : null
      };

    } catch (error) {
      console.error('Error getting financial overview:', error);
      throw error;
    }
  }

  // Helper method to get user information (reuse from existing database service)
  private async getUserById(userId: string): Promise<User | null> {
    const result = await dynamodb.get({
      TableName: this.usersTable,
      Key: { userId },
    }).promise();
    return result.Item as User || null;
  }
}

export const clientDb = new ClientDatabaseService();
