import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  LinearProgress,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AttachFile as FileIcon
} from '@mui/icons-material';
import { Step1Documents, Step1DocumentFile, STEP1_DOCUMENT_CATEGORIES, Step1DocumentCategory } from '../../shared/types';
import { apiService } from '../../services/api';

interface Step1DocumentsFormProps {
  clientId: string;
  documents: Step1Documents;
  onChange: () => void;
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
  file?: Step1DocumentFile;
  category?: Step1DocumentCategory;
  loading: boolean;
  previewUrl?: string;
  error?: string;
}

const Step1DocumentsForm: React.FC<Step1DocumentsFormProps> = ({
  clientId,
  documents,
  onChange
}) => {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});
  const [previewDialog, setPreviewDialog] = useState<PreviewState>({
    open: false,
    loading: false
  });

  const handleFileUpload = useCallback(async (category: Step1DocumentCategory, files: FileList) => {
    const fileArray = Array.from(files);
    const categoryConfig = STEP1_DOCUMENT_CATEGORIES[category];
    
    // Validate file count
    const currentCount = documents[category]?.length || 0;
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
      const result = await apiService.uploadStep1Documents(clientId, category, validFiles);
      
      if (result.uploadedFiles && result.uploadedFiles.length > 0) {
        // Update progress to complete
        setUploadProgress(prev => ({
          ...prev,
          [category]: { uploading: false, progress: 100 }
        }));
        
        // Trigger refresh
        onChange();
        
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
  }, [clientId, documents, onChange]);

  const handleDeleteDocument = async (category: Step1DocumentCategory, documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return;
    }

    try {
      await apiService.deleteStep1Document(clientId, category, documentId);
      onChange();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const handlePreviewDocument = async (file: Step1DocumentFile) => {
    // Find the category for this file
    let fileCategory: Step1DocumentCategory | undefined;
    for (const [categoryKey, categoryFiles] of Object.entries(documents)) {
      if (categoryFiles?.some((f: Step1DocumentFile) => f.documentId === file.documentId)) {
        fileCategory = categoryKey as Step1DocumentCategory;
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
      const result = await apiService.getStep1DocumentDownloadUrl(clientId, fileCategory, file.documentId);
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

  const handleDownloadDocument = async (category: Step1DocumentCategory, documentId: string) => {
    try {
      const result = await apiService.getStep1DocumentDownloadUrl(clientId, category, documentId);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const getCompletionStatus = (category: Step1DocumentCategory) => {
    const categoryConfig = STEP1_DOCUMENT_CATEGORIES[category];
    const fileCount = documents[category]?.length || 0;
    
    if (categoryConfig.required && fileCount === 0) {
      return { status: 'missing', color: 'error' as const, icon: <WarningIcon /> };
    } else if (fileCount > 0) {
      return { status: 'complete', color: 'success' as const, icon: <CheckIcon /> };
    } else {
      return { status: 'optional', color: 'default' as const, icon: <FileIcon /> };
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Documents
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Upload and manage all required documents for the solar installation process
      </Typography>

      {/* Document Categories */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(STEP1_DOCUMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
          const category = categoryKey as Step1DocumentCategory;
          const categoryFiles = documents[category] || [];
          const progress = uploadProgress[category];
          const completion = getCompletionStatus(category);
          
          return (
            <Accordion key={category} defaultExpanded={categoryConfig.required && categoryFiles.length === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                  <Box sx={{ color: `${completion.color}.main` }}>
                    {completion.icon}
                  </Box>
                  
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {categoryConfig.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {categoryConfig.required ? 'Required' : 'Optional'} • 
                      Max {categoryConfig.maxFiles} files • 
                      {categoryFiles.length} uploaded
                    </Typography>
                  </Box>
                  
                  <Chip
                    size="small"
                    label={`${categoryFiles.length}/${categoryConfig.maxFiles}`}
                    color={completion.color}
                    variant="outlined"
                  />
                </Box>
              </AccordionSummary>
              
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
                          handleFileUpload(category, e.target.files);
                          e.target.value = ''; // Reset input
                        }
                      }}
                      disabled={progress?.uploading}
                    />
                    
                    <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                    <Typography variant="h6" gutterBottom>
                      {progress?.uploading ? 'Uploading...' : 'Drop files here or click to browse'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      PDF and image files only • Max 10MB per file
                    </Typography>
                    
                    {progress?.uploading && (
                      <Box sx={{ mt: 2 }}>
                        <LinearProgress variant="indeterminate" />
                      </Box>
                    )}
                    
                    {progress?.error && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {progress.error}
                      </Alert>
                    )}
                  </Paper>

                  {/* File List */}
                  {categoryFiles.length > 0 && (
                    <Paper variant="outlined">
                      <List dense>
                        {categoryFiles.map((file, index) => (
                          <ListItem key={file.documentId} divider={index < categoryFiles.length - 1}>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="body2" fontWeight="medium">
                                    {file.originalName}
                                  </Typography>
                                  {isImageFile(file.mimeType) && (
                                    <Chip size="small" label="Image" color="info" variant="outlined" />
                                  )}
                                  {file.mimeType === 'application/pdf' && (
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
                                  onClick={() => handleDownloadDocument(category, file.documentId)}
                                  title="Download"
                                >
                                  <DownloadIcon />
                                </IconButton>
                                
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeleteDocument(category, file.documentId)}
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

                  {categoryFiles.length === 0 && !progress?.uploading && (
                    <Alert severity={categoryConfig.required ? "warning" : "info"}>
                      {categoryConfig.required 
                        ? `${categoryConfig.label} documents are required. Please upload the necessary files.`
                        : `No ${categoryConfig.label.toLowerCase()} uploaded yet. This category is optional.`
                      }
                    </Alert>
                  )}
                </Box>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Box>

      {/* Document Summary */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, backgroundColor: 'grey.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Document Summary
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          {Object.entries(STEP1_DOCUMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
            const category = categoryKey as Step1DocumentCategory;
            const fileCount = documents[category]?.length || 0;
            const completion = getCompletionStatus(category);
            
            return (
              <Chip
                key={category}
                size="small"
                icon={completion.icon}
                label={`${categoryConfig.label}: ${fileCount}/${categoryConfig.maxFiles}`}
                color={completion.color}
                variant={fileCount > 0 ? "filled" : "outlined"}
              />
            );
          })}
        </Box>
      </Paper>

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

export default Step1DocumentsForm;
