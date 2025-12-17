import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Tabs,
  Tab,
  Alert,
  CircularProgress,
  Chip,
  Paper,
  Divider,
  Stepper,
  Step,
  StepLabel,
  IconButton,
  Collapse
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Upload as UploadIcon,
  Download as DownloadIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';
import Papa from 'papaparse';
import { apiService } from '../services/api';
import { BulkCreatePhoneNumbersResponse, CreatePhoneNumberRequest, BatchProgress } from '../shared/types';
import BatchProgressIndicator from './BatchProgressIndicator';
import BatchResultsDisplay from './BatchResultsDisplay';
import LoadingButton from './LoadingButton';

interface AddPhoneNumberDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`phone-number-tabpanel-${index}`}
      aria-labelledby={`phone-number-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 2 }}>{children}</Box>}
    </div>
  );
}

const AddPhoneNumberDialog: React.FC<AddPhoneNumberDialogProps> = ({
  open,
  onClose,
  onSuccess
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Single number form
  const [singleFormData, setSingleFormData] = useState({
    phoneNumber: '',
    name: '',
    address: '',
    areaCode: ''
  });
  const [singleNumberError, setSingleNumberError] = useState<string | null>(null);
  
  // Bulk import form
  const [bulkNumbers, setBulkNumbers] = useState('');
  const [csvData, setCsvData] = useState<Array<{
    phoneNumber: string;
    name?: string;
    address?: string;
    areaCode: string;
  }>>([]);
  const [bulkResult, setBulkResult] = useState<BulkCreatePhoneNumbersResponse | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [expandedSections, setExpandedSections] = useState({
    created: false,
    duplicates: false,
    invalid: false
  });

  // Client-side batch processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState<BatchProgress | null>(null);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [liveBatchResults, setLiveBatchResults] = useState<BulkCreatePhoneNumbersResponse[]>([]);
  const [currentFileName, setCurrentFileName] = useState<string | null>(null);

  // Validation for Indian phone numbers
  const validateIndianPhoneNumber = (phoneNumber: string): { isValid: boolean; error?: string } => {
    if (!phoneNumber.trim()) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove spaces, dashes, parentheses, and other formatting characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)\+]/g, '');
    
    // Handle country code prefixes (91 or +91)
    let normalized = cleaned;
    if (normalized.startsWith('91') && normalized.length === 12) {
      normalized = normalized.substring(2);
    }
    
    // Validate 10-digit format starting with 6, 7, 8, or 9 (valid Indian mobile prefixes)
    if (!/^[6-9]\d{9}$/.test(normalized)) {
      return {
        isValid: false,
        error: 'Invalid Indian mobile number format. Must be 10 digits starting with 6, 7, 8, or 9'
      };
    }
    
    return { isValid: true };
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError(null);
    setSingleNumberError(null);
  };

  // Handle single form field changes
  const handleSingleFormChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSingleFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'phoneNumber' && value.trim()) {
      const validation = validateIndianPhoneNumber(value);
      setSingleNumberError(validation.isValid ? null : validation.error || null);
    } else if (field === 'phoneNumber') {
      setSingleNumberError(null);
    }
  };

  // Handle single number creation
  const handleCreateSingleNumber = async () => {
    setError(null);

    if (!singleFormData.phoneNumber.trim()) {
      setSingleNumberError('Phone number is required');
      throw new Error('Phone number is required');
    }

    if (!singleFormData.areaCode.trim()) {
      setError('Area code is required');
      throw new Error('Area code is required');
    }

    const validation = validateIndianPhoneNumber(singleFormData.phoneNumber);
    if (!validation.isValid) {
      setSingleNumberError(validation.error || 'Invalid phone number');
      throw new Error(validation.error || 'Invalid phone number');
    }

    try {
      const requestData: CreatePhoneNumberRequest = {
        phoneNumber: singleFormData.phoneNumber,
        name: singleFormData.name || undefined,
        address: singleFormData.address || undefined,
        areaCode: singleFormData.areaCode
      };

      await apiService.createPhoneNumber(requestData);
      
      // Reset form and close dialog
      setSingleFormData({ phoneNumber: '', name: '', address: '', areaCode: '' });
      setSingleNumberError(null);
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error creating phone number:', error);
      setError(error?.response?.data?.message || 'Failed to create phone number');
      throw error; // Re-throw so LoadingButton can handle the error state
    }
  };

  // Handle bulk import with client-side batching
  const handleBulkImport = async () => {
    setError(null);
    setBulkResult(null);
    setIsProcessing(false);
    setBatchProgress(null);
    setLiveBatchResults([]);

    if (!bulkNumbers.trim()) {
      setError('Please enter CSV data');
      throw new Error('Please enter CSV data');
    }

    try {
      // Parse CSV data using Papa Parse
      const parseResult = Papa.parse(bulkNumbers.trim(), {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase()
      });

      if (parseResult.errors.length > 0) {
        setError(`CSV parsing error: ${parseResult.errors[0].message}`);
        throw new Error(`CSV parsing error: ${parseResult.errors[0].message}`);
      }

      const csvData = parseResult.data as Array<{
        phonenumber?: string;
        name?: string;
        address?: string;
        areacode?: string;
      }>;

      if (csvData.length === 0) {
        setError('No valid data found in CSV');
        throw new Error('No valid data found in CSV');
      }

      // Convert CSV data to the format expected by the backend
      const phoneNumbersArray = csvData.map((row, index) => {
        const phoneNumber = row.phonenumber || '';
        const name = row.name || undefined;
        const address = row.address || undefined;
        const areaCode = row.areacode || '';

        // Validate required fields
        if (!phoneNumber.trim()) {
          throw new Error(`Row ${index + 2}: Phone number is required`);
        }
        if (!areaCode.trim()) {
          throw new Error(`Row ${index + 2}: Area code is required`);
        }

        return {
          phoneNumber: phoneNumber.trim(),
          name: name?.trim() || undefined,
          address: address?.trim() || undefined,
          areaCode: areaCode.trim()
        };
      });

      if (phoneNumbersArray.length > 10000) {
        setError('Maximum 10000 phone numbers allowed per request');
        throw new Error('Maximum 10000 phone numbers allowed per request');
      }

      // Start client-side batch processing
      setIsProcessing(true);
      
      // Create abort controller for cancellation
      const controller = new AbortController();
      setAbortController(controller);

      // Use client-side batching method
      const result = await apiService.bulkCreatePhoneNumbersWithClientBatching(
        phoneNumbersArray,
        {
          batchSize: 50,
          onProgress: (progress) => {
            setBatchProgress({
              ...progress,
              estimatedTimeRemainingMs: undefined // Will be calculated if needed
            });
          },
          onBatchComplete: (batchResult, batchNumber) => {
            console.log(`Batch ${batchNumber} completed:`, batchResult);
            setLiveBatchResults(prev => [...prev, batchResult]);
          },
          onError: (error, batchNumber) => {
            console.error(`Batch ${batchNumber} failed:`, error);
            // Error handling is done in the API service
          },
          signal: controller.signal
        }
      );
      
      setBulkResult(result);
      setShowResults(true);
      setIsProcessing(false);
      setAbortController(null);
      
      // Don't call onSuccess immediately - let user see results first
      // onSuccess will be called when they close the dialog
    } catch (error: any) {
      console.error('Error bulk creating phone numbers:', error);
      setIsProcessing(false);
      setAbortController(null);
      
      if (error.message === 'Operation cancelled by user') {
        setError('Import cancelled by user');
      } else if (error.message && error.message.includes('Row')) {
        setError(error.message);
      } else {
        setError(error?.response?.data?.message || 'Failed to create phone numbers');
      }
      
      throw error; // Re-throw so LoadingButton can handle the error state
    }
  };

  // Handle cancellation of batch processing
  const handleCancelProcessing = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsProcessing(false);
      setError('Import cancelled by user');
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the filename for display during processing
    setCurrentFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setBulkNumbers(content);
    };
    reader.readAsText(file);
  };

  // Toggle result section
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Reset dialog state
  const handleClose = () => {
    // Call onSuccess if there were any successful imports
    if (bulkResult && bulkResult.created.length > 0) {
      onSuccess();
    }
    
    setSingleFormData({ phoneNumber: '', name: '', address: '', areaCode: '' });
    setSingleNumberError(null);
    setBulkNumbers('');
    setCsvData([]);
    setBulkResult(null);
    setShowResults(false);
    setError(null);
    setTabValue(0);
    setExpandedSections({ created: false, duplicates: false, invalid: false });
    setCurrentFileName(null);
    onClose();
  };

  // Get live count of numbers in bulk textarea
  const getBulkNumbersCount = () => {
    if (!bulkNumbers.trim()) return 0;
    return bulkNumbers.split('\n').filter(line => line.trim().length > 0).length;
  };

  // Generate sample CSV file content
  const generateSampleFile = () => {
    const csvData = [
      ['phoneNumber', 'name', 'address', 'areaCode'],
      ['9876543210', 'John Doe', '123 Main St Delhi', 'DEL001'],
      ['9876543211', 'Jane Smith', '456 Park Ave Mumbai', 'MUM002'],
      ['9876543212', '', '789 Oak St Bangalore', 'BLR003'],
      ['7890123456', 'Alice Johnson', '', 'CHN004'],
      ['8901234567', 'Bob Wilson', '321 Pine St Pune', 'PUN005'],
      ['6789012345', '', '', 'HYD006']
    ];
    
    return Papa.unparse(csvData);
  };

  // Handle sample file download
  const handleDownloadSample = () => {
    try {
      const content = generateSampleFile();
      const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'phone_numbers_template.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading sample file:', error);
      setError('Failed to download sample file');
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Add Phone Numbers
      </DialogTitle>
      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Single Number" />
            <Tab label="Bulk Import" />
          </Tabs>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Phone Number *"
              value={singleFormData.phoneNumber}
              onChange={handleSingleFormChange('phoneNumber')}
              placeholder="Enter 10-digit mobile number (e.g., 9876543210)"
              error={!!singleNumberError}
              helperText={singleNumberError || 'Supports formats: 9876543210, +919876543210, 91-9876543210'}
              fullWidth
              disabled={loading}
              required
            />
            
            <TextField
              label="Name"
              value={singleFormData.name}
              onChange={handleSingleFormChange('name')}
              placeholder="Contact name (optional)"
              fullWidth
              disabled={loading}
            />
            
            <TextField
              label="Address"
              value={singleFormData.address}
              onChange={handleSingleFormChange('address')}
              placeholder="Contact address (optional)"
              multiline
              rows={2}
              fullWidth
              disabled={loading}
            />
            
            <TextField
              label="Area Code *"
              value={singleFormData.areaCode}
              onChange={handleSingleFormChange('areaCode')}
              placeholder="e.g., DEL001, MUM002"
              fullWidth
              disabled={loading}
              required
            />
            
            <Alert severity="info">
              Phone number and area code are required. Name and address are optional.
            </Alert>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Typography variant="body2" color="text.secondary">
                Numbers to import: {getBulkNumbersCount()}
              </Typography>
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadSample}
                disabled={loading}
              >
                Download Sample
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadIcon />}
                component="label"
                disabled={loading}
              >
                Upload File
                <input
                  type="file"
                  accept=".txt,.csv"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>

            <TextField
              label="CSV Data"
              value={bulkNumbers}
              onChange={(e) => setBulkNumbers(e.target.value)}
              placeholder={`Paste CSV data with headers:
phoneNumber,name,address,areaCode
9876543210,John Doe,123 Main St Delhi,DEL001
9876543211,Jane Smith,456 Park Ave Mumbai,MUM002
9876543212,,789 Oak St Bangalore,BLR003`}
              multiline
              rows={8}
              fullWidth
              disabled={loading}
            />

            <Alert severity="info">
              Paste CSV data with headers (phoneNumber, name, address, areaCode). Download the sample file to see the correct format. Phone number and area code are required fields.
            </Alert>

            {/* Current File Being Processed */}
            {isProcessing && currentFileName && (
              <Alert severity="info" sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Processing file:
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'primary.main' }}>
                    {currentFileName}
                  </Typography>
                </Box>
              </Alert>
            )}

            {/* Batch Progress Indicator */}
            {isProcessing && batchProgress && (
              <BatchProgressIndicator
                progress={batchProgress}
                isProcessing={isProcessing}
                canCancel={!!abortController}
                onCancel={handleCancelProcessing}
                processingMessage="Processing phone numbers in batches..."
              />
            )}

            {/* Live Batch Results Display */}
            {isProcessing && liveBatchResults.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Live Processing Results
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  Results are being updated in real-time as each batch completes.
                </Alert>
                {liveBatchResults.map((result, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Batch {index + 1} Results:
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                      <Chip
                        size="small"
                        icon={<CheckCircleIcon />}
                        label={`${result.created.length} Created`}
                        color="success"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={<WarningIcon />}
                        label={`${result.duplicates.length} Duplicates`}
                        color="warning"
                        variant="outlined"
                      />
                      <Chip
                        size="small"
                        icon={<ErrorIcon />}
                        label={`${result.invalid.length} Invalid`}
                        color="error"
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            {/* Final Results Section */}
            {showResults && bulkResult && (
              <BatchResultsDisplay
                results={bulkResult}
                isComplete={!isProcessing}
              />
            )}

            {/* Legacy Results Section (fallback) */}
            {showResults && bulkResult && !bulkResult.batchResults && (
              <Paper sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Import Results
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                  <Chip
                    icon={<CheckCircleIcon />}
                    label={`${bulkResult.created.length} Created`}
                    color="success"
                    variant="outlined"
                  />
                  <Chip
                    icon={<WarningIcon />}
                    label={`${bulkResult.duplicates.length} Duplicates`}
                    color="warning"
                    variant="outlined"
                  />
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${bulkResult.invalid.length} Invalid`}
                    color="error"
                    variant="outlined"
                  />
                </Box>

                {/* Created Numbers */}
                {bulkResult.created.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleSection('created')}>
                      <IconButton size="small">
                        {expandedSections.created ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography variant="subtitle2" color="success.main">
                        Successfully Created ({bulkResult.created.length})
                      </Typography>
                    </Box>
                    <Collapse in={expandedSections.created}>
                      <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto' }}>
                        {bulkResult.created.map((phone, index) => (
                          <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {phone.phoneNumber}
                          </Typography>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Duplicate Numbers */}
                {bulkResult.duplicates.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleSection('duplicates')}>
                      <IconButton size="small">
                        {expandedSections.duplicates ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography variant="subtitle2" color="warning.main">
                        Duplicates/Already Exist ({bulkResult.duplicates.length})
                      </Typography>
                    </Box>
                    <Collapse in={expandedSections.duplicates}>
                      <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto' }}>
                        {bulkResult.duplicates.map((phone, index) => (
                          <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                            {phone}
                          </Typography>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}

                {/* Invalid Numbers */}
                {bulkResult.invalid.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }} onClick={() => toggleSection('invalid')}>
                      <IconButton size="small">
                        {expandedSections.invalid ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      </IconButton>
                      <Typography variant="subtitle2" color="error.main">
                        Invalid Numbers ({bulkResult.invalid.length})
                      </Typography>
                    </Box>
                    <Collapse in={expandedSections.invalid}>
                      <Box sx={{ ml: 4, maxHeight: 200, overflow: 'auto' }}>
                        {bulkResult.invalid.map((item, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {item.phoneNumber}
                            </Typography>
                            <Typography variant="caption" color="error">
                              {item.error}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    </Collapse>
                  </Box>
                )}
              </Paper>
            )}
          </Box>
        </TabPanel>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={handleClose} disabled={loading || isProcessing}>
          {showResults && bulkResult ? 'Close' : 'Cancel'}
        </Button>
        {!showResults && tabValue === 0 && (
          <LoadingButton
            actionId="add-single-phone-number"
            onClick={handleCreateSingleNumber}
            variant="contained"
            disabled={!singleFormData.phoneNumber.trim() || !singleFormData.areaCode.trim() || !!singleNumberError}
            loadingText="Adding..."
          >
            Add Number
          </LoadingButton>
        )}
        {!showResults && tabValue === 1 && (
          <LoadingButton
            actionId="bulk-import-phone-numbers"
            onClick={handleBulkImport}
            variant="contained"
            disabled={!bulkNumbers.trim() || isProcessing}
            loadingText="Importing..."
          >
            Import Numbers
          </LoadingButton>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default AddPhoneNumberDialog;
