import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { step1Db } from '../services/step1Database';
import { fileStorageService } from '../services/fileStorageService';
import { clientDb } from '../services/clientDatabase';
import { 
  SaveStep1DataRequest,
  AddPaymentLogRequest,
  Step1DocumentCategory,
  STEP1_DOCUMENT_CATEGORIES,
  UploadStep1DocumentResponse
} from '../../../shared/types';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /step1/:clientId - Get Step 1 data for a client
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const userRole = req.user!.role;
    
    // Check if client exists and user has access
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (userRole !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    // Get Step 1 data with role-based filtering
    let step1Data = await step1Db.getStep1DataForUser(clientId, userRole);
    
    // If no Step 1 data exists, create initial data
    if (!step1Data) {
      // Pass client data to prefill personal info
      const clientData = {
        name: client.name,
        mobile: client.mobile,
        address: client.address,
        googleMapsUrl: client.googleMapsUrl,
        comments: client.comments
      };
      step1Data = await step1Db.createStep1Data(clientId, req.user!.userId, clientData);
      // Apply role-based filtering for non-admin users
      if (userRole !== 'admin') {
        const { pricingDetails, ...dataWithoutPricing } = step1Data;
        step1Data = dataWithoutPricing as any;
      }
    }
    
    res.status(200).json({
      success: true,
      data: step1Data
    });
  } catch (error) {
    console.error('Error getting Step 1 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get Step 1 data'
    });
  }
});

// PUT /step1/:clientId - Update Step 1 data
router.put('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const updates: SaveStep1DataRequest = req.body;
    const userRole = req.user!.role;
    const userId = req.user!.userId;
    
    // Check if client exists and user has access
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (userRole !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    // Ensure Step 1 data exists
    const existingData = await step1Db.getStep1Data(clientId);
    if (!existingData) {
      // Pass client data to prefill personal info
      const clientData = {
        name: client.name,
        mobile: client.mobile,
        address: client.address
      };
      await step1Db.createStep1Data(clientId, userId, clientData);
    }
    
    // Update Step 1 data
    const updatedData = await step1Db.updateStep1Data(clientId, updates, userId, userRole);
    
    // Apply role-based filtering for response
    let responseData = updatedData;
    if (userRole !== 'admin' && responseData) {
      const { pricingDetails, ...dataWithoutPricing } = responseData;
      responseData = dataWithoutPricing as any;
    }
    
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error updating Step 1 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update Step 1 data'
    });
  }
});

// POST /step1/:clientId/documents/:category - Upload documents
router.post('/:clientId/documents/:category', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step1DocumentCategory;
    const files = req.files as Express.Multer.File[];
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP1_DOCUMENT_CATEGORIES[category]) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid document category'
      });
    }
    
    // Check if client exists and user has access
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (userRole !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No files provided'
      });
    }
    
    // Check file count limits
    const categoryConfig = STEP1_DOCUMENT_CATEGORIES[category];
    if (files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`
      });
    }
    
    // Ensure Step 1 data exists
    let step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      // Pass client data to prefill personal info
      const clientData = {
        name: client.name,
        mobile: client.mobile,
        address: client.address
      };
      step1Data = await step1Db.createStep1Data(clientId, userId, clientData);
    }
    
    // Check current document count
    const currentDocuments = step1Data.documents[category] || [];
    if (currentDocuments.length + files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Total documents would exceed limit of ${categoryConfig.maxFiles} for ${categoryConfig.label}`
      });
    }
    
    // Upload files to S3
    const uploadResult = await fileStorageService.uploadFiles(
      files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      })),
      clientId,
      category,
      userId
    );
    
    // Add successful uploads to database
    let updatedStep1Data = step1Data;
    for (const uploadedFile of uploadResult.uploadedFiles) {
      const result = await step1Db.addDocument(clientId, category, uploadedFile, userId);
      if (result) {
        updatedStep1Data = result;
      }
    }
    
    const response: UploadStep1DocumentResponse = {
      success: true,
      uploadedFiles: uploadResult.uploadedFiles,
      errors: uploadResult.errors.length > 0 ? uploadResult.errors : undefined
    };
    
    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload documents'
    });
  }
});

// DELETE /step1/:clientId/documents/:category/:documentId - Delete a document
router.delete('/:clientId/documents/:category/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step1DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP1_DOCUMENT_CATEGORIES[category]) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid document category'
      });
    }
    
    // Check if client exists and user has access
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (userRole !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    // Get Step 1 data to find the document
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 1 data not found'
      });
    }
    
    // Find the document
    const documents = step1Data.documents[category] || [];
    const document = documents.find(doc => doc.documentId === documentId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
    
    // Delete from S3
    await fileStorageService.deleteFile(document.s3Key);
    
    // Remove from database
    await step1Db.removeDocument(clientId, category, documentId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete document'
    });
  }
});

// GET /step1/:clientId/documents/:category/:documentId/download - Get download URL for a document
router.get('/:clientId/documents/:category/:documentId/download', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step1DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Check if client exists and user has access
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (userRole !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    // Get Step 1 data to find the document
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 1 data not found'
      });
    }
    
    // Find the document
    const documents = step1Data.documents[category] || [];
    const document = documents.find(doc => doc.documentId === documentId);
    
    if (!document) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
    
    // Generate download URL
    const downloadUrl = await fileStorageService.getDownloadUrl(document.s3Key, 3600); // 1 hour expiry
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        fileName: document.originalName,
        fileSize: document.fileSize,
        mimeType: document.mimeType
      }
    });
  } catch (error) {
    console.error('Error getting download URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get download URL'
    });
  }
});

// POST /step1/:clientId/payment-logs - Add payment log (admin only)
router.post('/:clientId/payment-logs', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const paymentData: AddPaymentLogRequest = req.body;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Only admin can add payment logs
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can add payment logs'
      });
    }
    
    // Validate required fields
    if (!paymentData.amount || !paymentData.receiver) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount and receiver are required'
      });
    }
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // Ensure Step 1 data exists
    let step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      // Pass client data to prefill personal info
      const clientData = {
        name: client.name,
        mobile: client.mobile,
        address: client.address
      };
      step1Data = await step1Db.createStep1Data(clientId, userId, clientData);
    }
    
    // Add payment log
    const updatedData = await step1Db.addPaymentLog(clientId, paymentData, userId);
    
    // Return the newly added payment log (last item in the array)
    const newPaymentLog = updatedData?.pricingDetails?.paymentLogs?.slice(-1)[0];
    
    res.status(200).json({
      success: true,
      data: newPaymentLog
    });
  } catch (error) {
    console.error('Error adding payment log:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to add payment log'
    });
  }
});

// GET /step1/:clientId/pricing - Get pricing details (admin only)
router.get('/:clientId/pricing', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const userRole = req.user!.role;
    
    // Only admin can access pricing details
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can access pricing details'
      });
    }
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // Get Step 1 data
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 1 data not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: step1Data.pricingDetails || {
        priceQuoted: 0,
        quotationPdfUrl: '',
        priceFinalized: 0,
        advanceReceived: 0,
        paymentLogs: []
      }
    });
  } catch (error) {
    console.error('Error getting pricing details:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get pricing details'
    });
  }
});

export default router;
