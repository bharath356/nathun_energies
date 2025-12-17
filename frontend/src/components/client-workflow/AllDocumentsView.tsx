import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Tooltip,
  Badge
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Visibility as PreviewIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  AttachFile as FileIcon,
  Refresh as RefreshIcon,
  Description as DocumentIcon,
  Image as ImageIcon,
  PictureAsPdf as PdfIcon,
  Close as CloseIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { apiService } from '../../services/api';
import {
  STEP1_DOCUMENT_CATEGORIES,
  STEP2_DOCUMENT_CATEGORIES,
  STEP3_DOCUMENT_CATEGORIES,
  STEP4_DOCUMENT_CATEGORIES,
  STEP5_DOCUMENT_CATEGORIES
} from '../../shared/types';

interface AllDocumentsViewProps {
  clientId: string;
  onRefresh?: () => void;
}

interface DocumentFile {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
}

// GPS Image interface (extends DocumentFile with GPS-specific properties)
interface GpsImageFile extends DocumentFile {
  s3Url?: string;
  thumbnailUrl?: string;
  gpsCoordinates?: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    timestamp?: string;
    address?: string;
  };
  hasValidGPS?: boolean;
}

interface PreviewState {
  open: boolean;
  file?: DocumentFile | GpsImageFile;
  step?: number;
  category?: string;
  loading: boolean;
  previewUrl?: string;
  error?: string;
}

interface GpsPreviewState {
  open: boolean;
  image?: GpsImageFile;
  stepLabel?: string;
}

interface UploadProgress {
  [key: string]: {
    uploading: boolean;
    progress: number;
    error?: string;
  };
}

const AllDocumentsView: React.FC<AllDocumentsViewProps> = ({
  clientId,
  onRefresh
}) => {
  const [allDocuments, setAllDocuments] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<PreviewState>({
    open: false,
    loading: false
  });
  const [gpsPreviewDialog, setGpsPreviewDialog] = useState<GpsPreviewState>({
    open: false
  });
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({});

  const loadAllDocuments = useCallback(async () => {
    try {
      setError(null);
      const data = await apiService.getAllClientDocuments(clientId);
      setAllDocuments(data);
    } catch (error: any) {
      console.error('Error loading all documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadAllDocuments();
  }, [loadAllDocuments]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAllDocuments();
    if (onRefresh) {
      onRefresh();
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

  const getFileIcon = (mimeType: string) => {
    if (isImageFile(mimeType)) {
      return <ImageIcon color="info" />;
    } else if (isPdfFile(mimeType)) {
      return <PdfIcon color="error" />;
    } else {
      return <DocumentIcon color="action" />;
    }
  };

  const isGpsImageCategory = (step: number, category: string) => {
    return step === 3 && [
      'materialDispatch',
      'structureAssembly',
      'panelInstallation',
      'invertorConnection',
      'netMeteringAgreement',
      'plantStarted'
    ].includes(category);
  };

  const handlePreviewDocument = async (file: DocumentFile | GpsImageFile, step: number, category: string) => {
    setPreviewDialog({
      open: true,
      file,
      step,
      category,
      loading: false // Set to false initially for GPS images since we have direct URLs
    });

    try {
      let downloadUrl: string;
      
      // Check if this is a GPS image - use direct S3 URL
      if (isGpsImageCategory(step, category)) {
        // For GPS images, use the s3Url directly from the file object
        const gpsFile = file as GpsImageFile;
        downloadUrl = gpsFile.s3Url || gpsFile.thumbnailUrl || '';
        
        if (!downloadUrl) {
          throw new Error('GPS image URL not available');
        }
        
        // For GPS images, we can set the URL immediately
        setPreviewDialog(prev => ({
          ...prev,
          loading: false,
          previewUrl: downloadUrl
        }));
        return;
      } else {
        // For regular documents, show loading and fetch download URL
        setPreviewDialog(prev => ({
          ...prev,
          loading: true
        }));
        
        // Call appropriate API based on step for regular documents
        switch (step) {
          case 1:
            const step1Result = await apiService.getStep1DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step1Result.downloadUrl;
            break;
          case 2:
            const step2Result = await apiService.getStep2DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step2Result.downloadUrl;
            break;
          case 3:
            const step3Result = await apiService.getStep3DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step3Result.downloadUrl;
            break;
          case 4:
            const step4Result = await apiService.getStep4DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step4Result.downloadUrl;
            break;
          case 5:
            const step5Result = await apiService.getStep5DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step5Result.downloadUrl;
            break;
          default:
            throw new Error('Invalid step number');
        }
      }

      setPreviewDialog(prev => ({
        ...prev,
        loading: false,
        previewUrl: downloadUrl
      }));
    } catch (error) {
      console.error('Preview error:', error);
      setPreviewDialog(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load preview. Please try again.'
      }));
    }
  };

  const handleDownloadDocument = async (file: DocumentFile | GpsImageFile, step: number, category: string) => {
    try {
      let downloadUrl: string;
      
      // Check if this is a GPS image - use direct S3 URL
      if (isGpsImageCategory(step, category)) {
        // For GPS images, use the s3Url directly from the file object
        const gpsFile = file as GpsImageFile;
        downloadUrl = gpsFile.s3Url || gpsFile.thumbnailUrl || '';
        
        if (!downloadUrl) {
          throw new Error('GPS image URL not available');
        }
      } else {
        // Call appropriate API based on step for regular documents
        switch (step) {
          case 1:
            const step1Result = await apiService.getStep1DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step1Result.downloadUrl;
            break;
          case 2:
            const step2Result = await apiService.getStep2DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step2Result.downloadUrl;
            break;
          case 3:
            const step3Result = await apiService.getStep3DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step3Result.downloadUrl;
            break;
          case 4:
            const step4Result = await apiService.getStep4DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step4Result.downloadUrl;
            break;
          case 5:
            const step5Result = await apiService.getStep5DocumentDownloadUrl(clientId, category, file.documentId);
            downloadUrl = step5Result.downloadUrl;
            break;
          default:
            throw new Error('Invalid step number');
        }
      }

      window.open(downloadUrl, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download document. Please try again.');
    }
  };

  const handleDeleteDocument = async (file: DocumentFile, step: number, category: string) => {
    if (!window.confirm(`Are you sure you want to delete "${file.originalName}"?`)) {
      return;
    }

    try {
      // Call appropriate API based on step
      switch (step) {
        case 1:
          await apiService.deleteStep1Document(clientId, category, file.documentId);
          break;
        case 2:
          await apiService.deleteStep2Document(clientId, category, file.documentId);
          break;
        case 3:
          await apiService.deleteStep3Document(clientId, category, file.documentId);
          break;
        case 4:
          await apiService.deleteStep4Document(clientId, category, file.documentId);
          break;
        case 5:
          await apiService.deleteStep5Document(clientId, category, file.documentId);
          break;
        default:
          throw new Error('Invalid step number');
      }

      // Refresh documents
      await loadAllDocuments();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete document. Please try again.');
    }
  };

  const getCategoryConfig = (step: number, category: string) => {
    switch (step) {
      case 1:
        return STEP1_DOCUMENT_CATEGORIES[category as keyof typeof STEP1_DOCUMENT_CATEGORIES];
      case 2:
        return STEP2_DOCUMENT_CATEGORIES[category as keyof typeof STEP2_DOCUMENT_CATEGORIES];
      case 3:
        return STEP3_DOCUMENT_CATEGORIES[category as keyof typeof STEP3_DOCUMENT_CATEGORIES];
      case 4:
        return STEP4_DOCUMENT_CATEGORIES[category as keyof typeof STEP4_DOCUMENT_CATEGORIES];
      case 5:
        return STEP5_DOCUMENT_CATEGORIES[category as keyof typeof STEP5_DOCUMENT_CATEGORIES];
      default:
        return { label: category, required: false, maxFiles: 1 };
    }
  };

  const handleFileUpload = async (step: number, category: string, files: File[]) => {
    const uploadKey = `${step}-${category}`;
    
    try {
      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { uploading: true, progress: 0 }
      }));

      // Call appropriate upload API based on step
      switch (step) {
        case 1:
          await apiService.uploadStep1Documents(clientId, category, files);
          break;
        case 2:
          await apiService.uploadStep2Documents(clientId, category, files);
          break;
        case 3:
          await apiService.uploadStep3Documents(clientId, category, files);
          break;
        case 4:
          await apiService.uploadStep4Documents(clientId, category, files);
          break;
        case 5:
          await apiService.uploadStep5Documents(clientId, category, files);
          break;
        default:
          throw new Error('Invalid step number');
      }

      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { uploading: false, progress: 100 }
      }));

      // Refresh documents after successful upload
      await loadAllDocuments();
      if (onRefresh) {
        onRefresh();
      }

      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadKey];
          return newProgress;
        });
      }, 2000);

    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { 
          uploading: false, 
          progress: 0, 
          error: 'Upload failed. Please try again.' 
        }
      }));
      
      // Clear error after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadKey];
          return newProgress;
        });
      }, 5000);
    }
  };

  const handleStep3GpsImageUpload = async (category: string, file: File) => {
    const uploadKey = `3-gps-${category}`;
    
    try {
      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { uploading: true, progress: 0 }
      }));

      await apiService.uploadStep3GpsImage(clientId, category, file);

      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { uploading: false, progress: 100 }
      }));

      // Refresh documents after successful upload
      await loadAllDocuments();
      if (onRefresh) {
        onRefresh();
      }

      // Clear upload progress after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadKey];
          return newProgress;
        });
      }, 2000);

    } catch (error) {
      console.error('GPS image upload error:', error);
      setUploadProgress(prev => ({
        ...prev,
        [uploadKey]: { 
          uploading: false, 
          progress: 0, 
          error: 'Upload failed. Please try again.' 
        }
      }));
      
      // Clear error after a delay
      setTimeout(() => {
        setUploadProgress(prev => {
          const newProgress = { ...prev };
          delete newProgress[uploadKey];
          return newProgress;
        });
      }, 5000);
    }
  };


  const handleStep3GpsImageDelete = async (category: string, documentId: string) => {
    if (!window.confirm('Are you sure you want to delete this GPS image?')) {
      return;
    }

    try {
      setError(null);
      await apiService.deleteStep3GpsImage(clientId, category, documentId);
      
      // Refresh documents after successful deletion
      await loadAllDocuments();
      if (onRefresh) {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error deleting GPS image:', error);
      setError(error.response?.data?.message || 'Failed to delete GPS image');
    }
  };


  const renderDocumentCategory = (step: number, category: string, files: DocumentFile[]) => {
    const categoryConfig = getCategoryConfig(step, category);
    if (!categoryConfig) return null;

    const completion = categoryConfig.required && files.length === 0 ? 'missing' : 
                     files.length > 0 ? 'complete' : 'optional';
    
    const completionColor = completion === 'missing' ? 'error' : 
                           completion === 'complete' ? 'success' : 'default';
    
    const completionIcon = completion === 'missing' ? <WarningIcon /> : 
                          completion === 'complete' ? <CheckIcon /> : <FileIcon />;

    const uploadKey = `${step}-${category}`;
    const uploadState = uploadProgress[uploadKey];
    const canUpload = files.length < categoryConfig.maxFiles;

    return (
      <Box key={`${step}-${category}`} sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Box sx={{ color: `${completionColor}.main` }}>
            {completionIcon}
          </Box>
          <Typography variant="subtitle2" fontWeight="medium">
            {categoryConfig.label}
          </Typography>
          <Chip
            size="small"
            label={categoryConfig.required ? 'Required' : 'Optional'}
            color={categoryConfig.required ? 'error' : 'default'}
            variant="outlined"
          />
          <Chip
            size="small"
            label={`${files.length}/${categoryConfig.maxFiles}`}
            color={completionColor}
            variant="filled"
          />
        </Box>

        {/* Upload Area */}
        {canUpload && (
          <Box sx={{ mb: 2 }}>
            <input
              type="file"
              multiple={categoryConfig.maxFiles > 1}
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              style={{ display: 'none' }}
              id={`upload-${uploadKey}`}
              onChange={(e) => {
                const selectedFiles = Array.from(e.target.files || []);
                if (selectedFiles.length > 0) {
                  handleFileUpload(step, category, selectedFiles);
                }
                e.target.value = ''; // Reset input
              }}
            />
            <label htmlFor={`upload-${uploadKey}`}>
              <Paper
                sx={{
                  p: 2,
                  border: '2px dashed',
                  borderColor: uploadState?.uploading ? 'primary.main' : 'grey.300',
                  backgroundColor: uploadState?.uploading ? 'action.hover' : 'background.paper',
                  cursor: uploadState?.uploading ? 'not-allowed' : 'pointer',
                  textAlign: 'center',
                  '&:hover': {
                    borderColor: uploadState?.uploading ? 'primary.main' : 'primary.main',
                    backgroundColor: uploadState?.uploading ? 'action.hover' : 'action.hover',
                  },
                }}
              >
                {uploadState?.uploading ? (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={24} />
                    <Typography variant="body2" color="text.secondary">
                      Uploading...
                    </Typography>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <UploadIcon color="action" />
                    <Typography variant="body2" color="text.secondary">
                      Click to upload {categoryConfig.label.toLowerCase()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {categoryConfig.maxFiles > 1 ? 'Multiple files allowed' : 'Single file only'} • PDF, Images, Documents
                    </Typography>
                  </Box>
                )}
              </Paper>
            </label>
            
            {uploadState?.error && (
              <Alert severity="error" sx={{ mt: 1 }}>
                {uploadState.error}
              </Alert>
            )}
          </Box>
        )}

        {files.length > 0 ? (
          <List dense>
            {files.map((file) => (
              <ListItem key={file.documentId} divider>
                <Box sx={{ mr: 1 }}>
                  {getFileIcon(file.mimeType)}
                </Box>
                <ListItemText
                  primary={
                    <Typography variant="body2" fontWeight="medium">
                      {file.originalName}
                    </Typography>
                  }
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        {formatFileSize(file.fileSize)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {(isImageFile(file.mimeType) || isPdfFile(file.mimeType)) && (
                      <Tooltip title="Preview">
                        <IconButton
                          size="small"
                          onClick={() => handlePreviewDocument(file, step, category)}
                        >
                          <PreviewIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Download">
                      <IconButton
                        size="small"
                        onClick={() => handleDownloadDocument(file, step, category)}
                      >
                        <DownloadIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeleteDocument(file, step, category)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        ) : (
          <Alert severity={categoryConfig.required ? "warning" : "info"} sx={{ mt: 1 }}>
            {categoryConfig.required 
              ? `${categoryConfig.label} documents are required.`
              : `No ${categoryConfig.label.toLowerCase()} uploaded yet.`
            }
          </Alert>
        )}
      </Box>
    );
  };

  const renderSpecialStep3Categories = (step3Data: any): React.ReactElement[] => {
    const elements: React.ReactElement[] = [];

    // GPS Images with Upload Functionality
    const gpsCategories = [
      { key: 'materialDispatch', label: 'Material Dispatch', maxImages: 5 },
      { key: 'structureAssembly', label: 'Structure Assembly', maxImages: 5 },
      { key: 'panelInstallation', label: 'Panel Installation', maxImages: 5 },
      { key: 'invertorConnection', label: 'Invertor Connection', maxImages: 5 },
      { key: 'netMeteringAgreement', label: 'Net Metering Agreement', maxImages: 5 },
      { key: 'plantStarted', label: 'Plant Started', maxImages: 5 }
    ];

    gpsCategories.forEach(category => {
      const images = step3Data.gpsImages?.[category.key] || [];
      const uploadKey = `3-gps-${category.key}`;
      const uploadState = uploadProgress[uploadKey];
      const canUpload = images.length < category.maxImages;

      elements.push(
        <Box key={`gps-${category.key}`} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ImageIcon color="info" />
            <Typography variant="subtitle2" fontWeight="medium">
              GPS Images - {category.label}
            </Typography>
            <Chip size="small" label="GPS Tagged" color="info" variant="outlined" />
            <Chip size="small" label={`${images.length}/${category.maxImages}`} color="info" variant="filled" />
          </Box>

          {/* Upload Area for GPS Images */}
          {canUpload && (
            <Box sx={{ mb: 2 }}>
              <input
                type="file"
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                id={`upload-gps-${category.key}`}
                onChange={(e) => {
                  const selectedFiles = Array.from(e.target.files || []);
                  if (selectedFiles.length > 0) {
                    handleStep3GpsImageUpload(category.key, selectedFiles[0]); // GPS images are uploaded one at a time
                  }
                  e.target.value = ''; // Reset input
                }}
              />
              <label htmlFor={`upload-gps-${category.key}`}>
                <Paper
                  sx={{
                    p: 2,
                    border: '2px dashed',
                    borderColor: uploadState?.uploading ? 'primary.main' : 'grey.300',
                    backgroundColor: uploadState?.uploading ? 'action.hover' : 'background.paper',
                    cursor: uploadState?.uploading ? 'not-allowed' : 'pointer',
                    textAlign: 'center',
                    '&:hover': {
                      borderColor: uploadState?.uploading ? 'primary.main' : 'primary.main',
                      backgroundColor: uploadState?.uploading ? 'action.hover' : 'action.hover',
                    },
                  }}
                >
                  {uploadState?.uploading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <CircularProgress size={24} />
                      <Typography variant="body2" color="text.secondary">
                        Uploading GPS image...
                      </Typography>
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                      <UploadIcon color="action" />
                      <Typography variant="body2" color="text.secondary">
                        Click to upload GPS images for {category.label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        JPEG, PNG, GIF (max 10MB) • GPS tagged images preferred
                      </Typography>
                    </Box>
                  )}
                </Paper>
              </label>
              
              {uploadState?.error && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {uploadState.error}
                </Alert>
              )}
            </Box>
          )}

          {images.length > 0 ? (
            <Box sx={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
              gap: 2 
            }}>
              {images.map((image: GpsImageFile) => (
                <Card variant="outlined" key={image.documentId}>
                  <CardMedia
                    component="img"
                    height="200"
                    image={image.thumbnailUrl || image.s3Url}
                    alt={image.originalName}
                    sx={{ 
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => setGpsPreviewDialog({ 
                      open: true, 
                      image, 
                      stepLabel: category.label 
                    })}
                  />
                  <CardContent sx={{ p: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" fontWeight="medium" noWrap>
                        {image.originalName}
                      </Typography>
                      {image.hasValidGPS ? (
                        <Chip
                          icon={<CheckIcon />}
                          label="GPS"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : (
                        <Chip
                          icon={<ErrorIcon />}
                          label="No GPS"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" display="block">
                      Size: {formatFileSize(image.fileSize)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      GPS: {image.gpsCoordinates ? 
                        `${image.gpsCoordinates.latitude.toFixed(6)}, ${image.gpsCoordinates.longitude.toFixed(6)}` : 
                        'No GPS data'}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Uploaded: {new Date(image.uploadedAt).toLocaleDateString()}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ p: 2, pt: 0 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setGpsPreviewDialog({ 
                        open: true, 
                        image, 
                        stepLabel: category.label 
                      })}
                      startIcon={<ImageIcon />}
                    >
                      Preview
                    </Button>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleStep3GpsImageDelete(category.key, image.documentId)}
                      disabled={loading}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              ))}
            </Box>
          ) : (
            <Alert severity="info" sx={{ mt: 1 }}>
              No GPS images uploaded for {category.label} yet.
            </Alert>
          )}
        </Box>
      );
    });


    return elements;
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!allDocuments) {
    return (
      <Alert severity="info">
        No document data available for this client.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          All Documents Overview
        </Typography>
        <Button
          variant="outlined"
          startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          Refresh
        </Button>
      </Box>

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Files
            </Typography>
            <Typography variant="h4">
              {allDocuments.summary.totalFiles}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Completion
            </Typography>
            <Typography variant="h4" color="primary">
              {allDocuments.summary.completionPercentage}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={allDocuments.summary.completionPercentage} 
              sx={{ mt: 1 }}
            />
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Required Categories
            </Typography>
            <Typography variant="h4" color="error.main">
              {allDocuments.summary.totalCompletedCategories}/{allDocuments.summary.totalRequiredCategories}
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ minWidth: 200, flex: 1 }}>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Last Updated
            </Typography>
            <Typography variant="body2">
              {new Date(allDocuments.summary.lastUpdated).toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Documents by Step */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {Object.entries(allDocuments.steps).map(([stepKey, stepData]: [string, any]) => (
          <Accordion key={stepKey} defaultExpanded={stepData.totalFiles > 0}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                <Typography variant="h6" fontWeight="medium">
                  Step {stepData.stepNumber}: {stepData.stepName}
                </Typography>
                <Badge badgeContent={stepData.totalFiles} color="primary">
                  <FileIcon />
                </Badge>
                <Box sx={{ ml: 'auto', display: 'flex', gap: 1 }}>
                  <Chip
                    size="small"
                    label={`${stepData.completedCategories}/${stepData.requiredCategories} Required`}
                    color={stepData.completedCategories === stepData.requiredCategories ? 'success' : 'warning'}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${stepData.totalFiles} Files`}
                    color="primary"
                    variant="filled"
                  />
                </Box>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box>
                {/* Show all document categories for this step */}
                {(() => {
                  let categoryConfig;
                  switch (stepData.stepNumber) {
                    case 1:
                      categoryConfig = STEP1_DOCUMENT_CATEGORIES;
                      break;
                    case 2:
                      categoryConfig = STEP2_DOCUMENT_CATEGORIES;
                      break;
                    case 3:
                      categoryConfig = STEP3_DOCUMENT_CATEGORIES;
                      break;
                    case 4:
                      categoryConfig = STEP4_DOCUMENT_CATEGORIES;
                      break;
                    case 5:
                      categoryConfig = STEP5_DOCUMENT_CATEGORIES;
                      break;
                    default:
                      categoryConfig = {};
                  }

                  return Object.keys(categoryConfig).map(category => {
                    const files = stepData.documents[category] || [];
                    return renderDocumentCategory(stepData.stepNumber, category, files);
                  });
                })()}
                
                {/* Special Step 3 categories */}
                {stepData.stepNumber === 3 && (
                  <>
                    {renderSpecialStep3Categories(stepData)}
                  </>
                )}
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Regular Document Preview Dialog */}
      <Dialog
        open={previewDialog.open}
        onClose={() => setPreviewDialog({ open: false, loading: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Document Preview: {previewDialog.file?.originalName}
            </Typography>
            <IconButton onClick={() => setPreviewDialog({ open: false, loading: false })}>
              <CloseIcon />
            </IconButton>
          </Box>
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, loading: false })}>
            Close
          </Button>
          {previewDialog.file && previewDialog.step && previewDialog.category && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={() => handleDownloadDocument(previewDialog.file!, previewDialog.step!, previewDialog.category!)}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* GPS Image Preview Dialog */}
      <Dialog
        open={gpsPreviewDialog.open}
        onClose={() => setGpsPreviewDialog({ open: false })}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          GPS Image Preview - {gpsPreviewDialog.stepLabel}
        </DialogTitle>
        <DialogContent>
          {gpsPreviewDialog.image && (
            <Box>
              <img
                src={gpsPreviewDialog.image.s3Url || gpsPreviewDialog.image.thumbnailUrl}
                alt={gpsPreviewDialog.image.originalName}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxHeight: '500px',
                  objectFit: 'contain'
                }}
              />
              <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" gutterBottom>
                  GPS Information
                </Typography>
                <Typography variant="body2">
                  <strong>Coordinates:</strong> {gpsPreviewDialog.image.gpsCoordinates ? 
                    `${gpsPreviewDialog.image.gpsCoordinates.latitude.toFixed(6)}, ${gpsPreviewDialog.image.gpsCoordinates.longitude.toFixed(6)}` : 
                    'No GPS data'}
                </Typography>
                {gpsPreviewDialog.image.gpsCoordinates?.address && (
                  <Typography variant="body2">
                    <strong>Address:</strong> {gpsPreviewDialog.image.gpsCoordinates.address}
                  </Typography>
                )}
                {gpsPreviewDialog.image.gpsCoordinates?.accuracy && (
                  <Typography variant="body2">
                    <strong>Accuracy:</strong> {gpsPreviewDialog.image.gpsCoordinates.accuracy}m
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>File:</strong> {gpsPreviewDialog.image.originalName} ({formatFileSize(gpsPreviewDialog.image.fileSize)})
                </Typography>
                <Typography variant="body2">
                  <strong>Uploaded:</strong> {new Date(gpsPreviewDialog.image.uploadedAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGpsPreviewDialog({ open: false })}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllDocumentsView;
