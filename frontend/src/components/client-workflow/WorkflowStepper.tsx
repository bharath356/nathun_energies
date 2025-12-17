import React, { useState, useEffect } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  StepContent as MuiStepContent,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as PendingIcon,
  PlayCircle as InProgressIcon,
  Warning as OverdueIcon,
  Pause as OnHoldIcon,
  Edit as EditIcon,
  Assignment as AssignmentIcon
} from '@mui/icons-material';
import { ClientStep, ClientSubStep, User } from '../../shared/types';
import StepContentComponent from './StepContent';

interface WorkflowStepperProps {
  clientId: string;
  steps: ClientStep[];
  subSteps: ClientSubStep[];
  assigneeInfo: Record<string, User>;
  allUsers?: User[]; // Add all users for the dropdown
  onStepUpdate: (stepId: string, updates: Partial<ClientStep>) => void;
  onSubStepUpdate: (subStepId: string, updates: Partial<ClientSubStep>) => void;
  isLoading?: boolean;
}

const WorkflowStepper: React.FC<WorkflowStepperProps> = ({
  clientId,
  steps,
  subSteps,
  assigneeInfo,
  allUsers = [],
  onStepUpdate,
  onSubStepUpdate,
  isLoading = false
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeStep, setActiveStep] = useState(0);

  // Sort steps by step number
  const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

  // Find the current active step (first non-completed step)
  useEffect(() => {
    const currentStepIndex = sortedSteps.findIndex(step => step.status !== 'completed');
    setActiveStep(currentStepIndex >= 0 ? currentStepIndex : sortedSteps.length - 1);
  }, [steps]);

  const getStepIcon = (step: ClientStep) => {
    const isOverdue = new Date(step.dueDate) < new Date() && step.status !== 'completed';
    
    switch (step.status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: theme.palette.success.main }} />;
      case 'in-progress':
        return <InProgressIcon sx={{ color: theme.palette.primary.main }} />;
      case 'on-hold':
        return <OnHoldIcon sx={{ color: theme.palette.warning.main }} />;
      case 'overdue':
      case 'pending':
        return isOverdue ? 
          <OverdueIcon sx={{ color: theme.palette.error.main }} /> :
          <PendingIcon sx={{ color: theme.palette.grey[400] }} />;
      default:
        return <PendingIcon sx={{ color: theme.palette.grey[400] }} />;
    }
  };

  const getStepColor = (step: ClientStep) => {
    const isOverdue = new Date(step.dueDate) < new Date() && step.status !== 'completed';
    
    if (isOverdue) return theme.palette.error.main;
    
    switch (step.status) {
      case 'completed':
        return theme.palette.success.main;
      case 'in-progress':
        return theme.palette.primary.main;
      case 'on-hold':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[400];
    }
  };

  const getStatusChip = (step: ClientStep) => {
    const isOverdue = new Date(step.dueDate) < new Date() && step.status !== 'completed';
    const status = isOverdue ? 'overdue' : step.status;
    
    const statusConfig = {
      completed: { label: 'Completed', color: 'success' as const },
      'in-progress': { label: 'In Progress', color: 'primary' as const },
      pending: { label: 'Pending', color: 'default' as const },
      'on-hold': { label: 'On Hold', color: 'warning' as const },
      overdue: { label: 'Overdue', color: 'error' as const }
    };

    const config = statusConfig[status] || statusConfig.pending;
    
    return (
      <Chip
        label={config.label}
        color={config.color}
        size="small"
        sx={{ ml: 1 }}
      />
    );
  };

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

  const handleStepClick = (stepIndex: number) => {
    setActiveStep(stepIndex);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading workflow...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', p: 2 }}>
      {/* Client Workflow Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Client Workflow Progress
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track and manage the complete client onboarding process through all required steps.
          </Typography>
        </CardContent>
      </Card>

      {/* Stepper Component */}
      <Stepper
        activeStep={activeStep}
        orientation={isMobile ? 'vertical' : 'horizontal'}
        alternativeLabel={!isMobile}
        sx={{ mb: 4 }}
      >
        {sortedSteps.map((step, index) => {
          const stepSubSteps = subSteps.filter(ss => ss.stepId === step.stepId);
          const isStepClickable = true; // Allow clicking any step
          
          return (
            <Step key={step.stepId} completed={step.status === 'completed'}>
              <StepLabel
                icon={getStepIcon(step)}
                error={step.status === 'overdue' || (new Date(step.dueDate) < new Date() && step.status !== 'completed')}
                onClick={() => handleStepClick(index)}
                sx={{
                  cursor: 'pointer',
                  '& .MuiStepLabel-label': {
                    color: getStepColor(step),
                    fontWeight: index === activeStep ? 'bold' : 'normal'
                  }
                }}
              >
                <Box>
                  <Typography variant="subtitle1" component="div">
                    {step.stepName}
                    {getStatusChip(step)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Due: {formatDate(step.dueDate)}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                    <AssignmentIcon sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                    <Typography variant="caption" color="text.secondary">
                      {getAssigneeName(step.assignedTo)}
                    </Typography>
                  </Box>
                  {stepSubSteps.length > 0 && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {stepSubSteps.filter(ss => ss.status === 'completed').length}/{stepSubSteps.length} sub-steps completed
                    </Typography>
                  )}
                </Box>
              </StepLabel>
              
              {isMobile && (
                <MuiStepContent>
                  <StepContentComponent
                    step={step}
                    subSteps={stepSubSteps}
                    assigneeInfo={assigneeInfo}
                    allUsers={allUsers}
                    onStepUpdate={onStepUpdate}
                    onSubStepUpdate={onSubStepUpdate}
                    isActive={index === activeStep}
                  />
                </MuiStepContent>
              )}
            </Step>
          );
        })}
      </Stepper>

      {/* Desktop Step Content */}
      {!isMobile && sortedSteps[activeStep] && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <StepContentComponent
              step={sortedSteps[activeStep]}
              subSteps={subSteps.filter(ss => ss.stepId === sortedSteps[activeStep].stepId)}
              assigneeInfo={assigneeInfo}
              allUsers={allUsers}
              onStepUpdate={onStepUpdate}
              onSubStepUpdate={onSubStepUpdate}
              isActive={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Progress Summary */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Progress Summary
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Completed Steps
              </Typography>
              <Typography variant="h6" color="success.main">
                {steps.filter(s => s.status === 'completed').length}/{steps.length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                In Progress
              </Typography>
              <Typography variant="h6" color="primary.main">
                {steps.filter(s => s.status === 'in-progress').length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Overdue
              </Typography>
              <Typography variant="h6" color="error.main">
                {steps.filter(s => new Date(s.dueDate) < new Date() && s.status !== 'completed').length}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Total Sub-steps
              </Typography>
              <Typography variant="h6">
                {subSteps.filter(ss => ss.status === 'completed').length}/{subSteps.length}
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default WorkflowStepper;
