import React, { useState, useEffect } from 'react';
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
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Card,
  CardContent,
  Pagination,
  CircularProgress,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  InputAdornment,
  Stack,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Close as CloseIcon,
  ArrowBack as ArrowBackIcon,
  Description as DocumentsIcon,
  Receipt as ReceiptIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { apiService } from '../services/api';
import { WorkflowStepper } from '../components/client-workflow';
import AllDocumentsView from '../components/client-workflow/AllDocumentsView';
import ExpensesDialog from '../components/ExpensesDialog';
import PaymentLogsDialog from '../components/PaymentLogsDialog';
import FinancialOverview from '../components/FinancialOverview';
import { ClientStep, ClientSubStep, User } from '../shared/types';

interface Client {
  clientId: string;
  name: string;
  mobile: string;
  address: string;
  status: 'active' | 'completed' | 'on-hold' | 'cancelled';
  currentStep: number;
  assignedTo: string;
  createdAt: string;
  updatedAt: string;
  assigneeInfo?: {
    firstName?: string;
    lastName?: string;
    email: string;
  };
}

interface ClientStats {
  totalClients: number;
  activeClients: number;
  completedClients: number;
  onHoldClients: number;
  cancelledClients: number;
  clientsByStep: { [stepNumber: number]: number };
  overdueSteps: number;
  completedStepsThisWeek: number;
}

const ClientsPage: React.FC = () => {
  const { user } = useAuth();
  const [globalLoading, setGlobalLoading] = useState(false);

  // State management
  const [clients, setClients] = useState<Client[]>([]);
  const [stats, setStats] = useState<ClientStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [limit] = useState(20);
  const [loading, setLocalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowViewOpen, setWorkflowViewOpen] = useState(false);
  const [allDocumentsViewOpen, setAllDocumentsViewOpen] = useState(false);
  const [expensesDialogOpen, setExpensesDialogOpen] = useState(false);
  const [paymentLogsDialogOpen, setPaymentLogsDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Workflow data
  const [clientSteps, setClientSteps] = useState<ClientStep[]>([]);
  const [clientSubSteps, setClientSubSteps] = useState<ClientSubStep[]>([]);
  const [assigneeInfo, setAssigneeInfo] = useState<Record<string, User>>({});
  const [workflowLoading, setWorkflowLoading] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    mobile: '',
    address: '',
    googleMapsUrl: '',
    comments: '',
    assignedTo: user?.userId || ''
  });

  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    currentStep: '',
    name: '',
    mobile: ''
  });

  // Tab state
  const [currentTab, setCurrentTab] = useState(0);

  // Load initial data
  useEffect(() => {
    loadClients();
    loadStats();
    if (user?.role === 'admin') {
      loadUsers();
    }
  }, [page, filters]);

  const loadClients = async () => {
    try {
      setLocalLoading(true);
      setError(null);

      const params: any = {
        page,
        limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value !== '')
        )
      };

      const response = await apiService.getClients(params);
      setClients(response.items || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (error) {
      console.error('Error loading clients:', error);
      setError('Failed to load clients');
    } finally {
      setLocalLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const statsData = await apiService.getClientStats();
      setStats(statsData);
    } catch (error) {
      console.error('Error loading client stats:', error);
    }
  };

  const loadUsers = async () => {
    try {
      const usersData = await apiService.getActiveUsers();
      setUsers(usersData);
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const handleCreateClient = async () => {
    try {
      setGlobalLoading(true);
      await apiService.createClient(formData);
      setCreateDialogOpen(false);
      setFormData({ name: '', mobile: '', address: '', googleMapsUrl: '', comments: '', assignedTo: user?.userId || '' });
      loadClients();
      loadStats();
    } catch (error) {
      console.error('Error creating client:', error);
      setError('Failed to create client');
    } finally {
      setGlobalLoading(false);
    }
  };


  const handleDeleteClient = async () => {
    if (!selectedClient) return;

    try {
      setGlobalLoading(true);
      await apiService.deleteClient(selectedClient.clientId);
      setDeleteDialogOpen(false);
      setSelectedClient(null);
      loadClients();
      loadStats();
    } catch (error) {
      console.error('Error deleting client:', error);
      setError('Failed to delete client');
    } finally {
      setGlobalLoading(false);
    }
  };


  const openDeleteDialog = (client: Client) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const openWorkflowView = async (client: Client) => {
    setSelectedClient(client);
    setWorkflowViewOpen(true);
    await loadClientWorkflow(client.clientId);
  };

  const loadClientWorkflow = async (clientId: string) => {
    try {
      setWorkflowLoading(true);
      setError(null);
      
      console.log('Loading client workflow for clientId:', clientId);
      
      // Load client steps
      const stepsResponse = await apiService.getClientSteps(clientId);
      console.log('Client steps loaded:', stepsResponse);
      setClientSteps(stepsResponse || []);
      
      // Load sub-steps for all steps
      const allSubSteps: ClientSubStep[] = [];
      for (const step of stepsResponse || []) {
        try {
          console.log('Loading sub-steps for step:', step.stepId);
          const subStepsResponse = await apiService.getClientSubSteps(step.stepId);
          console.log('Sub-steps loaded for step', step.stepId, ':', subStepsResponse);
          allSubSteps.push(...(subStepsResponse || []));
        } catch (error) {
          console.error(`Error loading sub-steps for step ${step.stepId}:`, error);
        }
      }
      setClientSubSteps(allSubSteps);
      
      // Build assignee info map
      const assigneeIds = new Set<string>();
      stepsResponse?.forEach(step => assigneeIds.add(step.assignedTo));
      allSubSteps.forEach(subStep => assigneeIds.add(subStep.assignedTo));
      
      const assigneeInfoMap: Record<string, User> = {};
      for (const userId of Array.from(assigneeIds)) {
        try {
          const userInfo = await apiService.getUser(userId);
          if (userInfo) {
            assigneeInfoMap[userId] = userInfo;
          }
        } catch (error) {
          console.error(`Error loading user info for ${userId}:`, error);
        }
      }
      setAssigneeInfo(assigneeInfoMap);
      
      console.log('Client workflow loaded successfully:', {
        steps: stepsResponse?.length || 0,
        subSteps: allSubSteps.length,
        assignees: Object.keys(assigneeInfoMap).length
      });
      
    } catch (error) {
      console.error('Error loading client workflow:', error);
      setError('Failed to load client workflow. Please try again.');
    } finally {
      setWorkflowLoading(false);
    }
  };

  const handleStepUpdate = async (stepId: string, updates: Partial<ClientStep>) => {
    try {
      await apiService.updateClientStep(stepId, updates);
      // Reload workflow data
      if (selectedClient) {
        await loadClientWorkflow(selectedClient.clientId);
        // Also reload clients list to update current step
        loadClients();
        loadStats();
      }
    } catch (error) {
      console.error('Error updating step:', error);
      setError('Failed to update step');
    }
  };

  const handleSubStepUpdate = async (subStepId: string, updates: Partial<ClientSubStep>) => {
    try {
      await apiService.updateClientSubStep(subStepId, updates);
      // Reload workflow data
      if (selectedClient) {
        await loadClientWorkflow(selectedClient.clientId);
      }
    } catch (error) {
      console.error('Error updating sub-step:', error);
      setError('Failed to update sub-step');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'primary';
      case 'completed': return 'success';
      case 'on-hold': return 'warning';
      case 'cancelled': return 'error';
      default: return 'default';
    }
  };

  const getStepName = (stepNumber: number) => {
    const stepNames = {
      1: 'Client Finalization & Loan Process',
      2: 'Site Survey and Installation',
      3: 'Dispatch Process',
      4: 'Ghar Portal Upload',
      5: 'Final Bank Process and Subsidy'
    };
    return stepNames[stepNumber as keyof typeof stepNames] || `Step ${stepNumber}`;
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      assignedTo: '',
      currentStep: '',
      name: '',
      mobile: ''
    });
    setPage(1);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <AssignmentIcon />
          Client Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => {
              loadClients();
              loadStats();
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setCreateDialogOpen(true)}
          >
            Add Client
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Clients
              </Typography>
              <Typography variant="h4">
                {stats.totalClients}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Clients
              </Typography>
              <Typography variant="h4" color="primary">
                {stats.activeClients}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Completed
              </Typography>
              <Typography variant="h4" color="success.main">
                {stats.completedClients}
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 200, flex: 1 }}>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Overdue Steps
              </Typography>
              <Typography variant="h4" color="error.main">
                {stats.overdueSteps}
              </Typography>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={currentTab}
          onChange={(_, newValue) => setCurrentTab(newValue)}
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab label="Client List" />
          {user?.role === 'admin' && <Tab label="Financial Overview" />}
        </Tabs>
      </Paper>

      {/* Tab Content */}
      {currentTab === 0 && (
        <>
          {/* Filters */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" flexWrap="wrap">
              <TextField
                size="small"
                label="Search Name"
                value={filters.name}
                onChange={(e) => setFilters({ ...filters, name: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 200 }}
              />
              <TextField
                size="small"
                label="Search Mobile"
                value={filters.mobile}
                onChange={(e) => setFilters({ ...filters, mobile: e.target.value })}
                sx={{ minWidth: 200 }}
              />
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  input={<OutlinedInput label="Status" />}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="on-hold">On Hold</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Current Step</InputLabel>
                <Select
                  value={filters.currentStep}
                  onChange={(e) => setFilters({ ...filters, currentStep: e.target.value })}
                  input={<OutlinedInput label="Current Step" />}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="1">Step 1</MenuItem>
                  <MenuItem value="2">Step 2</MenuItem>
                  <MenuItem value="3">Step 3</MenuItem>
                  <MenuItem value="4">Step 4</MenuItem>
                  <MenuItem value="5">Step 5</MenuItem>
                </Select>
              </FormControl>
              {user?.role === 'admin' && (
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel>Assigned To</InputLabel>
                  <Select
                    value={filters.assignedTo}
                    onChange={(e) => setFilters({ ...filters, assignedTo: e.target.value })}
                    input={<OutlinedInput label="Assigned To" />}
                  >
                    <MenuItem value="">All</MenuItem>
                    {users.map((user) => (
                      <MenuItem key={user.userId} value={user.userId}>
                        {user.firstName} {user.lastName} ({user.email})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              <Button
                variant="outlined"
                onClick={resetFilters}
                startIcon={<FilterIcon />}
              >
                Clear Filters
              </Button>
            </Stack>
          </Paper>

          {/* Clients Table */}
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Client Name</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Address</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Current Step</TableCell>
                  {user?.role === 'admin' && <TableCell>Assigned To</TableCell>}
                  <TableCell>Created</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} align="center">
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : clients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} align="center">
                      No clients found
                    </TableCell>
                  </TableRow>
                ) : (
                  clients.map((client) => (
                    <TableRow key={client.clientId}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PersonIcon color="action" />
                          {client.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PhoneIcon color="action" />
                          {client.mobile}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Tooltip title={client.address}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationIcon color="action" />
                            <Typography variant="body2" noWrap sx={{ maxWidth: 150 }}>
                              {client.address}
                            </Typography>
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={client.status}
                          color={getStatusColor(client.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Tooltip title={getStepName(client.currentStep)}>
                          <Chip
                            label={`Step ${client.currentStep}`}
                            variant="outlined"
                            size="small"
                          />
                        </Tooltip>
                      </TableCell>
                      {user?.role === 'admin' && (
                        <TableCell>
                          {client.assigneeInfo ? 
                            `${client.assigneeInfo.firstName} ${client.assigneeInfo.lastName}` : 
                            client.assignedTo
                          }
                        </TableCell>
                      )}
                      <TableCell>
                        {new Date(client.createdAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="View Details">
                            <IconButton size="small" color="primary" onClick={() => openWorkflowView(client)}>
                              <ViewIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="All Documents">
                            <IconButton 
                              size="small" 
                              color="secondary" 
                              onClick={() => {
                                setSelectedClient(client);
                                setAllDocumentsViewOpen(true);
                              }}
                            >
                              <DocumentsIcon />
                            </IconButton>
                          </Tooltip>
                          {user?.role === 'admin' && (
                            <>
                              <Tooltip title="Expenses">
                                <IconButton 
                                  size="small" 
                                  color="warning" 
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setExpensesDialogOpen(true);
                                  }}
                                >
                                  <ReceiptIcon />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="Payment Logs">
                                <IconButton 
                                  size="small" 
                                  color="info" 
                                  onClick={() => {
                                    setSelectedClient(client);
                                    setPaymentLogsDialogOpen(true);
                                  }}
                                >
                                  <PaymentIcon />
                                </IconButton>
                              </Tooltip>
                            </>
                          )}
                          {user?.role === 'admin' && (
                            <Tooltip title="Delete">
                              <IconButton size="small" color="error" onClick={() => openDeleteDialog(client)}>
                                <DeleteIcon />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={(_, newPage) => setPage(newPage)}
                color="primary"
              />
            </Box>
          )}
        </>
      )}

      {/* Financial Overview Tab */}
      {currentTab === 1 && user?.role === 'admin' && (
        <FinancialOverview />
      )}

      {/* Create Client Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Client</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              fullWidth
              label="Client Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Mobile Number"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              required
            />
            <TextField
              fullWidth
              label="Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              multiline
              rows={3}
              required
            />
            <TextField
              fullWidth
              label="Google Maps URL"
              value={formData.googleMapsUrl}
              onChange={(e) => setFormData({ ...formData, googleMapsUrl: e.target.value })}
              placeholder="https://maps.google.com/..."
              helperText="Optional: Paste Google Maps link for the client's location"
            />
            <TextField
              fullWidth
              label="Comments"
              value={formData.comments}
              onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
              multiline
              rows={2}
              placeholder="Any additional notes about the client..."
              helperText="Optional: General comments or notes about the client"
            />
            {user?.role === 'admin' && (
              <FormControl fullWidth>
                <InputLabel>Assign To</InputLabel>
                <Select
                  value={formData.assignedTo}
                  onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                  input={<OutlinedInput label="Assign To" />}
                >
                  {users.map((user) => (
                    <MenuItem key={user.userId} value={user.userId}>
                      {user.firstName} {user.lastName} ({user.email})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateClient} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>


      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete client "{selectedClient?.name}"? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDeleteClient} color="error" variant="contained">Delete</Button>
        </DialogActions>
      </Dialog>

      {/* Client Workflow Dialog */}
      <Dialog 
        open={workflowViewOpen} 
        onClose={() => setWorkflowViewOpen(false)} 
        maxWidth="xl" 
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
              <IconButton onClick={() => setWorkflowViewOpen(false)}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6">
                  Client Workflow - {selectedClient?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedClient?.mobile} • {selectedClient?.address}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={selectedClient?.status}
                color={getStatusColor(selectedClient?.status || '') as any}
                size="small"
              />
              <IconButton onClick={() => setWorkflowViewOpen(false)}>
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
            p: 0,
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
          {workflowLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
              <CircularProgress />
            </Box>
          ) : selectedClient ? (
            <Box sx={{ height: 'fit-content', minHeight: '100%' }}>
              <WorkflowStepper
                clientId={selectedClient.clientId}
                steps={clientSteps}
                subSteps={clientSubSteps}
                assigneeInfo={assigneeInfo}
                allUsers={users}
                onStepUpdate={handleStepUpdate}
                onSubStepUpdate={handleSubStepUpdate}
                isLoading={workflowLoading}
              />
            </Box>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* All Documents Dialog */}
      <Dialog 
        open={allDocumentsViewOpen} 
        onClose={() => setAllDocumentsViewOpen(false)} 
        maxWidth="xl" 
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
              <IconButton onClick={() => setAllDocumentsViewOpen(false)}>
                <ArrowBackIcon />
              </IconButton>
              <Box>
                <Typography variant="h6">
                  All Documents - {selectedClient?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedClient?.mobile} • {selectedClient?.address}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={selectedClient?.status}
                color={getStatusColor(selectedClient?.status || '') as any}
                size="small"
              />
              <IconButton onClick={() => setAllDocumentsViewOpen(false)}>
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
          {selectedClient ? (
            <AllDocumentsView
              clientId={selectedClient.clientId}
              onRefresh={() => {
                // Optionally refresh other data when documents are updated
                loadClients();
                loadStats();
              }}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Expenses Dialog */}
      {selectedClient && (
        <ExpensesDialog
          open={expensesDialogOpen}
          onClose={() => setExpensesDialogOpen(false)}
          clientId={selectedClient.clientId}
          clientName={selectedClient.name}
        />
      )}

      {/* Payment Logs Dialog */}
      {selectedClient && (
        <PaymentLogsDialog
          open={paymentLogsDialogOpen}
          onClose={() => setPaymentLogsDialogOpen(false)}
          clientId={selectedClient.clientId}
          clientName={selectedClient.name}
          onPaymentUpdate={() => {
            // Refresh client data when payments are updated
            loadClients();
            loadStats();
          }}
        />
      )}
    </Box>
  );
};

export default ClientsPage;
