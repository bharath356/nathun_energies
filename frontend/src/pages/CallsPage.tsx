import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
  Tooltip,
  TablePagination,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  FilterList as FilterIcon,
  Delete as DeleteIcon,
  FlashOn as FlashOnIcon,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { apiService } from '../services/api';
import { Call, CreateCallRequest, CreateQuickCallRequest, UpdateCallRequest, PhoneNumber } from '../shared/types';
import TableHeaderFilter, { FilterOption } from '../components/TableHeaderFilter';
import CallsFilterDialog, { CallsFilterState } from '../components/CallsFilterDialog';
import PhoneNumberLink from '../components/PhoneNumberLink';
import StarRating from '../components/StarRating';
import LoadingButton from '../components/LoadingButton';

// No longer needed - removing call timer interface

const CallsPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { setPageLoading } = useLoading();
  const [calls, setCalls] = useState<Call[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [users, setUsers] = useState<any[]>([]); // For admin caller filtering
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<Call | null>(null);
  
  // Form states
  const [newCall, setNewCall] = useState<CreateCallRequest>({
    phoneNumber: '',
    notes: '',
  });
  const [editCall, setEditCall] = useState<UpdateCallRequest>({});
  
  // Follow-up form states
  const [followUpData, setFollowUpData] = useState({
    scheduledDate: '',
    notes: '',
    priority: 2, // Default to 2 stars
    enabled: false
  });
  const [showFollowUpFields, setShowFollowUpFields] = useState(false);
  
  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Enhanced filter states - default to today's calls
  const [enhancedFilters, setEnhancedFilters] = useState<CallsFilterState>({
    dateRange: { 
      preset: 'today', 
      startDate: getTodayDate(), 
      endDate: getTodayDate() 
    },
    caller: '',
    status: '',
    outcome: '',
  });
  
  // Legacy filter states (for backward compatibility)
  const [filters, setFilters] = useState({
    status: '',
    outcome: '',
    startDate: '',
    endDate: '',
  });
  
  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    phoneNumber: '',
    caller: '',
    status: '',
    outcome: '',
    duration: { start: '', end: '' },
    notes: '',
    createdAt: { start: '', end: '' },
  });
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // No longer using real-time call timers
  

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


  // Removed real-time call timer effect

  // Helper function to format date for input
  const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper function to format date and time for display
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  // Helper function to get default follow-up date (7 days from now at 9 AM)
  const getDefaultFollowUpDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    date.setHours(9, 0, 0, 0);
    return formatDateForInput(date);
  };

  // Helper function to reset follow-up data
  const resetFollowUpData = () => {
    setFollowUpData({
      scheduledDate: getDefaultFollowUpDate(),
      notes: '',
      priority: 2, // Default to 2 stars
      enabled: false
    });
    setShowFollowUpFields(false);
  };

  // Helper function to handle outcome change and show/hide follow-up fields
  const handleOutcomeChange = (outcome: Call['outcome']) => {
    setEditCall(prev => ({ ...prev, outcome }));
    
    if (outcome === 'interested' || outcome === 'callback') {
      setShowFollowUpFields(true);
      if (!followUpData.scheduledDate) {
        setFollowUpData(prev => ({
          ...prev,
          scheduledDate: getDefaultFollowUpDate(),
          notes: outcome === 'interested' 
            ? 'Customer showed interest - follow up to discuss further'
            : 'Customer requested callback - follow up as requested'
        }));
      }
    } else {
      setShowFollowUpFields(false);
      resetFollowUpData();
    }
  };

  const fetchData = async (filtersToUse?: CallsFilterState) => {
    try {
      setLoading(true);
      setPageLoading('calls', true);
      setError(null);
      
      // Use provided filters or current state filters
      const currentFilters = filtersToUse || enhancedFilters;
      console.log('Fetching data with filters:', currentFilters);
      
      // Build API parameters from filters
      const apiParams: any = {};
      
      // Add date range filters
      if (currentFilters.dateRange.startDate) {
        apiParams.startDate = currentFilters.dateRange.startDate;
      }
      if (currentFilters.dateRange.endDate) {
        apiParams.endDate = currentFilters.dateRange.endDate;
      }
      
      // Add status and outcome filters
      if (currentFilters.status) {
        apiParams.status = currentFilters.status;
      }
      if (currentFilters.outcome) {
        apiParams.outcome = currentFilters.outcome;
      }
      
      // Add caller filter (admin only)
      if (isAdmin && currentFilters.caller) {
        apiParams.userId = currentFilters.caller;
      }
      
      let fetchedCalls: Call[] = [];
      
      try {
        const callsData = await apiService.getCalls(apiParams);
        console.log('Fetched calls:', callsData);
        if (Array.isArray(callsData)) {
          setCalls(callsData);
          fetchedCalls = callsData;
        } else {
          console.error('Calls data is not an array:', callsData);
          setCalls([]);
        }
      } catch (callError: any) {
        console.error('Error fetching calls:', callError);
        setError(`Failed to load calls: ${callError?.message || 'Unknown error'}`);
      }
      
      try {
        const phoneNumbersData = await apiService.getPhoneNumbers();
        console.log('Fetched phone numbers:', phoneNumbersData);
        if (Array.isArray(phoneNumbersData)) {
          // Filter phone numbers to only show those assigned to the user
          const userPhoneNumbers = phoneNumbersData.filter(pn => 
            isAdmin || pn.assignedTo === user?.userId
          );
          
          // Further filter to exclude phone numbers that have already been called
          const calledPhoneNumbers = new Set(fetchedCalls.map(call => call.phoneNumber));
          const uncalledPhoneNumbers = userPhoneNumbers.filter(pn => 
            !calledPhoneNumbers.has(pn.phoneNumber) &&
            (pn.status === 'assigned' || pn.status === 'available')
          );
          
          setPhoneNumbers(uncalledPhoneNumbers);
        } else {
          console.error('Phone numbers data is not an array:', phoneNumbersData);
          setPhoneNumbers([]);
        }
      } catch (phoneError: any) {
        console.error('Error fetching phone numbers:', phoneError);
      }
      
      // Fetch users for admin caller filtering
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
      setError(`Failed to load calls data: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setPageLoading('calls', false);
    }
  };

  const handleCreateCall = async () => {
    try {
      if (!newCall.phoneNumber) {
        setError('Please select a phone number');
        return;
      }
      
      const createdCall = await apiService.createCall(newCall);
      
      // Check if the created call's date matches current filter
      const callDate = new Date(createdCall.createdAt).toISOString().split('T')[0];
      const todayDate = getTodayDate();
      
      // If we're filtering by today and the call was created today, add it to the list
      if (enhancedFilters.dateRange.preset === 'today' && callDate === todayDate) {
        setCalls(prev => [createdCall, ...prev]);
      } else if (!enhancedFilters.dateRange.startDate && !enhancedFilters.dateRange.endDate) {
        // If no date filters are applied, add it to the list
        setCalls(prev => [createdCall, ...prev]);
      } else {
        // If date filters might exclude the new call, refresh the data
        fetchData();
      }
      
      setCreateDialogOpen(false);
      setNewCall({ phoneNumber: '', notes: '' });
      
      // Always refresh to get updated stats
      setTimeout(() => fetchData(), 100);
    } catch (error) {
      console.error('Error creating call:', error);
      setError('Failed to create call');
    }
  };

  const handleQuickCreateCall = async () => {
    try {
      setError(null);
      
      const createdCall = await apiService.createQuickCall({ notes: '' });
      
      // Check if the created call's date matches current filter
      const callDate = new Date(createdCall.createdAt).toISOString().split('T')[0];
      const todayDate = getTodayDate();
      
      // If we're filtering by today and the call was created today, add it to the list
      if (enhancedFilters.dateRange.preset === 'today' && callDate === todayDate) {
        setCalls(prev => [createdCall, ...prev]);
      } else if (!enhancedFilters.dateRange.startDate && !enhancedFilters.dateRange.endDate) {
        // If no date filters are applied, add it to the list
        setCalls(prev => [createdCall, ...prev]);
      } else {
        // If date filters might exclude the new call, refresh the data
        fetchData();
      }
      
      // Show success message with selected phone number
      setError(null);
      
      // Always refresh to get updated stats
      setTimeout(() => fetchData(), 100);
    } catch (error: any) {
      console.error('Error creating quick call:', error);
      setError(error?.response?.data?.message || 'Failed to create call');
      throw error; // Re-throw so LoadingButton can handle the error state
    }
  };

  const handleUpdateCall = async () => {
    if (!selectedCall) return;
    
    try {
      // First update the call
      const updatedCall = await apiService.updateCall(selectedCall.callId, editCall);
      
      // If outcome is interested or callback and follow-up fields are shown, create follow-up
      if (showFollowUpFields && (editCall.outcome === 'interested' || editCall.outcome === 'callback')) {
        if (!followUpData.scheduledDate) {
          setError('Please select a follow-up date');
          return;
        }
        
        try {
          await apiService.createFollowUp({
            callId: selectedCall.callId,
            scheduledDate: new Date(followUpData.scheduledDate).toISOString(),
            notes: followUpData.notes || '',
            priority: followUpData.priority
          });
          
          setError(null);
          // Show success message
          console.log('Follow-up created successfully');
        } catch (followUpError: any) {
          console.error('Error creating follow-up:', followUpError);
          setError(`Call updated successfully, but failed to create follow-up: ${followUpError?.message || 'Unknown error'}`);
        }
      }
      
      // Update the calls list
      setCalls(prev => prev.map(call => 
        call.callId === selectedCall.callId ? updatedCall : call
      ));
      
      // Close dialog and reset states
      setEditDialogOpen(false);
      setSelectedCall(null);
      setEditCall({});
      resetFollowUpData();
      
      fetchData(); // Refresh to get updated stats
    } catch (error: any) {
      console.error('Error updating call:', error);
      setError(`Failed to update call: ${error?.message || 'Unknown error'}`);
    }
  };

  const handleDeleteCall = async () => {
    if (!selectedCall) return;
    
    try {
      await apiService.deleteCall(selectedCall.callId);
      setCalls(prev => prev.filter(call => call.callId !== selectedCall.callId));
      setDeleteDialogOpen(false);
      setSelectedCall(null);
      fetchData(); // Refresh to get updated stats
    } catch (error) {
      console.error('Error deleting call:', error);
      setError('Failed to delete call');
    }
  };


  const getStatusColor = (status: Call['status']) => {
    switch (status) {
      case 'pending': return 'default';
      case 'in-progress': return 'primary';
      case 'completed': return 'success';
      case 'failed': return 'error';
      case 'no-answer': return 'warning';
      default: return 'default';
    }
  };

  const getOutcomeColor = (outcome: Call['outcome']) => {
    switch (outcome) {
      case 'interested': return 'success';
      case 'callback': return 'info';
      case 'not-interested': return 'default';
      case 'wrong-number': return 'warning';
      case 'no-answer': return 'warning';
      default: return 'default';
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Filter options for dropdowns
  const statusOptions: FilterOption[] = [
    { value: 'pending', label: 'Pending' },
    { value: 'in-progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'no-answer', label: 'No Answer' },
  ];

  const outcomeOptions: FilterOption[] = [
    { value: 'interested', label: 'Interested' },
    { value: 'not-interested', label: 'Not Interested' },
    { value: 'callback', label: 'Callback Requested' },
    { value: 'wrong-number', label: 'Wrong Number' },
    { value: 'no-answer', label: 'No Answer' },
  ];

  const filteredCalls = calls.filter(call => {
    // Existing screen-level filters
    if (filters.status && call.status !== filters.status) return false;
    if (filters.outcome && call.outcome !== filters.outcome) return false;
    if (filters.startDate && call.createdAt < filters.startDate) return false;
    if (filters.endDate && call.createdAt > filters.endDate) return false;
    
    // Column-level filters
    if (columnFilters.phoneNumber && !call.phoneNumber.toLowerCase().includes(columnFilters.phoneNumber.toLowerCase())) return false;
    
    // Caller filter (only for admins)
    if (isAdmin && columnFilters.caller && call.callerInfo) {
      const callerName = `${call.callerInfo.firstName || ''} ${call.callerInfo.lastName || ''}`.trim();
      const callerEmail = call.callerInfo.email || '';
      const searchTerm = columnFilters.caller.toLowerCase();
      if (!callerName.toLowerCase().includes(searchTerm) && !callerEmail.toLowerCase().includes(searchTerm)) {
        return false;
      }
    }
    
    if (columnFilters.status && call.status !== columnFilters.status) return false;
    if (columnFilters.outcome && call.outcome !== columnFilters.outcome) return false;
    if (columnFilters.notes && call.notes && !call.notes.toLowerCase().includes(columnFilters.notes.toLowerCase())) return false;
    
    // Duration filter
    if (columnFilters.duration.start && call.duration && call.duration < parseInt(columnFilters.duration.start)) return false;
    if (columnFilters.duration.end && call.duration && call.duration > parseInt(columnFilters.duration.end)) return false;
    
    // Created date filter
    if (columnFilters.createdAt.start) {
      const callDate = new Date(call.createdAt).toISOString().split('T')[0];
      if (callDate < columnFilters.createdAt.start) return false;
    }
    if (columnFilters.createdAt.end) {
      const callDate = new Date(call.createdAt).toISOString().split('T')[0];
      if (callDate > columnFilters.createdAt.end) return false;
    }
    
    return true;
  });

  const paginatedCalls = filteredCalls.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" gutterBottom>
          Call Management
        </Typography>
        <Box display="flex" gap={1} alignItems="center">
          <Tooltip title="Filter Calls">
            <IconButton onClick={() => setFilterDialogOpen(true)}>
              <FilterIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Active Filters Indicator */}
      {(enhancedFilters.dateRange.preset === 'today' || enhancedFilters.dateRange.startDate || enhancedFilters.status || enhancedFilters.outcome || enhancedFilters.caller) && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              Active Filters:
            </Typography>
            {enhancedFilters.dateRange.preset === 'today' && (
              <Chip label="Today's Calls" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'yesterday' && (
              <Chip label="Yesterday's Calls" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'last7days' && (
              <Chip label="Last 7 Days" size="small" color="primary" />
            )}
            {enhancedFilters.dateRange.preset === 'last30days' && (
              <Chip label="Last 30 Days" size="small" color="primary" />
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
            {enhancedFilters.outcome && (
              <Chip label={`Outcome: ${enhancedFilters.outcome}`} size="small" color="secondary" />
            )}
            {enhancedFilters.caller && isAdmin && (
              <Chip 
                label={`Caller: ${users.find(u => u.userId === enhancedFilters.caller)?.firstName || 'Unknown'}`} 
                size="small" 
                color="secondary" 
              />
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

      {/* Call Summary */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="primary">
                {calls.length}
              </Typography>
              <Typography variant="body2">Total Calls</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 250px', minWidth: 250 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" color="success.main">
                {calls.filter(call => call.status === 'completed').length}
              </Typography>
              <Typography variant="body2">Completed</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Calls Table */}
      <Card>
        <CardHeader 
          title="Call History" 
          action={
            <Box display="flex" gap={1}>
              <LoadingButton
                actionId="quick-create-call"
                variant="outlined"
                startIcon={<FlashOnIcon />}
                onClick={handleQuickCreateCall}
                loadingText="Creating..."
                color="primary"
              >
                Quick Call
              </LoadingButton>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setCreateDialogOpen(true)}
              >
                New Call
              </Button>
            </Box>
          }
        />
        <CardContent>
          <TableContainer>
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
                        Caller
                        <TableHeaderFilter
                          title="Caller"
                          type="text"
                          value={columnFilters.caller}
                          onChange={(value) => setColumnFilters(prev => ({ ...prev, caller: value }))}
                          placeholder="Search caller name..."
                          hasActiveFilter={!!columnFilters.caller}
                        />
                      </Box>
                    </TableCell>
                  )}
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
                      Outcome
                      <TableHeaderFilter
                        title="Outcome"
                        type="select"
                        value={columnFilters.outcome}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, outcome: value }))}
                        options={outcomeOptions}
                        hasActiveFilter={!!columnFilters.outcome}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      Duration
                      <TableHeaderFilter
                        title="Duration"
                        type="number-range"
                        value={columnFilters.duration}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, duration: value }))}
                        hasActiveFilter={!!(columnFilters.duration.start || columnFilters.duration.end)}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      Comments
                      <TableHeaderFilter
                        title="Comments"
                        type="text"
                        value={columnFilters.notes}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, notes: value }))}
                        placeholder="Search comments..."
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
                {paginatedCalls.length > 0 ? (
                  paginatedCalls.map((call) => {
                    return (
                      <TableRow key={call.callId}>
                        <TableCell>
                          <PhoneNumberLink phoneNumber={call.phoneNumber} maskNumber={!isAdmin} />
                        </TableCell>
                        {isAdmin && (
                          <TableCell>
                            {call.callerInfo ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {`${call.callerInfo.firstName || ''} ${call.callerInfo.lastName || ''}`.trim() || 'Unknown'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {call.callerInfo.email}
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
                          <Chip 
                            label={call.status} 
                            color={getStatusColor(call.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {call.outcome && (
                            <Chip 
                              label={call.outcome} 
                              color={getOutcomeColor(call.outcome)}
                              size="small"
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          {call.duration && call.duration > 0 && formatDuration(call.duration)}
                        </TableCell>
                        <TableCell>
                          <Box sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            <Typography variant="body2" noWrap title={call.notes || ''}>
                              {call.notes || '-'}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          {formatDateTime(call.createdAt)}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" gap={0.5}>
                            <Tooltip title="Edit Call">
                              <IconButton 
                                size="small"
                                onClick={() => {
                                  setSelectedCall(call);
                                  setEditCall({
                                    status: call.status,
                                    outcome: call.outcome,
                                    notes: call.notes,
                                    duration: call.duration,
                                  });
                                  
                                  // Initialize follow-up fields if outcome is interested or callback
                                  if (call.outcome === 'interested' || call.outcome === 'callback') {
                                    setShowFollowUpFields(true);
                                    setFollowUpData({
                                      scheduledDate: getDefaultFollowUpDate(),
                                      notes: call.outcome === 'interested' 
                                        ? 'Customer showed interest - follow up to discuss further'
                                        : 'Customer requested callback - follow up as requested',
                                      priority: 2, // Default to 2 stars
                                      enabled: true
                                    });
                                  } else {
                                    resetFollowUpData();
                                  }
                                  
                                  setEditDialogOpen(true);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Delete Call">
                                <IconButton 
                                  size="small"
                                  color="error"
                                  onClick={() => {
                                    setSelectedCall(call);
                                    setDeleteDialogOpen(true);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Tooltip>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 8 : 7} align="center">
                      <Typography variant="body2" color="text.secondary" sx={{ py: 4 }}>
                        No calls found. {calls.length === 0 ? 'Create your first call to get started.' : 'Try adjusting your filters.'}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredCalls.length}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(e) => {
              setRowsPerPage(parseInt(e.target.value, 10));
              setPage(0);
            }}
          />
        </CardContent>
      </Card>

      {/* Create Call Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Call</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Phone Number</InputLabel>
              <Select
                value={newCall.phoneNumber}
                onChange={(e) => setNewCall(prev => ({ ...prev, phoneNumber: e.target.value }))}
                label="Phone Number"
              >
                {phoneNumbers
                  .filter(pn => pn.status === 'assigned' || pn.status === 'available')
                  .map((phoneNumber) => (
                    <MenuItem key={phoneNumber.phoneNumber} value={phoneNumber.phoneNumber}>
                      {phoneNumber.phoneNumber} ({phoneNumber.status})
                    </MenuItem>
                  ))}
              </Select>
            </FormControl>
            {phoneNumbers.filter(pn => pn.status === 'assigned' || pn.status === 'available').length === 0 && (
              <Alert severity="info">
                No uncalled phone numbers are available. All assigned phone numbers have already been called. 
                Use follow-ups to re-engage with previously called numbers.
              </Alert>
            )}
            <TextField
              label="Notes"
              multiline
              rows={3}
              value={newCall.notes}
              onChange={(e) => setNewCall(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            actionId="create-call"
            onClick={handleCreateCall}
            variant="contained"
            loadingText="Creating..."
          >
            Create Call
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Edit Call Dialog */}
      <Dialog 
        open={editDialogOpen} 
        onClose={() => {
          setEditDialogOpen(false);
          setSelectedCall(null);
          setEditCall({});
          resetFollowUpData();
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Update Call</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={editCall.status || ''}
                onChange={(e) => setEditCall(prev => ({ ...prev, status: e.target.value as Call['status'] }))}
                label="Status"
              >
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="in-progress">In Progress</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
                <MenuItem value="no-answer">No Answer</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>Outcome</InputLabel>
              <Select
                value={editCall.outcome || ''}
                onChange={(e) => handleOutcomeChange(e.target.value as Call['outcome'])}
                label="Outcome"
              >
                <MenuItem value="">None</MenuItem>
                <MenuItem value="interested">Interested</MenuItem>
                <MenuItem value="not-interested">Not Interested</MenuItem>
                <MenuItem value="callback">Callback Requested</MenuItem>
                <MenuItem value="wrong-number">Wrong Number</MenuItem>
                <MenuItem value="no-answer">No Answer</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Duration (seconds)"
              type="number"
              value={editCall.duration || ''}
              onChange={(e) => {
                const value = e.target.value;
                setEditCall(prev => ({ 
                  ...prev, 
                  duration: value === '' ? undefined : parseInt(value) || 0
                }));
              }}
              fullWidth
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Comments"
              multiline
              rows={3}
              value={editCall.notes || ''}
              onChange={(e) => setEditCall(prev => ({ ...prev, notes: e.target.value }))}
              fullWidth
            />

            {/* Follow-up Section */}
            {showFollowUpFields && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'grey.300' }}>
                <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
                  Schedule Follow-up
                </Typography>
                <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  A follow-up will be automatically created when you update this call.
                </Typography>
                
                <Box display="flex" flexDirection="column" gap={2}>
                  <TextField
                    label="Follow-up Date & Time"
                    type="datetime-local"
                    value={followUpData.scheduledDate}
                    onChange={(e) => setFollowUpData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    helperText="Default is 7 days from now at 9:00 AM"
                  />
                  
                  <TextField
                    label="Follow-up Notes"
                    multiline
                    rows={2}
                    value={followUpData.notes}
                    onChange={(e) => setFollowUpData(prev => ({ ...prev, notes: e.target.value }))}
                    fullWidth
                    placeholder="Add specific notes for the follow-up..."
                  />
                  
                  <Box>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                      Priority
                    </Typography>
                    <StarRating
                      value={followUpData.priority}
                      onChange={(priority) => setFollowUpData(prev => ({ ...prev, priority }))}
                      showLabel={true}
                      helperText="Set the priority level for this follow-up"
                    />
                  </Box>
                </Box>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditDialogOpen(false);
            setSelectedCall(null);
            setEditCall({});
            resetFollowUpData();
          }}>Cancel</Button>
          <LoadingButton
            actionId="update-call"
            onClick={handleUpdateCall}
            variant="contained"
            loadingText="Updating..."
          >
            Update Call
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Enhanced Filter Dialog */}
      <CallsFilterDialog
        open={filterDialogOpen}
        onClose={() => setFilterDialogOpen(false)}
        onApply={(newFilters) => {
          setEnhancedFilters(newFilters);
          fetchData(newFilters); // Pass new filters directly
        }}
        onClear={() => {
          const clearedFilters: CallsFilterState = {
            dateRange: { preset: '', startDate: '', endDate: '' },
            caller: '',
            status: '',
            outcome: '',
          };
          setEnhancedFilters(clearedFilters);
          fetchData(clearedFilters); // Pass cleared filters directly
        }}
        currentFilters={enhancedFilters}
        isAdmin={isAdmin}
        users={users}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Delete Call</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this call? This action cannot be undone.
          </Typography>
          {selectedCall && (
            <Box mt={2} p={2} bgcolor="grey.100" borderRadius={1}>
              <Typography variant="body2" color="text.secondary">
                <strong>Phone Number:</strong> {selectedCall.phoneNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Status:</strong> {selectedCall.status}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Created:</strong> {formatDateTime(selectedCall.createdAt)}
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <LoadingButton
            actionId="delete-call"
            onClick={handleDeleteCall}
            variant="contained"
            color="error"
            loadingText="Deleting..."
          >
            Delete Call
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CallsPage;
