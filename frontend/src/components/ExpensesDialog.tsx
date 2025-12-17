import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  InputAdornment,
  Card,
  CardContent,
  CardActions,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Alert,
  CircularProgress,
  Fab,
  Paper,
  Stack,
  Tooltip
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon,
  GetApp as DownloadIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Receipt as ReceiptIcon,
  CloudUpload as CloudUploadIcon,
  Visibility as ViewIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { EXPENSE_TYPES } from '../shared/types';

interface ExpensesDialogProps {
  open: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
}

interface Expense {
  expenseId: string;
  clientId: string;
  expenseType: keyof typeof EXPENSE_TYPES;
  customExpenseType?: string;
  amount: number;
  description?: string;
  documents: ExpenseDocument[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface ExpenseDocument {
  documentId: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;
  s3Key: string;
  s3Url?: string;
  thumbnailUrl?: string;
}

interface ExpenseSummary {
  totalExpenses: number;
  expensesByType: {
    material_cost: number;
    civil_work_cost: number;
    labour_cost: number;
    auto_cost: number;
    other: number;
  };
  expenseCount: number;
}

const ExpensesDialog: React.FC<ExpensesDialogProps> = ({
  open,
  onClose,
  clientId,
  clientName
}) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState({
    expenseType: '' as keyof typeof EXPENSE_TYPES,
    customExpenseType: '',
    amount: '',
    description: ''
  });
  
  // File upload states
  const [uploadingFiles, setUploadingFiles] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Load expenses when dialog opens
  useEffect(() => {
    if (open && clientId) {
      loadExpenses();
      loadSummary();
    }
  }, [open, clientId]);

  const loadExpenses = async () => {
    try {
      setLoading(true);
      setError(null);
      const expensesData = await apiService.getClientExpenses(clientId);
      setExpenses(expensesData);
    } catch (error) {
      console.error('Error loading expenses:', error);
      setError('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const loadSummary = async () => {
    try {
      const summaryData = await apiService.getClientExpenseSummary(clientId);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading expense summary:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const resetForm = () => {
    setFormData({
      expenseType: '' as keyof typeof EXPENSE_TYPES,
      customExpenseType: '',
      amount: '',
      description: ''
    });
    setSelectedFiles([]);
    setShowAddForm(false);
    setEditingExpense(null);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.expenseType || !formData.amount) {
        setError('Expense type and amount are required');
        return;
      }

      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      if (formData.expenseType === 'other' && !formData.customExpenseType.trim()) {
        setError('Please specify the custom expense type');
        return;
      }

      setLoading(true);
      setError(null);

      const expenseData = {
        expenseType: formData.expenseType,
        customExpenseType: formData.expenseType === 'other' ? formData.customExpenseType.trim() : undefined,
        amount,
        description: formData.description.trim() || undefined
      };

      let expense: Expense;
      if (editingExpense) {
        expense = await apiService.updateClientExpense(clientId, editingExpense.expenseId, expenseData);
      } else {
        expense = await apiService.createClientExpense(clientId, expenseData);
      }

      // Upload files if any
      if (selectedFiles.length > 0) {
        setUploadingFiles(expense.expenseId);
        try {
          await apiService.uploadExpenseDocuments(clientId, expense.expenseId, selectedFiles);
        } catch (uploadError) {
          console.error('Error uploading files:', uploadError);
          setError('Expense created but failed to upload some files');
        } finally {
          setUploadingFiles(null);
        }
      }

      resetForm();
      await loadExpenses();
      await loadSummary();
    } catch (error: any) {
      console.error('Error saving expense:', error);
      setError(error.response?.data?.message || 'Failed to save expense');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expenseType: expense.expenseType,
      customExpenseType: expense.customExpenseType || '',
      amount: expense.amount.toString(),
      description: expense.description || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (expense: Expense) => {
    if (!window.confirm(`Are you sure you want to delete this ${EXPENSE_TYPES[expense.expenseType]} expense of ${formatCurrency(expense.amount)}?`)) {
      return;
    }

    try {
      setLoading(true);
      await apiService.deleteClientExpense(clientId, expense.expenseId);
      await loadExpenses();
      await loadSummary();
    } catch (error: any) {
      console.error('Error deleting expense:', error);
      setError(error.response?.data?.message || 'Failed to delete expense');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (expenseId: string, files: File[]) => {
    try {
      setUploadingFiles(expenseId);
      await apiService.uploadExpenseDocuments(clientId, expenseId, files);
      await loadExpenses();
    } catch (error) {
      console.error('Error uploading files:', error);
      setError('Failed to upload files');
    } finally {
      setUploadingFiles(null);
    }
  };

  const handleDownloadDocument = async (expense: Expense, document: ExpenseDocument) => {
    try {
      const downloadData = await apiService.getExpenseDocumentDownloadUrl(clientId, expense.expenseId, document.documentId);
      window.open(downloadData.downloadUrl, '_blank');
    } catch (error) {
      console.error('Error downloading document:', error);
      setError('Failed to download document');
    }
  };

  const handleDeleteDocument = async (expense: Expense, document: ExpenseDocument) => {
    if (!window.confirm(`Are you sure you want to delete "${document.originalName}"?`)) {
      return;
    }

    try {
      await apiService.deleteExpenseDocument(clientId, expense.expenseId, document.documentId);
      await loadExpenses();
    } catch (error) {
      console.error('Error deleting document:', error);
      setError('Failed to delete document');
    }
  };

  const getExpenseTypeDisplay = (expense: Expense) => {
    if (expense.expenseType === 'other' && expense.customExpenseType) {
      return expense.customExpenseType;
    }
    return EXPENSE_TYPES[expense.expenseType];
  };

  return (
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
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ReceiptIcon />
            <Typography variant="h6">
              Expenses - {clientName}
            </Typography>
          </Box>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Summary Cards */}
        {summary && (
          <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ minWidth: 200, flex: '0 1 auto' }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Total Expenses
                </Typography>
                <Typography variant="h5" color="primary">
                  {formatCurrency(summary.totalExpenses)}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  {summary.expenseCount} expense{summary.expenseCount !== 1 ? 's' : ''}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: '1 1 auto', minWidth: 300 }}>
              <CardContent>
                <Typography color="textSecondary" gutterBottom variant="body2">
                  Breakdown by Type
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {Object.entries(summary.expensesByType).map(([type, amount]) => (
                    amount > 0 && (
                      <Chip
                        key={type}
                        label={`${EXPENSE_TYPES[type as keyof typeof EXPENSE_TYPES]}: ${formatCurrency(amount)}`}
                        size="small"
                        variant="outlined"
                      />
                    )
                  ))}
                </Stack>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                  <FormControl fullWidth>
                    <InputLabel>Expense Type</InputLabel>
                    <Select
                      value={formData.expenseType}
                      onChange={(e) => setFormData({ ...formData, expenseType: e.target.value as keyof typeof EXPENSE_TYPES })}
                      input={<OutlinedInput label="Expense Type" />}
                    >
                      {Object.entries(EXPENSE_TYPES).map(([key, label]) => (
                        <MenuItem key={key} value={key}>
                          {label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Box>

                {formData.expenseType === 'other' && (
                  <Box sx={{ flex: '1 1 300px', minWidth: 200 }}>
                    <TextField
                      fullWidth
                      label="Custom Expense Type"
                      value={formData.customExpenseType}
                      onChange={(e) => setFormData({ ...formData, customExpenseType: e.target.value })}
                      placeholder="e.g., Transportation, Equipment"
                    />
                  </Box>
                )}

                <Box sx={{ flex: '1 1 200px', minWidth: 150 }}>
                  <TextField
                    fullWidth
                    label="Amount"
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                </Box>
              </Box>

              <TextField
                fullWidth
                label="Description (Optional)"
                multiline
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Additional details about this expense..."
              />

              {!editingExpense && (
                <Box sx={{ border: '2px dashed #ccc', borderRadius: 1, p: 2, textAlign: 'center' }}>
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                    onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                    style={{ display: 'none' }}
                    id="expense-file-upload"
                  />
                  <label htmlFor="expense-file-upload">
                    <Button
                      variant="outlined"
                      component="span"
                      startIcon={<CloudUploadIcon />}
                    >
                      Upload Documents
                    </Button>
                  </label>
                  {selectedFiles.length > 0 && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                      </Typography>
                      {selectedFiles.map((file, index) => (
                        <Chip
                          key={index}
                          label={file.name}
                          size="small"
                          onDelete={() => setSelectedFiles(files => files.filter((_, i) => i !== index))}
                          sx={{ m: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <Button
                variant="contained"
                onClick={handleSubmit}
                disabled={loading}
                startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
              >
                {editingExpense ? 'Update' : 'Add'} Expense
              </Button>
              <Button
                variant="outlined"
                onClick={resetForm}
                startIcon={<CancelIcon />}
              >
                Cancel
              </Button>
            </Box>
          </Paper>
        )}

        {/* Expenses List */}
        {loading && expenses.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : expenses.length === 0 ? (
          <Box sx={{ textAlign: 'center', p: 3 }}>
            <Typography variant="h6" color="textSecondary">
              No expenses recorded yet
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
              Click the "Add Expense" button to get started
            </Typography>
          </Box>
        ) : (
          <Box>
            {expenses.map((expense, index) => (
              <Card key={expense.expenseId} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="h6">
                        {formatCurrency(expense.amount)}
                      </Typography>
                      <Chip
                        label={getExpenseTypeDisplay(expense)}
                        size="small"
                        color="primary"
                        variant="outlined"
                      />
                    </Box>
                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(expense)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      {user?.role === 'admin' && (
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error" onClick={() => handleDelete(expense)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Box>

                  {expense.description && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      {expense.description}
                    </Typography>
                  )}

                  <Typography variant="caption" color="textSecondary">
                    Added on {new Date(expense.createdAt).toLocaleDateString('en-IN')}
                  </Typography>

                  {/* Documents */}
                  {expense.documents.length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Documents ({expense.documents.length})
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {expense.documents.map((document) => (
                          <Chip
                            key={document.documentId}
                            label={document.originalName}
                            size="small"
                            icon={<AttachFileIcon />}
                            onClick={() => handleDownloadDocument(expense, document)}
                            onDelete={() => handleDeleteDocument(expense, document)}
                            deleteIcon={<DeleteIcon />}
                          />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {/* File Upload for existing expenses */}
                  <Box sx={{ mt: 2 }}>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        if (files.length > 0) {
                          handleFileUpload(expense.expenseId, files);
                        }
                      }}
                      style={{ display: 'none' }}
                      id={`file-upload-${expense.expenseId}`}
                    />
                    <label htmlFor={`file-upload-${expense.expenseId}`}>
                      <Button
                        variant="outlined"
                        component="span"
                        size="small"
                        startIcon={uploadingFiles === expense.expenseId ? <CircularProgress size={16} /> : <CloudUploadIcon />}
                        disabled={uploadingFiles === expense.expenseId}
                      >
                        Add Documents
                      </Button>
                    </label>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #e0e0e0' }}>
        {!showAddForm && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setShowAddForm(true)}
          >
            Add Expense
          </Button>
        )}
        <Button onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ExpensesDialog;
