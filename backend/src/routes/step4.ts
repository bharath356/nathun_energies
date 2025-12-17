import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { step4Db } from '../services/step4Database';
import { fileStorageService } from '../services/fileStorageService';
import { clientDb } from '../services/clientDatabase';
import { 
  Step4DiscomData, 
  Step4DocumentCategory, 
  SaveStep4DataRequest,
  Step4DocumentFile,
  STEP4_DOCUMENT_CATEGORIES
} from '../../../shared/types';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per request
  },
  fileFilter: (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Allow common document types
    const allowedMimeTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, images, Word, and Excel files are allowed.'));
    }
  }
});

// Apply authentication middleware to all routes
router.use(authenticate);

/**
 * GET /step4/:clientId
 * Get Step 4 data for a client
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
    
    let step4Data = await step4Db.getStep4Data(clientId);
    
    // If no data exists, create initial data
    if (!step4Data) {
      step4Data = await step4Db.createStep4Data(clientId, userId);
    }
    
    res.status(200).json({
      success: true,
      data: step4Data
    });
  } catch (error: any) {
    console.error('Error getting Step 4 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get Step 4 data'
    });
  }
});

/**
 * PUT /step4/:clientId
 * Update Step 4 data for a client
 */
router.put('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const updates: SaveStep4DataRequest = req.body;
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
    const existingData = await step4Db.getStep4Data(clientId);
    if (!existingData) {
      await step4Db.createStep4Data(clientId, userId);
    }
    
    const updatedData = await step4Db.updateStep4Data(clientId, updates, userId);
    
    res.status(200).json({
      success: true,
      data: updatedData
    });
  } catch (error: any) {
    console.error('Error updating Step 4 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update Step 4 data'
    });
  }
});

/**
 * POST /step4/:clientId/documents/:category
 * Upload documents for a specific category
 */
router.post('/:clientId/documents/:category', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step4DocumentCategory;
    const files = req.files as Express.Multer.File[];
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP4_DOCUMENT_CATEGORIES[category]) {
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
    const categoryConfig = STEP4_DOCUMENT_CATEGORIES[category];
    if (files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`
      });
    }
    
    // Check if data exists, create if not
    let step4Data = await step4Db.getStep4Data(clientId);
    if (!step4Data) {
      step4Data = await step4Db.createStep4Data(clientId, userId);
    }
    
    // Use the generic upload method from fileStorageService
    const stepPath = `step4/${category}`;
    const { uploadedFiles, errors } = await fileStorageService.uploadGenericFiles<Step4DocumentFile>(
      files.map(file => ({
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      })),
      clientId,
      stepPath,
      userId,
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
    
    // Add each uploaded file to the database
    let updatedStep4Data = step4Data;
    for (const uploadedFile of uploadedFiles) {
      const result = await step4Db.addDocument(clientId, category, uploadedFile, userId);
      if (result) {
        updatedStep4Data = result;
      }
    }
    
    res.status(200).json({
      success: true,
      data: {
        success: true,
        uploadedFiles,
        errors: errors.length > 0 ? errors : undefined
      }
    });
    
  } catch (error: any) {
    console.error('Error uploading Step 4 documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload documents'
    });
  }
});

/**
 * DELETE /step4/:clientId/documents/:category/:documentId
 * Delete a specific document
 */
router.delete('/:clientId/documents/:category/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step4DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP4_DOCUMENT_CATEGORIES[category]) {
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
    
    // Get current data to find the document
    const currentData = await step4Db.getStep4Data(clientId);
    if (!currentData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 4 data not found'
      });
    }
    
    // Find the document to get S3 key for deletion
    let documentToDelete: Step4DocumentFile | undefined;
    
    switch (category) {
      case 'dualSignFiles':
        documentToDelete = currentData.filePreparation.dualSignFiles.find(doc => doc.documentId === documentId);
        break;
      case 'wcrDocuments':
        documentToDelete = currentData.discomDocuments.wcrDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'jointInspectionDocuments':
        documentToDelete = currentData.discomDocuments.jointInspectionDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'commissioningUndertakingDocuments':
        documentToDelete = currentData.discomDocuments.commissioningUndertakingDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'almmCertificateDocuments':
        documentToDelete = currentData.discomDocuments.almmCertificateDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'dcrCertificateDocuments':
        documentToDelete = currentData.dcrCertificates.certificateFiles.find(doc => doc.documentId === documentId);
        break;
      case 'agreementFiles':
        documentToDelete = currentData.netMeteringAgreement.agreementFiles.find(doc => doc.documentId === documentId);
        break;
    }
    
    if (!documentToDelete) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
    
    // Delete from S3
    try {
      await fileStorageService.deleteFile(documentToDelete.s3Key);
    } catch (s3Error) {
      console.error('Error deleting file from S3:', s3Error);
      // Continue with database deletion even if S3 deletion fails
    }
    
    // Remove from database
    await step4Db.removeDocument(clientId, category, documentId, userId);
    
    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
    
  } catch (error: any) {
    console.error('Error deleting Step 4 document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete document'
    });
  }
});

/**
 * GET /step4/:clientId/documents/:category/:documentId/download
 * Get download URL for a specific document
 */
router.get('/:clientId/documents/:category/:documentId/download', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step4DocumentCategory;
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
    
    // Get current data to find the document
    const currentData = await step4Db.getStep4Data(clientId);
    if (!currentData) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 4 data not found'
      });
    }
    
    // Find the document
    let documentToDownload: Step4DocumentFile | undefined;
    
    switch (category) {
      case 'dualSignFiles':
        documentToDownload = currentData.filePreparation.dualSignFiles.find(doc => doc.documentId === documentId);
        break;
      case 'wcrDocuments':
        documentToDownload = currentData.discomDocuments.wcrDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'jointInspectionDocuments':
        documentToDownload = currentData.discomDocuments.jointInspectionDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'commissioningUndertakingDocuments':
        documentToDownload = currentData.discomDocuments.commissioningUndertakingDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'almmCertificateDocuments':
        documentToDownload = currentData.discomDocuments.almmCertificateDocuments.find(doc => doc.documentId === documentId);
        break;
      case 'dcrCertificateDocuments':
        documentToDownload = currentData.dcrCertificates.certificateFiles.find(doc => doc.documentId === documentId);
        break;
      case 'agreementFiles':
        documentToDownload = currentData.netMeteringAgreement.agreementFiles.find(doc => doc.documentId === documentId);
        break;
    }
    
    if (!documentToDownload) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
    
    // Generate signed URL for download
    const downloadUrl = await fileStorageService.getDownloadUrl(documentToDownload.s3Key, 3600); // 1 hour expiry
    
    res.status(200).json({
      success: true,
      data: {
        downloadUrl,
        fileName: documentToDownload.originalName,
        fileSize: documentToDownload.fileSize,
        mimeType: documentToDownload.mimeType
      }
    });
    
  } catch (error: any) {
    console.error('Error getting Step 4 document download URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get download URL'
    });
  }
});

/**
 * DELETE /step4/:clientId
 * Delete all Step 4 data for a client (admin only)
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
    
    const success = await step4Db.deleteStep4Data(clientId);
    
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Step 4 data deleted successfully'
      });
    } else {
      res.status(404).json({
        error: 'Not Found',
        message: 'Step 4 data not found'
      });
    }
  } catch (error: any) {
    console.error('Error deleting Step 4 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete Step 4 data'
    });
  }
});

export default router;
