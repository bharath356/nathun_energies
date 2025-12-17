import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { FollowUp, CreateFollowUpRequest, UpdateFollowUpRequest, Call, User } from '../shared/types';
import TableHeaderFilter, { FilterOption } from '../components/TableHeaderFilter';
import FollowUpsFilterDialog, { FollowUpsFilterState } from '../components/FollowUpsFilterDialog';
import PhoneNumberLink from '../components/PhoneNumberLink';
import StarRating from '../components/StarRating';

const FollowUpsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { setPageLoading } = useLoading();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [users, setUsers] = useState<User[]>([]); // For admin assignee filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingFollowUp, setEditingFollowUp] = useState<FollowUp | null>(null);
  const [formData, setFormData] = useState({
    callId: '',
    scheduledDate: '',
    notes: '',
    priority: 2 // Default to 2 stars
  });

  // Enhanced filter dialog states
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);

  // Helper function to get current month range
  const getCurrentMonthRange = () => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      startDate: startOfMonth.toISOString().split('T')[0],
      endDate: endOfMonth.toISOString().split('T')[0]
    };
  };

  // Enhanced filter states - default to current month's followups
  const [enhancedFilters, setEnhancedFilters] = useState<FollowUpsFilterState>(() => {
    const monthRange = getCurrentMonthRange();
    return {
      dateRange: { 
        preset: 'thismonth', 
        startDate: monthRange.startDate, 
        endDate: monthRange.endDate 
      },
      assignee: '',
      status: '',
      priority: '',
      overdue: false,
    };
  });

  // Status update dialog states
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false);
  const [selectedFollowUpForUpdate, setSelectedFollowUpForUpdate] = useState<FollowUp | null>(null);
  const [statusUpdateData, setStatusUpdateData] = useState({
    status: 'completed' as FollowUp['status'],
    scheduleNext: false,
    nextFollowUp: {
      scheduledDate: '',
      notes: '',
      priority: 2 // Default to 2 stars
    }
  });

  // Delete confirmation dialog states
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedFollowUpForDelete, setSelectedFollowUpForDelete] = useState<FollowUp | null>(null);

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    phoneNumber: '',
    assignedTo: '',
    status: '',
    scheduledDate: { start: '', end: '' },
    notes: '',
    createdAt: { start: '', end: '' },
  });

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to format date for input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to check if date is overdue
  const isOverdue = (followUp: FollowUp) => {
    return followUp.status === 'pending' && new Date(followUp.scheduledDate) < new Date();
  };

  // Helper function to check if date is today
  const isToday = (dateString: string) => {
    const today = new Date();
    const date = new Date(dateString);
    return today.toDateString() === date.toDateString();
  };

  // Helper function to get default next follow-up date (7 days from now at 9 AM)
  const getDefaultNextFollowUpDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
    return formatDateForInput(date);
  };

  // Helper function to reset status update data
  const resetStatusUpdateData = () => {
    setStatusUpdateData({
      status: 'completed',
      scheduleNext: false,
      nextFollowUp: {
        scheduledDate: getDefaultNextFollowUpDate(),
        notes: '',
        priority: selectedFollowUpForUpdate?.priority || 2 // Inherit current priority or default to 2 stars
      }
    });
  };

  // Fetch data with enhanced filters
  const fetchData = async (filtersToUse?: FollowUpsFilterState) => {
    try {
      setLoading(true);
      setPageLoading('followups', true);
      setError(null);

      // Use provided filters or current state filters
      const currentFilters = filtersToUse || enhancedFilters;
      console.log('Fetching follow-ups with filters:', currentFilters);

      // Build API parameters from filters
      const apiParams: any = {};

      // Add date range filters
      if (currentFilters.dateRange.startDate) {
        apiParams.startDate = currentFilters.dateRange.startDate;
      }
      if (currentFilters.dateRange.endDate) {
        apiParams.endDate = currentFilters.dateRange.endDate;
      }

      // Add status filter
      if (currentFilters.status) {
        apiParams.status = currentFilters.status;
      }

      // Add priority filter
      if (currentFilters.priority) {
        apiParams.priority = currentFilters.priority;
      }

      // Add overdue filter
      if (currentFilters.overdue) {
        apiParams.overdue = true;
      }

      // Add assignee filter (admin only)
      if (isAdmin && currentFilters.assignee) {
        apiParams.userId = currentFilters.assignee;
      }

      // Fetch follow-ups with filters
      try {
        const followUpsData = await apiService.getFollowUps(apiParams);
        console.log('Fetched follow-ups:', followUpsData);
        if (Array.isArray(followUpsData)) {
          setFollowUps(followUpsData);
        } else {
          console.error('Follow-ups data is not an array:', followUpsData);
          setFollowUps([]);
        }
      } catch (followUpError: any) {
        console.error('Error fetching follow-ups:', followUpError);
        setError(`Failed to load follow-ups: ${followUpError?.message || 'Unknown error'}`);
      }

      // Fetch calls for the dropdown
      try {
        const callsData = await apiService.getCalls({});
        console.log('Fetched calls:', callsData);
        if (Array.isArray(callsData)) {
          // Only show completed calls that requested callback
          const completedCalls = callsData.filter(call => 
            call.status === 'completed' && 
            call.outcome === 'callback'
          );
          setCalls(completedCalls);
        } else {
          console.error('Calls data is not an array:', callsData);
          setCalls([]);
        }
      } catch (callError: any) {
        console.error('Error fetching calls:', callError);
      }

      // Fetch users for admin assignee filtering
      if (isAdmin) {
        try {
          const usersData = await apiService.getUsers();
          console.log('Fetched users:', usersData);
          if (Array.isArray(usersData)) {
            setUsers(usersData);
          } else {
            console.error('Users data is not an array:', usersData);
            setUsers([]);
          }
        } catch (userError: any) {
          console.error('Error fetching users:', userError);
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setPageLoading('followups', false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch data when enhanced filters change
  useEffect(() => {
    if (!loading) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enhancedFilters]);

  // Handle form submission
  const handleSubmit = async () => {
    try {
      if (!formData.callId) {
        setError('Please select a call');
        return;
      }

      if (!formData.scheduledDate) {
        setError('Please select a scheduled date');
        return;
      }

      const requestData: CreateFollowUpRequest | UpdateFollowUpRequest = {
        scheduledDate: new Date(formData.scheduledDate).toISOString(),
        notes: formData.notes,
        priority: formData.priority
      };

      if (editingFollowUp) {
        // Update existing follow-up
        await apiService.updateFollowUp(editingFollowUp.followUpId, requestData);
      } else {
        // Create new follow-up
        await apiService.createFollowUp({
          ...requestData,
          callId: formData.callId
        } as CreateFollowUpRequest);
      }

      setOpenDialog(false);
      setEditingFollowUp(null);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving follow-up:', error);
      setError(`Failed to save follow-up: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle status update (old simple version - keeping for backward compatibility)
  const handleStatusUpdate = async (followUpId: string, status: FollowUp['status']) => {
    try {
      await apiService.updateFollowUp(followUpId, { status });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating follow-up status:', error);
      setError(`Failed to update status: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle status update with optional next follow-up scheduling
  const handleStatusUpdateSubmit = async () => {
    if (!selectedFollowUpForUpdate) return;

    try {
      // First update the current follow-up status
      await apiService.updateFollowUp(selectedFollowUpForUpdate.followUpId, { 
        status: statusUpdateData.status 
      });

      // If scheduling next follow-up, create it
      if (statusUpdateData.scheduleNext) {
        if (!statusUpdateData.nextFollowUp.scheduledDate) {
          setError('Please select a date for the next follow-up');
          return;
        }

        try {
          await apiService.createFollowUp({
            callId: selectedFollowUpForUpdate.callId,
            scheduledDate: new Date(statusUpdateData.nextFollowUp.scheduledDate).toISOString(),
            notes: statusUpdateData.nextFollowUp.notes || '',
            priority: statusUpdateData.nextFollowUp.priority
          });
          
          console.log('Next follow-up created successfully');
        } catch (followUpError: any) {
          console.error('Error creating next follow-up:', followUpError);
          setError(`Status updated successfully, but failed to create next follow-up: ${followUpError?.message || 'Unknown error'}`);
        }
      }

      // Close dialog and reset states
      setStatusUpdateDialogOpen(false);
      setSelectedFollowUpForUpdate(null);
      resetStatusUpdateData();
      
      // Refresh data
      await fetchData();
      setError(null);
    } catch (error: any) {
      console.error('Error updating follow-up status:', error);
      setError(`Failed to update status: ${error?.message || 'Unknown error'}`);
    }
  };

  // Open status update dialog
  const handleOpenStatusUpdateDialog = (followUp: FollowUp) => {
    setSelectedFollowUpForUpdate(followUp);
    // Set status update data with inherited priority
    setStatusUpdateData({
      status: 'completed',
      scheduleNext: false,
      nextFollowUp: {
        scheduledDate: getDefaultNextFollowUpDate(),
        notes: '',
        priority: followUp.priority || 2 // Inherit current followup's priority or default to 2 stars
      }
    });
    setStatusUpdateDialogOpen(true);
  };

  // Handle delete follow-up
  const handleDeleteFollowUp = async () => {
    if (!selectedFollowUpForDelete) return;

    try {
      await apiService.deleteFollowUp(selectedFollowUpForDelete.followUpId);
      
      // Close dialog and reset state
      setDeleteDialogOpen(false);
      setSelectedFollowUpForDelete(null);
      
      // Refresh data
      await fetchData();
      setError(null);
    } catch (error: any) {
      console.error('Error deleting follow-up:', error);
      setError(`Failed to delete follow-up: ${error?.message || 'Unknown error'}`);
      
      // Close dialog even on error
      setDeleteDialogOpen(false);
      setSelectedFollowUpForDelete(null);
    }
  };

  // Open delete confirmation dialog
  const handleOpenDeleteDialog = (followUp: FollowUp) => {
    setSelectedFollowUpForDelete(followUp);
    setDeleteDialogOpen(true);
  };

  // Reset form
  const resetForm = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(9, 0, 0, 0); // Set to 9 AM tomorrow
    
    setFormData({
      callId: '',
      scheduledDate: formatDateForInput(tomorrow),
      notes: '',
      priority: 2 // Default to 2 stars
    });
  };

  // Open dialog for editing
  const handleEdit = (followUp: FollowUp) => {
    setEditingFollowUp(followUp);
    setFormData({
      callId: followUp.callId,
      scheduledDate: formatDateForInput(new Date(followUp.scheduledDate)),
      notes: followUp.notes || '',
      priority: followUp.priority || 2 // Use existing priority or default to 2 stars
    });
    setOpenDialog(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingFollowUp(null);
    resetForm();
    setOpenDialog(true);
  };

  // Get status color
  const getStatusColor = (status: FollowUp['status']) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'completed':
        return 'success';
      case 'cancelled':
        return 'error';
      default:
        return 'default';
    }
  };

  // Filter options for dropdowns
  const statusOptions: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  // Helper function to sort follow-ups by priority (worst at top)
  const sortFollowUpsByPriority = (followUps: FollowUp[]) => {
    const now = new Date();
    
    return followUps.sort((a, b) => {
      // Calculate priority scores (lower score = higher priority = appears first)
      const scoreA = getFollowUpPriorityScore(a, now);
      const scoreB = getFollowUpPriorityScore(b, now);
      
      if (scoreA !== scoreB) {
        return scoreA - scoreB; // Lower score first
      }
      
      // If same priority, sort by scheduled date
      if (a.status === 'pending' && b.status === 'pending') {
        const dateA = new Date(a.scheduledDate);
        const dateB = new Date(b.scheduledDate);
        
        // For overdue items, most overdue first (oldest scheduled date first)
        if (dateA < now && dateB < now) {
          return dateA.getTime() - dateB.getTime();
        }
        
        // For pending items, soonest scheduled date first
        if (dateA >= now && dateB >= now) {
          return dateA.getTime() - dateB.getTime();
        }
      }
      
      // For completed items, most recently completed first
      if (a.status === 'completed' && b.status === 'completed') {
        const completedA = new Date(a.completedAt || a.updatedAt);
        const completedB = new Date(b.completedAt || b.updatedAt);
        return completedB.getTime() - completedA.getTime();
      }
      
      // Fallback to creation date (newest first)
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  };

  // Helper function to calculate priority score for a follow-up
  const getFollowUpPriorityScore = (followUp: FollowUp, now: Date): number => {
    const scheduledDate = new Date(followUp.scheduledDate);
    
    switch (followUp.status) {
      case 'pending':
        if (scheduledDate < now) {
          return 1; // Overdue - highest priority
        } else {
          return 2; // Pending - medium priority
        }
      case 'completed':
        return 3; // Completed - low priority
      case 'cancelled':
        return 4; // Cancelled - lowest priority
      default:
        return 5; // Unknown status - lowest priority
    }
  };

  // Apply column filters and sort by priority
  const filteredFollowUps = sortFollowUpsByPriority(
    followUps.filter(followUp => {
      // Phone number filter
      if (columnFilters.phoneNumber && !followUp.phoneNumber.toLowerCase().includes(columnFilters.phoneNumber.toLowerCase())) return false;
      
      // Assigned to filter (only for admins)
      if (isAdmin && columnFilters.assignedTo && followUp.callerInfo) {
        const assignedName = `${followUp.callerInfo.firstName || ''} ${followUp.callerInfo.lastName || ''}`.trim();
        const assignedEmail = followUp.callerInfo.email || '';
        const searchTerm = columnFilters.assignedTo.toLowerCase();
        if (!assignedName.toLowerCase().includes(searchTerm) && !assignedEmail.toLowerCase().includes(searchTerm)) {
          return false;
        }
      }
      
      // Status filter
      if (columnFilters.status && followUp.status !== columnFilters.status) return false;
      
      // Notes filter
      if (columnFilters.notes && followUp.notes && !followUp.notes.toLowerCase().includes(columnFilters.notes.toLowerCase())) return false;
      
      // Scheduled date filter
      if (columnFilters.scheduledDate.start) {
        const followUpDate = new Date(followUp.scheduledDate).toISOString().split('T')[0];
        if (followUpDate < columnFilters.scheduledDate.start) return false;
      }
      if (columnFilters.scheduledDate.end) {
        const followUpDate = new Date(followUp.scheduledDate).toISOString().split('T')[0];
        if (followUpDate > columnFilters.scheduledDate.end) return false;
      }
      
      // Created date filter
      if (columnFilters.createdAt.start) {
        const createdDate = new Date(followUp.createdAt).toISOString().split('T')[0];
        if (createdDate < columnFilters.createdAt.start) return false;
      }
      if (columnFilters.createdAt.end) {
        const createdDate = new Date(followUp.createdAt).toISOString().split('T')[0];
        if (createdDate > columnFilters.createdAt.end) return false;
      }
      
      return true;
    })
  );

  // Get follow-up statistics
  const getStats = () => {
    const total = followUps.length;
    const pending = followUps.filter(f => f.status === 'pending').length;
    const completed = followUps.filter(f => f.status === 'completed').length;
    const overdue = followUps.filter(f => isOverdue(f)).length;
    const today = followUps.filter(f => 
      f.status === 'pending' && isToday(f.scheduledDate)
    ).length;

    return { total, pending, completed, overdue, today };
  };

  const stats = getStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Follow-ups
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Tooltip title="Filter Follow-ups">
            <IconButton onClick={() => setFilterDialogOpen(true)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => fetchData()}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Schedule Follow-up
          </Button>
        </Box>
      </Box>

      {/* Active Filters Indicator */}
      {(enhancedFilters.dateRange.preset === 'thismonth' || enhancedFilters.dateRange.startDate || enhancedFilters.status || enhancedFilters.priority || enhancedFilters.assignee || enhancedFilters.overdue) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Active Filters:
            </Typography>
            {enhancedFilters.dateRange.preset === 'today' && (
              <Chip label="Today's Follow-ups" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'tomorrow' && (
              <Chip label="Tomorrow's Follow-ups" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'thisweek' && (
              <Chip label="This Week" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'nextweek' && (
              <Chip label="Next Week" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'thismonth' && (
              <Chip label="This Month" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'overdue' && (
              <Chip label="Overdue" size="small" color="warning" />
            )}
            {enhancedFilters.dateRange.preset === 'custom' && enhancedFilters.dateRange.startDate && (
              <Chip 
                label={`${enhancedFilters.dateRange.startDate} to ${enhancedFilters.dateRange.endDate || 'now'}`} 
                size="small" 
                color="primary" 
              />
            )}
            {enhancedFilters.status && (
              <Chip label={`Status: ${enhancedFilters.status}`} size="small" color="secondary" />
            )}
            {enhancedFilters.priority && (
              <Chip label={`Priority: ${enhancedFilters.priority} stars`} size="small" color="secondary" />
            )}
            {enhancedFilters.assignee && isAdmin && (
              <Chip 
                label={`Assignee: ${users.find(u => u.userId === enhancedFilters.assignee)?.firstName || 'Unknown'}`} 
                size="small" 
                color="secondary" 
              />
            )}
            {enhancedFilters.overdue && (
              <Chip label="Overdue Only" size="small" color="warning" />
            )}
            <Button 
              size="small" 
              onClick={() => setFilterDialogOpen(true)}
              sx={{ ml: 1 }}
            >
              Modify Filters
            </Button>
          </Box>
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2">Total Follow-ups</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.pending}
              </Typography>
              <Typography variant="body2">Pending</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.completed}
              </Typography>
              <Typography variant="body2">Completed</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {stats.overdue}
              </Typography>
              <Typography variant="body2">Overdue</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {stats.today}
              </Typography>
              <Typography variant="body2">Due Today</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Follow-ups Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Phone Number
                  <TableHeaderFilter
                    title="Phone Number"
                    type="text"
                    value={columnFilters.phoneNumber}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, phoneNumber: value }))}
                    placeholder="Search phone number..."
                    hasActiveFilter={!!columnFilters.phoneNumber}
                  />
                </Box>
              </TableCell>
              {isAdmin && (
                <TableCell>
                  <Box display="flex" alignItems="center">
                    Assigned To
                    <TableHeaderFilter
                      title="Assigned To"
                      type="text"
                      value={columnFilters.assignedTo}
                      onChange={(value) => setColumnFilters(prev => ({ ...prev, assignedTo: value }))}
                      placeholder="Search assigned person..."
                      hasActiveFilter={!!columnFilters.assignedTo}
                    />
                  </Box>
                </TableCell>
              )}
              <TableCell>
                <Box display="flex" alignItems="center">
                  Scheduled Date
                  <TableHeaderFilter
                    title="Scheduled Date"
                    type="date-range"
                    value={columnFilters.scheduledDate}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, scheduledDate: value }))}
                    hasActiveFilter={!!(columnFilters.scheduledDate.start || columnFilters.scheduledDate.end)}
                  />
                </Box>
              </TableCell>
              <TableCell>Priority</TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Status
                  <TableHeaderFilter
                    title="Status"
                    type="select"
                    value={columnFilters.status}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, status: value }))}
                    options={statusOptions}
                    hasActiveFilter={!!columnFilters.status}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Notes
                  <TableHeaderFilter
                    title="Notes"
                    type="text"
                    value={columnFilters.notes}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, notes: value }))}
                    placeholder="Search notes..."
                    hasActiveFilter={!!columnFilters.notes}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Created
                  <TableHeaderFilter
                    title="Created Date"
                    type="date-range"
                    value={columnFilters.createdAt}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, createdAt: value }))}
                    hasActiveFilter={!!(columnFilters.createdAt.start || columnFilters.createdAt.end)}
                  />
                </Box>
              </TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredFollowUps.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 8 : 7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {followUps.length === 0 ? 'No follow-ups found' : 'No follow-ups match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredFollowUps.map((followUp) => (
                <TableRow 
                  key={followUp.followUpId}
                  sx={{ 
                    backgroundColor: isOverdue(followUp) ? 'rgba(244, 67, 54, 0.1)' : 'inherit'
                  }}
                >
                  <TableCell>
                    <PhoneNumberLink phoneNumber={followUp.phoneNumber} maskNumber={!isAdmin} />
                  </TableCell>
                  {isAdmin && (
                    <TableCell>
                      {followUp.callerInfo ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {`${followUp.callerInfo.firstName || ''} ${followUp.callerInfo.lastName || ''}`.trim() || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {followUp.callerInfo.email}
                          </Typography>
                        </Box>
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Unknown
                        </Typography>
                      )}
                    </TableCell>
                  )}
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ScheduleIcon fontSize="small" />
                      {formatDate(followUp.scheduledDate)}
                      {isOverdue(followUp) && (
                        <Chip label="OVERDUE" size="small" color="error" />
                      )}
                      {isToday(followUp.scheduledDate) && followUp.status === 'pending' && (
                        <Chip label="TODAY" size="small" color="info" />
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StarRating
                      value={followUp.priority || 2}
                      readonly={true}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={followUp.status.toUpperCase()} 
                      color={getStatusColor(followUp.status)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {followUp.notes || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {formatDate(followUp.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {followUp.status === 'pending' && (
                        <Tooltip title="Update Status">
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenStatusUpdateDialog(followUp)}
                          >
                            Update Status
                          </Button>
                        </Tooltip>
                      )}
                      <Tooltip title="Edit Follow-up">
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => handleEdit(followUp)}
                        >
                          Edit
                        </Button>
                      </Tooltip>
                      {isAdmin && (
                        <Tooltip title="Delete Follow-up">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDeleteDialog(followUp)}
                          >
                            <DeleteIcon fontSize="small" />
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

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingFollowUp ? 'Edit Follow-up' : 'Schedule Follow-up'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {!editingFollowUp && (
              <FormControl fullWidth>
                <InputLabel>Select Call</InputLabel>
                <Select
                  value={formData.callId}
                  onChange={(e) => setFormData({ ...formData, callId: e.target.value })}
                  label="Select Call"
                >
                  {calls.map((call) => (
                    <MenuItem key={call.callId} value={call.callId}>
                      {call.phoneNumber} - {formatDate(call.createdAt)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Scheduled Date & Time"
              type="datetime-local"
              value={formData.scheduledDate}
              onChange={(e) => setFormData({ ...formData, scheduledDate: e.target.value })}
              fullWidth
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              label="Notes"
              multiline
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Add notes about this follow-up..."
              fullWidth
            />

            <Box>
              <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                Priority
              </Typography>
              <StarRating
                value={formData.priority}
                onChange={(priority) => setFormData({ ...formData, priority })}
                showLabel={true}
                helperText="Set the priority level for this follow-up"
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingFollowUp ? 'Update' : 'Schedule'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Status Update Dialog */}
      <Dialog 
        open={statusUpdateDialogOpen} 
        onClose={() => {
          setStatusUpdateDialogOpen(false);
          setSelectedFollowUpForUpdate(null);
          resetStatusUpdateData();
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Update Follow-up Status</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {selectedFollowUpForUpdate && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Phone Number:</strong> {selectedFollowUpForUpdate.phoneNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Scheduled:</strong> {formatDate(selectedFollowUpForUpdate.scheduledDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Current Notes:</strong> {selectedFollowUpForUpdate.notes || 'None'}
                </Typography>
              </Box>
            )}

            <FormControl component="fieldset">
              <Typography variant="h6" sx={{ mb: 1 }}>
                Update Status
              </Typography>
              <RadioGroup
                value={statusUpdateData.status}
                onChange={(e) => setStatusUpdateData(prev => ({ 
                  ...prev, 
                  status: e.target.value as FollowUp['status'] 
                }))}
              >
                <FormControlLabel 
                  value="completed" 
                  control={<Radio />} 
                  label="Mark as Completed" 
                />
                <FormControlLabel 
                  value="cancelled" 
                  control={<Radio />} 
                  label="Cancel Follow-up" 
                />
              </RadioGroup>
            </FormControl>

            <FormControlLabel
              control={
                <Checkbox
                  checked={statusUpdateData.scheduleNext}
                  onChange={(e) => setStatusUpdateData(prev => ({ 
                    ...prev, 
                    scheduleNext: e.target.checked 
                  }))}
                />
              }
              label="Schedule next follow-up"
            />

            {statusUpdateData.scheduleNext && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Next Follow-up Details
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  A new follow-up will be created for the same call.
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Next Follow-up Date & Time"
                    type="datetime-local"
                    value={statusUpdateData.nextFollowUp.scheduledDate}
                    onChange={(e) => setStatusUpdateData(prev => ({
                      ...prev,
                      nextFollowUp: {
                        ...prev.nextFollowUp,
                        scheduledDate: e.target.value
                      }
                    }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Default is 7 days from now at 9:00 AM"
                  />
                  
                  <TextField
                    label="Next Follow-up Notes"
                    multiline
                    rows={2}
                    value={statusUpdateData.nextFollowUp.notes}
                    onChange={(e) => setStatusUpdateData(prev => ({
                      ...prev,
                      nextFollowUp: {
                        ...prev.nextFollowUp,
                        notes: e.target.value
                      }
                    }))}
                    fullWidth
                    placeholder="Add notes for the next follow-up..."
                  />

                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Priority
                    </Typography>
                    <StarRating
                      value={statusUpdateData.nextFollowUp.priority}
                      onChange={(priority) => setStatusUpdateData(prev => ({
                        ...prev,
                        nextFollowUp: {
                          ...prev.nextFollowUp,
                          priority
                        }
                      }))}
                      showLabel={true}
                      helperText={`Inherited from current follow-up: ${selectedFollowUpForUpdate?.priority || 2} stars`}
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setStatusUpdateDialogOpen(false);
            setSelectedFollowUpForUpdate(null);
            resetStatusUpdateData();
          }}>
            Cancel
          </Button>
          <Button onClick={handleStatusUpdateSubmit} variant="contained">
            Update Status
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={deleteDialogOpen} 
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedFollowUpForDelete(null);
        }}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Delete Follow-up</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {selectedFollowUpForDelete && (
              <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1, mb: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  <strong>Phone Number:</strong> {selectedFollowUpForDelete.phoneNumber}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Scheduled:</strong> {formatDate(selectedFollowUpForDelete.scheduledDate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Status:</strong> {selectedFollowUpForDelete.status.toUpperCase()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Notes:</strong> {selectedFollowUpForDelete.notes || 'None'}
                </Typography>
              </Box>
            )}

            <Alert severity="warning" sx={{ mb: 2 }}>
              <Typography variant="body2">
                <strong>Warning:</strong> This action cannot be undone. The follow-up will be permanently deleted from the system.
              </Typography>
            </Alert>

            <Typography variant="body1">
              Are you sure you want to delete this follow-up? This action is permanent and cannot be reversed.
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setDeleteDialogOpen(false);
              setSelectedFollowUpForDelete(null);
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteFollowUp} 
            variant="contained" 
            color="error"
            startIcon={<DeleteIcon />}
          >
            Delete Follow-up
          </Button>
        </DialogActions>
      </Dialog>

      {/* Enhanced Filter Dialog */}
      <FollowUpsFilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        onApply={(newFilters) => {
          setEnhancedFilters(newFilters);
          fetchData(newFilters); // Pass new filters directly
        }}
        onClear={() => {
          const clearedFilters: FollowUpsFilterState = {
            dateRange: { preset: '', startDate: '', endDate: '' },
            assignee: '',
            status: '',
            priority: '',
            overdue: false,
          };
          setEnhancedFilters(clearedFilters);
          fetchData(clearedFilters); // Pass cleared filters directly
        }}
        currentFilters={enhancedFilters}
        isAdmin={isAdmin}
        users={users}
      />
    </Box>
  );
};

export default FollowUpsPage;
