import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  TextField,
  Paper,
  Divider,
  Button,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  SwapHoriz as TransferIcon,
  ElectricBolt as LoadIcon,
  Settings as OtherIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon
} from '@mui/icons-material';
import { Step1SpecialRequirements, Step1DocumentFile } from '../../shared/types';
import { apiService } from '../../services/api';

interface Step1SpecialRequirementsFormProps {
  clientId: string;
  data: Step1SpecialRequirements;
  onChange: (data: Partial<Step1SpecialRequirements>) => void;
  disabled?: boolean;
}

interface UploadProgress {
  uploading: boolean;
  progress: number;
  error?: string;
}

const Step1SpecialRequirementsForm: React.FC<Step1SpecialRequirementsFormProps> = ({
  clientId,
  data,
  onChange,
  disabled = false
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploading: false,
    progress: 0
  });

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    file?: Step1DocumentFile;
    loading: boolean;
    previewUrl?: string;
    error?: string;
  }>({ open: false, loading: false });

  const handleCheckboxChange = (field: keyof Step1SpecialRequirements, value: boolean) => {
    onChange({ [field]: value });
  };

  const handleTextChange = (field: keyof Step1SpecialRequirements, value: string) => {
    onChange({ [field]: value });
  };

  const handleFileUpload = useCallback(async (files: FileList) => {
    const fileArray = Array.from(files);
    const currentCount = data.nameTransferDocuments?.length || 0;
    const totalCount = currentCount + fileArray.length;
    
    // Validate file count (max 4 files)
    if (totalCount > 4) {
      alert('Maximum 4 files allowed for Name Transfer Documents');
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
    setUploadProgress({ uploading: true, progress: 0 });

    try {
      // Create FormData for upload
      const formData = new FormData();
      validFiles.forEach(file => {
        formData.append('files', file);
      });

      // Upload files using a generic document upload API
      // For now, we'll simulate the upload and update the local state
      // In a real implementation, you'd call an API endpoint
      
      // Simulate upload progress
      for (let i = 0; i <= 100; i += 20) {
        setUploadProgress({ uploading: true, progress: i });
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Create mock document files (in real implementation, these would come from the API)
      const newDocuments: Step1DocumentFile[] = validFiles.map(file => ({
        documentId: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fileName: file.name,
        originalName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: 'current-user', // This would come from auth context
        s3Key: `name-transfer/${file.name}`,
        s3Url: URL.createObjectURL(file), // Temporary URL for preview
        thumbnailUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined
      }));

      // Update the documents in the special requirements
      const updatedDocuments = [...(data.nameTransferDocuments || []), ...newDocuments];
      onChange({ nameTransferDocuments: updatedDocuments });

      setUploadProgress({ uploading: false, progress: 100 });
      
      // Clear progress after a delay
      setTimeout(() => {
        setUploadProgress({ uploading: false, progress: 0 });
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress({ uploading: false, progress: 0, error: 'Upload failed' });
      alert('Failed to upload files. Please try again.');
    }
  }, [clientId, data.nameTransferDocuments, onChange]);

  const handleDeleteDocument = useCallback(async (documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      // In real implementation, call API to delete the document
      // await apiService.deleteNameTransferDocument(clientId, documentId);
      
      // Update local state
      const updatedDocuments = (data.nameTransferDocuments || []).filter(
        doc => doc.documentId !== documentId
      );
      onChange({ nameTransferDocuments: updatedDocuments });
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    }
  }, [data.nameTransferDocuments, onChange]);

  const handleDownloadDocument = useCallback(async (document: Step1DocumentFile) => {
    try {
      // In real implementation, get download URL from API
      // const result = await apiService.getNameTransferDocumentDownloadUrl(clientId, document.documentId);
      // window.open(result.downloadUrl, '_blank');
      
      // For now, use the existing URL
      if (document.s3Url) {
        window.open(document.s3Url, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  }, []);

  const handlePreviewDocument = useCallback((file: Step1DocumentFile) => {
    setPreviewDialog({ open: true, file, loading: false });
  }, []);

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

  const requirements = [
    {
      key: 'nameTransferRequired' as const,
      label: 'Name Transfer Required',
      description: 'Property ownership needs to be transferred to client name',
      icon: <TransferIcon />
    },
    {
      key: 'loadEnhancementRequired' as const,
      label: 'Load Enhancement Required',
      description: 'Electrical load capacity needs to be increased',
      icon: <LoadIcon />
    },
    {
      key: 'otherPrerequisiteRequired' as const,
      label: 'Other Prerequisites Required',
      description: 'Additional requirements or prerequisites needed',
      icon: <OtherIcon />
    }
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {requirements.map((requirement) => (
        <Paper key={requirement.key} variant="outlined" sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Box sx={{ color: 'primary.main', mt: 0.5 }}>
              {requirement.icon}
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={data[requirement.key] || false}
                    onChange={(e) => handleCheckboxChange(requirement.key, e.target.checked)}
                    disabled={disabled}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {requirement.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {requirement.description}
                    </Typography>
                  </Box>
                }
              />

              {/* Name Transfer Documents Upload Section */}
              {requirement.key === 'nameTransferRequired' && data.nameTransferRequired && (
                <Box sx={{ mt: 2, pl: 4 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Name Transfer Documents
                  </Typography>
                  
                  {/* Upload Area */}
                  <Paper
                    variant="outlined"
                    sx={{
                      p: 2,
                      mb: 2,
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
                          handleFileUpload(e.target.files);
                          e.target.value = ''; // Reset input
                        }
                      }}
                      disabled={disabled || uploadProgress.uploading}
                    />
                    
                    <UploadIcon sx={{ fontSize: 32, color: 'grey.400', mb: 1 }} />
                    <Typography variant="body2" gutterBottom>
                      {uploadProgress.uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      PDF and image files only • Max 10MB per file • Max 4 files total
                    </Typography>
                    
                    {uploadProgress.uploading && (
                      <Box sx={{ mt: 1 }}>
                        <LinearProgress variant="determinate" value={uploadProgress.progress} />
                      </Box>
                    )}
                    
                    {uploadProgress.error && (
                      <Alert severity="error" sx={{ mt: 1 }}>
                        {uploadProgress.error}
                      </Alert>
                    )}
                  </Paper>

                  {/* File List */}
                  {data.nameTransferDocuments && data.nameTransferDocuments.length > 0 && (
                    <Paper variant="outlined" sx={{ mb: 2 }}>
                      <List dense>
                        {data.nameTransferDocuments.map((file, index) => (
                          <ListItem key={file.documentId} divider={index < data.nameTransferDocuments!.length - 1}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {file.originalName}
                                  </Typography>
                                  {isImageFile(file.mimeType) && (
                                    <Typography variant="caption" sx={{ 
                                      px: 1, 
                                      py: 0.25, 
                                      backgroundColor: 'info.100', 
                                      color: 'info.800',
                                      borderRadius: 1,
                                      fontSize: '0.7rem'
                                    }}>
                                      Image
                                    </Typography>
                                  )}
                                  {file.mimeType === 'application/pdf' && (
                                    <Typography variant="caption" sx={{ 
                                      px: 1, 
                                      py: 0.25, 
                                      backgroundColor: 'error.100', 
                                      color: 'error.800',
                                      borderRadius: 1,
                                      fontSize: '0.7rem'
                                    }}>
                                      PDF
                                    </Typography>
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
                                {(isImageFile(file.mimeType) || file.mimeType === 'application/pdf') && (
                                  <IconButton
                                    size="small"
                                    onClick={() => handlePreviewDocument(file)}
                                    title="Preview"
                                    disabled={disabled}
                                  >
                                    <PreviewIcon />
                                  </IconButton>
                                )}
                                
                                <IconButton
                                  size="small"
                                  onClick={() => handleDownloadDocument(file)}
                                  title="Download"
                                  disabled={disabled}
                                >
                                  <DownloadIcon />
                                </IconButton>
                                
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteDocument(file.documentId)}
                                  title="Delete"
                                  disabled={disabled}
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

                  {/* Document Summary */}
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, display: 'block' }}>
                    {data.nameTransferDocuments?.length || 0} of 4 documents uploaded
                  </Typography>

                  {/* Name Transfer Comments */}
                  <TextField
                    fullWidth
                    label="Name Transfer Comments"
                    value={data.nameTransferComments || ''}
                    onChange={(e) => handleTextChange('nameTransferComments', e.target.value)}
                    disabled={disabled}
                    multiline
                    rows={3}
                    placeholder="Add any comments or notes about the name transfer requirements..."
                    helperText="Provide additional details about the name transfer process"
                    sx={{ mt: 1 }}
                  />
                </Box>
              )}

              {/* Load Enhancement Comments Section */}
              {requirement.key === 'loadEnhancementRequired' && data.loadEnhancementRequired && (
                <Box sx={{ mt: 2, pl: 4 }}>
                  <TextField
                    fullWidth
                    label="Load Enhancement Comments"
                    value={data.loadEnhancementComments || ''}
                    onChange={(e) => handleTextChange('loadEnhancementComments', e.target.value)}
                    disabled={disabled}
                    multiline
                    rows={3}
                    placeholder="Add any comments or notes about the load enhancement requirements..."
                    helperText="Provide additional details about the load enhancement process"
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Paper>
      ))}
      
      {data.otherPrerequisiteRequired && (
        <>
          <Divider sx={{ my: 2 }} />
          <TextField
            fullWidth
            label="Other Prerequisites Details"
            value={data.otherPrerequisiteDetails || ''}
            onChange={(e) => handleTextChange('otherPrerequisiteDetails', e.target.value)}
            disabled={disabled}
            multiline
            rows={4}
            placeholder="Please describe the other prerequisites or special requirements in detail..."
            helperText="Provide detailed information about the additional requirements"
          />
        </>
      )}
      
      {!data.nameTransferRequired && !data.loadEnhancementRequired && !data.otherPrerequisiteRequired && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            No special requirements selected. The installation can proceed with standard procedures.
          </Typography>
        </Paper>
      )}

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
          {previewDialog.file && isImageFile(previewDialog.file.mimeType) && (
            <Box sx={{ textAlign: 'center' }}>
              <img
                src={previewDialog.file.s3Url || previewDialog.file.thumbnailUrl}
                alt={previewDialog.file.originalName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain'
                }}
              />
            </Box>
          )}
          
          {previewDialog.file && previewDialog.file.mimeType === 'application/pdf' && (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={previewDialog.file.s3Url}
                title={previewDialog.file.originalName}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            </Box>
          )}
          
          {previewDialog.file && !isImageFile(previewDialog.file.mimeType) && previewDialog.file.mimeType !== 'application/pdf' && (
            <Alert severity="info">
              Preview not available for this file type. Use the download button to view the document.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, loading: false })}>
            Close
          </Button>
          {previewDialog.file && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => {
                if (previewDialog.file?.s3Url) {
                  window.open(previewDialog.file.s3Url, '_blank');
                }
              }}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step1SpecialRequirementsForm;
