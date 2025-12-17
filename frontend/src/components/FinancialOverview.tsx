import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  TextField,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  AccountBalance as MoneyIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon,
  TrendingUp as ProfitIcon,
  TrendingDown as LossIcon,
  DateRange as DateRangeIcon,
  Visibility as ViewIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ClientFinancialData {
  clientId: string;
  clientName: string;
  mobile: string;
  status: string;
  priceFinalized: number;
  totalPaymentsReceived: number;
  outstandingBalance: number;
  totalExpenses: number;
  netProfitLoss: number;
  lastPaymentDate: string | null;
  paymentStatus: 'fully_paid' | 'partial' | 'overdue' | 'no_payments';
  paymentCount: number;
  expenseCount: number;
  paymentsInDateRange: number;
  expensesInDateRange: number;
}

interface FinancialSummary {
  totalClients: number;
  totalPriceFinalized: number;
  totalPaymentsReceived: number;
  totalOutstandingBalance: number;
  totalExpenses: number;
  totalNetProfitLoss: number;
  clientsWithPayments: number;
  clientsWithExpenses: number;
  fullyPaidClients: number;
  partiallyPaidClients: number;
  unpaidClients: number;
}

interface DateRangeData {
  startDate?: string;
  endDate?: string;
  paymentsInRange: number;
  paymentsInRangeTotal: number;
  expensesInRange: number;
  expensesInRangeTotal: number;
  netCashFlowInRange: number;
  clientsWithPaymentsInRange: number;
  clientsWithExpensesInRange: number;
  paymentDetails: any[];
  expenseDetails: any[];
}

interface FinancialOverviewData {
  clients: ClientFinancialData[];
  summary: FinancialSummary;
  dateRangeData: DateRangeData | null;
}

const FinancialOverview: React.FC = () => {
  const [data, setData] = useState<FinancialOverviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateRangeDialogOpen, setDateRangeDialogOpen] = useState(false);

  // Load financial overview data
  const loadFinancialData = async (start?: string, end?: string) => {
    try {
      setLoading(true);
      setError(null);
      const financialData = await apiService.getClientsFinancialOverview(start, end);
      setData(financialData);
    } catch (error: any) {
      console.error('Error loading financial data:', error);
      setError('Failed to load financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const handleDateRangeFilter = () => {
    if (startDate || endDate) {
      loadFinancialData(startDate, endDate);
    } else {
      loadFinancialData();
    }
    setDateRangeDialogOpen(false);
  };

  const clearDateRange = () => {
    setStartDate('');
    setEndDate('');
    loadFinancialData();
    setDateRangeDialogOpen(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'success';
      case 'partial': return 'warning';
      case 'overdue': return 'error';
      case 'no_payments': return 'default';
      default: return 'default';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'fully_paid': return 'Fully Paid';
      case 'partial': return 'Partial';
      case 'overdue': return 'Overdue';
      case 'no_payments': return 'No Payments';
      default: return status;
    }
  };

  // Memoized sorted clients for performance - sorted by Balance Due (outstandingBalance) in descending order
  const sortedClients = useMemo(() => {
    if (!data?.clients) return [];
    return [...data.clients].sort((a, b) => b.outstandingBalance - a.outstandingBalance);
  }, [data?.clients]);

  const openDateRangeDetails = () => {
    setDateRangeDialogOpen(true);
  };

  if (loading && !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
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

  if (!data) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No financial data available
      </Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header with Date Range Filter */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoneyIcon />
          Financial Overview
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<DateRangeIcon />}
            onClick={() => setDateRangeDialogOpen(true)}
          >
            Date Range Filter
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => loadFinancialData(startDate, endDate)}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Date Range Indicator */}
      {(startDate || endDate) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Showing data for: {startDate || 'Beginning'} to {endDate || 'Present'}
          <Button size="small" onClick={clearDateRange} sx={{ ml: 2 }}>
            Clear Filter
          </Button>
        </Alert>
      )}

      {/* Summary Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <Card sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <MoneyIcon color="primary" />
              <Typography variant="subtitle2" color="text.secondary">
                Total Price Finalized
              </Typography>
            </Box>
            <Typography variant="h5" color="primary.main">
              {formatCurrency(data.summary.totalPriceFinalized)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.summary.totalClients} clients
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <PaymentIcon color="success" />
              <Typography variant="subtitle2" color="text.secondary">
                Total Payments Received
              </Typography>
            </Box>
            <Typography variant="h5" color="success.main">
              {formatCurrency(data.summary.totalPaymentsReceived)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.summary.clientsWithPayments} clients paid
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <ReceiptIcon color="warning" />
              <Typography variant="subtitle2" color="text.secondary">
                Total Expenses
              </Typography>
            </Box>
            <Typography variant="h5" color="warning.main">
              {formatCurrency(data.summary.totalExpenses)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {data.summary.clientsWithExpenses} clients with expenses
            </Typography>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              {data.summary.totalNetProfitLoss >= 0 ? (
                <ProfitIcon color="success" />
              ) : (
                <LossIcon color="error" />
              )}
              <Typography variant="subtitle2" color="text.secondary">
                Net Profit/Loss
              </Typography>
            </Box>
            <Typography 
              variant="h5" 
              color={data.summary.totalNetProfitLoss >= 0 ? "success.main" : "error.main"}
            >
              {formatCurrency(data.summary.totalNetProfitLoss)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Outstanding: {formatCurrency(data.summary.totalOutstandingBalance)}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Date Range Summary (if applicable) */}
      {data.dateRangeData && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Date Range Summary ({data.dateRangeData.startDate || 'Beginning'} to {data.dateRangeData.endDate || 'Present'})
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'space-around' }}>
              <Box sx={{ textAlign: 'center', flex: '1 1 200px' }}>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(data.dateRangeData.paymentsInRangeTotal)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Payments Received ({data.dateRangeData.paymentsInRange} transactions)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', flex: '1 1 200px' }}>
                <Typography variant="h4" color="warning.main">
                  {formatCurrency(data.dateRangeData.expensesInRangeTotal)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expenses Incurred ({data.dateRangeData.expensesInRange} transactions)
                </Typography>
              </Box>
              <Box sx={{ textAlign: 'center', flex: '1 1 200px' }}>
                <Typography 
                  variant="h4" 
                  color={data.dateRangeData.netCashFlowInRange >= 0 ? "success.main" : "error.main"}
                >
                  {formatCurrency(data.dateRangeData.netCashFlowInRange)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Net Cash Flow
                </Typography>
              </Box>
            </Box>
            {(data.dateRangeData.paymentDetails.length > 0 || data.dateRangeData.expenseDetails.length > 0) && (
              <Box sx={{ mt: 2, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<ViewIcon />}
                  onClick={openDateRangeDetails}
                >
                  View Transaction Details
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clients Financial Table */}
      <Paper>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6">
            Client Financial Details ({sortedClients.length} clients)
          </Typography>
        </Box>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell>Client Name</TableCell>
                <TableCell align="right">Price Finalized</TableCell>
                <TableCell align="right">Payments Received</TableCell>
                <TableCell align="right">Balance Due</TableCell>
                <TableCell align="right">Total Expenses</TableCell>
                <TableCell align="right">Net Profit/Loss</TableCell>
                <TableCell>Payment Status</TableCell>
                <TableCell>Last Payment</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sortedClients.map((client) => (
                <TableRow key={client.clientId} hover>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {client.clientName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {client.mobile}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2">
                      {formatCurrency(client.priceFinalized)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="success.main">
                      {formatCurrency(client.totalPaymentsReceived)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({client.paymentCount} payments)
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      color={client.outstandingBalance > 0 ? "warning.main" : "success.main"}
                    >
                      {formatCurrency(client.outstandingBalance)}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="warning.main">
                      {formatCurrency(client.totalExpenses)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({client.expenseCount} expenses)
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography 
                      variant="body2" 
                      color={client.netProfitLoss >= 0 ? "success.main" : "error.main"}
                      fontWeight="medium"
                    >
                      {formatCurrency(client.netProfitLoss)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getPaymentStatusLabel(client.paymentStatus)}
                      color={getPaymentStatusColor(client.paymentStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {client.lastPaymentDate 
                        ? new Date(client.lastPaymentDate).toLocaleDateString()
                        : 'No payments'
                      }
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Date Range Filter Dialog */}
      <Dialog open={dateRangeDialogOpen} onClose={() => setDateRangeDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Filter by Date Range</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateRangeDialogOpen(false)}>Cancel</Button>
          <Button onClick={clearDateRange}>Clear</Button>
          <Button onClick={handleDateRangeFilter} variant="contained">Apply Filter</Button>
        </DialogActions>
      </Dialog>

      {/* Transaction Details Dialog */}
      <Dialog 
        open={dateRangeDialogOpen && (data?.dateRangeData?.paymentDetails?.length || 0) > 0} 
        onClose={() => setDateRangeDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {data?.dateRangeData && (
            <Box>
              {data.dateRangeData.paymentDetails.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Payments ({data.dateRangeData.paymentDetails.length})
                  </Typography>
                  <List>
                    {data.dateRangeData.paymentDetails.map((payment, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${payment.clientName} - ${formatCurrency(payment.amount)}`}
                          secondary={`${new Date(payment.timestamp).toLocaleDateString()} - ${payment.receiver}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
              
              {data.dateRangeData.expenseDetails.length > 0 && (
                <Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Expenses ({data.dateRangeData.expenseDetails.length})
                  </Typography>
                  <List>
                    {data.dateRangeData.expenseDetails.map((expense, index) => (
                      <ListItem key={index}>
                        <ListItemText
                          primary={`${expense.clientName} - ${formatCurrency(expense.amount)}`}
                          secondary={`${new Date(expense.createdAt).toLocaleDateString()} - ${expense.expenseType}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDateRangeDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FinancialOverview;
