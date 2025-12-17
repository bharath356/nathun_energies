import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Alert,
  Divider,
  Card,
  CardContent,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  Download as DownloadIcon,
  AttachMoney as MoneyIcon,
  Receipt as ReceiptIcon,
  Visibility as PreviewIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import { Step1PricingDetails, Step1PaymentLog, AddPaymentLogRequest, Step1Documents } from '../../shared/types';
import { apiService } from '../../services/api';

// Extended interface to include payment date
interface ExtendedAddPaymentLogRequest extends AddPaymentLogRequest {
  paymentDate?: string;
}

interface PreviewState {
  open: boolean;
  loading: boolean;
  previewUrl?: string;
  error?: string;
}

interface Step1PricingFormProps {
  clientId: string;
  data?: Step1PricingDetails;
  documents?: Step1Documents;
  onChange: (data: Partial<Step1PricingDetails>) => void;
  onDocumentsChange?: () => void;
  disabled?: boolean;
}

const Step1PricingForm: React.FC<Step1PricingFormProps> = ({
  clientId,
  data,
  documents,
  onChange,
  onDocumentsChange,
  disabled = false
}) => {
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Step1PaymentLog | null>(null);
  const [quotationFile, setQuotationFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewDialog, setPreviewDialog] = useState<PreviewState>({
    open: false,
    loading: false
  });
  const [paymentForm, setPaymentForm] = useState<ExtendedAddPaymentLogRequest>({
    amount: 0,
    receiver: '',
    notes: '',
    paymentDate: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
  });

  const handlePricingChange = (field: keyof Step1PricingDetails, value: any) => {
    onChange({ [field]: value });
  };

  const handleQuotationUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Please upload a PDF file');
      return;
    }

    setQuotationFile(file);
    setUploading(true);

    try {
      // Upload quotation PDF using the document upload API
      const result = await apiService.uploadStep1Documents(clientId, 'quotation', [file]);
      if (result.uploadedFiles && result.uploadedFiles.length > 0) {
        const uploadedFile = result.uploadedFiles[0];
        handlePricingChange('quotationPdfUrl', uploadedFile.s3Url);
        // Trigger documents refresh if callback is provided
        if (onDocumentsChange) {
          onDocumentsChange();
        }
      }
    } catch (error) {
      console.error('Error uploading quotation:', error);
      alert('Failed to upload quotation PDF');
    } finally {
      setUploading(false);
      setQuotationFile(null);
      // Reset file input
      event.target.value = '';
    }
  };

  const handlePreviewQuotation = async () => {
    const quotationFiles = documents?.quotation || [];
    if (quotationFiles.length === 0) {
      alert('No quotation document found');
      return;
    }

    const quotationFile = quotationFiles[0];
    
    setPreviewDialog({
      open: true,
      loading: true
    });

    try {
      const result = await apiService.getStep1DocumentDownloadUrl(clientId, 'quotation', quotationFile.documentId);
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

  const handleDownloadQuotation = async () => {
    const quotationFiles = documents?.quotation || [];
    if (quotationFiles.length === 0) {
      alert('No quotation document found');
      return;
    }

    const quotationFile = quotationFiles[0];
    
    try {
      const result = await apiService.getStep1DocumentDownloadUrl(clientId, 'quotation', quotationFile.documentId);
      if (result.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Failed to download document. Please try again.');
    }
  };

  const handleDeleteQuotation = async () => {
    const quotationFiles = documents?.quotation || [];
    if (quotationFiles.length === 0) {
      alert('No quotation document found');
      return;
    }

    if (!window.confirm('Are you sure you want to delete the quotation document?')) {
      return;
    }

    const quotationFile = quotationFiles[0];
    
    try {
      await apiService.deleteStep1Document(clientId, 'quotation', quotationFile.documentId);
      handlePricingChange('quotationPdfUrl', undefined);
      if (onDocumentsChange) {
        onDocumentsChange();
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete document. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openPaymentDialog = (payment?: Step1PaymentLog) => {
    if (payment) {
      setEditingPayment(payment);
      setPaymentForm({
        amount: payment.amount,
        receiver: payment.receiver,
        notes: payment.notes || '',
        paymentDate: payment.timestamp ? new Date(payment.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      });
    } else {
      setEditingPayment(null);
      setPaymentForm({
        amount: 0,
        receiver: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
      });
    }
    setPaymentDialogOpen(true);
  };

  const closePaymentDialog = () => {
    setPaymentDialogOpen(false);
    setEditingPayment(null);
    setPaymentForm({
      amount: 0,
      receiver: '',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleSavePayment = async () => {
    try {
      if (editingPayment) {
        // Update existing payment log
        const updatedLogs = data?.paymentLogs?.map(log => 
          log.id === editingPayment.id 
            ? { ...log, ...paymentForm, timestamp: paymentForm.paymentDate ? new Date(paymentForm.paymentDate).toISOString() : log.timestamp }
            : log
        ) || [];
        onChange({ paymentLogs: updatedLogs });
      } else {
        // Add new payment log
        const newPaymentLog = await apiService.addStep1PaymentLog(clientId, paymentForm);
        // The API now returns just the new payment log
        if (newPaymentLog) {
          const updatedLogs = [...(data?.paymentLogs || []), newPaymentLog];
          onChange({ paymentLogs: updatedLogs });
        }
      }
      closePaymentDialog();
    } catch (error) {
      console.error('Error saving payment log:', error);
      alert('Failed to save payment log');
    }
  };

  const handleDeletePayment = (paymentId: string) => {
    if (window.confirm('Are you sure you want to delete this payment log?')) {
      const updatedLogs = data?.paymentLogs.filter(log => log.id !== paymentId) || [];
      onChange({ paymentLogs: updatedLogs });
    }
  };

  const calculateTotalReceived = () => {
    if (!data?.paymentLogs || !Array.isArray(data.paymentLogs)) {
      return 0;
    }
    return data.paymentLogs.reduce((total, log) => {
      const amount = typeof log?.amount === 'number' ? log.amount : 0;
      return total + amount;
    }, 0);
  };

  const calculateBalance = () => {
    const finalized = typeof data?.priceFinalized === 'number' ? data.priceFinalized : 0;
    const received = calculateTotalReceived();
    return finalized - received;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Pricing Details (Admin Only)
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Manage pricing information, quotations, and payment tracking
      </Typography>

      {/* Pricing Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', mb: 3 }}>
        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyIcon color="primary" />
              <Typography variant="subtitle2" color="text.secondary">
                Price Finalized
              </Typography>
            </Box>
            <Typography variant="h4" color="primary.main">
              ₹{data?.priceFinalized?.toLocaleString() || '0'}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ReceiptIcon color="success" />
              <Typography variant="subtitle2" color="text.secondary">
                Total Received
              </Typography>
            </Box>
            <Typography variant="h4" color="success.main">
              ₹{calculateTotalReceived().toLocaleString()}
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: 1, minWidth: 200 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyIcon color={calculateBalance() > 0 ? "warning" : "success"} />
              <Typography variant="subtitle2" color="text.secondary">
                Balance
              </Typography>
            </Box>
            <Typography 
              variant="h4" 
              color={calculateBalance() > 0 ? "warning.main" : "success.main"}
            >
              ₹{calculateBalance().toLocaleString()}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Pricing Information */}
      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Pricing Information
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <TextField
                fullWidth
                label="Price Quoted (₹)"
                type="number"
                value={data?.priceQuoted ?? ''}
                onChange={(e) => handlePricingChange('priceQuoted', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                inputProps={{ min: 0 }}
                placeholder="Enter quoted price"
              />
            </Box>
            
            <Box sx={{ flex: 1, minWidth: 250 }}>
              <TextField
                fullWidth
                label="Price Finalized (₹)"
                type="number"
                value={data?.priceFinalized ?? ''}
                onChange={(e) => handlePricingChange('priceFinalized', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                onFocus={(e) => e.target.select()}
                disabled={disabled}
                inputProps={{ min: 0 }}
                placeholder="Enter finalized price"
              />
            </Box>
          </Box>

          {/* Quotation Upload */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="subtitle2">
                Quotation Document
              </Typography>
              {documents?.quotation && documents.quotation.length > 0 ? (
                <Chip
                  size="small"
                  icon={<CheckIcon />}
                  label="Uploaded"
                  color="success"
                  variant="outlined"
                />
              ) : (
                <Chip
                  size="small"
                  icon={<WarningIcon />}
                  label="Not Uploaded"
                  color="warning"
                  variant="outlined"
                />
              )}
            </Box>

            {/* Upload Area */}
            {(!documents?.quotation || documents.quotation.length === 0) && (
              <Paper
                variant="outlined"
                sx={{
                  p: 3,
                  textAlign: 'center',
                  border: '2px dashed',
                  borderColor: 'grey.300',
                  backgroundColor: 'grey.50',
                  cursor: 'pointer',
                  mb: 2,
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: 'primary.50'
                  }
                }}
                component="label"
              >
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={handleQuotationUpload}
                  disabled={disabled || uploading}
                />
                
                <UploadIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="h6" gutterBottom>
                  {uploading ? 'Uploading...' : 'Drop quotation PDF here or click to browse'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  PDF files only • Max 10MB per file
                </Typography>
                
                {uploading && (
                  <Box sx={{ mt: 2 }}>
                    <LinearProgress variant="indeterminate" />
                  </Box>
                )}
              </Paper>
            )}

            {/* File Display */}
            {documents?.quotation && documents.quotation.length > 0 && (
              <Paper variant="outlined" sx={{ mb: 2 }}>
                <List dense>
                  {documents.quotation.map((file, index) => (
                    <ListItem key={file.documentId} divider={index < documents.quotation.length - 1}>
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {file.originalName}
                            </Typography>
                            <Chip size="small" label="PDF" color="error" variant="outlined" />
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
                          <IconButton
                            size="small"
                            onClick={handlePreviewQuotation}
                            title="Preview"
                          >
                            <PreviewIcon />
                          </IconButton>
                          
                          <IconButton
                            size="small"
                            onClick={handleDownloadQuotation}
                            title="Download"
                          >
                            <DownloadIcon />
                          </IconButton>
                          
                          {!disabled && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={handleDeleteQuotation}
                              title="Delete"
                            >
                              <DeleteIcon />
                            </IconButton>
                          )}
                        </Box>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}

            {/* Alternative Upload Button for when file exists */}
            {documents?.quotation && documents.quotation.length > 0 && !disabled && (
              <Button
                variant="outlined"
                component="label"
                startIcon={<AttachFileIcon />}
                disabled={uploading}
                size="small"
              >
                {uploading ? 'Uploading...' : 'Replace Quotation PDF'}
                <input
                  type="file"
                  hidden
                  accept=".pdf"
                  onChange={handleQuotationUpload}
                />
              </Button>
            )}
          </Box>
        </Box>
      </Paper>

      {/* Payment Logs */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Payment Logs
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => openPaymentDialog()}
            disabled={disabled}
          >
            Add Payment
          </Button>
        </Box>

        {!data?.paymentLogs || data.paymentLogs.length === 0 ? (
          <Alert severity="info">
            No payment logs recorded. Click "Add Payment" to record the first payment.
          </Alert>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Receiver</TableCell>
                  <TableCell>Notes</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.paymentLogs.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.timestamp ? new Date(payment.timestamp).toLocaleDateString() : '-'}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={`₹${(typeof payment.amount === 'number' ? payment.amount : 0).toLocaleString()}`}
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{payment.receiver || '-'}</TableCell>
                    <TableCell>{payment.notes || '-'}</TableCell>
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => openPaymentDialog(payment)}
                        disabled={disabled}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDeletePayment(payment.id)}
                        disabled={disabled}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onClose={closePaymentDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingPayment ? 'Edit Payment Log' : 'Add Payment Log'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentForm.paymentDate || ''}
              onChange={(e) => setPaymentForm({ ...paymentForm, paymentDate: e.target.value })}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Select the date when payment was received"
            />
            
            <TextField
              fullWidth
              label="Amount (₹)"
              type="number"
              value={paymentForm.amount ?? ''}
              onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 0 }}
              placeholder="Enter payment amount"
              required
            />
            
            <TextField
              fullWidth
              label="Receiver"
              value={paymentForm.receiver}
              onChange={(e) => setPaymentForm({ ...paymentForm, receiver: e.target.value })}
              placeholder="Name of person/entity who received payment"
              required
            />
            
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={paymentForm.notes}
              onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
              multiline
              rows={3}
              placeholder="Additional notes about this payment..."
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closePaymentDialog}>Cancel</Button>
          <Button 
            onClick={handleSavePayment} 
            variant="contained"
            disabled={!paymentForm.amount || !paymentForm.receiver}
          >
            {editingPayment ? 'Update' : 'Add'} Payment
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
          Quotation Document Preview
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

          {!previewDialog.loading && !previewDialog.error && previewDialog.previewUrl && (
            <Box sx={{ width: '100%', height: '70vh' }}>
              <iframe
                src={previewDialog.previewUrl}
                title="Quotation Document Preview"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialog({ open: false, loading: false })}>
            Close
          </Button>
          {documents?.quotation && documents.quotation.length > 0 && (
            <Button
              variant="contained"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadQuotation}
            >
              Download
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step1PricingForm;
