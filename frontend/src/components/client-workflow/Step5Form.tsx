import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Alert,
  CircularProgress,
  TextField,
  FormControlLabel,
  Checkbox,
  Card,
  CardContent,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Save as SaveIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  AttachFile as FileIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  Step5BankSubsidyData,
  SaveStep5DataRequest,
  Step5DocumentFile,
  Step5DocumentCategory,
  STEP5_DOCUMENT_CATEGORIES
} from '../../shared/types';

interface Step5FormProps {
  clientId: string;
  onDataChange?: (data: Step5BankSubsidyData) => void;
}

interface UploadProgress {
  [category: string]: {
    uploading: boolean;
    progress: number;
    error?: string;
  };
}

interface PreviewState {
  open: boolean;
  file?: Step5DocumentFile;
  category?: Step5DocumentCategory;
  loading: boolean;
  previewUrl?: string;
  error?: string;
}

const Step5Form: React.FC<Step5FormProps> = ({ clientId, onDataChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Local data (current form state)
  const [localData, setLocalData] = useState<Step5BankSubsidyData | null>(null);
  
  // File upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [previewDialog, setPreviewDialog] = useState<PreviewState>({
    open: false,
    loading: false
  });

  // Load Step 5 data on component mount
  useEffect(() => {
    loadStep5Data();
  }, [clientId]);

  const loadStep5Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStep5Data(clientId);
      setLocalData(data);
      
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error: any) {
      console.error('Error loading Step 5 data:', error);
      setError('Failed to load Step 5 data');
    } finally {
      setLoading(false);
    }
  };

  const saveStep5Data = async (updates: SaveStep5DataRequest) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedData = await apiService.updateStep5Data(clientId, updates);
      setLocalData(updatedData);
      
      if (onDataChange) {
        onDataChange(updatedData);
      }
      
      setSuccess('Data saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving Step 5 data:', error);
      setError(error.response?.data?.message || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  // File upload handlers
  const handleFileUpload = useCallback(async (category: Step5DocumentCategory, files: FileList) => {
    const fileArray = Array.from(files);
    const categoryConfig = STEP5_DOCUMENT_CATEGORIES[category];
    
    // Validate file count
    const currentCount = localData?.[category]?.length || 0;
    const totalCount = currentCount + fileArray.length;
    
    if (totalCount > categoryConfig.maxFiles) {
      alert(`Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`);
      return;
    }

    // Validate file types and sizes
    const validFiles = fileArray.filter(file => {
      const isValidType = file.type === 'application/pdf' || file.type.startsWith('image/');
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        alert(`${file.name}: Only PDF and image files are allowed`);
        return false;
      }
      
      if (!isValidSize) {
        alert(`${file.name}: File size must be less than 10MB`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) return;

    // Set upload progress
    setUploadProgress(prev => ({
      ...prev,
      [category]: { uploading: true, progress: 0 }
    }));

    try {
      const result = await apiService.uploadStep5Documents(clientId, category, validFiles);
      
      if (result.uploadedFiles && result.uploadedFiles.length > 0) {
        // Update progress to complete
        setUploadProgress(prev => ({
          ...prev,
          [category]: { uploading: false, progress: 100 }
        }));
        
        // Refresh data
        await loadStep5Data();
        
        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress(prev => {
            const newProgress = { ...prev };
            delete newProgress[category];
            return newProgress;
          });
        }, 2000);
      }
      
      if (result.errors && result.errors.length > 0) {
        const errorMessages = result.errors.map((err: any) => `${err.fileName}: ${err.error}`).join('\n');
        alert(`Some files failed to upload:\n${errorMessages}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [category]: { uploading: false, progress: 0, error: 'Upload failed' }
      }));
      alert('Failed to upload files. Please try again.');
    }
  }, [clientId, localData, loadStep5Data]);

  const handleDeleteDocument = async (category: Step5DocumentCategory, documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiService.deleteStep5Document(clientId, category, documentId);
      await loadStep5Data();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handlePreviewDocument = async (file: Step5DocumentFile) => {
    // Find the category for this file
    let fileCategory: Step5DocumentCategory | undefined;
    for (const [categoryKey, categoryFiles] of Object.entries(localData || {})) {
      if (Array.isArray(categoryFiles) && categoryFiles.some((f: Step5DocumentFile) => f.documentId === file.documentId)) {
        fileCategory = categoryKey as Step5DocumentCategory;
        break;
      }
    }

    if (!fileCategory) {
      alert('Unable to determine file category');
      return;
    }

    // Set initial state with loading
    setPreviewDialog({
      open: true,
      file,
      category: fileCategory,
      loading: true
    });

    try {
      // Generate fresh URL for preview
      const result = await apiService.getStep5DocumentDownloadUrl(clientId, fileCategory, file.documentId);
      if (result.downloadUrl) {
        setPreviewDialog(prev => ({
          ...prev,
          loading: false,
          previewUrl: result.downloadUrl
        }));
      } else {
        throw new Error('No download URL received');
      }
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewDialog(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load preview. Please try again.'
      }));
    }
  };

  const handleDownloadDocument = async (category: Step5DocumentCategory, documentId: string) => {
    try {
      const result = await apiService.getStep5DocumentDownloadUrl(clientId, category, documentId);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const isPdfFile = (mimeType: string) => {
    return mimeType === 'application/pdf';
  };

  const handleSave = async () => {
    if (!localData) return;

    const updates: SaveStep5DataRequest = {
      registrationStatus: localData.registrationStatus,
      documentUploadStatus: localData.documentUploadStatus,
      subsidyApplication: localData.subsidyApplication,
      notes: localData.notes
    };

    await saveStep5Data(updates);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!localData) {
    return (
      <Alert severity="error">
        Failed to load Step 5 data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 5: Final Bank Process and Subsidy Release
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Track registration, document uploads, and subsidy application status
        </Typography>
      </Box>

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Bank Disbursement Letter */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Bank Disbursement Letter
          </Typography>
          
          {/* Upload Area */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: 'grey.300',
              backgroundColor: 'grey.50',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50'
              }
            }}
            component="label"
          >
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload('bankDisbursementLetter', e.target.files);
                  e.target.value = ''; // Reset input
                }
              }}
              disabled={uploadProgress['bankDisbursementLetter']?.uploading}
            />
            
            <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {uploadProgress['bankDisbursementLetter']?.uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PDF and image files only • Max 10MB per file • Max 5 files
            </Typography>
            
            {uploadProgress['bankDisbursementLetter']?.uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="indeterminate" />
              </Box>
            )}
            
            {uploadProgress['bankDisbursementLetter']?.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadProgress['bankDisbursementLetter'].error}
              </Alert>
            )}
          </Paper>

          {/* File List */}
          {localData.bankDisbursementLetter && localData.bankDisbursementLetter.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2 }}>
              <List dense>
                {localData.bankDisbursementLetter.map((file, index) => (
                  <ListItem key={file.documentId} divider={index < localData.bankDisbursementLetter.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {file.originalName}
                          </Typography>
                          {isImageFile(file.mimeType) && (
                            <Chip size="small" label="Image" color="info" variant="outlined" />
                          )}
                          {isPdfFile(file.mimeType) && (
                            <Chip size="small" label="PDF" color="error" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.fileSize)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(isImageFile(file.mimeType) || isPdfFile(file.mimeType)) && (
                          <IconButton
                            size="small"
                            onClick={() => handlePreviewDocument(file)}
                            title="Preview"
                          >
                            <PreviewIcon />
                          </IconButton>
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadDocument('bankDisbursementLetter', file.documentId)}
                          title="Download"
                        >
                          <DownloadIcon />
                        </IconButton>
                        
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDocument('bankDisbursementLetter', file.documentId)}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {(!localData.bankDisbursementLetter || localData.bankDisbursementLetter.length === 0) && !uploadProgress['bankDisbursementLetter']?.uploading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No bank disbursement letter uploaded yet. This is optional but recommended for record keeping.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Registration Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Registration Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localData.registrationStatus.registrationDone}
                  onChange={(e) => setLocalData(prev => prev ? {
                    ...prev,
                    registrationStatus: {
                      ...prev.registrationStatus,
                      registrationDone: e.target.checked
                    }
                  } : prev)}
                />
              }
              label="Registration Done?"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Registration Date"
                type="date"
                value={localData.registrationStatus.registrationDate || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  registrationStatus: {
                    ...prev.registrationStatus,
                    registrationDate: e.target.value
                  }
                } : prev)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Registration Reference"
                value={localData.registrationStatus.registrationReference || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  registrationStatus: {
                    ...prev.registrationStatus,
                    registrationReference: e.target.value
                  }
                } : prev)}
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Registration Authority"
              value={localData.registrationStatus.registrationAuthority || ''}
              onChange={(e) => setLocalData(prev => prev ? {
                ...prev,
                registrationStatus: {
                  ...prev.registrationStatus,
                  registrationAuthority: e.target.value
                }
              } : prev)}
              fullWidth
            />
          </Box>
        </CardContent>
      </Card>

      {/* Document Upload Status */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Document Upload Status
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localData.documentUploadStatus.allDocumentsUploaded}
                  onChange={(e) => setLocalData(prev => prev ? {
                    ...prev,
                    documentUploadStatus: {
                      ...prev.documentUploadStatus,
                      allDocumentsUploaded: e.target.checked
                    }
                  } : prev)}
                />
              }
              label="All Documents Uploaded?"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Upload Date"
                type="date"
                value={localData.documentUploadStatus.uploadDate || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  documentUploadStatus: {
                    ...prev.documentUploadStatus,
                    uploadDate: e.target.value
                  }
                } : prev)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Document Count"
                type="number"
                value={localData.documentUploadStatus.documentCount ?? ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  documentUploadStatus: {
                    ...prev.documentUploadStatus,
                    documentCount: e.target.value === '' ? 0 : parseInt(e.target.value) || 0
                  }
                } : prev)}
                onFocus={(e) => e.target.select()}
                placeholder="Enter count"
                sx={{ flex: 1 }}
              />
            </Box>
            <TextField
              label="Upload Platform"
              value={localData.documentUploadStatus.uploadPlatform || ''}
              onChange={(e) => setLocalData(prev => prev ? {
                ...prev,
                documentUploadStatus: {
                  ...prev.documentUploadStatus,
                  uploadPlatform: e.target.value
                }
              } : prev)}
              fullWidth
            />
          </Box>
        </CardContent>
      </Card>

      {/* Subsidy Application */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Subsidy Application
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Checkbox
                  checked={localData.subsidyApplication.subsidyApplied}
                  onChange={(e) => setLocalData(prev => prev ? {
                    ...prev,
                    subsidyApplication: {
                      ...prev.subsidyApplication,
                      subsidyApplied: e.target.checked
                    }
                  } : prev)}
                />
              }
              label="Subsidy Applied?"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Application Date"
                type="date"
                value={localData.subsidyApplication.applicationDate || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  subsidyApplication: {
                    ...prev.subsidyApplication,
                    applicationDate: e.target.value
                  }
                } : prev)}
                InputLabelProps={{ shrink: true }}
                sx={{ flex: 1 }}
              />
              <TextField
                label="Application Reference"
                value={localData.subsidyApplication.applicationReference || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  subsidyApplication: {
                    ...prev.subsidyApplication,
                    applicationReference: e.target.value
                  }
                } : prev)}
                sx={{ flex: 1 }}
              />
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Expected Amount"
                type="number"
                value={localData.subsidyApplication.expectedAmount ?? ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  subsidyApplication: {
                    ...prev.subsidyApplication,
                    expectedAmount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                  }
                } : prev)}
                onFocus={(e) => e.target.select()}
                placeholder="Enter amount"
                sx={{ flex: 1 }}
              />
              <TextField
                label="Subsidy Type"
                value={localData.subsidyApplication.subsidyType || ''}
                onChange={(e) => setLocalData(prev => prev ? {
                  ...prev,
                  subsidyApplication: {
                    ...prev.subsidyApplication,
                    subsidyType: e.target.value
                  }
                } : prev)}
                sx={{ flex: 1 }}
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notes */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Notes
          </Typography>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Additional Notes"
            value={localData.notes || ''}
            onChange={(e) => setLocalData(prev => prev ? {
              ...prev,
              notes: e.target.value
            } : prev)}
          />
        </CardContent>
      </Card>

      {/* Margin Receipt */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Margin Receipt
          </Typography>
          
          {/* Upload Area */}
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              textAlign: 'center',
              border: '2px dashed',
              borderColor: 'grey.300',
              backgroundColor: 'grey.50',
              cursor: 'pointer',
              '&:hover': {
                borderColor: 'primary.main',
                backgroundColor: 'primary.50'
              }
            }}
            component="label"
          >
            <input
              type="file"
              multiple
              accept=".pdf,image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload('marginReceipt', e.target.files);
                  e.target.value = ''; // Reset input
                }
              }}
              disabled={uploadProgress['marginReceipt']?.uploading}
            />
            
            <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
            <Typography variant="h6" gutterBottom>
              {uploadProgress['marginReceipt']?.uploading ? 'Uploading...' : 'Drop files here or click to browse'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              PDF and image files only • Max 10MB per file • Max 5 files
            </Typography>
            
            {uploadProgress['marginReceipt']?.uploading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress variant="indeterminate" />
              </Box>
            )}
            
            {uploadProgress['marginReceipt']?.error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {uploadProgress['marginReceipt'].error}
              </Alert>
            )}
          </Paper>

          {/* File List */}
          {localData.marginReceipt && localData.marginReceipt.length > 0 && (
            <Paper variant="outlined" sx={{ mt: 2 }}>
              <List dense>
                {localData.marginReceipt.map((file, index) => (
                  <ListItem key={file.documentId} divider={index < localData.marginReceipt.length - 1}>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="body2" fontWeight="medium">
                            {file.originalName}
                          </Typography>
                          {isImageFile(file.mimeType) && (
                            <Chip size="small" label="Image" color="info" variant="outlined" />
                          )}
                          {isPdfFile(file.mimeType) && (
                            <Chip size="small" label="PDF" color="error" variant="outlined" />
                          )}
                        </Box>
                      }
                      secondary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(file.fileSize)}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Uploaded {new Date(file.uploadedAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {(isImageFile(file.mimeType) || isPdfFile(file.mimeType)) && (
                          <IconButton
                            size="small"
                            onClick={() => handlePreviewDocument(file)}
                            title="Preview"
                          >
                            <PreviewIcon />
                          </IconButton>
                        )}
                        
                        <IconButton
                          size="small"
                          onClick={() => handleDownloadDocument('marginReceipt', file.documentId)}
                          title="Download"
                        >
                          <DownloadIcon />
                        </IconButton>
                        
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDocument('marginReceipt', file.documentId)}
                          title="Delete"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Paper>
          )}

          {(!localData.marginReceipt || localData.marginReceipt.length === 0) && !uploadProgress['marginReceipt']?.uploading && (
            <Alert severity="info" sx={{ mt: 2 }}>
              No margin receipt uploaded yet. This is optional but recommended for record keeping.
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          size="large"
        >
          {saving ? 'Saving...' : 'Save All Changes'}
        </Button>
      </Box>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Document Preview: {previewDialog.file?.originalName}
        </DialogTitle>
        <DialogContent>
          {previewDialog.loading && (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
              <LinearProgress sx={{ width: '100%', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                Loading preview...
              </Typography>
            </Box>
          )}

          {previewDialog.error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {previewDialog.error}
            </Alert>
          )}

          {!previewDialog.loading && !previewDialog.error && previewDialog.file && previewDialog.previewUrl && (
            <>
              {isImageFile(previewDialog.file.mimeType) && (
                <Box sx={{ textAlign: 'center' }}>
                  <img
                    src={previewDialog.previewUrl}
                    alt={previewDialog.file.originalName}
                    style={{
                      maxWidth: '100%',
                      maxHeight: '70vh',
                      objectFit: 'contain'
                    }}
                  />
                </Box>
              )}
              
              {isPdfFile(previewDialog.file.mimeType) && (
                <Box sx={{ width: '100%', height: '70vh' }}>
                  <iframe
                    src={previewDialog.previewUrl}
                    title={previewDialog.file.originalName}
                    style={{
                      width: '100%',
                      height: '100%',
                      border: 'none'
                    }}
                  />
                </Box>
              )}
            </>
          )}
          
          {!previewDialog.loading && !previewDialog.error && previewDialog.file && !isImageFile(previewDialog.file.mimeType) && !isPdfFile(previewDialog.file.mimeType) && (
            <Alert severity="info">
              Preview not available for this file type. Use the download button to view the document.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, loading: false })}>
            Close
          </Button>
          {previewDialog.file && previewDialog.category && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadDocument(previewDialog.category!, previewDialog.file!.documentId)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step5Form;
