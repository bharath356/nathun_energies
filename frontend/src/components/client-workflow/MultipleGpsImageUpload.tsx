import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  IconButton,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  LocationOn as GpsIcon,
  Image as ImageIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Step3GeoTaggedImage } from '../../shared/types';

interface MultipleGpsImageUploadProps {
  stepName: string;
  stepLabel: string;
  clientId: string;
  gpsImages: Step3GeoTaggedImage[];
  onUpload: (stepName: string, file: File) => Promise<void>;
  onDelete: (stepName: string, documentId: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
  maxImages?: number;
}

const MultipleGpsImageUpload: React.FC<MultipleGpsImageUploadProps> = ({
  stepName,
  stepLabel,
  clientId,
  gpsImages = [],
  onUpload,
  onDelete,
  disabled = false,
  loading = false,
  maxImages = 10
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<Step3GeoTaggedImage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Check if adding these files would exceed the limit
    if (gpsImages.length + files.length > maxImages) {
      setError(`Cannot upload more than ${maxImages} images per step. Currently have ${gpsImages.length} images.`);
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setError(`File "${file.name}" is not an image`);
          continue;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          setError(`File "${file.name}" is too large (max 10MB)`);
          continue;
        }

        await onUpload(stepName, file);
      }
    } catch (error: any) {
      console.error('Error uploading GPS images:', error);
      setError(error.message || 'Failed to upload GPS images');
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (documentId: string) => {
    try {
      setError(null);
      await onDelete(stepName, documentId);
    } catch (error: any) {
      console.error('Error deleting GPS image:', error);
      setError(error.message || 'Failed to delete GPS image');
    }
  };

  const formatCoordinates = (gpsCoordinates?: Step3GeoTaggedImage['gpsCoordinates']) => {
    if (!gpsCoordinates) return 'No GPS data';
    return `${gpsCoordinates.latitude.toFixed(6)}, ${gpsCoordinates.longitude.toFixed(6)}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canUploadMore = gpsImages.length < maxImages;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <GpsIcon fontSize="small" />
          GPS Images for {stepLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {gpsImages.length} / {maxImages} images
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Upload Area */}
      {canUploadMore && (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            mb: 2,
            textAlign: 'center', 
            border: '2px dashed',
            borderColor: 'grey.300',
            backgroundColor: 'grey.50',
            cursor: disabled || loading || uploading ? 'not-allowed' : 'pointer',
            '&:hover': {
              borderColor: disabled || loading || uploading ? 'grey.300' : 'primary.main',
              backgroundColor: disabled || loading || uploading ? 'grey.50' : 'primary.50'
            }
          }}
          onClick={() => !disabled && !loading && !uploading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Uploading GPS images...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <AddIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Click to upload geo-tagged images
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports JPEG, PNG, GIF (max 10MB each) • Multiple files allowed
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      {/* Images Grid */}
      {gpsImages.length > 0 && (
        <Box sx={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
          gap: 2 
        }}>
          {gpsImages.map((image) => (
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
                onClick={() => setPreviewImage(image)}
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
                  GPS: {formatCoordinates(image.gpsCoordinates)}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Uploaded: {new Date(image.uploadedAt).toLocaleDateString()}
                </Typography>
              </CardContent>
              <CardActions sx={{ p: 2, pt: 0 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setPreviewImage(image)}
                  startIcon={<ImageIcon />}
                >
                  Preview
                </Button>
                <IconButton
                  size="small"
                  color="error"
                  onClick={() => handleDelete(image.documentId)}
                  disabled={disabled || loading}
                >
                  <DeleteIcon />
                </IconButton>
              </CardActions>
            </Card>
          ))}
        </Box>
      )}

      {/* Empty State */}
      {gpsImages.length === 0 && !canUploadMore && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', backgroundColor: 'grey.50' }}>
          <ImageIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Maximum number of images reached
          </Typography>
        </Paper>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || loading || uploading || !canUploadMore}
        multiple
      />

      {/* Image Preview Dialog */}
      <Dialog
        open={!!previewImage}
        onClose={() => setPreviewImage(null)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          GPS Image Preview - {stepLabel}
        </DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box>
              <img
                src={previewImage.s3Url || previewImage.thumbnailUrl}
                alt={previewImage.originalName}
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
                  <strong>Coordinates:</strong> {formatCoordinates(previewImage.gpsCoordinates)}
                </Typography>
                {previewImage.gpsCoordinates?.address && (
                  <Typography variant="body2">
                    <strong>Address:</strong> {previewImage.gpsCoordinates.address}
                  </Typography>
                )}
                {previewImage.gpsCoordinates?.accuracy && (
                  <Typography variant="body2">
                    <strong>Accuracy:</strong> {previewImage.gpsCoordinates.accuracy}m
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>File:</strong> {previewImage.originalName} ({formatFileSize(previewImage.fileSize)})
                </Typography>
                <Typography variant="body2">
                  <strong>Uploaded:</strong> {new Date(previewImage.uploadedAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewImage(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MultipleGpsImageUpload;
