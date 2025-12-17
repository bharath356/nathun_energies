import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database';
import { authenticate, authorize } from '../middleware/auth';
import { Call, CreateCallRequest, CreateQuickCallRequest, UpdateCallRequest } from '@shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get calls (admin sees all, callers see only their own)
router.get('/', async (req: Request, res: Response) => {
  try {
    let calls: Call[];
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    const status = req.query.status as string;
    const outcome = req.query.outcome as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;

    if (req.user!.role === 'admin') {
      // Admin can see all calls with caller information or filter by user
      const userId = req.query.userId as string;
      if (userId) {
        calls = await db.getCallsByUser(userId, limit);
      } else {
        calls = await db.getAllCallsWithCallerInfo(limit);
      }
    } else {
      // Callers can only see their own calls (no caller info needed)
      calls = await db.getCallsByUser(req.user!.userId, limit);
    }

    // Apply filters
    if (status) {
      calls = calls.filter(call => call.status === status);
    }
    if (outcome) {
      calls = calls.filter(call => call.outcome === outcome);
    }
    if (startDate) {
      // Extract date part from timestamp for comparison
      calls = calls.filter(call => {
        const callDate = call.createdAt.split('T')[0]; // Get YYYY-MM-DD part
        return callDate >= startDate;
      });
    }
    if (endDate) {
      // Extract date part from timestamp for comparison
      calls = calls.filter(call => {
        const callDate = call.createdAt.split('T')[0]; // Get YYYY-MM-DD part
        return callDate <= endDate;
      });
    }

    res.status(200).json({
      success: true,
      data: calls
    });
  } catch (error) {
    console.error('Error getting calls:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting calls'
    });
  }
});

// Quick create a call with auto-selected phone number
router.post('/quick-create', async (req: Request, res: Response) => {
  try {
    const callData: CreateQuickCallRequest = req.body;
    
    // Find phone numbers that haven't been called yet
    const availableNumbers = await db.getAvailablePhoneNumbersForUser(req.user!.userId, req.user!.role === 'admin');
    
    if (availableNumbers.length === 0) {
      return res.status(400).json({
        error: 'No Available Numbers',
        message: 'No uncalled phone numbers are available. All assigned phone numbers have already been called. Use follow-ups to re-engage with previously called numbers.'
      });
    }
    
    // Select the first available number (prioritize 'assigned' over 'available')
    const sortedNumbers = availableNumbers.sort((a, b) => {
      if (a.status === 'assigned' && b.status === 'available') return -1;
      if (a.status === 'available' && b.status === 'assigned') return 1;
      return 0;
    });
    
    const selectedPhoneNumber = sortedNumbers[0];
    
    // Create new call
    const now = new Date().toISOString();
    const newCall: Call = {
      callId: uuidv4(),
      userId: req.user!.userId,
      phoneNumber: selectedPhoneNumber.phoneNumber,
      status: 'pending',
      notes: callData.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    // Store call in database
    await db.createCall(newCall);

    // Update phone number status to in-use
    await db.updatePhoneNumber(selectedPhoneNumber.phoneNumber, { status: 'in-use' });

    res.status(201).json({
      success: true,
      data: newCall,
      message: `Call created with phone number ${selectedPhoneNumber.phoneNumber}`
    });
  } catch (error) {
    console.error('Error creating quick call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error creating quick call'
    });
  }
});

// Create a new call
router.post('/', async (req: Request, res: Response) => {
  try {
    const callData: CreateCallRequest = req.body;
    
    if (!callData.phoneNumber) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Phone number is required'
      });
    }

    // Check if phone number exists and is assigned to the user
    const phoneNumber = await db.getPhoneNumber(callData.phoneNumber);
    if (!phoneNumber) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Phone number not found'
      });
    }

    if (req.user!.role !== 'admin' && phoneNumber.assignedTo !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create calls for phone numbers assigned to you'
      });
    }

    // Check if this phone number has already been called by this user
    const existingCalls = await db.getCallsByUser(req.user!.userId);
    const hasBeenCalled = existingCalls.some(call => call.phoneNumber === callData.phoneNumber);
    
    if (hasBeenCalled) {
      return res.status(400).json({
        error: 'Already Called',
        message: 'This phone number has already been called. Use follow-ups to re-engage with previously called numbers.'
      });
    }

    // Create new call
    const now = new Date().toISOString();
    const newCall: Call = {
      callId: uuidv4(),
      userId: req.user!.userId,
      phoneNumber: callData.phoneNumber,
      status: 'pending',
      notes: callData.notes || '',
      createdAt: now,
      updatedAt: now,
    };

    // Store call in database
    await db.createCall(newCall);

    // Update phone number status to in-use
    await db.updatePhoneNumber(callData.phoneNumber, { status: 'in-use' });

    res.status(201).json({
      success: true,
      data: newCall
    });
  } catch (error) {
    console.error('Error creating call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error creating call'
    });
  }
});

// Update a call
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const callId = req.params.id;
    
    if (!callId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Call ID is required'
      });
    }

    // Get call
    const call = await db.getCall(callId);
    if (!call) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
    }

    // Check if user is admin or the call owner
    if (req.user!.role !== 'admin' && call.userId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own calls'
      });
    }

    const updates: UpdateCallRequest = req.body;
    
    // Clean up the updates object - remove empty strings and undefined values
    const cleanedUpdates: any = {};
    
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && value !== null) {
        if (typeof value === 'string' && value.trim() === '') {
          // For empty strings, we'll either skip them or set them to undefined
          // depending on the field
          if (key === 'outcome') {
            // For outcome, we want to allow clearing it, so we'll remove the attribute
            cleanedUpdates[key] = null;
          } else if (key === 'notes') {
            // For notes, empty string is valid
            cleanedUpdates[key] = '';
          }
        } else {
          cleanedUpdates[key] = value;
        }
      }
    }
    
    // Update call
    const updatedCall = await db.updateCall(callId, cleanedUpdates);

    if (!updatedCall) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found after update'
      });
    }

    // Update phone number status based on call completion
    if (cleanedUpdates.status === 'completed') {
      const phoneNumber = await db.getPhoneNumber(call.phoneNumber);
      if (phoneNumber) {
        let phoneStatus: 'available' | 'assigned' | 'in-use' | 'completed' = 'completed';
        
        // If outcome is callback or interested, keep as assigned for follow-up
        if (cleanedUpdates.outcome === 'callback' || cleanedUpdates.outcome === 'interested') {
          phoneStatus = 'assigned';
        }
        
        await db.updatePhoneNumber(call.phoneNumber, { status: phoneStatus });
      }
    }

    res.status(200).json({
      success: true,
      data: updatedCall
    });
  } catch (error) {
    console.error('Error updating call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: `Error updating call: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Delete a call (admin only)
router.delete('/:id', authorize(['admin']), async (req: Request, res: Response) => {
  try {
    const callId = req.params.id;
    
    if (!callId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Call ID is required'
      });
    }

    // Get the call to ensure it exists and to get phone number for cleanup
    const call = await db.getCall(callId);
    if (!call) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
    }

    // Delete the call
    await db.deleteCall(callId);

    // Update phone number status if needed
    // If the call was in-progress or pending, reset phone number to assigned
    if (call.status === 'in-progress' || call.status === 'pending') {
      const phoneNumber = await db.getPhoneNumber(call.phoneNumber);
      if (phoneNumber) {
        await db.updatePhoneNumber(call.phoneNumber, { status: 'assigned' });
      }
    }

    res.status(200).json({
      success: true,
      data: { message: 'Call deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting call:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error deleting call'
    });
  }
});

// Get call statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    let stats;
    
    if (req.user!.role === 'admin') {
      const userId = req.query.userId as string;
      // Use the new efficient stats method that gets accurate counts without limits
      stats = await db.getCallStats(userId);
    } else {
      // Use the new efficient stats method for the current user
      stats = await db.getCallStats(req.user!.userId);
    }

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting call stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting call stats'
    });
  }
});

export default router;
