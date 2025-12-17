import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../services/database';
import { authenticate } from '../middleware/auth';
import { FollowUp, CreateFollowUpRequest, UpdateFollowUpRequest } from '@shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get follow-ups (admin sees all, callers see only their own)
router.get('/', async (req: Request, res: Response) => {
  try {
    let followUps: FollowUp[];
    const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
    
    // Extract filter parameters
    const filters = {
      userId: req.query.userId as string,
      startDate: req.query.startDate as string,
      endDate: req.query.endDate as string,
      status: req.query.status as FollowUp['status'],
      priority: req.query.priority ? parseInt(req.query.priority as string) : undefined,
      overdue: req.query.overdue === 'true'
    };

    if (req.user!.role === 'admin') {
      // Admin can see all follow-ups with caller information or filter by user
      if (filters.userId) {
        followUps = await db.getFollowUpsByUser(filters.userId, limit, filters);
      } else {
        followUps = await db.getAllFollowUpsWithCallerInfo(limit, filters);
      }
    } else {
      // Callers can only see their own follow-ups (no caller info needed)
      followUps = await db.getFollowUpsByUser(req.user!.userId, limit, filters);
    }

    res.status(200).json({
      success: true,
      data: followUps
    });
  } catch (error) {
    console.error('Error getting follow-ups:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error getting follow-ups'
    });
  }
});

// Create a new follow-up
router.post('/', async (req: Request, res: Response) => {
  try {
    const followUpData: CreateFollowUpRequest = req.body;
    
    if (!followUpData.callId || !followUpData.scheduledDate) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Call ID and scheduled date are required'
      });
    }

    // Validate priority if provided
    if (followUpData.priority !== undefined) {
      if (!Number.isInteger(followUpData.priority) || followUpData.priority < 1 || followUpData.priority > 5) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Priority must be an integer between 1 and 5'
        });
      }
    }

    // Check if call exists and belongs to the user
    const call = await db.getCall(followUpData.callId);
    if (!call) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Call not found'
      });
    }

    if (req.user!.role !== 'admin' && call.userId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only create follow-ups for your own calls'
      });
    }

    // Validate scheduled date
    const scheduledDate = new Date(followUpData.scheduledDate);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid scheduled date format'
      });
    }

    // Create new follow-up
    const now = new Date().toISOString();
    const newFollowUp: FollowUp = {
      followUpId: uuidv4(),
      userId: call.userId,
      callId: followUpData.callId,
      phoneNumber: call.phoneNumber,
      scheduledDate: scheduledDate.toISOString(),
      status: 'pending',
      notes: followUpData.notes || '',
      priority: followUpData.priority || 2, // Default to 2 stars
      reminderSent: false,
      createdAt: now,
      updatedAt: now,
    };

    // Store follow-up in database
    await db.createFollowUp(newFollowUp);

    res.status(201).json({
      success: true,
      data: newFollowUp
    });
  } catch (error) {
    console.error('Error creating follow-up:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error creating follow-up'
    });
  }
});

// Update a follow-up
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const followUpId = req.params.id;
    
    if (!followUpId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Follow-up ID is required'
      });
    }

    // Get follow-up
    const followUp = await db.getFollowUp(followUpId);
    if (!followUp) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Follow-up not found'
      });
    }

    // Check if user is admin or the follow-up owner
    if (req.user!.role !== 'admin' && followUp.userId !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only update your own follow-ups'
      });
    }

    const updates: UpdateFollowUpRequest = req.body;
    
    // Validate priority if provided
    if (updates.priority !== undefined) {
      if (!Number.isInteger(updates.priority) || updates.priority < 1 || updates.priority > 5) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Priority must be an integer between 1 and 5'
        });
      }
    }
    
    // Validate scheduled date if provided
    if (updates.scheduledDate) {
      const scheduledDate = new Date(updates.scheduledDate);
      if (isNaN(scheduledDate.getTime())) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid scheduled date format'
        });
      }
      updates.scheduledDate = scheduledDate.toISOString();
    }

    // Update follow-up
    const updatedFollowUp = await db.updateFollowUp(followUpId, {
      ...updates,
      updatedAt: new Date().toISOString(),
      ...(updates.status === 'completed' && { completedAt: new Date().toISOString() }),
    });

    if (!updatedFollowUp) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Follow-up not found'
      });
    }

    res.status(200).json({
      success: true,
      data: updatedFollowUp
    });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error updating follow-up'
    });
  }
});

// Delete a follow-up (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const followUpId = req.params.id;
    
    if (!followUpId) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Follow-up ID is required'
      });
    }

    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can delete follow-ups'
      });
    }

    // Get follow-up to verify it exists
    const followUp = await db.getFollowUp(followUpId);
    if (!followUp) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Follow-up not found'
      });
    }

    // Delete the follow-up
    const deleted = await db.deleteFollowUp(followUpId);
    
    if (!deleted) {
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to delete follow-up'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Follow-up deleted successfully',
      data: { followUpId }
    });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Error deleting follow-up'
    });
  }
});

export default router;
