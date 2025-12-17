import { Router, Request, Response } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { clientDb } from '../services/clientDatabase';
import { ClientStep, ClientSubStep } from '../../../shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /client-steps/:stepId - Get specific client step
router.get('/:stepId', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.stepId;
    
    const step = await clientDb.getClientStep(stepId);
    
    if (!step) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client step not found'
      });
    }
    
    // Check if user has access to this step's client
    const client = await clientDb.getClient(step.clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Associated client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, step.clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: step
    });
  } catch (error) {
    console.error('Error getting client step:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client step'
    });
  }
});

// PUT /client-steps/:stepId - Update client step
router.put('/:stepId', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.stepId;
    const updates = req.body;
    
    // Get existing step to check permissions
    const existingStep = await clientDb.getClientStep(stepId);
    if (!existingStep) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client step not found'
      });
    }
    
    // Check if user has access to this step's client
    const client = await clientDb.getClient(existingStep.clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Associated client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, existingStep.clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const updatedStep = await clientDb.updateClientStep(stepId, updates);
    
    if (!updatedStep) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client step not found'
      });
    }
    
    // Update client status based on all step statuses (handles both completion and reversal)
    await clientDb.updateClientStatusBasedOnSteps(existingStep.clientId);
    
    res.status(200).json({
      success: true,
      data: updatedStep
    });
  } catch (error) {
    console.error('Error updating client step:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update client step'
    });
  }
});

// GET /client-steps/:stepId/sub-steps - Get sub-steps for a client step
router.get('/:stepId/sub-steps', async (req: Request, res: Response) => {
  try {
    const stepId = req.params.stepId;
    
    // Get the step to check permissions
    const step = await clientDb.getClientStep(stepId);
    if (!step) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client step not found'
      });
    }
    
    // Check if user has access to this step's client
    const client = await clientDb.getClient(step.clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Associated client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, step.clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const subSteps = await clientDb.getClientSubSteps(stepId);
    
    res.status(200).json({
      success: true,
      data: subSteps
    });
  } catch (error) {
    console.error('Error getting client sub-steps:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client sub-steps'
    });
  }
});

// GET /client-sub-steps/:subStepId - Get specific client sub-step
router.get('/sub-steps/:subStepId', async (req: Request, res: Response) => {
  try {
    const subStepId = req.params.subStepId;
    
    const subStep = await clientDb.getClientSubStep(subStepId);
    
    if (!subStep) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client sub-step not found'
      });
    }
    
    // Check if user has access to this sub-step's client
    const client = await clientDb.getClient(subStep.clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Associated client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, subStep.clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: subStep
    });
  } catch (error) {
    console.error('Error getting client sub-step:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client sub-step'
    });
  }
});

// PUT /client-sub-steps/:subStepId - Update client sub-step
router.put('/sub-steps/:subStepId', async (req: Request, res: Response) => {
  try {
    const subStepId = req.params.subStepId;
    const updates = req.body;
    
    // Get existing sub-step to check permissions
    const existingSubStep = await clientDb.getClientSubStep(subStepId);
    if (!existingSubStep) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client sub-step not found'
      });
    }
    
    // Check if user has access to this sub-step's client
    const client = await clientDb.getClient(existingSubStep.clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Associated client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, existingSubStep.clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const updatedSubStep = await clientDb.updateClientSubStep(subStepId, updates);
    
    if (!updatedSubStep) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client sub-step not found'
      });
    }
    
    // Update client status based on all step statuses (sub-step changes might affect overall completion)
    await clientDb.updateClientStatusBasedOnSteps(existingSubStep.clientId);
    
    res.status(200).json({
      success: true,
      data: updatedSubStep
    });
  } catch (error) {
    console.error('Error updating client sub-step:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update client sub-step'
    });
  }
});

export default router;
