import { Router, Request, Response } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import { step3Db } from '../services/step3Database';
import { fileStorageService } from '../services/fileStorageService';
import { clientDb } from '../services/clientDatabase';
import { 
  SaveStep3DataRequest,
  Step3DocumentCategory,
  STEP3_DOCUMENT_CATEGORIES,
  UploadStep3DocumentResponse
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

// GET /step3/:clientId - Get Step 3 data for a client
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
    
    // Get Step 3 data
    let step3Data = await step3Db.getStep3Data(clientId);
    
    // If no Step 3 data exists, create initial data
    if (!step3Data) {
      step3Data = await step3Db.createStep3Data(clientId, userId);
    }
    
    res.status(200).json({
      success: true,
      data: step3Data
    });
  } catch (error) {
    console.error('Error getting Step 3 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get Step 3 data'
    });
  }
});

// PUT /step3/:clientId - Update Step 3 data
router.put('/:clientId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const updates: SaveStep3DataRequest = req.body;
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
    
    // Ensure Step 3 data exists
    const existingData = await step3Db.getStep3Data(clientId);
    if (!existingData) {
      await step3Db.createStep3Data(clientId, userId);
    }
    
    // Update Step 3 data
    const updatedData = await step3Db.updateStep3Data(clientId, updates, userId);
    
    res.status(200).json({
      success: true,
      data: updatedData
    });
  } catch (error) {
    console.error('Error updating Step 3 data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update Step 3 data'
    });
  }
});

// POST /step3/:clientId/documents/:category - Upload documents
router.post('/:clientId/documents/:category', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step3DocumentCategory;
    const files = req.files as Express.Multer.File[];
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP3_DOCUMENT_CATEGORIES[category]) {
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
    const categoryConfig = STEP3_DOCUMENT_CATEGORIES[category];
    if (files.length > categoryConfig.maxFiles) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`
      });
    }
    
    // Ensure Step 3 data exists
    let step3Data = await step3Db.getStep3Data(clientId);
    if (!step3Data) {
      step3Data = await step3Db.createStep3Data(clientId, userId);
    }
    
    // Check current document count
    const currentDocuments = step3Data.legalAgreements[category] || [];
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
      `step3/${category}`,
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
    
    // Add successful uploads to database
    let updatedStep3Data = step3Data;
    for (const uploadedFile of uploadResult.uploadedFiles) {
      const result = await step3Db.addDocument(clientId, category, uploadedFile, userId);
      if (result) {
        updatedStep3Data = result;
      }
    }
    
    const response: UploadStep3DocumentResponse = {
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

// DELETE /step3/:clientId/documents/:category/:documentId - Delete a document
router.delete('/:clientId/documents/:category/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step3DocumentCategory;
    const documentId = req.params.documentId;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate category
    if (!STEP3_DOCUMENT_CATEGORIES[category]) {
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
    
    // Get Step 3 data to find the document
    const step3Data = await step3Db.getStep3Data(clientId);
    if (!step3Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 3 data not found'
      });
    }
    
    // Find the document
    const documents = step3Data.legalAgreements[category] || [];
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
    await step3Db.removeDocument(clientId, category, documentId, userId);
    
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

// POST /step3/:clientId/gps-images/:stepName - Upload GPS image for a specific step
router.post('/:clientId/gps-images/:stepName', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const stepName = req.params.stepName;
    const file = req.file as Express.Multer.File;
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    
    // Validate step name
    const validStepNames = ['materialDispatch', 'structureAssembly', 'panelInstallation', 'invertorConnection', 'netMeteringAgreement', 'plantStarted'];
    if (!validStepNames.includes(stepName)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid step name for GPS image'
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
    
    if (!file) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No file provided'
      });
    }
    
    // Ensure Step 3 data exists
    let step3Data = await step3Db.getStep3Data(clientId);
    if (!step3Data) {
      step3Data = await step3Db.createStep3Data(clientId, userId);
    }
    
    // Upload file to S3 using generic method
    const uploadResult = await fileStorageService.uploadGenericFiles(
      [{
        fieldname: file.fieldname,
        originalname: file.originalname,
        encoding: file.encoding,
        mimetype: file.mimetype,
        size: file.size,
        buffer: file.buffer
      }],
      clientId,
      `step3/gps-images/${stepName}`,
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
        thumbnailUrl: baseFile.thumbnailUrl,
        gpsCoordinates: undefined, // Will be extracted on frontend
        hasValidGPS: false // Will be updated after GPS extraction
      })
    );
    
    if (uploadResult.uploadedFiles.length > 0) {
      // Add GPS image to database
      const gpsImage = uploadResult.uploadedFiles[0];
      await step3Db.addGpsImage(clientId, stepName, gpsImage, userId);
    }
    
    res.status(200).json({
      success: true,
      data: {
        uploadedFile: uploadResult.uploadedFiles[0],
        errors: uploadResult.errors.length > 0 ? uploadResult.errors : undefined
      }
    });
  } catch (error) {
    console.error('Error uploading GPS image:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload GPS image'
    });
  }
});

// DELETE /step3/:clientId/gps-images/:stepName/:documentId - Delete GPS image for a specific step
router.delete('/:clientId/gps-images/:stepName/:documentId', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const stepName = req.params.stepName;
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
    
    // Get Step 3 data to find the GPS image
    const step3Data = await step3Db.getStep3Data(clientId);
    if (!step3Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 3 data not found'
      });
    }
    
    // Find the GPS image
    const gpsImages = step3Data.installationProgress.gpsImages[stepName as keyof typeof step3Data.installationProgress.gpsImages];
    const gpsImage = gpsImages.find(img => img.documentId === documentId);
    
    if (!gpsImage) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'GPS image not found'
      });
    }
    
    // Delete from S3
    await fileStorageService.deleteFile(gpsImage.s3Key);
    
    // Remove from database
    await step3Db.removeGpsImage(clientId, stepName, documentId, userId);
    
    res.status(200).json({
      success: true,
      message: 'GPS image deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting GPS image:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete GPS image'
    });
  }
});


// GET /step3/:clientId/documents/:category/:documentId/download - Get download URL for a document
router.get('/:clientId/documents/:category/:documentId/download', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const category = req.params.category as Step3DocumentCategory;
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
    
    // Get Step 3 data to find the document
    const step3Data = await step3Db.getStep3Data(clientId);
    if (!step3Data) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Step 3 data not found'
      });
    }
    
    // Find the document
    const documents = step3Data.legalAgreements[category] || [];
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
