import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Collapse,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Timer as TimerIcon,
  TrendingUp as TrendingUpIcon
} from '@mui/icons-material';
import { BulkCreatePhoneNumbersResponse, BatchResult } from '../shared/types';

interface BatchResultsDisplayProps {
  results: BulkCreatePhoneNumbersResponse;
  isComplete: boolean;
}

const BatchResultsDisplay: React.FC<BatchResultsDisplayProps> = ({
  results,
  isComplete
}) => {
  const [expandedSections, setExpandedSections] = useState({
    batchDetails: false,
    created: false,
    duplicates: false,
    invalid: false
  });

  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Format processing time
  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  };

  // Calculate success rate
  const successRate = results.total > 0 ? (results.created.length / results.total) * 100 : 0;

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUpIcon color="primary" />
          Batch Processing Results
        </Typography>

        {/* Overall Summary */}
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 3 }}>
          <Chip
            icon={<CheckCircleIcon />}
            label={`${results.created.length} Created`}
            color="success"
            variant="outlined"
          />
          <Chip
            icon={<WarningIcon />}
            label={`${results.duplicates.length} Duplicates`}
            color="warning"
            variant="outlined"
          />
          <Chip
            icon={<ErrorIcon />}
            label={`${results.invalid.length} Invalid`}
            color="error"
            variant="outlined"
          />
          <Chip
            icon={<TimerIcon />}
            label={formatProcessingTime(results.processingTimeMs)}
            color="info"
            variant="outlined"
          />
          <Chip
            label={`${successRate.toFixed(1)}% Success Rate`}
            color={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'}
            variant="outlined"
          />
        </Box>

        {/* Processing Summary */}
        <Alert severity={successRate >= 90 ? 'success' : successRate >= 70 ? 'warning' : 'error'} sx={{ mb: 2 }}>
          <Typography variant="body2">
            Processed {results.total} items in {results.totalBatches} batches of {results.batchSize} items each. 
            {isComplete 
              ? ` Processing completed in ${formatProcessingTime(results.processingTimeMs)}.`
              : ' Processing in progress...'
            }
          </Typography>
        </Alert>

        <Divider sx={{ my: 2 }} />

        {/* Batch Details */}
        {results.batchResults.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mb: 1 }} 
              onClick={() => toggleSection('batchDetails')}
            >
              <IconButton size="small">
                {expandedSections.batchDetails ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="subtitle1">
                Batch-by-Batch Details ({results.batchResults.length} batches)
              </Typography>
            </Box>
            
            <Collapse in={expandedSections.batchDetails}>
              <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Batch</TableCell>
                      <TableCell align="right">Size</TableCell>
                      <TableCell align="right">Created</TableCell>
                      <TableCell align="right">Duplicates</TableCell>
                      <TableCell align="right">Invalid</TableCell>
                      <TableCell align="right">Errors</TableCell>
                      <TableCell align="right">Time</TableCell>
                      <TableCell align="right">Success Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.batchResults.map((batch) => {
                      const batchSuccessRate = batch.batchSize > 0 ? (batch.created / batch.batchSize) * 100 : 0;
                      return (
                        <TableRow key={batch.batchNumber}>
                          <TableCell>#{batch.batchNumber}</TableCell>
                          <TableCell align="right">{batch.batchSize}</TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={batch.created} color="success" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={batch.duplicates} color="warning" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={batch.invalid} color="error" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">
                            <Chip size="small" label={batch.errors} color="error" variant="outlined" />
                          </TableCell>
                          <TableCell align="right">{formatProcessingTime(batch.processingTimeMs)}</TableCell>
                          <TableCell align="right">
                            <Typography 
                              variant="body2" 
                              color={batchSuccessRate >= 90 ? 'success.main' : batchSuccessRate >= 70 ? 'warning.main' : 'error.main'}
                            >
                              {batchSuccessRate.toFixed(1)}%
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Collapse>
          </Box>
        )}

        {/* Created Numbers */}
        {results.created.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
              onClick={() => toggleSection('created')}
            >
              <IconButton size="small">
                {expandedSections.created ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="subtitle2" color="success.main">
                Successfully Created ({results.created.length})
              </Typography>
            </Box>
            <Collapse in={expandedSections.created}>
              <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto', mt: 1 }}>
                {results.created.map((phone, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {phone.phoneNumber} {phone.name && `(${phone.name})`} - {phone.areaCode}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Duplicate Numbers */}
        {results.duplicates.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
              onClick={() => toggleSection('duplicates')}
            >
              <IconButton size="small">
                {expandedSections.duplicates ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="subtitle2" color="warning.main">
                Duplicates/Already Exist ({results.duplicates.length})
              </Typography>
            </Box>
            <Collapse in={expandedSections.duplicates}>
              <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto', mt: 1 }}>
                {results.duplicates.map((phone, index) => (
                  <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace', mb: 0.5 }}>
                    {phone}
                  </Typography>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}

        {/* Invalid Numbers */}
        {results.invalid.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box 
              sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} 
              onClick={() => toggleSection('invalid')}
            >
              <IconButton size="small">
                {expandedSections.invalid ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
              <Typography variant="subtitle2" color="error.main">
                Invalid Numbers ({results.invalid.length})
              </Typography>
            </Box>
            <Collapse in={expandedSections.invalid}>
              <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto', mt: 1 }}>
                {results.invalid.map((item, index) => (
                  <Box key={index} sx={{ mb: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                      {item.phoneNumber}
                    </Typography>
                    <Typography variant="caption" color="error" sx={{ ml: 2 }}>
                      {item.error}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default BatchResultsDisplay;
