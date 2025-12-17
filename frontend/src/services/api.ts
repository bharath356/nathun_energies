import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  User, 
  LoginRequest, 
  LoginResponse, 
  CreateUserRequest,
  PhoneNumber,
  AssignPhoneNumbersRequest,
  AssignPhoneNumbersResponse,
  CreatePhoneNumberRequest,
  BulkCreatePhoneNumbersRequest,
  BulkCreatePhoneNumbersResponse,
  DeletePhoneNumberResponse,
  BulkDeleteByAreaCodeRequest,
  BulkDeleteByAreaCodeResponse,
  PaginatedPhoneNumbersResponse,
  PhoneNumberStats,
  PhoneNumbersQueryParams,
  Call,
  CreateCallRequest,
  CreateQuickCallRequest,
  UpdateCallRequest,
  FollowUp,
  CreateFollowUpRequest,
  UpdateFollowUpRequest,
  ApiResponse
} from '../shared/types';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor to handle errors
    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await this.api.post('/auth/login', credentials);
    return response.data.data!;
  }

  async register(userData: CreateUserRequest): Promise<LoginResponse> {
    const response: AxiosResponse<ApiResponse<LoginResponse>> = await this.api.post('/auth/register', userData);
    return response.data.data!;
  }

  // User endpoints
  async getUsers(): Promise<User[]> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/users');
    return response.data.data!;
  }

  async getActiveUsers(): Promise<User[]> {
    const response: AxiosResponse<ApiResponse<User[]>> = await this.api.get('/users/active');
    return response.data.data!;
  }

  async getUser(userId: string): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.get(`/users/${userId}`);
    return response.data.data!;
  }

  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const response: AxiosResponse<ApiResponse<User>> = await this.api.put(`/users/${userId}`, updates);
    return response.data.data!;
  }

  // Phone number endpoints
  async getPhoneNumbers(): Promise<PhoneNumber[]> {
    const response: AxiosResponse<ApiResponse<PhoneNumber[]>> = await this.api.get('/phone-numbers');
    return response.data.data!;
  }

  // New paginated phone numbers method
  async getPhoneNumbersPaginated(
    page: number = 1,
    limit: number = 50,
    filters?: PhoneNumbersQueryParams
  ): Promise<PaginatedPhoneNumbersResponse> {
    const params: any = { page, limit };
    
    // Add filters to params
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params[key] = value;
        }
      });
    }

    const response: AxiosResponse<ApiResponse<PaginatedPhoneNumbersResponse>> = await this.api.get('/phone-numbers/paginated', { params });
    return response.data.data!;
  }

  // New phone number statistics method
  async getPhoneNumberStats(): Promise<PhoneNumberStats> {
    const response: AxiosResponse<ApiResponse<PhoneNumberStats>> = await this.api.get('/phone-numbers/stats');
    return response.data.data!;
  }

  async assignPhoneNumbers(request: AssignPhoneNumbersRequest): Promise<AssignPhoneNumbersResponse> {
    const response: AxiosResponse<ApiResponse<AssignPhoneNumbersResponse>> = await this.api.post('/phone-numbers/assign', request);
    return response.data.data!;
  }

  async createPhoneNumber(request: CreatePhoneNumberRequest): Promise<PhoneNumber> {
    const response: AxiosResponse<ApiResponse<PhoneNumber>> = await this.api.post('/phone-numbers', request);
    return response.data.data!;
  }

  async bulkCreatePhoneNumbers(request: BulkCreatePhoneNumbersRequest): Promise<BulkCreatePhoneNumbersResponse> {
    const response: AxiosResponse<ApiResponse<BulkCreatePhoneNumbersResponse>> = await this.api.post('/phone-numbers/bulk', request);
    return response.data.data!;
  }

  // Client-side batching method to avoid Lambda timeouts
  async bulkCreatePhoneNumbersWithClientBatching(
    phoneNumbers: Array<{
      phoneNumber: string;
      name?: string;
      address?: string;
      areaCode: string;
    }>,
    options: {
      batchSize?: number;
      onProgress?: (progress: { currentBatch: number; totalBatches: number; processedItems: number; totalItems: number; percentage: number; isComplete: boolean }) => void;
      onBatchComplete?: (batchResult: BulkCreatePhoneNumbersResponse, batchNumber: number) => void;
      onError?: (error: any, batchNumber: number) => void;
      signal?: AbortSignal;
    } = {}
  ): Promise<BulkCreatePhoneNumbersResponse> {
    const {
      batchSize = 50,
      onProgress,
      onBatchComplete,
      onError,
      signal
    } = options;

    const totalItems = phoneNumbers.length;
    const totalBatches = Math.ceil(totalItems / batchSize);
    
    // Initialize aggregated results
    const allCreated: any[] = [];
    const allDuplicates: string[] = [];
    const allInvalid: { phoneNumber: string; error: string }[] = [];
    const allBatchResults: any[] = [];
    const failedBatches: { batchNumber: number; error: any; items: any[] }[] = [];

    let processedItems = 0;
    const startTime = Date.now();

    console.log(`Starting client-side batch processing: ${totalItems} items in ${totalBatches} batches of ${batchSize}`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      // Check if operation was cancelled
      if (signal?.aborted) {
        throw new Error('Operation cancelled by user');
      }

      const batchNumber = batchIndex + 1;
      const startIdx = batchIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, totalItems);
      const batchItems = phoneNumbers.slice(startIdx, endIdx);

      console.log(`Processing client batch ${batchNumber}/${totalBatches}: items ${startIdx + 1}-${endIdx}`);

      try {
        // Make API call for this batch
        const batchResult = await this.bulkCreatePhoneNumbers({
          phoneNumbers: batchItems
        });

        // Aggregate results
        allCreated.push(...batchResult.created);
        allDuplicates.push(...batchResult.duplicates);
        allInvalid.push(...batchResult.invalid);
        
        // Store batch results if available
        if (batchResult.batchResults) {
          allBatchResults.push(...batchResult.batchResults);
        }

        processedItems += batchItems.length;

        // Calculate progress
        const progress = {
          currentBatch: batchNumber,
          totalBatches,
          processedItems,
          totalItems,
          percentage: (processedItems / totalItems) * 100,
          isComplete: batchNumber === totalBatches
        };

        // Call progress callback
        if (onProgress) {
          onProgress(progress);
        }

        // Call batch complete callback
        if (onBatchComplete) {
          onBatchComplete(batchResult, batchNumber);
        }

        console.log(`Client batch ${batchNumber} completed: ${batchResult.created.length} created, ${batchResult.duplicates.length} duplicates, ${batchResult.invalid.length} invalid`);

      } catch (error) {
        console.error(`Error in client batch ${batchNumber}:`, error);
        
        // Store failed batch for potential retry
        failedBatches.push({
          batchNumber,
          error,
          items: batchItems
        });

        // Call error callback
        if (onError) {
          onError(error, batchNumber);
        }

        // For failed batches, still update processed items count
        processedItems += batchItems.length;

        // Update progress even for failed batches
        const progress = {
          currentBatch: batchNumber,
          totalBatches,
          processedItems,
          totalItems,
          percentage: (processedItems / totalItems) * 100,
          isComplete: batchNumber === totalBatches
        };

        if (onProgress) {
          onProgress(progress);
        }
      }

      // Small delay between batches to avoid overwhelming the server
      if (batchNumber < totalBatches) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalProcessingTime = Date.now() - startTime;

    // Create final aggregated response
    const finalResponse: BulkCreatePhoneNumbersResponse = {
      created: allCreated,
      duplicates: allDuplicates,
      invalid: allInvalid,
      total: totalItems,
      batchSize,
      totalBatches,
      processingTimeMs: totalProcessingTime,
      batchResults: allBatchResults
    };

    console.log(`Client-side batch processing completed: ${allCreated.length} created, ${allDuplicates.length} duplicates, ${allInvalid.length} invalid, ${failedBatches.length} failed batches (${totalProcessingTime}ms total)`);

    // If there were failed batches, add them to the response for potential retry
    if (failedBatches.length > 0) {
      (finalResponse as any).failedBatches = failedBatches;
    }

    return finalResponse;
  }

  async updatePhoneNumber(phoneNumber: string, updates: { name?: string; address?: string }): Promise<PhoneNumber> {
    const response: AxiosResponse<ApiResponse<PhoneNumber>> = await this.api.put(`/phone-numbers/${phoneNumber}`, updates);
    return response.data.data!;
  }

  async getAvailableAreaCodes(): Promise<{ areaCode: string; count: number }[]> {
    const response: AxiosResponse<ApiResponse<{ areaCode: string; count: number }[]>> = await this.api.get('/phone-numbers/area-codes');
    return response.data.data!;
  }

  async deletePhoneNumber(phoneNumber: string): Promise<DeletePhoneNumberResponse> {
    const response: AxiosResponse<ApiResponse<DeletePhoneNumberResponse>> = await this.api.delete(`/phone-numbers/${phoneNumber}`);
    return response.data.data!;
  }

  async bulkDeletePhoneNumbersByAreaCode(areaCode: string, force: boolean = false): Promise<BulkDeleteByAreaCodeResponse> {
    const response: AxiosResponse<ApiResponse<BulkDeleteByAreaCodeResponse>> = await this.api.delete(`/phone-numbers/area-code/${areaCode}?force=${force}`);
    return response.data.data!;
  }

  // Call endpoints
  async getCalls(params?: { 
    limit?: number; 
    userId?: string; 
    status?: string;
    outcome?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Call[]> {
    const response: AxiosResponse<ApiResponse<Call[]>> = await this.api.get('/calls', { params });
    return response.data.data!;
  }

  async createCall(callData: CreateCallRequest): Promise<Call> {
    const response: AxiosResponse<ApiResponse<Call>> = await this.api.post('/calls', callData);
    return response.data.data!;
  }

  async createQuickCall(callData: CreateQuickCallRequest): Promise<Call> {
    const response: AxiosResponse<ApiResponse<Call>> = await this.api.post('/calls/quick-create', callData);
    return response.data.data!;
  }

  async updateCall(callId: string, updates: UpdateCallRequest): Promise<Call> {
    const response: AxiosResponse<ApiResponse<Call>> = await this.api.put(`/calls/${callId}`, updates);
    return response.data.data!;
  }

  async deleteCall(callId: string): Promise<{ message: string }> {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/calls/${callId}`);
    return response.data.data!;
  }

  async getCallStats(params?: { userId?: string }): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/calls/stats', { params });
    return response.data.data!;
  }

  // Follow-up endpoints
  async getFollowUps(params?: { 
    limit?: number; 
    userId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    priority?: number;
    overdue?: boolean;
  }): Promise<FollowUp[]> {
    const response: AxiosResponse<ApiResponse<FollowUp[]>> = await this.api.get('/follow-ups', { params });
    return response.data.data!;
  }

  async createFollowUp(followUpData: CreateFollowUpRequest): Promise<FollowUp> {
    const response: AxiosResponse<ApiResponse<FollowUp>> = await this.api.post('/follow-ups', followUpData);
    return response.data.data!;
  }

  async updateFollowUp(followUpId: string, updates: UpdateFollowUpRequest): Promise<FollowUp> {
    const response: AxiosResponse<ApiResponse<FollowUp>> = await this.api.put(`/follow-ups/${followUpId}`, updates);
    return response.data.data!;
  }

  async deleteFollowUp(followUpId: string): Promise<{ message: string; followUpId: string }> {
    const response: AxiosResponse<ApiResponse<{ message: string; followUpId: string }>> = await this.api.delete(`/follow-ups/${followUpId}`);
    return response.data.data!;
  }

  // Client endpoints
  async getClients(params?: { 
    page?: number;
    limit?: number;
    status?: string;
    assignedTo?: string;
    currentStep?: number;
    name?: string;
    mobile?: string;
    createdAtStart?: string;
    createdAtEnd?: string;
  }): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/clients', { params });
    return response.data.data!;
  }

  async getClient(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/clients/${clientId}`);
    return response.data.data!;
  }

  async createClient(clientData: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post('/clients', clientData);
    return response.data.data!;
  }

  async updateClient(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/clients/${clientId}`, updates);
    return response.data.data!;
  }

  async deleteClient(clientId: string): Promise<{ message: string }> {
    const response: AxiosResponse<ApiResponse<{ message: string }>> = await this.api.delete(`/clients/${clientId}`);
    return response.data.data!;
  }

  async getClientStats(): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/clients/stats');
    return response.data.data!;
  }

  async getClientsFinancialOverview(startDate?: string, endDate?: string): Promise<any> {
    const params: any = {};
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get('/clients/financial-overview', { params });
    return response.data.data!;
  }

  async getClientSteps(clientId: string): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get(`/clients/${clientId}/steps`);
    return response.data.data!;
  }

  async getClientDocuments(clientId: string): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get(`/clients/${clientId}/documents`);
    return response.data.data!;
  }

  async getAllClientDocuments(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/clients/${clientId}/all-documents`);
    return response.data.data!;
  }

  async getClientFormData(clientId: string, params?: { stepId?: string; subStepId?: string; fieldName?: string }): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get(`/clients/${clientId}/form-data`, { params });
    return response.data.data!;
  }

  async getStepTemplates(): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get('/clients/step-templates');
    return response.data.data!;
  }

  // Client workflow step management
  async getClientSubSteps(stepId: string): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get(`/client-steps/${stepId}/sub-steps`);
    return response.data.data!;
  }

  async updateClientStep(stepId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/client-steps/${stepId}`, updates);
    return response.data.data!;
  }

  async updateClientSubStep(subStepId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/client-sub-steps/sub-steps/${subStepId}`, updates);
    return response.data.data!;
  }

  // Step 1 API methods
  async getStep1Data(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step1/${clientId}`);
    return response.data.data!;
  }

  async updateStep1Data(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/step1/${clientId}`, updates);
    return response.data.data!;
  }

  async uploadStep1Documents(clientId: string, category: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step1/${clientId}/documents/${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep1Document(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step1/${clientId}/documents/${category}/${documentId}`
    );
    return response.data.data!;
  }

  async getStep1DocumentDownloadUrl(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/step1/${clientId}/documents/${category}/${documentId}/download`
    );
    return response.data.data!;
  }

  async addStep1PaymentLog(clientId: string, paymentData: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step1/${clientId}/payment-logs`,
      paymentData
    );
    return response.data.data!;
  }

  async getStep1PricingDetails(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step1/${clientId}/pricing`);
    return response.data.data!;
  }

  // Step 2 API methods
  async getStep2Data(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step2/${clientId}`);
    return response.data.data!;
  }

  async updateStep2Data(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/step2/${clientId}`, updates);
    return response.data.data!;
  }

  async uploadStep2Documents(clientId: string, category: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step2/${clientId}/documents/${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep2Document(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step2/${clientId}/documents/${category}/${documentId}`
    );
    return response.data.data!;
  }

  async getStep2DocumentDownloadUrl(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/step2/${clientId}/documents/${category}/${documentId}/download`
    );
    return response.data.data!;
  }

  // Step 3 API methods
  async getStep3Data(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step3/${clientId}`);
    return response.data.data!;
  }

  async updateStep3Data(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/step3/${clientId}`, updates);
    return response.data.data!;
  }

  async uploadStep3Documents(clientId: string, category: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step3/${clientId}/documents/${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep3Document(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step3/${clientId}/documents/${category}/${documentId}`
    );
    return response.data.data!;
  }

  async getStep3DocumentDownloadUrl(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/step3/${clientId}/documents/${category}/${documentId}/download`
    );
    return response.data.data!;
  }

  // Step 3 GPS Image methods
  async uploadStep3GpsImage(clientId: string, stepName: string, file: File): Promise<any> {
    const formData = new FormData();
    formData.append('file', file);

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step3/${clientId}/gps-images/${stepName}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep3GpsImage(clientId: string, stepName: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step3/${clientId}/gps-images/${stepName}/${documentId}`
    );
    return response.data.data!;
  }


  // Step 4 API methods
  async getStep4Data(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step4/${clientId}`);
    return response.data.data!;
  }

  async updateStep4Data(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/step4/${clientId}`, updates);
    return response.data.data!;
  }

  async uploadStep4Documents(clientId: string, category: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step4/${clientId}/documents/${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep4Document(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step4/${clientId}/documents/${category}/${documentId}`
    );
    return response.data.data!;
  }

  async getStep4DocumentDownloadUrl(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/step4/${clientId}/documents/${category}/${documentId}/download`
    );
    return response.data.data!;
  }

  // Step 5 API methods
  async getStep5Data(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/step5/${clientId}`);
    return response.data.data!;
  }

  async updateStep5Data(clientId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/step5/${clientId}`, updates);
    return response.data.data!;
  }

  async uploadStep5Documents(clientId: string, category: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/step5/${clientId}/documents/${category}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteStep5Document(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/step5/${clientId}/documents/${category}/${documentId}`
    );
    return response.data.data!;
  }

  async getStep5DocumentDownloadUrl(clientId: string, category: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/step5/${clientId}/documents/${category}/${documentId}/download`
    );
    return response.data.data!;
  }

  // Client Expenses API methods
  async getClientExpenses(clientId: string): Promise<any[]> {
    const response: AxiosResponse<ApiResponse<any[]>> = await this.api.get(`/clients/${clientId}/expenses`);
    return response.data.data!;
  }

  async getClientExpenseSummary(clientId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(`/clients/${clientId}/expenses/summary`);
    return response.data.data!;
  }

  async createClientExpense(clientId: string, expenseData: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(`/clients/${clientId}/expenses`, expenseData);
    return response.data.data!;
  }

  async updateClientExpense(clientId: string, expenseId: string, updates: any): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.put(`/clients/${clientId}/expenses/${expenseId}`, updates);
    return response.data.data!;
  }

  async deleteClientExpense(clientId: string, expenseId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(`/clients/${clientId}/expenses/${expenseId}`);
    return response.data.data!;
  }

  async uploadExpenseDocuments(clientId: string, expenseId: string, files: File[]): Promise<any> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response: AxiosResponse<ApiResponse<any>> = await this.api.post(
      `/clients/${clientId}/expenses/${expenseId}/documents`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data.data!;
  }

  async deleteExpenseDocument(clientId: string, expenseId: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.delete(
      `/clients/${clientId}/expenses/${expenseId}/documents/${documentId}`
    );
    return response.data.data!;
  }

  async getExpenseDocumentDownloadUrl(clientId: string, expenseId: string, documentId: string): Promise<any> {
    const response: AxiosResponse<ApiResponse<any>> = await this.api.get(
      `/clients/${clientId}/expenses/${expenseId}/documents/${documentId}/download`
    );
    return response.data.data!;
  }
}

export const apiService = new ApiService();
