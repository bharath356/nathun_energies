import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { step5Db } from '../services/step5Database';
import { clientDb } from '../services/clientDatabase';
import { 
  Step5BankSubsidyData, 
  SaveStep5DataRequest,
  Step5DocumentCategory
} from '../../../shared/types';

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Max 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow only PDF and image files
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  }
});

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /step5/:clientId
 * Get Step 5 data for a client
 */
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
    
    let step5Data = await step5Db.getStep5Data(clientId);
    
    // If no data exists, create initial data
    if (!step5Data) {
      step5Data = await step5Db.createStep5Data(clientId, userId);
    }
    
    res.status(200).json({
      success: true,
      data: step5Data
    });
  } catch (error: any) {
    console.error('Error getting Step 5 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get Step 5 data'
    });
  }
});

/**
 * PUT /step5/:clientId
 * Update Step 5 data for a client
 */
router.put('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const updates: SaveStep5DataRequest = req.body;
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
    
    // Check if data exists, create if not
    const existingData = await step5Db.getStep5Data(clientId);
    if (!existingData) {
      await step5Db.createStep5Data(clientId, userId);
    }
    
    const updatedData = await step5Db.updateStep5Data(clientId, updates, userId);
    
    res.status(200).json({
      success: true,
      data: updatedData
    });
  } catch (error: any) {
    console.error('Error updating Step 5 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update Step 5 data'
    });
  }
});

/**
 * POST /step5/:clientId/documents/:category
 * Upload documents for a specific category
 */
router.post('/:clientId/documents/:category', upload.array('files', 5), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step5DocumentCategory;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const files = req.files as Express.Multer.File[];

    // Validate category
    if (category !== 'bankDisbursementLetter' && category !== 'marginReceipt') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid document category'
      });
    }

    // Check if files were uploaded
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No files uploaded'
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

    // Ensure Step 5 data exists
    let step5Data = await step5Db.getStep5Data(clientId);
    if (!step5Data) {
      step5Data = await step5Db.createStep5Data(clientId, userId);
    }

    // Upload documents
    const uploadedFiles = await step5Db.uploadDocuments(clientId, category, files, userId);

    res.status(200).json({
      success: true,
      data: {
        uploadedFiles,
        message: `Successfully uploaded ${uploadedFiles.length} file(s)`
      }
    });
  } catch (error: any) {
    console.error('Error uploading Step 5 documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to upload documents'
    });
  }
});

/**
 * DELETE /step5/:clientId/documents/:category/:documentId
 * Delete a specific document
 */
router.delete('/:clientId/documents/:category/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step5DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    // Validate category
    if (category !== 'bankDisbursementLetter' && category !== 'marginReceipt') {
      return res.status(400).json({
        error: 'Bad Request',
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

    // Delete document
    const success = await step5Db.deleteDocument(clientId, category, documentId, userId);

    if (success) {
      res.status(200).json({
        success: true,
        message: 'Document deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
  } catch (error: any) {
    console.error('Error deleting Step 5 document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to delete document'
    });
  }
});

/**
 * GET /step5/:clientId/documents/:category/:documentId/download
 * Get download URL for a specific document
 */
router.get('/:clientId/documents/:category/:documentId/download', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step5DocumentCategory;
    const documentId = req.params.documentId;
    const userRole = req.user!.role;
    const userId = req.user!.userId;

    // Validate category
    if (category !== 'bankDisbursementLetter' && category !== 'marginReceipt') {
      return res.status(400).json({
        error: 'Bad Request',
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

    // Get download URL
    const result = await step5Db.getDocumentDownloadUrl(clientId, category, documentId);

    if (result) {
      res.status(200).json({
        success: true,
        data: result
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
  } catch (error: any) {
    console.error('Error getting Step 5 document download URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error.message || 'Failed to get download URL'
    });
  }
});

/**
 * DELETE /step5/:clientId
 * Delete all Step 5 data for a client (admin only)
 */
router.delete('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const userRole = req.user!.role;
    
    // Check if user is admin
    if (userRole !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied. Admin role required.'
      });
    }
    
    const success = await step5Db.deleteStep5Data(clientId);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Step 5 data deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Step 5 data not found'
      });
    }
  } catch (error: any) {
    console.error('Error deleting Step 5 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete Step 5 data'
    });
  }
});

export default router;
