import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { step2Db } from '../services/step2Database';
import { step1Db } from '../services/step1Database';
import { fileStorageService } from '../services/fileStorageService';
import { clientDb } from '../services/clientDatabase';
import { 
  SaveStep2DataRequest,
  Step2DocumentCategory,
  STEP2_DOCUMENT_CATEGORIES,
  UploadStep2DocumentResponse
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

// GET /step2/:clientId - Get Step 2 data for a client
router.get('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
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

    // Check if Step 1 exists and payment mode is 'Loan'
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Step 1 data must be completed first'
      });
    }

    if (step1Data.paymentMode !== 'Loan') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Step 2 is only available for clients with loan payment mode'
      });
    }
    
    // Get Step 2 data
    let step2Data = await step2Db.getStep2Data(clientId);
    
    // If no Step 2 data exists, create initial data
    if (!step2Data) {
      step2Data = await step2Db.createStep2Data(clientId, userId);
    }
    
    res.status(200).json({
      success: true,
      data: step2Data
    });
  } catch (error) {
    console.error('Error getting Step 2 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get Step 2 data'
    });
  }
});

// PUT /step2/:clientId - Update Step 2 data
router.put('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const updates: SaveStep2DataRequest = req.body;
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

    // Check if Step 1 exists and payment mode is 'Loan'
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data || step1Data.paymentMode !== 'Loan') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Step 2 is only available for clients with loan payment mode'
      });
    }
    
    // Ensure Step 2 data exists
    const existingData = await step2Db.getStep2Data(clientId);
    if (!existingData) {
      await step2Db.createStep2Data(clientId, userId);
    }
    
    // Update Step 2 data
    const updatedData = await step2Db.updateStep2Data(clientId, updates, userId);
    
    res.status(200).json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error updating Step 2 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update Step 2 data'
    });
  }
});

// POST /step2/:clientId/documents/:category - Upload documents
router.post('/:clientId/documents/:category', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step2DocumentCategory;
    const files = req.files as Express.Multer.File[];
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP2_DOCUMENT_CATEGORIES[category]) {
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

    // Check if Step 1 exists and payment mode is 'Loan'
    const step1Data = await step1Db.getStep1Data(clientId);
    if (!step1Data || step1Data.paymentMode !== 'Loan') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Step 2 is only available for clients with loan payment mode'
      });
    }
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No files provided'
      });
    }
    
    // Check file count limits
    const categoryConfig = STEP2_DOCUMENT_CATEGORIES[category];
    if (files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`
      });
    }
    
    // Ensure Step 2 data exists
    let step2Data = await step2Db.getStep2Data(clientId);
    if (!step2Data) {
      step2Data = await step2Db.createStep2Data(clientId, userId);
    }
    
    // Check current document count
    const currentDocuments = step2Data.loanDocuments[category] || [];
    if (currentDocuments.length + files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Total documents would exceed limit of ${categoryConfig.maxFiles} for ${categoryConfig.label}`
      });
    }
    
    // Upload files to S3 using generic method
    const uploadResult = await fileStorageService.uploadGenericFiles(
      files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      })),
      clientId,
      `step2/${category}`,
      userId,
      (baseFile) => ({
        ...baseFile,
        details: '' // Step 2 documents can have additional details
      })
    );
    
    // Add successful uploads to database
    let updatedStep2Data = step2Data;
    for (const uploadedFile of uploadResult.uploadedFiles) {
      const result = await step2Db.addDocument(clientId, category, uploadedFile, userId);
      if (result) {
        updatedStep2Data = result;
      }
    }
    
    const response: UploadStep2DocumentResponse = {
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

// DELETE /step2/:clientId/documents/:category/:documentId - Delete a document
router.delete('/:clientId/documents/:category/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step2DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP2_DOCUMENT_CATEGORIES[category]) {
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
    
    // Get Step 2 data to find the document
    const step2Data = await step2Db.getStep2Data(clientId);
    if (!step2Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 2 data not found'
      });
    }
    
    // Find the document
    const documents = step2Data.loanDocuments[category] || [];
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
    await step2Db.removeDocument(clientId, category, documentId, userId);
    
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

// GET /step2/:clientId/documents/:category/:documentId/download - Get download URL for a document
router.get('/:clientId/documents/:category/:documentId/download', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step2DocumentCategory;
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
    
    // Get Step 2 data to find the document
    const step2Data = await step2Db.getStep2Data(clientId);
    if (!step2Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 2 data not found'
      });
    }
    
    // Find the document
    const documents = step2Data.loanDocuments[category] || [];
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

export default router;
