import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticate, authorize } from '../middleware/auth';
import { clientDb } from '../services/clientDatabase';
import { 
  Client, 
  CreateClientRequest, 
  UpdateClientRequest,
  ClientsQueryParams,
  CLIENT_STEP_TEMPLATES
} from '../../../shared/types';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// GET /clients - Get paginated clients with filtering
router.get('/', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    
    // Build filters from query parameters
    const filters: ClientsQueryParams = {};
    if (req.query.status) filters.status = req.query.status as any;
    if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo as string;
    if (req.query.currentStep) filters.currentStep = parseInt(req.query.currentStep as string);
    if (req.query.name) filters.name = req.query.name as string;
    if (req.query.mobile) filters.mobile = req.query.mobile as string;
    if (req.query.createdAtStart) filters.createdAtStart = req.query.createdAtStart as string;
    if (req.query.createdAtEnd) filters.createdAtEnd = req.query.createdAtEnd as string;

    // For non-admin users, only show their assigned clients unless they're filtering by assignedTo
    const userId = req.user!.role === 'admin' ? undefined : req.user!.userId;
    
    const result = await clientDb.getClientsPaginated(page, limit, userId, filters);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error getting clients:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get clients'
    });
  }
});

// GET /clients/stats - Get client statistics
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // For non-admin users, only show stats for their assigned clients
    const userId = req.user!.role === 'admin' ? undefined : req.user!.userId;
    
    const stats = await clientDb.getClientStats(userId);
    
    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting client stats:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client statistics'
    });
  }
});

// GET /clients/financial-overview - Get financial overview for all clients
router.get('/financial-overview', async (req: Request, res: Response) => {
  try {
    // For non-admin users, only show their assigned clients
    const userId = req.user!.role === 'admin' ? undefined : req.user!.userId;
    
    // Get date range filters if provided
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    
    const financialOverview = await clientDb.getClientsFinancialOverview(userId, startDate, endDate);
    
    res.status(200).json({
      success: true,
      data: financialOverview
    });
  } catch (error) {
    console.error('Error getting financial overview:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get financial overview'
    });
  }
});

// GET /clients/step-templates - Get predefined step templates
router.get('/step-templates', async (req: Request, res: Response) => {
  try {
    res.status(200).json({
      success: true,
      data: CLIENT_STEP_TEMPLATES
    });
  } catch (error) {
    console.error('Error getting step templates:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get step templates'
    });
  }
});

// GET /clients/:id - Get specific client with assignee info
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    const client = await clientDb.getClientWithAssigneeInfo(clientId);
    
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      data: client
    });
  } catch (error) {
    console.error('Error getting client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client'
    });
  }
});

// POST /clients - Create new client
router.post('/', async (req: Request, res: Response) => {
  try {
    const createRequest: CreateClientRequest = req.body;
    
    // Validate required fields
    if (!createRequest.name || !createRequest.mobile || !createRequest.address || !createRequest.assignedTo) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Name, mobile, address, and assignedTo are required'
      });
    }
    
    // For non-admin users, they can only assign to themselves
    if (req.user!.role !== 'admin' && createRequest.assignedTo !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only assign clients to yourself'
      });
    }
    
    const now = new Date().toISOString();
    const client: Client = {
      clientId: uuidv4(),
      name: createRequest.name,
      mobile: createRequest.mobile,
      address: createRequest.address,
      googleMapsUrl: createRequest.googleMapsUrl,
      comments: createRequest.comments,
      status: 'active',
      currentStep: 1,
      assignedTo: createRequest.assignedTo,
      createdAt: now,
      updatedAt: now,
    };
    
    const createdClient = await clientDb.createClient(client);
    
    // Create initial steps based on templates
    // First pass: create all steps with empty dependencies
    const createdSteps: Record<number, string> = {}; // stepNumber -> stepId mapping
    
    for (const template of CLIENT_STEP_TEMPLATES) {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + template.estimatedDuration);
      
      const stepId = uuidv4();
      const step = {
        stepId,
        clientId: client.clientId,
        stepNumber: template.stepNumber,
        stepName: template.stepName,
        description: template.description,
        status: template.stepNumber === 1 ? 'pending' as const : 'pending' as const,
        assignedTo: createRequest.assignedTo,
        dueDate: dueDate.toISOString().split('T')[0], // YYYY-MM-DD format
        estimatedDuration: template.estimatedDuration,
        dependencies: [], // Will be populated in second pass
        isOptional: template.isOptional,
        createdAt: now,
        updatedAt: now,
      };
      
      await clientDb.createClientStep(step);
      createdSteps[template.stepNumber] = stepId;
      
      // Create sub-steps if they exist in the template
      if (template.subSteps && template.subSteps.length > 0) {
        for (let i = 0; i < template.subSteps.length; i++) {
          const subStepTemplate = template.subSteps[i];
          const subStepDueDate = new Date();
          subStepDueDate.setDate(subStepDueDate.getDate() + 3); // Default 3 days for sub-steps
          
          const subStep = {
            subStepId: uuidv4(),
            stepId,
            clientId: client.clientId,
            subStepName: subStepTemplate.subStepName,
            description: subStepTemplate.description,
            status: 'pending' as const,
            assignedTo: createRequest.assignedTo,
            dueDate: subStepDueDate.toISOString().split('T')[0],
            isRequired: subStepTemplate.isRequired,
            sortOrder: subStepTemplate.sortOrder,
            createdAt: now,
            updatedAt: now,
          };
          
          await clientDb.createClientSubStep(subStep);
        }
      }
    }
    
    // Second pass: update dependencies with actual step IDs
    for (const template of CLIENT_STEP_TEMPLATES) {
      if (template.dependencies && template.dependencies.length > 0) {
        const stepId = createdSteps[template.stepNumber];
        const dependencyStepIds = template.dependencies
          .map(depStepNumber => createdSteps[depStepNumber])
          .filter(Boolean); // Remove any undefined values
        
        if (dependencyStepIds.length > 0) {
          await clientDb.updateClientStep(stepId, {
            dependencies: dependencyStepIds
          });
        }
      }
    }
    
    res.status(201).json({
      success: true,
      data: createdClient
    });
  } catch (error) {
    console.error('Error creating client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to create client'
    });
  }
});

// PUT /clients/:id - Update client
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    const updateRequest: UpdateClientRequest = req.body;
    
    // Get existing client to check permissions
    const existingClient = await clientDb.getClient(clientId);
    if (!existingClient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, only allow updates to their assigned clients
    if (req.user!.role !== 'admin' && existingClient.assignedTo !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied'
      });
    }
    
    // For non-admin users, prevent changing assignedTo to someone else
    if (req.user!.role !== 'admin' && updateRequest.assignedTo && updateRequest.assignedTo !== req.user!.userId) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'You can only assign clients to yourself'
      });
    }
    
    const updatedClient = await clientDb.updateClient(clientId, updateRequest);
    
    if (!updatedClient) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: updatedClient
    });
  } catch (error) {
    console.error('Error updating client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to update client'
    });
  }
});

// DELETE /clients/:id - Delete client (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    // Only admin can delete clients
    if (req.user!.role !== 'admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only administrators can delete clients'
      });
    }
    
    const success = await clientDb.deleteClient(clientId);
    
    if (!success) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: { message: 'Client deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting client:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to delete client'
    });
  }
});

// GET /clients/:id/steps - Get client steps
router.get('/:id/steps', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const steps = await clientDb.getClientSteps(clientId);
    
    res.status(200).json({
      success: true,
      data: steps
    });
  } catch (error) {
    console.error('Error getting client steps:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client steps'
    });
  }
});

// GET /clients/:id/documents - Get client documents
router.get('/:id/documents', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const documents = await clientDb.getClientDocuments(clientId);
    
    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    console.error('Error getting client documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client documents'
    });
  }
});

// GET /clients/:id/all-documents - Get all documents from all steps for a client
router.get('/:id/all-documents', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    const allDocuments = await clientDb.getAllClientDocuments(clientId);
    
    res.status(200).json({
      success: true,
      data: allDocuments
    });
  } catch (error) {
    console.error('Error getting all client documents:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get all client documents'
    });
  }
});

// GET /clients/:id/form-data - Get client form data
router.get('/:id/form-data', async (req: Request, res: Response) => {
  try {
    const clientId = req.params.id;
    
    // Check if client exists
    const client = await clientDb.getClient(clientId);
    if (!client) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Client not found'
      });
    }
    
    // For non-admin users, check if they have any steps assigned for this client
    if (req.user!.role !== 'admin') {
      const hasAccess = await clientDb.hasUserAnyStepForClient(req.user!.userId, clientId);
      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Access denied'
        });
      }
    }
    
    // Get query parameters for filtering
    const stepId = req.query.stepId as string;
    const subStepId = req.query.subStepId as string;
    const fieldName = req.query.fieldName as string;
    
    const formData = await clientDb.getClientFormDataByField(clientId, stepId, subStepId, fieldName);
    
    res.status(200).json({
      success: true,
      data: formData
    });
  } catch (error) {
    console.error('Error getting client form data:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Failed to get client form data'
    });
  }
});

export default router;
