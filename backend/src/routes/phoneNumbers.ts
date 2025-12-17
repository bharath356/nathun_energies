import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database';
import { authenticate, authorize } from '../middleware/auth';
import { PhoneNumber, AssignPhoneNumbersRequest, CreatePhoneNumberRequest, BulkCreatePhoneNumbersRequest, BulkCreatePhoneNumbersResponse, DeletePhoneNumberResponse, BulkDeleteByAreaCodeRequest, BulkDeleteByAreaCodeResponse, BatchResult, PaginatedPhoneNumbersResponse, PhoneNumberStats, PhoneNumbersQueryParams } from '@shared/types';
import { validateIndianPhoneNumber, validatePhoneNumbers } from '../utils/phoneValidation';

// Constants for phone number assignment
const UNASSIGNED_PHONE_NUMBER = 'UNASSIGNED';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get available area codes with counts (admin only)
router.get('/area-codes', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const areaCodes = await db.getAvailableAreaCodes();
    
    res.status(200).json({
      success: true,
      data: areaCodes
    });
  } catch (error) {
    console.error('Error getting available area codes:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting available area codes'
    });
  }
});

// Get phone number statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    let stats: PhoneNumberStats;

    if (req.user!.role === 'admin') {
      // Admin can see all phone number stats
      stats = await db.getPhoneNumberStats();
    } else {
      // Callers can only see stats for their assigned numbers
      stats = await db.getPhoneNumberStats(req.user!.userId);
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting phone number stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting phone number stats'
    });
  }
});

// Get paginated phone numbers
router.get('/paginated', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Build filters from query parameters
    const filters: PhoneNumbersQueryParams = {};
    
    if (req.query.status) filters.status = req.query.status as PhoneNumber['status'];
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo as string;
    if (req.query.areaCode) filters.areaCode = req.query.areaCode as string;
    if (req.query.name) filters.name = req.query.name as string;
    if (req.query.address) filters.address = req.query.address as string;
    if (req.query.batchId) filters.batchId = req.query.batchId as string;
    if (req.query.assignedAtStart) filters.assignedAtStart = req.query.assignedAtStart as string;
    if (req.query.assignedAtEnd) filters.assignedAtEnd = req.query.assignedAtEnd as string;
    if (req.query.createdAtStart) filters.createdAtStart = req.query.createdAtStart as string;
    if (req.query.createdAtEnd) filters.createdAtEnd = req.query.createdAtEnd as string;

    let result: PaginatedPhoneNumbersResponse;

    if (req.user!.role === 'admin') {
      // Admin can see all phone numbers with pagination
      result = await db.getPhoneNumbersPaginated(page, limit, undefined, filters);
    } else {
      // Callers can only see their assigned numbers with pagination
      result = await db.getPhoneNumbersPaginated(page, limit, req.user!.userId, filters);
    }

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting paginated phone numbers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting paginated phone numbers'
    });
  }
});

// Get phone numbers (admin sees all, callers see only their assigned numbers)
// Keep this for backward compatibility
router.get('/', async (req: Request, res: Response) => {
  try {
    let phoneNumbers: PhoneNumber[];

    if (req.user!.role === 'admin') {
      // Admin can see all phone numbers
      phoneNumbers = await db.getAllPhoneNumbers();
    } else {
      // Callers can only see their assigned numbers
      phoneNumbers = await db.getPhoneNumbersByUser(req.user!.userId);
    }

    res.status(200).json({
      success: true,
      data: phoneNumbers
    });
  } catch (error) {
    console.error('Error getting phone numbers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting phone numbers'
    });
  }
});

// Assign phone numbers to a caller (admin only)
router.post('/assign', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const assignmentData: AssignPhoneNumbersRequest = req.body;
    
    if (!assignmentData.userId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'User ID is required'
      });
    }

    const count = assignmentData.count || 10; // Default to 10 numbers

    // Check if user exists and is a caller
    const user = await db.getUserById(assignmentData.userId);
    if (!user) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'User not found'
      });
    }

    if (user.role !== 'caller') {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Phone numbers can only be assigned to callers'
      });
    }

    // Get available phone numbers (with optional area code filter)
    let availableNumbers: PhoneNumber[];
    let assignmentType = 'random';
    let actualCount = count;
    
    if (assignmentData.areaCode) {
      // Area code based assignment
      // Get all available numbers for this area code first to check availability
      const allAvailableInAreaCode = await db.getAvailablePhoneNumbersByAreaCode(assignmentData.areaCode, 1000);
      assignmentType = `area code ${assignmentData.areaCode}`;
      
      console.log(`Area code assignment request: userId=${assignmentData.userId}, areaCode=${assignmentData.areaCode}, requested=${count}, available=${allAvailableInAreaCode.length}`);
      
      if (allAvailableInAreaCode.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: `No available phone numbers in area code ${assignmentData.areaCode}`
        });
      }

      // Assign the minimum of requested or available
      actualCount = Math.min(count, allAvailableInAreaCode.length);
      availableNumbers = await db.getAvailablePhoneNumbersByAreaCode(assignmentData.areaCode, actualCount);
    } else {
      // Random assignment (existing behavior)
      // Get all available numbers first to check availability
      const allAvailable = await db.getAvailablePhoneNumbers(1000);
      
      console.log(`Random assignment request: userId=${assignmentData.userId}, requested=${count}, available=${allAvailable.length}`);
      
      if (allAvailable.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'No available phone numbers'
        });
      }

      // Assign the minimum of requested or available
      actualCount = Math.min(count, allAvailable.length);
      availableNumbers = await db.getAvailablePhoneNumbers(actualCount);
    }

    // Generate batch ID
    const batchId = uuidv4();
    const now = new Date().toISOString();

    // Assign numbers to user
    const assignedNumbers: PhoneNumber[] = [];
    for (const phoneNumber of availableNumbers) {
      const updatedNumber = await db.updatePhoneNumber(phoneNumber.phoneNumber, {
        assignedTo: assignmentData.userId,
        status: 'assigned',
        assignedAt: now,
        batchId,
      });
      
      if (updatedNumber) {
        assignedNumbers.push(updatedNumber);
      }
    }

    // Create response with enhanced information
    let message: string | undefined;
    if (actualCount < count) {
      if (assignmentData.areaCode) {
        message = `Requested ${count} numbers but only ${actualCount} were available in area code ${assignmentData.areaCode}. Assigned all available numbers.`;
      } else {
        message = `Requested ${count} numbers but only ${actualCount} were available. Assigned all available numbers.`;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        assignedNumbers,
        batchId,
        requestedCount: count,
        actualCount,
        message,
      }
    });
  } catch (error) {
    console.error('Error assigning phone numbers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error assigning phone numbers'
    });
  }
});

// Create a single phone number (admin only)
router.post('/', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const requestData: CreatePhoneNumberRequest = req.body;
    
    if (!requestData.phoneNumber) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Phone number is required'
      });
    }

    if (!requestData.areaCode) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Area code is required'
      });
    }

    // Validate phone number format
    const validation = validateIndianPhoneNumber(requestData.phoneNumber);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation Error',
        message: validation.error || 'Invalid phone number format'
      });
    }

    // Check if phone number already exists
    const existingNumber = await db.getPhoneNumber(validation.normalized);
    if (existingNumber) {
      return res.status(409).json({
        error: 'Conflict',
        message: 'Phone number already exists'
      });
    }

    // Create phone number
    const now = new Date().toISOString();
    const phoneNumber: PhoneNumber = {
      phoneNumber: validation.normalized,
      assignedTo: UNASSIGNED_PHONE_NUMBER, // Use constant for available numbers
      name: requestData.name,
      address: requestData.address,
      areaCode: requestData.areaCode,
      status: 'available',
      createdAt: now,
      updatedAt: now,
    };

    const created = await db.createPhoneNumber(phoneNumber);
    res.status(201).json({
      success: true,
      data: created
    });
  } catch (error) {
    console.error('Error creating phone number:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error creating phone number'
    });
  }
});

// Create multiple phone numbers in bulk with batch processing (admin only)
router.post('/bulk', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const requestData: BulkCreatePhoneNumbersRequest = req.body;
    
    if (!requestData.phoneNumbers || !Array.isArray(requestData.phoneNumbers)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Phone numbers array is required'
      });
    }

    if (requestData.phoneNumbers.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one phone number is required'
      });
    }

    if (requestData.phoneNumbers.length > 10000) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Maximum 10000 phone numbers allowed per request'
      });
    }

    const startTime = Date.now();
    const BATCH_SIZE = 50; // Process 50 numbers per batch
    const phoneNumbers = requestData.phoneNumbers;
    const totalBatches = Math.ceil(phoneNumbers.length / BATCH_SIZE);
    
    // Initialize overall results
    const allCreated: PhoneNumber[] = [];
    const allDuplicates: string[] = [];
    const allInvalid: { phoneNumber: string; error: string }[] = [];
    const batchResults: BatchResult<PhoneNumber>[] = [];

    console.log(`Starting batch processing: ${phoneNumbers.length} items in ${totalBatches} batches of ${BATCH_SIZE}`);

    // Process each batch
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const batchStartTime = Date.now();
      const batchNumber = batchIndex + 1;
      const startIdx = batchIndex * BATCH_SIZE;
      const endIdx = Math.min(startIdx + BATCH_SIZE, phoneNumbers.length);
      const batch = phoneNumbers.slice(startIdx, endIdx);
      
      console.log(`Processing batch ${batchNumber}/${totalBatches}: items ${startIdx + 1}-${endIdx}`);

      // Initialize batch results
      const batchCreated: PhoneNumber[] = [];
      const batchDuplicates: string[] = [];
      const batchInvalid: { phoneNumber: string; error: string }[] = [];
      let batchErrors = 0;
      const now = new Date().toISOString();

      // Process each item in the batch
      for (const entry of batch) {
        try {
          // Validate required fields
          if (!entry.phoneNumber) {
            batchInvalid.push({ phoneNumber: entry.phoneNumber || '', error: 'Phone number is required' });
            continue;
          }

          if (!entry.areaCode) {
            batchInvalid.push({ phoneNumber: entry.phoneNumber, error: 'Area code is required' });
            continue;
          }

          // Validate phone number format
          const validation = validateIndianPhoneNumber(entry.phoneNumber);
          if (!validation.isValid) {
            batchInvalid.push({ 
              phoneNumber: entry.phoneNumber, 
              error: validation.error || 'Invalid phone number format' 
            });
            continue;
          }

          // Check if phone number already exists
          const existingNumber = await db.getPhoneNumber(validation.normalized);
          if (existingNumber) {
            batchDuplicates.push(entry.phoneNumber);
            continue;
          }

          // Create phone number
          const phoneNumberObj: PhoneNumber = {
            phoneNumber: validation.normalized,
            assignedTo: UNASSIGNED_PHONE_NUMBER, // Use constant for available numbers
            name: entry.name,
            address: entry.address,
            areaCode: entry.areaCode,
            status: 'available',
            createdAt: now,
            updatedAt: now,
          };

          const createdNumber = await db.createPhoneNumber(phoneNumberObj);
          batchCreated.push(createdNumber);
        } catch (error) {
          console.error(`Error processing phone number ${entry.phoneNumber} in batch ${batchNumber}:`, error);
          batchErrors++;
          batchInvalid.push({ 
            phoneNumber: entry.phoneNumber, 
            error: 'Failed to process phone number' 
          });
        }
      }

      const batchProcessingTime = Date.now() - batchStartTime;
      
      // Create batch result
      const batchResult: BatchResult<PhoneNumber> = {
        batchNumber,
        batchSize: batch.length,
        created: batchCreated.length,
        duplicates: batchDuplicates.length,
        invalid: batchInvalid.length,
        errors: batchErrors,
        processingTimeMs: batchProcessingTime,
        createdItems: batchCreated,
        duplicateItems: batchDuplicates,
        invalidItems: batchInvalid
      };

      batchResults.push(batchResult);

      // Add to overall results
      allCreated.push(...batchCreated);
      allDuplicates.push(...batchDuplicates);
      allInvalid.push(...batchInvalid);

      console.log(`Batch ${batchNumber} completed: ${batchCreated.length} created, ${batchDuplicates.length} duplicates, ${batchInvalid.length} invalid, ${batchErrors} errors (${batchProcessingTime}ms)`);
    }

    const totalProcessingTime = Date.now() - startTime;

    // Prepare response
    const response: BulkCreatePhoneNumbersResponse = {
      created: allCreated,
      duplicates: allDuplicates,
      invalid: allInvalid,
      summary: {
        total: phoneNumbers.length,
        created: allCreated.length,
        duplicates: allDuplicates.length,
        invalid: allInvalid.length
      },
      total: phoneNumbers.length,
      batchSize: BATCH_SIZE,
      totalBatches,
      processingTimeMs: totalProcessingTime,
      batchResults
    };

    console.log(`Bulk processing completed: ${allCreated.length} created, ${allDuplicates.length} duplicates, ${allInvalid.length} invalid (${totalProcessingTime}ms total)`);

    res.status(201).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error bulk creating phone numbers:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error bulk creating phone numbers'
    });
  }
});

// Update phone number details (admin only)
router.put('/:phoneNumber', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;
    const updates = req.body;

    // Only allow updating name and address
    const allowedFields = ['name', 'address'];
    const filteredUpdates: Partial<PhoneNumber> = {};

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field as keyof PhoneNumber] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No valid fields to update. Only name and address can be updated.'
      });
    }

    // Check if phone number exists
    const existingNumber = await db.getPhoneNumber(phoneNumber);
    if (!existingNumber) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Phone number not found'
      });
    }

    // Update phone number
    const updatedNumber = await db.updatePhoneNumber(phoneNumber, filteredUpdates);
    
    if (!updatedNumber) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to update phone number'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedNumber
    });
  } catch (error) {
    console.error('Error updating phone number:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error updating phone number'
    });
  }
});

// Delete a single phone number (admin only)
router.delete('/:phoneNumber', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.params;

    // Check if phone number exists
    const existingNumber = await db.getPhoneNumber(phoneNumber);
    if (!existingNumber) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Phone number not found'
      });
    }

    // Check if phone number can be safely deleted
    const canDelete = await db.canDeletePhoneNumber(phoneNumber);
    if (!canDelete.canDelete) {
      return res.status(400).json({
        error: 'Bad Request',
        message: canDelete.reason || 'Phone number cannot be deleted'
      });
    }

    // Delete the phone number
    const deleted = await db.deletePhoneNumber(phoneNumber);
    
    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete phone number'
      });
    }

    const response: DeletePhoneNumberResponse = {
      success: true,
      message: 'Phone number deleted successfully',
      phoneNumber: phoneNumber
    };

    res.status(200).json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error deleting phone number:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error deleting phone number'
    });
  }
});

// Bulk delete phone numbers by area code (admin only)
router.delete('/area-code/:areaCode', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const { areaCode } = req.params;
    const force = req.query.force === 'true';

    // Validate area code
    if (!areaCode || areaCode.trim() === '') {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Area code is required'
      });
    }

    // Check if area code has any phone numbers
    const phoneNumbers = await db.getAllPhoneNumbers();
    const numbersInAreaCode = phoneNumbers.filter(num => num.areaCode === areaCode);
    
    if (numbersInAreaCode.length === 0) {
      return res.status(404).json({
        error: 'Not Found',
        message: `No phone numbers found in area code ${areaCode}`
      });
    }

    // Perform bulk deletion
    const result = await db.deletePhoneNumbersByAreaCode(areaCode, force);

    const response: BulkDeleteByAreaCodeResponse = {
      areaCode: result.areaCode,
      totalNumbers: result.totalNumbers,
      deletedCount: result.deletedCount,
      skippedCount: result.skippedCount,
      errorCount: result.errorCount,
      deletedNumbers: result.deletedNumbers,
      skippedNumbers: result.skippedNumbers,
      errors: result.errors
    };

    // Return appropriate status code based on results
    let statusCode = 200;
    if (result.errorCount > 0) {
      statusCode = 207; // Multi-status - some operations failed
    } else if (result.deletedCount === 0) {
      statusCode = 400; // Bad request - nothing was deleted
    }

    res.status(statusCode).json({
      success: result.deletedCount > 0,
      data: response,
      message: result.deletedCount > 0 
        ? `Successfully deleted ${result.deletedCount} phone numbers from area code ${areaCode}`
        : `No phone numbers were deleted from area code ${areaCode}`
    });
  } catch (error) {
    console.error('Error bulk deleting phone numbers by area code:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error bulk deleting phone numbers by area code'
    });
  }
});

export default router;
