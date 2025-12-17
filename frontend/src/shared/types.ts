// User types
export interface User {
  userId: string;
  email: string;
  role: 'admin' | 'caller';
  firstName?: string;
  lastName?: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export interface CreateUserRequest {
  email: string;
  password: string;
  role: 'admin' | 'caller';
  firstName?: string;
  lastName?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: Omit<User, 'password'>;
}

// Phone Number types
export interface PhoneNumber {
  phoneNumber: string;
  name?: string;
  address?: string;
  areaCode: string;
  assignedTo?: string;
  status: 'available' | 'assigned' | 'in-use' | 'completed';
  assignedAt?: string;
  batchId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssignPhoneNumbersRequest {
  userId: string;
  count?: number; // Default to 10
  areaCode?: string; // Optional area code filter
}

export interface AssignPhoneNumbersResponse {
  assignedNumbers: PhoneNumber[];
  batchId: string;
  requestedCount: number;
  actualCount: number;
  message?: string;
}

export interface CreatePhoneNumberRequest {
  phoneNumber: string;
  name?: string;
  address?: string;
  areaCode: string;
}

export interface BulkCreatePhoneNumbersRequest {
  phoneNumbers: Array<{
    phoneNumber: string;
    name?: string;
    address?: string;
    areaCode: string;
  }>;
}

export interface BulkCreatePhoneNumbersResponse {
  created: PhoneNumber[];
  duplicates: string[];
  invalid: { phoneNumber: string; error: string }[];
  total: number;
  // New batch processing fields
  batchSize: number;
  totalBatches: number;
  processingTimeMs: number;
  batchResults: BatchResult[];
}

export interface BatchResult {
  batchNumber: number;
  batchSize: number;
  created: number;
  duplicates: number;
  invalid: number;
  errors: number;
  processingTimeMs: number;
  createdItems: PhoneNumber[];
  duplicateItems: string[];
  invalidItems: { phoneNumber: string; error: string }[];
}

export interface BatchProgress {
  currentBatch: number;
  totalBatches: number;
  processedItems: number;
  totalItems: number;
  percentage: number;
  isComplete: boolean;
  estimatedTimeRemainingMs?: number;
}

// Phone Number deletion types
export interface DeletePhoneNumberResponse {
  success: boolean;
  message: string;
  phoneNumber: string;
}

export interface BulkDeleteByAreaCodeRequest {
  areaCode: string;
  force?: boolean;
}

export interface BulkDeleteByAreaCodeResponse {
  areaCode: string;
  totalNumbers: number;
  deletedCount: number;
  skippedCount: number;
  errorCount: number;
  deletedNumbers: string[];
  skippedNumbers: { phoneNumber: string; reason: string }[];
  errors: { phoneNumber: string; error: string }[];
}

// Call types
export interface Call {
  callId: string;
  userId: string;
  phoneNumber: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'no-answer';
  outcome?: 'interested' | 'not-interested' | 'callback' | 'wrong-number' | 'no-answer';
  notes?: string;
  duration?: number; // in seconds
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Optional caller information (populated for admin views)
  callerInfo?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface CreateCallRequest {
  phoneNumber: string;
  notes?: string;
}

export interface CreateQuickCallRequest {
  notes?: string;
}

export interface UpdateCallRequest {
  status?: Call['status'];
  outcome?: Call['outcome'];
  notes?: string;
  duration?: number;
}

// Follow-up types
export interface FollowUp {
  followUpId: string;
  userId: string;
  callId: string;
  phoneNumber: string;
  scheduledDate: string;
  status: 'pending' | 'completed' | 'cancelled';
  notes?: string;
  priority?: number; // 1-5 stars (5 = highest priority, default = 2)
  reminderSent?: boolean;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Optional caller information (populated for admin views)
  callerInfo?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface CreateFollowUpRequest {
  callId: string;
  scheduledDate: string;
  notes?: string;
  priority?: number; // 1-5 stars, default to 2
}

export interface UpdateFollowUpRequest {
  status?: FollowUp['status'];
  scheduledDate?: string;
  notes?: string;
  priority?: number;
  reminderSent?: boolean;
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

// Query parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
}

// Phone Number pagination types
export interface PaginatedPhoneNumbersResponse {
  items: PhoneNumber[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
  totalPages: number;
}

export interface PhoneNumberStats {
  total: number;
  available: number;
  assigned: number;
  inUse: number;
  completed: number;
}

export interface PhoneNumbersQueryParams extends PaginationParams {
  status?: PhoneNumber['status'];
  assignedTo?: string;
  areaCode?: string;
  name?: string;
  address?: string;
  batchId?: string;
  assignedAtStart?: string;
  assignedAtEnd?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
}

export interface CallsQueryParams extends PaginationParams {
  status?: Call['status'];
  outcome?: Call['outcome'];
  startDate?: string;
  endDate?: string;
  userId?: string; // For admin to filter by specific caller
}

export interface FollowUpsQueryParams extends PaginationParams {
  status?: FollowUp['status'];
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
}

// Dashboard statistics
export interface DashboardStats {
  totalCalls: number;
  completedCalls: number;
  pendingCalls: number;
  successRate: number;
  totalFollowUps: number;
  pendingFollowUps: number;
  overdueFollowUps: number;
}

// Call statistics
export interface CallStats {
  totalCalls: number;
  completedCalls: number;
  pendingCalls: number;
  inProgressCalls: number;
  successfulCalls: number;
  callbackRequests: number;
  noAnswerCalls: number;
  averageDuration: number;
  successRate: number;
}

export interface AdminDashboardStats extends DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalPhoneNumbers: number;
  assignedPhoneNumbers: number;
  availablePhoneNumbers: number;
}

// Client Management Types
export interface Client {
  clientId: string;
  name: string;
  mobile: string;
  address: string;
  googleMapsUrl?: string;
  comments?: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  currentStep: number;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  assigneeInfo?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

export interface ClientStep {
  stepId: string;
  clientId: string;
  stepNumber: number;
  stepName: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'on-hold' | 'overdue';
  assignedTo: string;
  dueDate: string;
  completedAt?: string;
  estimatedDuration: number; // days
  dependencies: string[]; // stepIds that must be completed first
  isOptional: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClientSubStep {
  subStepId: string;
  stepId: string;
  clientId: string;
  subStepName: string;
  description?: string;
  status: 'pending' | 'completed';
  assignedTo: string;
  dueDate: string;
  completedAt?: string;
  isRequired: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientRequest {
  name: string;
  mobile: string;
  address: string;
  googleMapsUrl?: string;
  comments?: string;
  assignedTo?: string;
}

export interface UpdateClientRequest {
  name?: string;
  mobile?: string;
  address?: string;
  status?: Client['status'];
  assignedTo?: string;
}

export interface ClientStats {
  totalClients: number;
  activeClients: number;
  completedClients: number;
  onHoldClients: number;
  cancelledClients: number;
  clientsByStep: Record<number, number>;
  overdueSteps: number;
  completedStepsThisWeek: number;
}

export interface ClientsQueryParams {
  page?: number;
  limit?: number;
  status?: Client['status'];
  assignedTo?: string;
  currentStep?: number;
  name?: string;
  mobile?: string;
  createdAtStart?: string;
  createdAtEnd?: string;
}

// JWT Payload
export interface JWTPayload {
  userId: string;
  email: string;
  role: 'admin' | 'caller';
  iat: number;
  exp: number;
}

// Lambda event context
export interface AuthContext {
  user: JWTPayload;
}

// Step 1 Enhanced Data Structures
export interface Step1PersonalInfo {
  name: string;
  address: string;
  googleMapsUrl?: string;
  phone1: string;
  phone2?: string;
  referral?: string;
  status: 'discussion in progress' | 'work in progress' | 'dropped' | 'completed';
  comment?: string;
}

export interface Step1Dates {
  firstContactDate: string;
  nextFollowUpDate?: string;
}

export interface Step1PlantSummary {
  wattage: string;
}

export interface Step1SolarPanel {
  id: string;
  brand: string;
  dcrNonDcrId: string;
  wattagePerPanel: number;
  quantity: number;
}

export interface Step1Invertor {
  id: string;
  brand: string;
  modelNo?: string;
  phase?: string;
  wattage: number;
  serialNumber?: string;
  quantity: number;
}

export interface Step1PlantDetails {
  summary: Step1PlantSummary;
  solarPanels: Step1SolarPanel[];
  invertors: Step1Invertor[];
  otherItems: Record<string, any>;
}

export interface Step1PaymentLog {
  id: string;
  amount: number;
  receiver: string;
  timestamp: string;
  notes?: string;
  createdBy: string;
}

export interface Step1PricingDetails {
  priceQuoted?: number;
  quotationPdfUrl?: string;
  priceFinalized?: number;
  advanceReceived?: number;
  paymentLogs: Step1PaymentLog[];
}

export interface Step1SpecialRequirements {
  nameTransferRequired: boolean;
  nameTransferComments?: string;
  loadEnhancementRequired: boolean;
  loadEnhancementComments?: string;
  otherPrerequisiteRequired: boolean;
  otherPrerequisiteDetails?: string;
  nameTransferDocuments?: Step1DocumentFile[];
}

export interface Step1DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

export interface Step1Documents {
  electricityBill: Step1DocumentFile[];
  aadhar: Step1DocumentFile[];
  panCard: Step1DocumentFile[];
  bankPassbook: Step1DocumentFile[];
  feasibilityReport: Step1DocumentFile[];
  sanctionedLoadDocument: Step1DocumentFile[];
  loanApplicationForm: Step1DocumentFile[];
  loanRequestLetter: Step1DocumentFile[];
  propertyOwnershipProof: Step1DocumentFile[];
  passportSizePhoto: Step1DocumentFile[];
  quotation: Step1DocumentFile[];
  otherDocs: Step1DocumentFile[];
}

export interface Step1ClientData {
  clientId: string;
  personalInfo: Step1PersonalInfo;
  dates: Step1Dates;
  paymentMode: 'CASH' | 'Loan' | 'Digital Payment';
  plantDetails: Step1PlantDetails;
  pricingDetails?: Step1PricingDetails;
  specialRequirements: Step1SpecialRequirements;
  documents: Step1Documents;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const STEP1_DOCUMENT_CATEGORIES = {
  electricityBill: { label: 'Electricity Bill', required: true, maxFiles: 3 },
  aadhar: { label: 'Aadhar Card', required: true, maxFiles: 2 },
  panCard: { label: 'PAN Card', required: true, maxFiles: 2 },
  bankPassbook: { label: 'Bank Passbook', required: true, maxFiles: 3 },
  feasibilityReport: { label: 'Feasibility Report from DISCOM', required: true, maxFiles: 2 },
  sanctionedLoadDocument: { label: 'Sanctioned Load Document', required: true, maxFiles: 2 },
  loanApplicationForm: { label: 'Loan Application Form', required: false, maxFiles: 2 },
  loanRequestLetter: { label: 'Loan Request Letter', required: false, maxFiles: 2 },
  propertyOwnershipProof: { label: 'Property Ownership Proof', required: true, maxFiles: 3 },
  passportSizePhoto: { label: 'Passport Size Photograph', required: true, maxFiles: 2 },
  quotation: { label: 'Quotation Document', required: false, maxFiles: 1 },
  otherDocs: { label: 'Other Documents', required: false, maxFiles: 10 }
} as const;

export type Step1DocumentCategory = keyof typeof STEP1_DOCUMENT_CATEGORIES;

export interface SaveStep1DataRequest {
  personalInfo?: Partial<Step1PersonalInfo>;
  dates?: Partial<Step1Dates>;
  paymentMode?: Step1ClientData['paymentMode'];
  plantDetails?: Partial<Step1PlantDetails>;
  pricingDetails?: Partial<Step1PricingDetails>;
  specialRequirements?: Partial<Step1SpecialRequirements>;
}

export interface UploadStep1DocumentResponse {
  success: boolean;
  uploadedFiles: Step1DocumentFile[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

export interface AddPaymentLogRequest {
  amount: number;
  receiver: string;
  notes?: string;
  paymentDate?: string;
}

// Step 2 Enhanced Data Structures (Loan Process - Conditional)
export interface Step2DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
  details?: string; // Additional details about the document
}

export interface Step2LoanDocuments {
  loanApplications: Step2DocumentFile[];
  incomeProofs: Step2DocumentFile[];
  collateralDocuments: Step2DocumentFile[];
  bankStatements: Step2DocumentFile[];
  otherLoanDocs: Step2DocumentFile[];
}

export interface Step2LoanStatus {
  loanRegistrationDone: boolean;
  fileSubmittedToBranch: boolean;
  loanApprovedAndSigned: boolean;
  loanDisbursed: boolean;
}

export interface Step2LoanData {
  clientId: string;
  loanDocuments: Step2LoanDocuments;
  loanStatus: Step2LoanStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const STEP2_DOCUMENT_CATEGORIES = {
  loanApplications: { label: 'Loan Applications', required: true, maxFiles: 5 },
  incomeProofs: { label: 'Income Proof Documents', required: true, maxFiles: 5 },
  collateralDocuments: { label: 'Collateral Documents', required: true, maxFiles: 5 },
  bankStatements: { label: 'Bank Statements', required: true, maxFiles: 5 },
  otherLoanDocs: { label: 'Other Loan Documents', required: false, maxFiles: 10 }
} as const;

export type Step2DocumentCategory = keyof typeof STEP2_DOCUMENT_CATEGORIES;

export interface SaveStep2DataRequest {
  loanDocuments?: Partial<Step2LoanDocuments>;
  loanStatus?: Partial<Step2LoanStatus>;
  notes?: string;
}

export interface UploadStep2DocumentResponse {
  success: boolean;
  uploadedFiles: Step2DocumentFile[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

// Step 3 Enhanced Data Structures (Site Survey and Installation)
export interface Step3DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

export interface Step3LegDimension {
  id: string;
  height: number; // in feet
}

export interface Step3SiteMeasurement {
  numberOfLegs: number;
  legDimensions: Step3LegDimension[];
  notes?: string;
}

export interface Step3LegalAgreements {
  modalAgreement: Step3DocumentFile[];
  netMeteringAgreement: Step3DocumentFile[];
  meterPaymentReceipt: Step3DocumentFile[];
  workCompletionReport: Step3DocumentFile[];
  jointInspectionReport: Step3DocumentFile[];
  commissioningCertificate: Step3DocumentFile[];
  dcrSelfUndertaking: Step3DocumentFile[];
  almmDeclaration: Step3DocumentFile[];
  otherAgreements: Step3DocumentFile[];
}

export interface Step3PlantDetailsUpdate {
  panelDetailsUpdated: boolean;
  invertorDetailsUpdated: boolean;
  lastUpdatedAt?: string;
  notes?: string;
}

export interface Step3GeoTaggedImage extends Step3DocumentFile {
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
    address?: string; // Reverse geocoded address
  };
  hasValidGPS: boolean;
}


export interface Step3InstallationProgress {
  materialDispatchedOnSite: boolean;
  structureAssemblyDone: boolean;
  panelInstalled: boolean;
  invertorConnected: boolean;
  dualSignNetMeteringAgreementDone: boolean;
  plantStarted: boolean;
  gpsImages: {
    materialDispatch: Step3GeoTaggedImage[];
    structureAssembly: Step3GeoTaggedImage[];
    panelInstallation: Step3GeoTaggedImage[];
    invertorConnection: Step3GeoTaggedImage[];
    netMeteringAgreement: Step3GeoTaggedImage[];
    plantStarted: Step3GeoTaggedImage[];
  };
}

export interface Step3SiteSurveyData {
  clientId: string;
  siteMeasurement: Step3SiteMeasurement;
  installationProgress: Step3InstallationProgress;
  legalAgreements: Step3LegalAgreements;
  plantDetailsUpdate: Step3PlantDetailsUpdate;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const STEP3_DOCUMENT_CATEGORIES = {
  modalAgreement: { label: 'Modal Agreement', required: true, maxFiles: 3 },
  netMeteringAgreement: { label: 'Net Metering Agreement', required: true, maxFiles: 3 },
  meterPaymentReceipt: { label: 'Meter Payment Receipt', required: true, maxFiles: 3 },
  workCompletionReport: { label: 'Work Completion Report', required: true, maxFiles: 3 },
  jointInspectionReport: { label: 'Joint Inspection Report', required: true, maxFiles: 3 },
  commissioningCertificate: { label: 'Commissioning Certificate', required: true, maxFiles: 3 },
  dcrSelfUndertaking: { label: 'DCR Self Undertaking', required: true, maxFiles: 3 },
  almmDeclaration: { label: 'ALMM Declaration', required: true, maxFiles: 3 },
  otherAgreements: { label: 'Other Legal Agreements', required: false, maxFiles: 10 }
} as const;

export type Step3DocumentCategory = keyof typeof STEP3_DOCUMENT_CATEGORIES;

export interface SaveStep3DataRequest {
  siteMeasurement?: Partial<Step3SiteMeasurement>;
  installationProgress?: Partial<Step3InstallationProgress>;
  legalAgreements?: Partial<Step3LegalAgreements>;
  plantDetailsUpdate?: Partial<Step3PlantDetailsUpdate>;
  notes?: string;
}

export interface UploadStep3DocumentResponse {
  success: boolean;
  uploadedFiles: Step3DocumentFile[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

// Step 4 Enhanced Data Structures (DISCOM Documentation and Net Metering)
export interface Step4DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

export interface Step4FilePreparation {
  dualSignFilePrepared: boolean;
  dualSignFiles: Step4DocumentFile[];
  preparationDate?: string;
  preparedBy?: string;
  notes?: string;
}

export interface Step4DiscomDocuments {
  wcrDocuments: Step4DocumentFile[];
  jointInspectionDocuments: Step4DocumentFile[];
  commissioningUndertakingDocuments: Step4DocumentFile[];
  almmCertificateDocuments: Step4DocumentFile[];
}

export interface Step4PaymentTracking {
  meterReplacementPaymentDone: boolean;
  paymentAmount?: number;
  paymentDate?: string;
  paymentReference?: string;
  paymentMode?: 'cash' | 'cheque' | 'online' | 'dd';
  receivedBy?: string;
  notes?: string;
}

export interface Step4DcrCertificates {
  dcrCertificatesGenerated: boolean;
  certificateNumbers: string[];
  certificateFiles: Step4DocumentFile[];
  generatedDate?: string;
  issuingAuthority?: string;
  validityPeriod?: string;
  notes?: string;
}

export interface Step4DispatchTracking {
  fileSentToDiscom: boolean;
  dispatchDate?: string;
  dispatchedBy?: string;
  receiverName?: string;
  receiverDesignation?: string;
  receiverContact?: string;
  dispatchMode?: 'hand_delivery' | 'courier' | 'post' | 'email';
  trackingNumber?: string;
  acknowledgmentReceived?: boolean;
  acknowledgmentDate?: string;
  notes?: string;
}

export interface Step4NetMeteringAgreement {
  dualSignNetMeteringFile: boolean;
  agreementFiles: Step4DocumentFile[];
  agreementDate?: string;
  agreementNumber?: string;
  validityPeriod?: string;
  notes?: string;
}

export interface Step4DiscomData {
  clientId: string;
  filePreparation: Step4FilePreparation;
  discomDocuments: Step4DiscomDocuments;
  paymentTracking: Step4PaymentTracking;
  dcrCertificates: Step4DcrCertificates;
  dispatchTracking: Step4DispatchTracking;
  netMeteringAgreement: Step4NetMeteringAgreement;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const STEP4_DOCUMENT_CATEGORIES = {
  dualSignFiles: { label: 'Dual Sign Files', required: true, maxFiles: 5 },
  wcrDocuments: { label: 'WCR Documents', required: true, maxFiles: 3 },
  jointInspectionDocuments: { label: 'Joint Inspection Documents', required: true, maxFiles: 3 },
  commissioningUndertakingDocuments: { label: 'Commissioning Undertaking Documents', required: true, maxFiles: 3 },
  almmCertificateDocuments: { label: 'ALMM Certificate Documents', required: true, maxFiles: 3 },
  dcrCertificateDocuments: { label: 'DCR Certificate Documents', required: false, maxFiles: 10 },
  agreementFiles: { label: 'Net Metering Agreement Files', required: true, maxFiles: 5 }
} as const;

export type Step4DocumentCategory = keyof typeof STEP4_DOCUMENT_CATEGORIES;

export interface SaveStep4DataRequest {
  filePreparation?: Partial<Step4FilePreparation>;
  discomDocuments?: Partial<Step4DiscomDocuments>;
  paymentTracking?: Partial<Step4PaymentTracking>;
  dcrCertificates?: Partial<Step4DcrCertificates>;
  dispatchTracking?: Partial<Step4DispatchTracking>;
  netMeteringAgreement?: Partial<Step4NetMeteringAgreement>;
  notes?: string;
}

export interface UploadStep4DocumentResponse {
  success: boolean;
  uploadedFiles: Step4DocumentFile[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

// Step 5 Enhanced Data Structures (Final Bank Process and Subsidy Release)
export interface Step5DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

export interface Step5RegistrationStatus {
  registrationDone: boolean;
  registrationDate?: string;
  registrationReference?: string;
  registrationAuthority?: string;
  notes?: string;
}

export interface Step5DocumentUploadStatus {
  allDocumentsUploaded: boolean;
  uploadDate?: string;
  documentCount?: number;
  uploadPlatform?: string;
  confirmationNumber?: string;
  notes?: string;
}

export interface Step5SubsidyApplication {
  subsidyApplied: boolean;
  applicationDate?: string;
  applicationReference?: string;
  expectedAmount?: number;
  subsidyType?: string;
  applicationStatus?: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'disbursed';
  disbursementDate?: string;
  actualAmount?: number;
  notes?: string;
}

export interface Step5BankSubsidyData {
  clientId: string;
  bankDisbursementLetter: Step5DocumentFile[];
  marginReceipt: Step5DocumentFile[];
  registrationStatus: Step5RegistrationStatus;
  documentUploadStatus: Step5DocumentUploadStatus;
  subsidyApplication: Step5SubsidyApplication;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export const STEP5_DOCUMENT_CATEGORIES = {
  bankDisbursementLetter: { label: 'Bank Disbursement Letter', required: false, maxFiles: 5 },
  marginReceipt: { label: 'Margin Receipt', required: false, maxFiles: 5 }
} as const;

export type Step5DocumentCategory = keyof typeof STEP5_DOCUMENT_CATEGORIES;

export interface SaveStep5DataRequest {
  bankDisbursementLetter?: Step5DocumentFile[];
  marginReceipt?: Step5DocumentFile[];
  registrationStatus?: Partial<Step5RegistrationStatus>;
  documentUploadStatus?: Partial<Step5DocumentUploadStatus>;
  subsidyApplication?: Partial<Step5SubsidyApplication>;
  notes?: string;
}

export interface UploadStep5DocumentResponse {
  success: boolean;
  uploadedFiles: Step5DocumentFile[];
  errors?: Array<{
    fileName: string;
    error: string;
  }>;
}

// Client Expenses Types
export interface ClientExpense {
  expenseId: string;
  clientId: string;
  expenseType: 'material_cost' | 'civil_work_cost' | 'labour_cost' | 'auto_cost' | 'other';
  customExpenseType?: string; // For "other" category
  amount: number;
  description?: string;
  documents: ExpenseDocumentFile[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExpenseDocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

export interface CreateExpenseRequest {
  expenseType: ClientExpense['expenseType'];
  customExpenseType?: string;
  amount: number;
  description?: string;
}

export interface UpdateExpenseRequest {
  expenseType?: ClientExpense['expenseType'];
  customExpenseType?: string;
  amount?: number;
  description?: string;
}

export interface ExpenseSummary {
  totalExpenses: number;
  expensesByType: {
    material_cost: number;
    civil_work_cost: number;
    labour_cost: number;
    auto_cost: number;
    other: number;
  };
  expenseCount: number;
}

export const EXPENSE_TYPES = {
  material_cost: 'Material Cost',
  civil_work_cost: 'Civil Work Cost',
  labour_cost: 'Labour Cost',
  auto_cost: 'Auto Cost',
  other: 'Other'
} as const;

export type ExpenseType = keyof typeof EXPENSE_TYPES;
