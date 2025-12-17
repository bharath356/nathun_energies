import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { 
  Step2LoanDocuments, 
  Step2DocumentCategory, 
  STEP2_DOCUMENT_CATEGORIES,
  Step2DocumentFile 
} from '../../shared/types';

interface Step2LoanDocumentsFormProps {
  clientId: string;
  documents: Step2LoanDocuments;
  onChange: () => void;
}

const Step2LoanDocumentsForm: React.FC<Step2LoanDocumentsFormProps> = ({
  clientId,
  documents,
  onChange
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    file?: Step2DocumentFile;
    category?: Step2DocumentCategory;
    loading: boolean;
    previewUrl?: string;
    error?: string;
  }>({ open: false, loading: false });

  const handleFileUpload = async (category: Step2DocumentCategory, files: FileList) => {
    if (!files || files.length === 0) return;

    const categoryConfig = STEP2_DOCUMENT_CATEGORIES[category];
    const currentCount = documents[category]?.length || 0;
    
    if (currentCount + files.length > categoryConfig.maxFiles) {
      setError(`Cannot upload ${files.length} files. Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`);
      return;
    }

    try {
      setUploading(category);
      setError(null);
      
      const fileArray = Array.from(files);
      await apiService.uploadStep2Documents(clientId, category, fileArray);
      
      setSuccess(`Successfully uploaded ${files.length} file(s) to ${categoryConfig.label}`);
      onChange(); // Refresh the parent component
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      setError(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploading(null);
    }
  };

  const handleFileDelete = async (category: Step2DocumentCategory, documentId: string) => {
    try {
      await apiService.deleteStep2Document(clientId, category, documentId);
      setSuccess('Document deleted successfully');
      onChange(); // Refresh the parent component
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setError(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleFileDownload = async (category: Step2DocumentCategory, documentId: string) => {
    try {
      const response = await apiService.getStep2DocumentDownloadUrl(clientId, category, documentId);
      window.open(response.downloadUrl, '_blank');
    } catch (error: any) {
      console.error('Error downloading document:', error);
      setError(error.response?.data?.message || 'Failed to download document');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handlePreviewDocument = async (file: Step2DocumentFile) => {
    // Find the category for this file
    let fileCategory: Step2DocumentCategory | undefined;
    for (const [categoryKey, categoryFiles] of Object.entries(documents)) {
      if (categoryFiles?.some((f: Step2DocumentFile) => f.documentId === file.documentId)) {
        fileCategory = categoryKey as Step2DocumentCategory;
        break;
      }
    }

    if (!fileCategory) {
      setError('Unable to determine file category');
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
      const result = await apiService.getStep2DocumentDownloadUrl(clientId, fileCategory, file.documentId);
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

  const isImageFile = (mimeType: string) => {
    return mimeType.startsWith('image/');
  };

  const isPdfFile = (mimeType: string) => {
    return mimeType === 'application/pdf';
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Loan Documents
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload and manage loan-related documents required for the loan application process
      </Typography>

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

      {/* Document Categories */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {Object.entries(STEP2_DOCUMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
          const category = categoryKey as Step2DocumentCategory;
          const categoryDocuments = documents[category] || [];
          const isUploading = uploading === category;
          
          return (
            <Paper key={category} variant="outlined" sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {categoryConfig.label}
                    {categoryConfig.required && (
                      <Chip label="Required" color="error" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {categoryDocuments.length} of {categoryConfig.maxFiles} files uploaded
                  </Typography>
                </Box>
                
                <Box>
                  <input
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    style={{ display: 'none' }}
                    id={`upload-${category}`}
                    multiple
                    type="file"
                    onChange={(e) => e.target.files && handleFileUpload(category, e.target.files)}
                    disabled={isUploading || categoryDocuments.length >= categoryConfig.maxFiles}
                  />
                  <label htmlFor={`upload-${category}`}>
                    <Button
                      variant="contained"
                      component="span"
                      startIcon={isUploading ? <CircularProgress size={20} /> : <UploadIcon />}
                      disabled={isUploading || categoryDocuments.length >= categoryConfig.maxFiles}
                    >
                      {isUploading ? 'Uploading...' : 'Upload Files'}
                    </Button>
                  </label>
                </Box>
              </Box>

              {/* Document List */}
              {categoryDocuments.length > 0 ? (
                <List>
                  {categoryDocuments.map((document: Step2DocumentFile) => (
                    <ListItem key={document.documentId} divider>
                      <FileIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <ListItemText
                        primary={document.originalName}
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {formatFileSize(document.fileSize)} • Uploaded {formatDate(document.uploadedAt)}
                            </Typography>
                            {document.details && (
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {document.details}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                      <ListItemSecondaryAction>
                        {(isImageFile(document.mimeType) || isPdfFile(document.mimeType)) && (
                          <IconButton
                            edge="end"
                            aria-label="preview"
                            onClick={() => handlePreviewDocument(document)}
                            sx={{ mr: 1 }}
                          >
                            <PreviewIcon />
                          </IconButton>
                        )}
                        <IconButton
                          edge="end"
                          aria-label="download"
                          onClick={() => handleFileDownload(category, document.documentId)}
                          sx={{ mr: 1 }}
                        >
                          <DownloadIcon />
                        </IconButton>
                        <IconButton
                          edge="end"
                          aria-label="delete"
                          onClick={() => handleFileDelete(category, document.documentId)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                  <FileIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2">
                    No documents uploaded yet
                  </Typography>
                </Box>
              )}
            </Paper>
          );
        })}
      </Box>

      {/* Upload Guidelines */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, backgroundColor: 'info.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Upload Guidelines:
        </Typography>
        <Typography variant="body2" component="ul" sx={{ m: 0, pl: 2 }}>
          <li>Supported formats: PDF, JPG, PNG, GIF, DOC, DOCX</li>
          <li>Maximum file size: 10MB per file</li>
          <li>Ensure documents are clear and readable</li>
          <li>Required documents must be uploaded before loan processing</li>
        </Typography>
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
              <CircularProgress sx={{ mb: 2 }} />
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
              onClick={() => handleFileDownload(previewDialog.category!, previewDialog.file!.documentId)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step2LoanDocumentsForm;
