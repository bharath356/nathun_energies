import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Checkbox,
  IconButton,
  Divider,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Assignment as AssignmentIcon,
  Schedule as ScheduleIcon,
  Description as DescriptionIcon,
  Person as PersonIcon
} from '@mui/icons-material';
import { ClientStep, ClientSubStep, User, Step1ClientData } from '../../shared/types';
import Step1Form from './Step1Form';
import Step2Form from './Step2Form';
import Step3Form from './Step3Form';
import Step4Form from './Step4Form';
import Step5Form from './Step5Form';

interface StepContentProps {
  step: ClientStep;
  subSteps: ClientSubStep[];
  assigneeInfo: Record<string, User>;
  allUsers?: User[]; // Add all users for the dropdown
  onStepUpdate: (stepId: string, updates: Partial<ClientStep>) => void;
  onSubStepUpdate: (subStepId: string, updates: Partial<ClientSubStep>) => void;
  isActive: boolean;
}

const StepContent: React.FC<StepContentProps> = ({
  step,
  subSteps,
  assigneeInfo,
  allUsers = [],
  onStepUpdate,
  onSubStepUpdate,
  isActive
}) => {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editData, setEditData] = useState({
    status: step.status,
    assignedTo: step.assignedTo,
    dueDate: step.dueDate,
    estimatedDuration: step.estimatedDuration,
    notes: ''
  });

  // Update editData whenever the step changes or dialog opens
  useEffect(() => {
    if (editDialogOpen || step) {
      setEditData({
        status: step.status,
        assignedTo: step.assignedTo,
        dueDate: step.dueDate,
        estimatedDuration: step.estimatedDuration,
        notes: ''
      });
    }
  }, [step.status, step.assignedTo, step.dueDate, step.estimatedDuration, editDialogOpen]);

  const sortedSubSteps = [...subSteps].sort((a, b) => a.sortOrder - b.sortOrder);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getAssigneeName = (userId: string) => {
    const user = assigneeInfo[userId];
    return user ? `${user.firstName} ${user.lastName}` : 'Unknown User';
  };

  const isOverdue = new Date(step.dueDate) < new Date() && step.status !== 'completed';

  const handleSubStepToggle = (subStep: ClientSubStep) => {
    const newStatus = subStep.status === 'completed' ? 'pending' : 'completed';
    onSubStepUpdate(subStep.subStepId, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined
    });
  };

  const handleEditSubmit = () => {
    const updates: Partial<ClientStep> = {
      status: editData.status,
      assignedTo: editData.assignedTo,
      dueDate: editData.dueDate,
      estimatedDuration: editData.estimatedDuration
    };

    // If assignee is being changed and status wasn't explicitly changed to completed,
    // reset to pending status (unless the user explicitly set a different status)
    const isAssigneeChanged = editData.assignedTo !== step.assignedTo;
    const isStatusExplicitlyChanged = editData.status !== step.status;
    
    if (isAssigneeChanged && !isStatusExplicitlyChanged && step.status !== 'pending') {
      // Reset to pending when reassigning, unless user explicitly chose a different status
      updates.status = 'pending';
      // Clear completedAt if it was previously completed
      if (step.completedAt) {
        updates.completedAt = undefined;
      }
    } else if (editData.status === 'completed' && step.status !== 'completed') {
      // Only set completedAt if status is being changed TO completed (not if it was already completed)
      updates.completedAt = new Date().toISOString();
    } else if (editData.status !== 'completed' && step.status === 'completed') {
      // Clear completedAt if status is being changed FROM completed
      updates.completedAt = undefined;
    }

    onStepUpdate(step.stepId, updates);
    setEditDialogOpen(false);
  };

  const canStartStep = step.status === 'pending' && (step.dependencies || []).every((depId: string) => {
    // In a real implementation, you'd check if dependency steps are completed
    return true;
  });

  const canCompleteStep = step.status === 'in-progress' || (step.status === 'pending' && canStartStep);

  return (
    <Box>
      {/* Step Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h6" gutterBottom>
            {step.stepName}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            {step.description}
          </Typography>
          
          {isOverdue && (
            <Alert severity="error" sx={{ mb: 2 }}>
              This step is overdue! Due date was {formatDate(step.dueDate)}
            </Alert>
          )}
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <IconButton
            onClick={() => setEditDialogOpen(true)}
            size="small"
            color="primary"
          >
            <EditIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Step Details */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Card variant="outlined" sx={{ minWidth: 200, flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <ScheduleIcon color="action" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Due Date
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {formatDate(step.dueDate)}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 200, flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <PersonIcon color="action" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Assigned To
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {getAssigneeName(step.assignedTo)}
            </Typography>
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 200, flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <AssignmentIcon color="action" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Status
            </Typography>
            <Chip
              label={step.status.replace('-', ' ').toUpperCase()}
              color={
                step.status === 'completed' ? 'success' :
                step.status === 'in-progress' ? 'primary' :
                step.status === 'on-hold' ? 'warning' :
                isOverdue ? 'error' : 'default'
              }
              size="small"
            />
          </CardContent>
        </Card>
        
        <Card variant="outlined" sx={{ minWidth: 200, flex: 1 }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <DescriptionIcon color="action" sx={{ mb: 1 }} />
            <Typography variant="body2" color="text.secondary">
              Duration
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {step.estimatedDuration} days
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Sub-steps */}
      {sortedSubSteps.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Sub-steps ({sortedSubSteps.filter(ss => ss.status === 'completed').length}/{sortedSubSteps.length} completed)
          </Typography>
          <List>
            {sortedSubSteps.map((subStep, index) => (
              <React.Fragment key={subStep.subStepId}>
                <ListItem>
                  <ListItemIcon>
                    <Checkbox
                      checked={subStep.status === 'completed'}
                      onChange={() => handleSubStepToggle(subStep)}
                      color="primary"
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={subStep.subStepName}
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Due: {formatDate(subStep.dueDate)} • Assigned to: {getAssigneeName(subStep.assignedTo)}
                        </Typography>
                        {subStep.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {subStep.description}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Chip
                      label={subStep.status === 'completed' ? 'Completed' : 'Pending'}
                      color={subStep.status === 'completed' ? 'success' : 'default'}
                      size="small"
                    />
                  </ListItemSecondaryAction>
                </ListItem>
                {index < sortedSubSteps.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </Box>
      )}

      {/* Step Forms */}
      {step.stepNumber === 1 && isActive && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Step1Form 
            clientId={step.clientId}
            onDataChange={(data) => {
              console.log('Step 1 data updated:', data);
            }}
          />
        </Box>
      )}

      {step.stepNumber === 2 && isActive && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Step2Form 
            clientId={step.clientId}
            onDataChange={(data: any) => {
              console.log('Step 2 data updated:', data);
            }}
          />
        </Box>
      )}

      {step.stepNumber === 3 && isActive && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Step3Form 
            clientId={step.clientId}
            onDataChange={(data: any) => {
              console.log('Step 3 data updated:', data);
            }}
          />
        </Box>
      )}

      {step.stepNumber === 4 && isActive && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Step4Form 
            clientId={step.clientId}
            onDataChange={(data: any) => {
              console.log('Step 4 data updated:', data);
            }}
          />
        </Box>
      )}

      {step.stepNumber === 5 && isActive && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 3 }} />
          <Step5Form 
            clientId={step.clientId}
            onDataChange={(data: any) => {
              console.log('Step 5 data updated:', data);
            }}
          />
        </Box>
      )}

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        {step.status === 'pending' && canStartStep && (
          <Button
            variant="contained"
            color="primary"
            onClick={() => onStepUpdate(step.stepId, { status: 'in-progress' })}
          >
            Start Step
          </Button>
        )}
        
        {canCompleteStep && (
          <Button
            variant="contained"
            color="success"
            onClick={() => onStepUpdate(step.stepId, { 
              status: 'completed',
              completedAt: new Date().toISOString()
            })}
          >
            Mark Complete
          </Button>
        )}
        
        {step.status === 'in-progress' && (
          <Button
            variant="outlined"
            color="warning"
            onClick={() => onStepUpdate(step.stepId, { status: 'on-hold' })}
          >
            Put On Hold
          </Button>
        )}
        
        {step.status === 'on-hold' && (
          <Button
            variant="outlined"
            color="primary"
            onClick={() => onStepUpdate(step.stepId, { status: 'in-progress' })}
          >
            Resume
          </Button>
        )}
      </Box>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Step</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editData.status}
                label="Status"
                onChange={(e) => setEditData({ ...editData, status: e.target.value as any })}
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="on-hold">On Hold</MenuItem>
              </Select>
            </FormControl>
            
            <FormControl fullWidth>
              <InputLabel>Assigned To</InputLabel>
              <Select
                value={editData.assignedTo}
                label="Assigned To"
                onChange={(e) => setEditData({ ...editData, assignedTo: e.target.value })}
              >
                {allUsers.length > 0 ? (
                  allUsers.map((user) => (
                    <MenuItem key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))
                ) : (
                  Object.values(assigneeInfo).map((user) => (
                    <MenuItem key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
            
            <TextField
              label="Due Date"
              type="date"
              value={editData.dueDate}
              onChange={(e) => setEditData({ ...editData, dueDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            
            <TextField
              label="Estimated Duration (days)"
              type="number"
              value={editData.estimatedDuration ?? ''}
              onChange={(e) => setEditData({ ...editData, estimatedDuration: e.target.value === '' ? 0 : parseInt(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 1 }}
              placeholder="Enter duration"
              fullWidth
            />
            
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={editData.notes}
              onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
              placeholder="Add any notes about this update..."
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditSubmit} variant="contained">Save Changes</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StepContent;
