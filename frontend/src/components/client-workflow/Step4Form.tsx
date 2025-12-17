import React, { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import {
  VerifiedUser as CertificateIcon,
  Save as SaveIcon,
  SaveAlt as SaveAllIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  CloudUpload as UploadIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  Step4DiscomData,
  SaveStep4DataRequest,
  Step4DocumentFile
} from '../../shared/types';

interface Step4FormProps {
  clientId: string;
  onDataChange?: (data: Step4DiscomData) => void;
}

const Step4Form: React.FC<Step4FormProps> = ({ clientId, onDataChange }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Local data (current form state)
  const [localData, setLocalData] = useState<Step4DiscomData | null>(null);
  
  // Certificate number management
  const [newCertificateNumber, setNewCertificateNumber] = useState('');
  const [editingCertIndex, setEditingCertIndex] = useState<number | null>(null);
  const [editingCertValue, setEditingCertValue] = useState('');
  
  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  
  // Dialog states
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{
    open: boolean;
    type: 'certificate' | 'file';
    index?: number;
    fileId?: string;
    fileName?: string;
  }>({ open: false, type: 'certificate' });

  const [previewDialog, setPreviewDialog] = useState<{
    open: boolean;
    file?: Step4DocumentFile;
    loading: boolean;
    previewUrl?: string;
    error?: string;
  }>({ open: false, loading: false });

  // Load Step 4 data on component mount
  useEffect(() => {
    loadStep4Data();
  }, [clientId]);

  const loadStep4Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStep4Data(clientId);
      setLocalData(data);
      
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error: any) {
      console.error('Error loading Step 4 data:', error);
      setError('Failed to load Step 4 data');
    } finally {
      setLoading(false);
    }
  };

  const saveStep4Data = async (updates: SaveStep4DataRequest) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedData = await apiService.updateStep4Data(clientId, updates);
      setLocalData(updatedData);
      
      if (onDataChange) {
        onDataChange(updatedData);
      }
      
      setSuccess('Data saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving Step 4 data:', error);
      setError(error.response?.data?.message || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!localData) return;

    const updates: SaveStep4DataRequest = {
      dcrCertificates: localData.dcrCertificates
    };

    await saveStep4Data(updates);
  };

  // Certificate number management functions
  const addCertificateNumber = () => {
    if (!newCertificateNumber.trim() || !localData) return;
    
    const updatedNumbers = [...localData.dcrCertificates.certificateNumbers, newCertificateNumber.trim()];
    setLocalData(prev => prev ? {
      ...prev,
      dcrCertificates: {
        ...prev.dcrCertificates,
        certificateNumbers: updatedNumbers
      }
    } : prev);
    setNewCertificateNumber('');
  };

  const startEditingCertificate = (index: number) => {
    if (!localData) return;
    setEditingCertIndex(index);
    setEditingCertValue(localData.dcrCertificates.certificateNumbers[index]);
  };

  const saveEditingCertificate = () => {
    if (!localData || editingCertIndex === null) return;
    
    const updatedNumbers = [...localData.dcrCertificates.certificateNumbers];
    updatedNumbers[editingCertIndex] = editingCertValue.trim();
    
    setLocalData(prev => prev ? {
      ...prev,
      dcrCertificates: {
        ...prev.dcrCertificates,
        certificateNumbers: updatedNumbers
      }
    } : prev);
    
    setEditingCertIndex(null);
    setEditingCertValue('');
  };

  const cancelEditingCertificate = () => {
    setEditingCertIndex(null);
    setEditingCertValue('');
  };

  const deleteCertificateNumber = (index: number) => {
    if (!localData) return;
    
    const updatedNumbers = localData.dcrCertificates.certificateNumbers.filter((_, i) => i !== index);
    setLocalData(prev => prev ? {
      ...prev,
      dcrCertificates: {
        ...prev.dcrCertificates,
        certificateNumbers: updatedNumbers
      }
    } : prev);
    setDeleteConfirmDialog({ open: false, type: 'certificate' });
  };

  // File upload functions
  const handleFileUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) return;

    try {
      setUploadingFiles(true);
      setError(null);

      const files = Array.from(selectedFiles);
      const result = await apiService.uploadStep4Documents(clientId, 'dcrCertificateDocuments', files);
      
      // Reload data to get updated file list
      await loadStep4Data();
      
      setSelectedFiles(null);
      setSuccess(`Successfully uploaded ${files.length} file(s)`);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading files:', error);
      setError(error.response?.data?.message || 'Failed to upload files');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileDelete = async (fileId: string) => {
    try {
      setError(null);
      await apiService.deleteStep4Document(clientId, 'dcrCertificateDocuments', fileId);
      
      // Reload data to get updated file list
      await loadStep4Data();
      
      setSuccess('File deleted successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting file:', error);
      setError(error.response?.data?.message || 'Failed to delete file');
    }
    setDeleteConfirmDialog({ open: false, type: 'file' });
  };

  const handleFileDownload = async (fileId: string, fileName: string) => {
    try {
      const result = await apiService.getStep4DocumentDownloadUrl(clientId, 'dcrCertificateDocuments', fileId);
      
      // Create a temporary link and trigger download
      const link = document.createElement('a');
      link.href = result.downloadUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error: any) {
      console.error('Error downloading file:', error);
      setError(error.response?.data?.message || 'Failed to download file');
    }
  };

  const handlePreviewDocument = async (file: Step4DocumentFile) => {
    // Set initial state with loading
    setPreviewDialog({
      open: true,
      file,
      loading: true
    });

    try {
      // Generate fresh URL for preview
      const result = await apiService.getStep4DocumentDownloadUrl(clientId, 'dcrCertificateDocuments', file.documentId);
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
        Failed to load Step 4 data. Please try refreshing the page.
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          <CertificateIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Step 4: DCR Certificates
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage DCR certificate information and document uploads
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

      {/* Main Form */}
      <Paper sx={{ width: '100%', p: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          {/* DCR Certificate Information */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DCR Certificate Information
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={localData.dcrCertificates.dcrCertificatesGenerated}
                      onChange={(e) => setLocalData(prev => prev ? {
                        ...prev,
                        dcrCertificates: {
                          ...prev.dcrCertificates,
                          dcrCertificatesGenerated: e.target.checked
                        }
                      } : prev)}
                    />
                  }
                  label="DCR Certificates Generated?"
                />
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  <TextField
                    label="Generated Date"
                    type="date"
                    value={localData.dcrCertificates.generatedDate || ''}
                    onChange={(e) => setLocalData(prev => prev ? {
                      ...prev,
                      dcrCertificates: {
                        ...prev.dcrCertificates,
                        generatedDate: e.target.value
                      }
                    } : prev)}
                    InputLabelProps={{ shrink: true }}
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                  <TextField
                    label="Issuing Authority"
                    value={localData.dcrCertificates.issuingAuthority || ''}
                    onChange={(e) => setLocalData(prev => prev ? {
                      ...prev,
                      dcrCertificates: {
                        ...prev.dcrCertificates,
                        issuingAuthority: e.target.value
                      }
                    } : prev)}
                    sx={{ flex: 1, minWidth: 200 }}
                  />
                </Box>
                
                {/* Certificate Numbers Management */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Certificate Numbers:
                  </Typography>
                  
                  {/* Add new certificate number */}
                  <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                    <TextField
                      size="small"
                      placeholder="Enter certificate number"
                      value={newCertificateNumber}
                      onChange={(e) => setNewCertificateNumber(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          addCertificateNumber();
                        }
                      }}
                      sx={{ flex: 1 }}
                    />
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={addCertificateNumber}
                      disabled={!newCertificateNumber.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                  
                  {/* List of certificate numbers */}
                  <List dense>
                    {localData.dcrCertificates.certificateNumbers.map((cert, index) => (
                      <ListItem key={index} divider>
                        {editingCertIndex === index ? (
                          <Box sx={{ display: 'flex', gap: 1, width: '100%', alignItems: 'center' }}>
                            <TextField
                              size="small"
                              value={editingCertValue}
                              onChange={(e) => setEditingCertValue(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  saveEditingCertificate();
                                } else if (e.key === 'Escape') {
                                  cancelEditingCertificate();
                                }
                              }}
                              sx={{ flex: 1 }}
                              autoFocus
                            />
                            <IconButton size="small" onClick={saveEditingCertificate} color="primary">
                              <SaveIcon />
                            </IconButton>
                            <IconButton size="small" onClick={cancelEditingCertificate}>
                              <CloseIcon />
                            </IconButton>
                          </Box>
                        ) : (
                          <>
                            <ListItemText primary={cert} />
                            <ListItemSecondaryAction>
                              <IconButton
                                size="small"
                                onClick={() => startEditingCertificate(index)}
                                sx={{ mr: 1 }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                size="small"
                                onClick={() => setDeleteConfirmDialog({
                                  open: true,
                                  type: 'certificate',
                                  index
                                })}
                                color="error"
                              >
                                <DeleteIcon />
                              </IconButton>
                            </ListItemSecondaryAction>
                          </>
                        )}
                      </ListItem>
                    ))}
                    {localData.dcrCertificates.certificateNumbers.length === 0 && (
                      <ListItem>
                        <ListItemText 
                          primary="No certificate numbers added yet" 
                          sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                        />
                      </ListItem>
                    )}
                  </List>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* DCR Certificate Files */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                DCR Certificate Documents
              </Typography>
              
              {/* File Upload Section */}
              <Box sx={{ mb: 3 }}>
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  style={{ display: 'none' }}
                  id="dcr-file-upload"
                />
                <label htmlFor="dcr-file-upload">
                  <Button
                    variant="outlined"
                    component="span"
                    startIcon={<UploadIcon />}
                    sx={{ mr: 2 }}
                  >
                    Select Files
                  </Button>
                </label>
                {selectedFiles && selectedFiles.length > 0 && (
                  <Button
                    variant="contained"
                    onClick={handleFileUpload}
                    disabled={uploadingFiles}
                    startIcon={uploadingFiles ? <CircularProgress size={20} /> : <UploadIcon />}
                  >
                    {uploadingFiles ? 'Uploading...' : `Upload ${selectedFiles.length} file(s)`}
                  </Button>
                )}
              </Box>

              {/* Selected Files Preview */}
              {selectedFiles && selectedFiles.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Selected Files:
                  </Typography>
                  {Array.from(selectedFiles).map((file, index) => (
                    <Chip
                      key={index}
                      label={file.name}
                      size="small"
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* Uploaded Files List */}
              <Typography variant="subtitle2" gutterBottom>
                Uploaded Documents:
              </Typography>
              <List dense>
                {localData.dcrCertificates.certificateFiles.map((file: Step4DocumentFile) => (
                  <ListItem key={file.documentId} divider>
                    <ListItemText
                      primary={file.originalName}
                      secondary={`${(file.fileSize / 1024 / 1024).toFixed(2)} MB • ${new Date(file.uploadedAt).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      {(isImageFile(file.mimeType) || isPdfFile(file.mimeType)) && (
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewDocument(file)}
                          sx={{ mr: 1 }}
                        >
                          <PreviewIcon />
                        </IconButton>
                      )}
                      <IconButton
                        size="small"
                        onClick={() => handleFileDownload(file.documentId, file.originalName)}
                        sx={{ mr: 1 }}
                      >
                        <DownloadIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => setDeleteConfirmDialog({
                          open: true,
                          type: 'file',
                          fileId: file.documentId,
                          fileName: file.originalName
                        })}
                        color="error"
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
                {localData.dcrCertificates.certificateFiles.length === 0 && (
                  <ListItem>
                    <ListItemText 
                      primary="No documents uploaded yet" 
                      sx={{ fontStyle: 'italic', color: 'text.secondary' }}
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Box>
      </Paper>

      {/* Save Button */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<SaveAllIcon />}
          onClick={handleSave}
          disabled={saving}
          size="large"
        >
          {saving ? 'Saving...' : 'Save DCR Certificate Data'}
        </Button>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteConfirmDialog.open}
        onClose={() => setDeleteConfirmDialog({ open: false, type: 'certificate' })}
      >
        <DialogTitle>
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <Typography>
            {deleteConfirmDialog.type === 'certificate' 
              ? 'Are you sure you want to delete this certificate number?'
              : `Are you sure you want to delete "${deleteConfirmDialog.fileName}"?`
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setDeleteConfirmDialog({ open: false, type: 'certificate' })}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              if (deleteConfirmDialog.type === 'certificate' && deleteConfirmDialog.index !== undefined) {
                deleteCertificateNumber(deleteConfirmDialog.index);
              } else if (deleteConfirmDialog.type === 'file' && deleteConfirmDialog.fileId) {
                handleFileDelete(deleteConfirmDialog.fileId);
              }
            }}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

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
          {previewDialog.file && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleFileDownload(previewDialog.file!.documentId, previewDialog.file!.originalName)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step4Form;
