import React from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Cancel as CancelIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Timer as TimerIcon
} from '@mui/icons-material';
import { BatchProgress } from '../shared/types';

interface BatchProgressIndicatorProps {
  progress: BatchProgress;
  isProcessing: boolean;
  canCancel: boolean;
  onCancel: () => void;
  processingMessage?: string;
}

const BatchProgressIndicator: React.FC<BatchProgressIndicatorProps> = ({
  progress,
  isProcessing,
  canCancel,
  onCancel,
  processingMessage = 'Processing batches...'
}) => {
  // Format time remaining
  const formatTimeRemaining = (ms?: number) => {
    if (!ms) return 'Calculating...';
    
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s remaining`;
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s remaining`;
  };

  // Get status color based on progress
  const getStatusColor = (): 'success' | 'primary' | 'secondary' => {
    if (progress.isComplete) return 'success';
    if (isProcessing) return 'primary';
    return 'secondary';
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {progress.isComplete ? (
              <CheckCircleIcon color="success" />
            ) : isProcessing ? (
              <TimerIcon color="primary" />
            ) : (
              <WarningIcon color="warning" />
            )}
            {progress.isComplete ? 'Processing Complete' : processingMessage}
          </Typography>
          
          {canCancel && isProcessing && (
            <Tooltip title="Cancel processing">
              <IconButton onClick={onCancel} color="error" size="small">
                <CancelIcon />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Progress Bar */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Batch {progress.currentBatch} of {progress.totalBatches}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progress.percentage.toFixed(1)}%
            </Typography>
          </Box>
          
          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            color={getStatusColor()}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Progress Details */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
          <Chip
            size="small"
            label={`${progress.processedItems} / ${progress.totalItems} items`}
            color="primary"
            variant="outlined"
          />
          
          {progress.estimatedTimeRemainingMs && isProcessing && (
            <Chip
              size="small"
              label={formatTimeRemaining(progress.estimatedTimeRemainingMs)}
              color="info"
              variant="outlined"
              icon={<TimerIcon />}
            />
          )}
        </Box>

        {/* Status Message */}
        <Typography variant="body2" color="text.secondary">
          {progress.isComplete
            ? `Successfully processed all ${progress.totalItems} items in ${progress.totalBatches} batches.`
            : isProcessing
            ? `Processing items ${Math.max(1, (progress.currentBatch - 1) * Math.ceil(progress.totalItems / progress.totalBatches))} to ${Math.min(progress.processedItems, progress.totalItems)}...`
            : 'Ready to start processing.'
          }
        </Typography>
      </CardContent>
    </Card>
  );
};

export default BatchProgressIndicator;
