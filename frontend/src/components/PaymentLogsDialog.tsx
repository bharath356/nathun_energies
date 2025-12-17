import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Chip,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  TextField,
  Paper,
  Divider
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Payment as PaymentIcon,
  Receipt as ReceiptIcon,
  AccountBalance as MoneyIcon,
  ArrowBack as ArrowBackIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { Step1PaymentLog, AddPaymentLogRequest } from '../shared/types';

interface PaymentLogsDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onPaymentUpdate?: () => void;
}

interface ExtendedAddPaymentLogRequest extends AddPaymentLogRequest {
  paymentDate?: string;
}

interface PaymentDialogState {
  open: boolean;
  editingPayment: Step1PaymentLog | null;
  form: ExtendedAddPaymentLogRequest;
}

const PaymentLogsDialog: React.FC<PaymentLogsDialogProps> = ({
  open,
  onClose,
  clientId,
  clientName,
  onPaymentUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentLogs, setPaymentLogs] = useState<Step1PaymentLog[]>([]);
  const [pricingData, setPricingData] = useState<any>(null);
  
  const [paymentDialog, setPaymentDialog] = useState<PaymentDialogState>({
    open: false,
    editingPayment: null,
    form: {
      amount: 0,
      receiver: '',
      notes: '',
      paymentDate: new Date().toISOString().split('T')[0]
    }
  });

  // Load payment data when dialog opens
  useEffect(() => {
    if (open && clientId) {
      loadPaymentData();
    }
  }, [open, clientId]);

  const loadPaymentData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load Step 1 data to get payment logs and pricing info
      const step1Data = await apiService.getStep1Data(clientId);
      
      if (step1Data?.pricingDetails) {
        setPricingData(step1Data.pricingDetails);
        setPaymentLogs(step1Data.pricingDetails.paymentLogs || []);
      } else {
        // If no pricing data exists, initialize empty state
        setPricingData({ paymentLogs: [] });
        setPaymentLogs([]);
      }
    } catch (error: any) {
      console.error('Error loading payment data:', error);
      setError('Failed to load payment data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const openPaymentDialog = (payment?: Step1PaymentLog) => {
    if (payment) {
      setPaymentDialog({
        open: true,
        editingPayment: payment,
        form: {
          amount: payment.amount,
          receiver: payment.receiver,
          notes: payment.notes || '',
          paymentDate: payment.timestamp ? new Date(payment.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
        }
      });
    } else {
      setPaymentDialog({
        open: true,
        editingPayment: null,
        form: {
          amount: 0,
          receiver: '',
          notes: '',
          paymentDate: new Date().toISOString().split('T')[0]
        }
      });
    }
  };

  const closePaymentDialog = () => {
    setPaymentDialog({
      open: false,
      editingPayment: null,
      form: {
        amount: 0,
        receiver: '',
        notes: '',
        paymentDate: new Date().toISOString().split('T')[0]
      }
    });
  };

  const handleSavePayment = async () => {
    try {
      setError(null);
      setSuccess(null);

      if (paymentDialog.editingPayment) {
        // For editing, we need to update the Step1 data with modified payment logs
        const updatedLogs = paymentLogs.map(log => 
          log.id === paymentDialog.editingPayment!.id 
            ? { 
                ...log, 
                ...paymentDialog.form, 
                timestamp: paymentDialog.form.paymentDate ? new Date(paymentDialog.form.paymentDate).toISOString() : log.timestamp 
              }
            : log
        );
        
        // Update Step1 data with modified payment logs
        await apiService.updateStep1Data(clientId, {
          pricingDetails: {
            ...pricingData,
            paymentLogs: updatedLogs
          }
        });
        
        setPaymentLogs(updatedLogs);
        setSuccess('Payment updated successfully');
      } else {
        // Add new payment log
        const newPaymentLog = await apiService.addStep1PaymentLog(clientId, paymentDialog.form);
        
        if (newPaymentLog) {
          const updatedLogs = [...paymentLogs, newPaymentLog];
          setPaymentLogs(updatedLogs);
          setSuccess('Payment added successfully');
        }
      }
      
      closePaymentDialog();
      
      // Notify parent component of payment update
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error saving payment:', error);
      setError('Failed to save payment. Please try again.');
    }
  };

  const handleDeletePayment = async (paymentId: string) => {
    if (!window.confirm('Are you sure you want to delete this payment log?')) {
      return;
    }

    try {
      setError(null);
      
      const updatedLogs = paymentLogs.filter(log => log.id !== paymentId);
      
      // Update Step1 data with filtered payment logs
      await apiService.updateStep1Data(clientId, {
        pricingDetails: {
          ...pricingData,
          paymentLogs: updatedLogs
        }
      });
      
      setPaymentLogs(updatedLogs);
      setSuccess('Payment deleted successfully');
      
      // Notify parent component of payment update
      if (onPaymentUpdate) {
        onPaymentUpdate();
      }
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (error: any) {
      console.error('Error deleting payment:', error);
      setError('Failed to delete payment. Please try again.');
    }
  };

  const calculateTotalReceived = () => {
    return paymentLogs.reduce((total, log) => {
      const amount = typeof log?.amount === 'number' ? log.amount : 0;
      return total + amount;
    }, 0);
  };

  const calculateBalance = () => {
    const finalized = typeof pricingData?.priceFinalized === 'number' ? pricingData.priceFinalized : 0;
    const received = calculateTotalReceived();
    return finalized - received;
  };

  const handleFormChange = (field: keyof ExtendedAddPaymentLogRequest, value: any) => {
    setPaymentDialog(prev => ({
      ...prev,
      form: {
        ...prev.form,
        [field]: value
      }
    }));
  };

  return (
    <>
      {/* Main Payment Logs Dialog */}
      <Dialog 
        open={open} 
        onClose={onClose} 
        maxWidth="lg" 
        fullWidth
        PaperProps={{
          sx: { 
            height: '90vh',
            display: 'flex',
            flexDirection: 'column'
          }
        }}
      >
        <DialogTitle sx={{ flexShrink: 0 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <IconButton onClick={onClose}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6">
                  Payment Logs - {clientName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Manage payment records and track payment history
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openPaymentDialog()}
                disabled={loading}
              >
                Add Payment
              </Button>
              <IconButton onClick={onClose}>
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        
        <Divider sx={{ flexShrink: 0 }} />
        
        <DialogContent 
          sx={{ 
            flex: 1,
            overflow: 'auto',
            p: 3,
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: '#a8a8a8',
            },
          }}
        >
          {/* Error and Success Messages */}
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

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* Payment Summary Cards */}
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
                      ₹{pricingData?.priceFinalized?.toLocaleString() || '0'}
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
                      <PaymentIcon color={calculateBalance() > 0 ? "warning" : "success"} />
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

              {/* Payment Logs Table */}
              <Paper variant="outlined">
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">
                    Payment History ({paymentLogs.length} records)
                  </Typography>
                </Box>

                {paymentLogs.length === 0 ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <PaymentIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No payment records found
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Click "Add Payment" to record the first payment.
                    </Typography>
                    <Button
                      variant="contained"
                      startIcon={<AddIcon />}
                      onClick={() => openPaymentDialog()}
                    >
                      Add First Payment
                    </Button>
                  </Box>
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
                        {paymentLogs
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((payment) => (
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
                            <TableCell>
                              <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                                {payment.notes || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box sx={{ display: 'flex', gap: 0.5 }}>
                                <IconButton
                                  size="small"
                                  onClick={() => openPaymentDialog(payment)}
                                  title="Edit Payment"
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  color="error"
                                  onClick={() => handleDeletePayment(payment.id)}
                                  title="Delete Payment"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Paper>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Payment Dialog */}
      <Dialog 
        open={paymentDialog.open} 
        onClose={closePaymentDialog} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {paymentDialog.editingPayment ? 'Edit Payment Log' : 'Add Payment Log'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              fullWidth
              label="Payment Date"
              type="date"
              value={paymentDialog.form.paymentDate || ''}
              onChange={(e) => handleFormChange('paymentDate', e.target.value)}
              InputLabelProps={{
                shrink: true,
              }}
              helperText="Select the date when payment was received"
            />
            
            <TextField
              fullWidth
              label="Amount (₹)"
              type="number"
              value={paymentDialog.form.amount ?? ''}
              onChange={(e) => handleFormChange('amount', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
              onFocus={(e) => e.target.select()}
              inputProps={{ min: 0 }}
              placeholder="Enter payment amount"
              required
            />
            
            <TextField
              fullWidth
              label="Receiver"
              value={paymentDialog.form.receiver}
              onChange={(e) => handleFormChange('receiver', e.target.value)}
              placeholder="Name of person/entity who received payment"
              required
            />
            
            <TextField
              fullWidth
              label="Notes (Optional)"
              value={paymentDialog.form.notes}
              onChange={(e) => handleFormChange('notes', e.target.value)}
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
            disabled={!paymentDialog.form.amount || !paymentDialog.form.receiver}
          >
            {paymentDialog.editingPayment ? 'Update' : 'Add'} Payment
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default PaymentLogsDialog;
