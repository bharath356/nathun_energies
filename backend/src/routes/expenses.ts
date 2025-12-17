import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import { db } from '../services/database';
import { fileStorageService } from '../services/fileStorageService';
import { 
  ClientExpense, 
  CreateExpenseRequest, 
  UpdateExpenseRequest,
  ExpenseDocumentFile
} from '@shared/types';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files per upload
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
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

// GET /clients/:clientId/expenses - Get all expenses for a client
router.get('/:clientId/expenses', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    
    // Check if user has access to this client (same logic as other client routes)
    // For non-admin users, they should only see expenses for clients they have access to
    // This would typically be checked via client assignment or step assignment
    
    const expenses = await db.getClientExpenses(clientId);
    
    res.status(200).json({
      success: true,
      data: expenses
    });
  } catch (error) {
    console.error('Error getting client expenses:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client expenses'
    });
  }
});

// GET /clients/:clientId/expenses/summary - Get expense summary for a client
router.get('/:clientId/expenses/summary', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    
    const summary = await db.getClientExpenseSummary(clientId);
    
    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error getting client expense summary:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client expense summary'
    });
  }
});

// POST /clients/:clientId/expenses - Create new expense
router.post('/:clientId/expenses', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.clientId;
    const createRequest: CreateExpenseRequest = req.body;
    
    // Validate required fields
    if (!createRequest.expenseType || !createRequest.amount) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Expense type and amount are required'
      });
    }

    const { EXPENSE_TYPES } = await import('../../../shared/types');
    // Validate expense type
    if (!Object.keys(EXPENSE_TYPES).includes(createRequest.expenseType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid expense type'
      });
    }
    
    // Validate amount is positive
    if (createRequest.amount <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0'
      });
    }
    
    // If expense type is "other", custom type is required
    if (createRequest.expenseType === 'other' && !createRequest.customExpenseType?.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Custom expense type is required when expense type is "other"'
      });
    }
    
    const now = new Date().toISOString();
    const expense: ClientExpense = {
      expenseId: uuidv4(),
      clientId,
      expenseType: createRequest.expenseType,
      customExpenseType: createRequest.customExpenseType?.trim(),
      amount: createRequest.amount,
      description: createRequest.description?.trim(),
      documents: [], // Will be populated when documents are uploaded
      createdBy: req.user!.userId,
      createdAt: now,
      updatedAt: now,
    };
    
    const createdExpense = await db.createClientExpense(expense);
    
    res.status(201).json({
      success: true,
      data: createdExpense
    });
  } catch (error) {
    console.error('Error creating client expense:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create client expense'
    });
  }
});

// PUT /clients/:clientId/expenses/:expenseId - Update expense
router.put('/:clientId/expenses/:expenseId', async (req: Request, res: Response) => {
  try {
    const { clientId, expenseId } = req.params;
    const updateRequest: UpdateExpenseRequest = req.body;
    
    // Get existing expense to verify it exists and belongs to the client
    const existingExpense = await db.getClientExpense(expenseId);
    if (!existingExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    if (existingExpense.clientId !== clientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expense does not belong to the specified client'
      });
    }
    
    const { EXPENSE_TYPES } = await import('../../../shared/types');
    // Validate expense type if provided
    if (updateRequest.expenseType && !Object.keys(EXPENSE_TYPES).includes(updateRequest.expenseType)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid expense type'
      });
    }
    
    // Validate amount if provided
    if (updateRequest.amount !== undefined && updateRequest.amount <= 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Amount must be greater than 0'
      });
    }
    
    // If expense type is being changed to "other", custom type is required
    if (updateRequest.expenseType === 'other' && !updateRequest.customExpenseType?.trim()) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Custom expense type is required when expense type is "other"'
      });
    }
    
    // Prepare updates
    const updates: Partial<ClientExpense> = {};
    if (updateRequest.expenseType) updates.expenseType = updateRequest.expenseType;
    if (updateRequest.customExpenseType !== undefined) updates.customExpenseType = updateRequest.customExpenseType?.trim();
    if (updateRequest.amount !== undefined) updates.amount = updateRequest.amount;
    if (updateRequest.description !== undefined) updates.description = updateRequest.description?.trim();
    
    const updatedExpense = await db.updateClientExpense(expenseId, updates);
    
    if (!updatedExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedExpense
    });
  } catch (error) {
    console.error('Error updating client expense:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update client expense'
    });
  }
});

// DELETE /clients/:clientId/expenses/:expenseId - Delete expense (admin only)
router.delete('/:clientId/expenses/:expenseId', async (req: Request, res: Response) => {
  try {
    const { clientId, expenseId } = req.params;
    
    // Only admin can delete expenses
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can delete expenses'
      });
    }
    
    // Get existing expense to verify it exists and get document info for cleanup
    const existingExpense = await db.getClientExpense(expenseId);
    if (!existingExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    if (existingExpense.clientId !== clientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expense does not belong to the specified client'
      });
    }
    
    // Delete associated documents from S3
    if (existingExpense.documents && existingExpense.documents.length > 0) {
      try {
        const s3Keys = existingExpense.documents.map(doc => doc.s3Key);
        await fileStorageService.deleteFiles(s3Keys);
      } catch (error) {
        console.warn('Error deleting expense documents from S3:', error);
        // Continue with expense deletion even if S3 cleanup fails
      }
    }
    
    const success = await db.deleteClientExpense(expenseId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { message: 'Expense deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting client expense:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete client expense'
    });
  }
});

// POST /clients/:clientId/expenses/:expenseId/documents - Upload documents for expense
router.post('/:clientId/expenses/:expenseId/documents', upload.array('files', 10), async (req: Request, res: Response) => {
  try {
    const { clientId, expenseId } = req.params;
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No files provided'
      });
    }
    
    // Get existing expense to verify it exists
    const existingExpense = await db.getClientExpense(expenseId);
    if (!existingExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    if (existingExpense.clientId !== clientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expense does not belong to the specified client'
      });
    }
    
    // Upload files using the generic file storage service
    const { uploadedFiles, errors } = await fileStorageService.uploadGenericFiles<ExpenseDocumentFile>(
      files,
      clientId,
      `expenses/${expenseId}`,
      req.user!.userId,
      (baseFile) => ({
        ...baseFile,
      } as ExpenseDocumentFile)
    );
    
    // Update expense with new documents
    const updatedDocuments = [...existingExpense.documents, ...uploadedFiles];
    await db.updateClientExpense(expenseId, { documents: updatedDocuments });
    
    res.status(200).json({
      success: true,
      data: {
        uploadedFiles,
        errors,
        totalDocuments: updatedDocuments.length
      }
    });
  } catch (error) {
    console.error('Error uploading expense documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to upload expense documents'
    });
  }
});

// DELETE /clients/:clientId/expenses/:expenseId/documents/:documentId - Delete expense document
router.delete('/:clientId/expenses/:expenseId/documents/:documentId', async (req: Request, res: Response) => {
  try {
    const { clientId, expenseId, documentId } = req.params;
    
    // Get existing expense
    const existingExpense = await db.getClientExpense(expenseId);
    if (!existingExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    if (existingExpense.clientId !== clientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expense does not belong to the specified client'
      });
    }
    
    // Find the document to delete
    const documentToDelete = existingExpense.documents.find(doc => doc.documentId === documentId);
    if (!documentToDelete) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Document not found'
      });
    }
    
    // Delete from S3
    try {
      await fileStorageService.deleteFile(documentToDelete.s3Key);
    } catch (error) {
      console.warn('Error deleting document from S3:', error);
      // Continue with database update even if S3 deletion fails
    }
    
    // Update expense by removing the document
    const updatedDocuments = existingExpense.documents.filter(doc => doc.documentId !== documentId);
    await db.updateClientExpense(expenseId, { documents: updatedDocuments });
    
    res.status(200).json({
      success: true,
      data: { message: 'Document deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting expense document:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete expense document'
    });
  }
});

// GET /clients/:clientId/expenses/:expenseId/documents/:documentId/download - Get document download URL
router.get('/:clientId/expenses/:expenseId/documents/:documentId/download', async (req: Request, res: Response) => {
  try {
    const { clientId, expenseId, documentId } = req.params;
    
    // Get existing expense
    const existingExpense = await db.getClientExpense(expenseId);
    if (!existingExpense) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Expense not found'
      });
    }
    
    if (existingExpense.clientId !== clientId) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Expense does not belong to the specified client'
      });
    }
    
    // Find the document
    const document = existingExpense.documents.find(doc => doc.documentId === documentId);
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
    console.error('Error getting expense document download URL:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get document download URL'
    });
  }
});

export default router;
