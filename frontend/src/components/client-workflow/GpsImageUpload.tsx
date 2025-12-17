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
  DialogActions
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  LocationOn as GpsIcon,
  Image as ImageIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon
} from '@mui/icons-material';
import { Step3GeoTaggedImage } from '../../shared/types';

interface GpsImageUploadProps {
  stepName: string;
  stepLabel: string;
  clientId: string;
  gpsImage?: Step3GeoTaggedImage;
  onUpload: (stepName: string, file: File) => Promise<void>;
  onDelete: (stepName: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

const GpsImageUpload: React.FC<GpsImageUploadProps> = ({
  stepName,
  stepLabel,
  clientId,
  gpsImage,
  onUpload,
  onDelete,
  disabled = false,
  loading = false
}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      await onUpload(stepName, file);
    } catch (error: any) {
      console.error('Error uploading GPS image:', error);
      setError(error.message || 'Failed to upload GPS image');
    } finally {
      setUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    try {
      setError(null);
      await onDelete(stepName);
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

  return (
    <Box>
      <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <GpsIcon fontSize="small" />
        GPS Image for {stepLabel}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {gpsImage ? (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ImageIcon color="primary" />
              <Typography variant="body2" fontWeight="medium">
                {gpsImage.originalName}
              </Typography>
              {gpsImage.hasValidGPS ? (
                <Chip
                  icon={<CheckIcon />}
                  label="GPS Valid"
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
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => setShowPreview(true)}
              >
                Preview
              </Button>
              <IconButton
                size="small"
                color="error"
                onClick={handleDelete}
                disabled={disabled || loading}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
          
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Size: {formatFileSize(gpsImage.fileSize)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Coordinates: {formatCoordinates(gpsImage.gpsCoordinates)}
            </Typography>
            {gpsImage.gpsCoordinates?.address && (
              <Typography variant="caption" color="text.secondary">
                Location: {gpsImage.gpsCoordinates.address}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Uploaded: {new Date(gpsImage.uploadedAt).toLocaleString()}
            </Typography>
          </Box>
        </Paper>
      ) : (
        <Paper 
          variant="outlined" 
          sx={{ 
            p: 3, 
            textAlign: 'center', 
            border: '2px dashed',
            borderColor: 'grey.300',
            backgroundColor: 'grey.50',
            cursor: disabled || loading ? 'not-allowed' : 'pointer',
            '&:hover': {
              borderColor: disabled || loading ? 'grey.300' : 'primary.main',
              backgroundColor: disabled || loading ? 'grey.50' : 'primary.50'
            }
          }}
          onClick={() => !disabled && !loading && fileInputRef.current?.click()}
        >
          {uploading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <CircularProgress size={40} />
              <Typography variant="body2" color="text.secondary">
                Uploading GPS image...
              </Typography>
            </Box>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <UploadIcon sx={{ fontSize: 48, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                Click to upload geo-tagged image
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Supports JPEG, PNG, GIF (max 10MB)
              </Typography>
            </Box>
          )}
        </Paper>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        disabled={disabled || loading || uploading}
      />

      {/* Image Preview Dialog */}
      <Dialog
        open={showPreview}
        onClose={() => setShowPreview(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          GPS Image Preview - {stepLabel}
        </DialogTitle>
        <DialogContent>
          {gpsImage && (
            <Box>
              <img
                src={gpsImage.s3Url || gpsImage.thumbnailUrl}
                alt={gpsImage.originalName}
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
                  <strong>Coordinates:</strong> {formatCoordinates(gpsImage.gpsCoordinates)}
                </Typography>
                {gpsImage.gpsCoordinates?.address && (
                  <Typography variant="body2">
                    <strong>Address:</strong> {gpsImage.gpsCoordinates.address}
                  </Typography>
                )}
                {gpsImage.gpsCoordinates?.accuracy && (
                  <Typography variant="body2">
                    <strong>Accuracy:</strong> {gpsImage.gpsCoordinates.accuracy}m
                  </Typography>
                )}
                <Typography variant="body2">
                  <strong>File:</strong> {gpsImage.originalName} ({formatFileSize(gpsImage.fileSize)})
                </Typography>
                <Typography variant="body2">
                  <strong>Uploaded:</strong> {new Date(gpsImage.uploadedAt).toLocaleString()}
                </Typography>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GpsImageUpload;
