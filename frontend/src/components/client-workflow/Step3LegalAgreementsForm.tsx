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
  CircularProgress
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Description as FileIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import { 
  Step3LegalAgreements, 
  Step3DocumentCategory, 
  STEP3_DOCUMENT_CATEGORIES,
  Step3DocumentFile 
} from '../../shared/types';

interface Step3LegalAgreementsFormProps {
  clientId: string;
  agreements: Step3LegalAgreements;
  onChange: () => void;
}

const Step3LegalAgreementsForm: React.FC<Step3LegalAgreementsFormProps> = ({
  clientId,
  agreements,
  onChange
}) => {
  const [uploading, setUploading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleFileUpload = async (category: Step3DocumentCategory, files: FileList) => {
    if (!files || files.length === 0) return;

    const categoryConfig = STEP3_DOCUMENT_CATEGORIES[category];
    const currentCount = agreements[category]?.length || 0;
    
    if (currentCount + files.length > categoryConfig.maxFiles) {
      setError(`Cannot upload ${files.length} files. Maximum ${categoryConfig.maxFiles} files allowed for ${categoryConfig.label}`);
      return;
    }

    try {
      setUploading(category);
      setError(null);
      
      const fileArray = Array.from(files);
      await apiService.uploadStep3Documents(clientId, category, fileArray);
      
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

  const handleFileDelete = async (category: Step3DocumentCategory, documentId: string) => {
    try {
      await apiService.deleteStep3Document(clientId, category, documentId);
      setSuccess('Document deleted successfully');
      onChange(); // Refresh the parent component
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting document:', error);
      setError(error.response?.data?.message || 'Failed to delete document');
    }
  };

  const handleFileDownload = async (category: Step3DocumentCategory, documentId: string) => {
    try {
      const response = await apiService.getStep3DocumentDownloadUrl(clientId, category, documentId);
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

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Legal Agreements
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Upload and manage legal agreements and contracts required for the installation
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
        {Object.entries(STEP3_DOCUMENT_CATEGORIES).map(([categoryKey, categoryConfig]) => {
          const category = categoryKey as Step3DocumentCategory;
          const categoryDocuments = agreements[category] || [];
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
                  {categoryDocuments.map((document: Step3DocumentFile) => (
                    <ListItem key={document.documentId} divider>
                      <FileIcon sx={{ mr: 2, color: 'primary.main' }} />
                      <ListItemText
                        primary={document.originalName}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {formatFileSize(document.fileSize)} • Uploaded {formatDate(document.uploadedAt)}
                          </Typography>
                        }
                      />
                      <ListItemSecondaryAction>
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
                    No agreements uploaded yet
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
          <li>Ensure all agreements are properly signed and dated</li>
          <li>Required agreements must be uploaded before installation completion</li>
        </Typography>
      </Paper>
    </Box>
  );
};

export default Step3LegalAgreementsForm;
