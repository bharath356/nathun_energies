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
  Pagination,
  Stack
} from '@mui/material';
import {
  Add as AddIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Delete as DeleteIcon,
  DeleteSweep as DeleteSweepIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { PhoneNumber, User, AssignPhoneNumbersRequest, PaginatedPhoneNumbersResponse, PhoneNumberStats, PhoneNumbersQueryParams } from '../shared/types';
import AddPhoneNumberDialog from '../components/AddPhoneNumberDialog';
import TableHeaderFilter, { FilterOption } from '../components/TableHeaderFilter';
import PhoneNumberLink from '../components/PhoneNumberLink';
import LoadingButton from '../components/LoadingButton';

const PhoneNumbersPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { setPageLoading } = useLoading();
  
  // Pagination state
  const [paginatedData, setPaginatedData] = useState<PaginatedPhoneNumbersResponse | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [phoneNumberStats, setPhoneNumberStats] = useState<PhoneNumberStats | null>(null);
  
  // Legacy state for backward compatibility
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableAreaCodes, setAvailableAreaCodes] = useState<{ areaCode: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openAssignDialog, setOpenAssignDialog] = useState(false);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    userId: '',
    count: 10,
    assignmentMethod: 'random' as 'random' | 'area-code',
    areaCode: ''
  });

  // Edit state management
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    address: ''
  });
  const [updateLoading, setUpdateLoading] = useState(false);

  // Deletion state management
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [openBulkDeleteDialog, setOpenBulkDeleteDialog] = useState(false);
  const [phoneNumberToDelete, setPhoneNumberToDelete] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [bulkDeleteFormData, setBulkDeleteFormData] = useState({
    areaCode: '',
    force: false
  });

  // Column filter states
  const [columnFilters, setColumnFilters] = useState({
    phoneNumber: '',
    name: '',
    address: '',
    areaCode: '',
    status: '',
    assignedTo: '',
    assignedAt: { start: '', end: '' },
    batchId: '',
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

  // Fetch paginated data
  const fetchPaginatedData = async (page: number = currentPage, filters?: PhoneNumbersQueryParams) => {
    try {
      setLoading(true);
      setPageLoading('phonenumbers', true);
      setError(null);

      // Build filters from column filters
      const queryFilters: PhoneNumbersQueryParams = {
        ...filters,
        status: (columnFilters.status as PhoneNumber['status']) || undefined,
        assignedTo: columnFilters.assignedTo || undefined,
        areaCode: columnFilters.areaCode || undefined,
        name: columnFilters.name || undefined,
        address: columnFilters.address || undefined,
        batchId: columnFilters.batchId || undefined,
        assignedAtStart: columnFilters.assignedAt.start || undefined,
        assignedAtEnd: columnFilters.assignedAt.end || undefined,
        createdAtStart: columnFilters.createdAt.start || undefined,
        createdAtEnd: columnFilters.createdAt.end || undefined,
      };

      // Remove empty filters
      Object.keys(queryFilters).forEach(key => {
        if (queryFilters[key as keyof PhoneNumbersQueryParams] === undefined || queryFilters[key as keyof PhoneNumbersQueryParams] === '') {
          delete queryFilters[key as keyof PhoneNumbersQueryParams];
        }
      });

      // Fetch paginated phone numbers
      const paginatedResult = await apiService.getPhoneNumbersPaginated(page, pageSize, queryFilters);
      console.log('Fetched paginated phone numbers:', paginatedResult);
      setPaginatedData(paginatedResult);
      setPhoneNumbers(paginatedResult.items); // Keep for backward compatibility

      // Fetch statistics separately
      const statsData = await apiService.getPhoneNumberStats();
      console.log('Fetched phone number stats:', statsData);
      setPhoneNumberStats(statsData);

      // Fetch users for assignment dropdown (admin only)
      if (isAdmin) {
        const usersData = await apiService.getUsers();
        console.log('Fetched users:', usersData);
        if (Array.isArray(usersData)) {
          // Only show active callers
          const activeCallers = usersData.filter(u => u.role === 'caller' && u.isActive);
          setUsers(activeCallers);
        } else {
          console.error('Users data is not an array:', usersData);
          setUsers([]);
        }

        // Fetch available area codes
        try {
          const areaCodesData = await apiService.getAvailableAreaCodes();
          console.log('Fetched area codes:', areaCodesData);
          if (Array.isArray(areaCodesData)) {
            setAvailableAreaCodes(areaCodesData);
          } else {
            console.error('Area codes data is not an array:', areaCodesData);
            setAvailableAreaCodes([]);
          }
        } catch (areaCodeError: any) {
          console.error('Error fetching area codes:', areaCodeError);
          // Don't set error here as it's not critical for the main functionality
        }
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setError(`Failed to load data: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setPageLoading('phonenumbers', false);
    }
  };

  // Legacy fetch data method for backward compatibility
  const fetchData = () => fetchPaginatedData(1);

  // Handle page change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
    fetchPaginatedData(page);
  };

  // Handle filter changes
  const handleFilterChange = () => {
    setCurrentPage(1); // Reset to first page when filters change
    fetchPaginatedData(1);
  };

  useEffect(() => {
    fetchPaginatedData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger filter change when column filters change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      handleFilterChange();
    }, 500); // Debounce filter changes

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnFilters]);

  // Handle phone number assignment
  const handleAssignNumbers = async () => {
    try {
      if (!assignFormData.userId) {
        setError('Please select a user');
        return;
      }

      if (assignFormData.assignmentMethod === 'area-code' && !assignFormData.areaCode) {
        setError('Please select an area code for area code-based assignment');
        return;
      }

      const maxCount = assignFormData.assignmentMethod === 'area-code' && assignFormData.areaCode
        ? availableAreaCodes.find(ac => ac.areaCode === assignFormData.areaCode)?.count || 0
        : 100;

      if (assignFormData.count < 1 || assignFormData.count > maxCount) {
        setError(`Count must be between 1 and ${maxCount}`);
        return;
      }

      const requestData: AssignPhoneNumbersRequest = {
        userId: assignFormData.userId,
        count: assignFormData.count,
        ...(assignFormData.assignmentMethod === 'area-code' && assignFormData.areaCode && {
          areaCode: assignFormData.areaCode
        })
      };

      const response = await apiService.assignPhoneNumbers(requestData);
      
      setOpenAssignDialog(false);
      resetAssignForm();
      
      // Show appropriate message based on assignment result
      if (response.message) {
        // Show info message for partial assignment (not an error)
        console.log('Partial assignment:', response.message);
      }
      
      await fetchData();
    } catch (error: any) {
      console.error('Error assigning phone numbers:', error);
      setError(`Failed to assign phone numbers: ${error?.message || 'Unknown error'}`);
    }
  };

  // Reset assignment form
  const resetAssignForm = () => {
    setAssignFormData({
      userId: '',
      count: 10,
      assignmentMethod: 'random',
      areaCode: ''
    });
  };

  // Open assignment dialog
  const handleOpenAssignDialog = () => {
    resetAssignForm();
    setOpenAssignDialog(true);
  };

  // Get status color
  const getStatusColor = (status: PhoneNumber['status']) => {
    switch (status) {
      case 'available':
        return 'success';
      case 'assigned':
        return 'primary';
      case 'in-use':
        return 'warning';
      case 'completed':
        return 'default';
      default:
        return 'default';
    }
  };

  // Filter options for dropdowns
  const statusOptions: FilterOption[] = [
    { value: 'available', label: 'Available' },
    { value: 'assigned', label: 'Assigned' },
    { value: 'in-use', label: 'In Use' },
    { value: 'completed', label: 'Completed' },
  ];

  const userOptions: FilterOption[] = users.map(user => ({
    value: user.userId,
    label: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email
  }));

  // Apply column filters
  const filteredPhoneNumbers = phoneNumbers.filter(phoneNumber => {
    // Phone number filter
    if (columnFilters.phoneNumber && !phoneNumber.phoneNumber.toLowerCase().includes(columnFilters.phoneNumber.toLowerCase())) return false;
    
    // Name filter
    if (columnFilters.name && phoneNumber.name && !phoneNumber.name.toLowerCase().includes(columnFilters.name.toLowerCase())) return false;
    
    // Address filter
    if (columnFilters.address && phoneNumber.address && !phoneNumber.address.toLowerCase().includes(columnFilters.address.toLowerCase())) return false;
    
    // Area code filter
    if (columnFilters.areaCode && !phoneNumber.areaCode.toLowerCase().includes(columnFilters.areaCode.toLowerCase())) return false;
    
    // Status filter
    if (columnFilters.status && phoneNumber.status !== columnFilters.status) return false;
    
    // Assigned to filter
    if (columnFilters.assignedTo && phoneNumber.assignedTo !== columnFilters.assignedTo) return false;
    
    // Batch ID filter
    if (columnFilters.batchId && phoneNumber.batchId && !phoneNumber.batchId.toLowerCase().includes(columnFilters.batchId.toLowerCase())) return false;
    
    // Assigned date filter
    if (columnFilters.assignedAt.start && phoneNumber.assignedAt) {
      const assignedDate = new Date(phoneNumber.assignedAt).toISOString().split('T')[0];
      if (assignedDate < columnFilters.assignedAt.start) return false;
    }
    if (columnFilters.assignedAt.end && phoneNumber.assignedAt) {
      const assignedDate = new Date(phoneNumber.assignedAt).toISOString().split('T')[0];
      if (assignedDate > columnFilters.assignedAt.end) return false;
    }
    
    // Created date filter
    if (columnFilters.createdAt.start) {
      const createdDate = new Date(phoneNumber.createdAt).toISOString().split('T')[0];
      if (createdDate < columnFilters.createdAt.start) return false;
    }
    if (columnFilters.createdAt.end) {
      const createdDate = new Date(phoneNumber.createdAt).toISOString().split('T')[0];
      if (createdDate > columnFilters.createdAt.end) return false;
    }
    
    return true;
  });

  // Get phone number statistics - use API stats for accurate totals
  const getStats = () => {
    if (phoneNumberStats) {
      return {
        total: phoneNumberStats.total,
        available: phoneNumberStats.available,
        assigned: phoneNumberStats.assigned,
        inUse: phoneNumberStats.inUse,
        completed: phoneNumberStats.completed
      };
    }
    
    // Fallback to local calculation if stats not loaded yet
    const total = phoneNumbers.length;
    const available = phoneNumbers.filter(p => p.status === 'available').length;
    const assigned = phoneNumbers.filter(p => p.status === 'assigned').length;
    const inUse = phoneNumbers.filter(p => p.status === 'in-use').length;
    const completed = phoneNumbers.filter(p => p.status === 'completed').length;

    return { total, available, assigned, inUse, completed };
  };

  // Get user name by ID
  const getUserName = (userId: string) => {
    const foundUser = users.find(u => u.userId === userId);
    return foundUser ? `${foundUser.firstName || ''} ${foundUser.lastName || ''}`.trim() || foundUser.email : 'Unknown User';
  };

  // Handle edit row
  const handleEditRow = (phoneNumber: PhoneNumber) => {
    setEditingRow(phoneNumber.phoneNumber);
    setEditFormData({
      name: phoneNumber.name || '',
      address: phoneNumber.address || ''
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditFormData({ name: '', address: '' });
  };

  // Handle save edit
  const handleSaveEdit = async (phoneNumber: string) => {
    try {
      setUpdateLoading(true);
      setError(null);

      await apiService.updatePhoneNumber(phoneNumber, {
        name: editFormData.name || undefined,
        address: editFormData.address || undefined
      });

      // Update local state
      setPhoneNumbers(prev => prev.map(p => 
        p.phoneNumber === phoneNumber 
          ? { ...p, name: editFormData.name || undefined, address: editFormData.address || undefined }
          : p
      ));

      setEditingRow(null);
      setEditFormData({ name: '', address: '' });
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      setError(`Failed to update phone number: ${error?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setUpdateLoading(false);
    }
  };

  // Handle edit form change
  const handleEditFormChange = (field: 'name' | 'address') => (event: React.ChangeEvent<HTMLInputElement>) => {
    setEditFormData(prev => ({ ...prev, [field]: event.target.value }));
  };

  // Handle delete phone number
  const handleDeletePhoneNumber = (phoneNumber: string) => {
    setPhoneNumberToDelete(phoneNumber);
    setOpenDeleteDialog(true);
  };

  // Confirm delete phone number
  const confirmDeletePhoneNumber = async () => {
    if (!phoneNumberToDelete) return;

    try {
      setDeleteLoading(true);
      setError(null);

      await apiService.deletePhoneNumber(phoneNumberToDelete);

      // Remove from local state
      setPhoneNumbers(prev => prev.filter(p => p.phoneNumber !== phoneNumberToDelete));

      setOpenDeleteDialog(false);
      setPhoneNumberToDelete(null);
    } catch (error: any) {
      console.error('Error deleting phone number:', error);
      setError(`Failed to delete phone number: ${error?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Handle bulk delete by area code
  const handleBulkDeleteByAreaCode = () => {
    setBulkDeleteFormData({ areaCode: '', force: false });
    setOpenBulkDeleteDialog(true);
  };

  // Confirm bulk delete by area code
  const confirmBulkDeleteByAreaCode = async () => {
    if (!bulkDeleteFormData.areaCode) {
      setError('Please select an area code');
      return;
    }

    try {
      setDeleteLoading(true);
      setError(null);

      const result = await apiService.bulkDeletePhoneNumbersByAreaCode(
        bulkDeleteFormData.areaCode,
        bulkDeleteFormData.force
      );

      // Show results
      if (result.deletedCount > 0) {
        console.log(`Successfully deleted ${result.deletedCount} phone numbers from area code ${result.areaCode}`);
      }

      if (result.skippedCount > 0) {
        console.log(`Skipped ${result.skippedCount} phone numbers due to safety restrictions`);
      }

      if (result.errorCount > 0) {
        console.log(`Failed to delete ${result.errorCount} phone numbers due to errors`);
      }

      setOpenBulkDeleteDialog(false);
      setBulkDeleteFormData({ areaCode: '', force: false });
      
      // Refresh data to show updated state
      await fetchData();
    } catch (error: any) {
      console.error('Error bulk deleting phone numbers:', error);
      setError(`Failed to bulk delete phone numbers: ${error?.response?.data?.message || 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // Check if phone number can be deleted (for UI indication)
  const canDeletePhoneNumber = (phoneNumber: PhoneNumber) => {
    // Basic client-side checks (server will do more thorough validation)
    return phoneNumber.status !== 'in-use';
  };

  // Get area codes that have phone numbers for bulk delete
  const getAreaCodesForBulkDelete = () => {
    const areaCodes = new Set(phoneNumbers.map(p => p.areaCode));
    return Array.from(areaCodes).map(areaCode => {
      const count = phoneNumbers.filter(p => p.areaCode === areaCode).length;
      return { areaCode, count };
    }).sort((a, b) => a.areaCode.localeCompare(b.areaCode));
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
          {isAdmin ? 'Phone Numbers' : 'My Phone Numbers'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          {isAdmin && (
            <>
              <Button
                variant="outlined"
                startIcon={<AddIcon />}
                onClick={() => setOpenAddDialog(true)}
              >
                Add Numbers
              </Button>
              <Button
                variant="contained"
                startIcon={<AssignmentIcon />}
                onClick={handleOpenAssignDialog}
              >
                Assign Numbers
              </Button>
              <Button
                variant="outlined"
                startIcon={<DeleteSweepIcon />}
                onClick={handleBulkDeleteByAreaCode}
                color="error"
              >
                Bulk Delete
              </Button>
            </>
          )}
        </Box>
      </Box>

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
              <Typography variant="body2">Total Numbers</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.available}
              </Typography>
              <Typography variant="body2">Available</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.assigned}
              </Typography>
              <Typography variant="body2">Assigned</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {stats.inUse}
              </Typography>
              <Typography variant="body2">In Use</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="text.secondary">
                {stats.completed}
              </Typography>
              <Typography variant="body2">Completed</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Phone Numbers Table */}
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
              <TableCell>
                <Box display="flex" alignItems="center">
                  Name
                  <TableHeaderFilter
                    title="Name"
                    type="text"
                    value={columnFilters.name}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, name: value }))}
                    placeholder="Search name..."
                    hasActiveFilter={!!columnFilters.name}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Address
                  <TableHeaderFilter
                    title="Address"
                    type="text"
                    value={columnFilters.address}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, address: value }))}
                    placeholder="Search address..."
                    hasActiveFilter={!!columnFilters.address}
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center">
                  Area Code
                  <TableHeaderFilter
                    title="Area Code"
                    type="text"
                    value={columnFilters.areaCode}
                    onChange={(value) => setColumnFilters(prev => ({ ...prev, areaCode: value }))}
                    placeholder="Search area code..."
                    hasActiveFilter={!!columnFilters.areaCode}
                  />
                </Box>
              </TableCell>
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
              {isAdmin && (
                <>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      Assigned To
                      <TableHeaderFilter
                        title="Assigned To"
                        type="select"
                        value={columnFilters.assignedTo}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, assignedTo: value }))}
                        options={userOptions}
                        hasActiveFilter={!!columnFilters.assignedTo}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      Assigned Date
                      <TableHeaderFilter
                        title="Assigned Date"
                        type="date-range"
                        value={columnFilters.assignedAt}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, assignedAt: value }))}
                        hasActiveFilter={!!(columnFilters.assignedAt.start || columnFilters.assignedAt.end)}
                      />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center">
                      Batch ID
                      <TableHeaderFilter
                        title="Batch ID"
                        type="text"
                        value={columnFilters.batchId}
                        onChange={(value) => setColumnFilters(prev => ({ ...prev, batchId: value }))}
                        placeholder="Search batch ID..."
                        hasActiveFilter={!!columnFilters.batchId}
                      />
                    </Box>
                  </TableCell>
                </>
              )}
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
            {filteredPhoneNumbers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={isAdmin ? 10 : 7} align="center">
                  <Typography variant="body2" color="text.secondary">
                    {phoneNumbers.length === 0 ? 'No phone numbers found' : 'No phone numbers match your filters'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredPhoneNumbers.map((phoneNumber) => {
                const isEditing = editingRow === phoneNumber.phoneNumber;
                return (
                  <TableRow key={phoneNumber.phoneNumber}>
                    <TableCell>
                      <PhoneNumberLink phoneNumber={phoneNumber.phoneNumber} maskNumber={!isAdmin} />
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editFormData.name}
                          onChange={handleEditFormChange('name')}
                          placeholder="Enter name"
                          variant="outlined"
                          sx={{ minWidth: 120 }}
                        />
                      ) : (
                        <Typography variant="body2">
                          {phoneNumber.name || '-'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <TextField
                          size="small"
                          value={editFormData.address}
                          onChange={handleEditFormChange('address')}
                          placeholder="Enter address"
                          variant="outlined"
                          multiline
                          rows={1}
                          sx={{ minWidth: 150 }}
                        />
                      ) : (
                        <Typography variant="body2" sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {phoneNumber.address || '-'}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={phoneNumber.areaCode} 
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={phoneNumber.status.toUpperCase()} 
                        color={getStatusColor(phoneNumber.status)}
                        size="small"
                      />
                    </TableCell>
                    {isAdmin && (
                      <>
                        <TableCell>
                          {phoneNumber.assignedTo ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <PersonIcon fontSize="small" />
                              {getUserName(phoneNumber.assignedTo)}
                            </Box>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              Unassigned
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {phoneNumber.assignedAt ? formatDate(phoneNumber.assignedAt) : '-'}
                        </TableCell>
                        <TableCell>
                          {phoneNumber.batchId ? (
                            <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                              {phoneNumber.batchId.substring(0, 8)}...
                            </Typography>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      </>
                    )}
                    <TableCell>
                      {formatDate(phoneNumber.createdAt)}
                    </TableCell>
                    <TableCell>
                      {isAdmin ? (
                        isEditing ? (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Save">
                              <IconButton
                                size="small"
                                onClick={() => handleSaveEdit(phoneNumber.phoneNumber)}
                                disabled={updateLoading}
                                color="primary"
                              >
                                {updateLoading ? <CircularProgress size={16} /> : <SaveIcon />}
                              </IconButton>
                            </Tooltip>
                            <Tooltip title="Cancel">
                              <IconButton
                                size="small"
                                onClick={handleCancelEdit}
                                disabled={updateLoading}
                              >
                                <CancelIcon />
                              </IconButton>
                            </Tooltip>
                          </Box>
                        ) : (
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Edit name and address">
                              <IconButton
                                size="small"
                                onClick={() => handleEditRow(phoneNumber)}
                                disabled={editingRow !== null}
                              >
                                <EditIcon />
                              </IconButton>
                            </Tooltip>
                            <Tooltip title={canDeletePhoneNumber(phoneNumber) ? "Delete phone number" : "Cannot delete - phone number is in use"}>
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeletePhoneNumber(phoneNumber.phoneNumber)}
                                  disabled={editingRow !== null || !canDeletePhoneNumber(phoneNumber)}
                                  color="error"
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </Box>
                        )
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          -
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Pagination Controls */}
      {paginatedData && paginatedData.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 3, gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, paginatedData.total)} of {paginatedData.total} phone numbers
          </Typography>
          <Pagination
            count={paginatedData.totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
            size="medium"
          />
        </Box>
      )}

      {/* Assignment Dialog */}
      <Dialog open={openAssignDialog} onClose={() => setOpenAssignDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          Assign Phone Numbers
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select User</InputLabel>
              <Select
                value={assignFormData.userId}
                onChange={(e) => setAssignFormData({ ...assignFormData, userId: e.target.value })}
                label="Select User"
              >
                {users.map((user) => (
                  <MenuItem key={user.userId} value={user.userId}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" />
                      {`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email}
                      <Chip label={user.role} size="small" color="primary" />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Assignment Method</InputLabel>
              <Select
                value={assignFormData.assignmentMethod}
                onChange={(e) => setAssignFormData({ 
                  ...assignFormData, 
                  assignmentMethod: e.target.value as 'random' | 'area-code',
                  areaCode: e.target.value === 'random' ? '' : assignFormData.areaCode
                })}
                label="Assignment Method"
              >
                <MenuItem value="random">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Random Assignment</Typography>
                    <Chip label="Default" size="small" color="default" />
                  </Box>
                </MenuItem>
                <MenuItem value="area-code">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography>Area Code Based</Typography>
                    <Chip label="New" size="small" color="primary" />
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            {assignFormData.assignmentMethod === 'area-code' && (
              <FormControl fullWidth>
                <InputLabel>Select Area Code</InputLabel>
                <Select
                  value={assignFormData.areaCode}
                  onChange={(e) => setAssignFormData({ ...assignFormData, areaCode: e.target.value })}
                  label="Select Area Code"
                >
                  {availableAreaCodes.map((areaCodeInfo) => (
                    <MenuItem key={areaCodeInfo.areaCode} value={areaCodeInfo.areaCode}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                        <Typography>{areaCodeInfo.areaCode}</Typography>
                        <Chip 
                          label={`${areaCodeInfo.count} available`} 
                          size="small" 
                          color={areaCodeInfo.count > 0 ? 'success' : 'error'}
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              label="Number of Phone Numbers"
              type="number"
              value={assignFormData.count}
              onChange={(e) => setAssignFormData({ ...assignFormData, count: parseInt(e.target.value) || 0 })}
              inputProps={{ 
                min: 1, 
                max: assignFormData.assignmentMethod === 'area-code' && assignFormData.areaCode 
                  ? availableAreaCodes.find(ac => ac.areaCode === assignFormData.areaCode)?.count || 100
                  : 100 
              }}
              helperText={
                assignFormData.assignmentMethod === 'area-code' && assignFormData.areaCode
                  ? `Enter the number of phone numbers to assign (1-${availableAreaCodes.find(ac => ac.areaCode === assignFormData.areaCode)?.count || 0})`
                  : "Enter the number of phone numbers to assign (1-100)"
              }
              fullWidth
            />

            <Alert severity="info">
              {assignFormData.assignmentMethod === 'random' 
                ? `This will assign ${assignFormData.count} available phone numbers randomly to the selected user.`
                : assignFormData.areaCode
                  ? `This will assign ${assignFormData.count} phone numbers from area code ${assignFormData.areaCode} to the selected user.`
                  : `This will assign ${assignFormData.count} phone numbers from the selected area code to the selected user.`
              }
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssignDialog(false)}>Cancel</Button>
          <LoadingButton
            actionId="assign-numbers"
            onClick={handleAssignNumbers}
            variant="contained"
            loadingText="Assigning..."
          >
            Assign Numbers
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* Add Phone Number Dialog */}
      <AddPhoneNumberDialog
        open={openAddDialog}
        onClose={() => setOpenAddDialog(false)}
        onSuccess={fetchData}
      />

      {/* Delete Phone Number Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningIcon color="error" />
            Delete Phone Number
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Are you sure you want to delete the phone number <strong>{phoneNumberToDelete}</strong>?
          </Typography>
          <Alert severity="warning">
            This action cannot be undone. The phone number will be permanently removed from the system.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmDeletePhoneNumber} 
            variant="contained" 
            color="error"
            disabled={deleteLoading}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <Dialog open={openBulkDeleteDialog} onClose={() => setOpenBulkDeleteDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <DeleteSweepIcon color="error" />
            Bulk Delete by Area Code
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Select Area Code</InputLabel>
              <Select
                value={bulkDeleteFormData.areaCode}
                onChange={(e) => setBulkDeleteFormData({ ...bulkDeleteFormData, areaCode: e.target.value })}
                label="Select Area Code"
              >
                {getAreaCodesForBulkDelete().map((areaCodeInfo) => (
                  <MenuItem key={areaCodeInfo.areaCode} value={areaCodeInfo.areaCode}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%', justifyContent: 'space-between' }}>
                      <Typography>{areaCodeInfo.areaCode}</Typography>
                      <Chip 
                        label={`${areaCodeInfo.count} numbers`} 
                        size="small" 
                        color="primary"
                      />
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <input
                type="checkbox"
                id="force-delete"
                checked={bulkDeleteFormData.force}
                onChange={(e) => setBulkDeleteFormData({ ...bulkDeleteFormData, force: e.target.checked })}
              />
              <label htmlFor="force-delete">
                <Typography variant="body2">
                  Force delete (override safety restrictions)
                </Typography>
              </label>
            </Box>

            {bulkDeleteFormData.areaCode && (
              <Alert severity="warning">
                <Typography variant="body2" sx={{ mb: 1 }}>
                  This will delete all phone numbers in area code <strong>{bulkDeleteFormData.areaCode}</strong>.
                </Typography>
                <Typography variant="body2">
                  {bulkDeleteFormData.force 
                    ? "Force mode is enabled - all numbers will be deleted regardless of their status."
                    : "Numbers currently in use or with recent calls will be skipped for safety."
                  }
                </Typography>
              </Alert>
            )}

            <Alert severity="error">
              <Typography variant="body2">
                <strong>Warning:</strong> This action cannot be undone. Deleted phone numbers will be permanently removed from the system.
              </Typography>
            </Alert>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenBulkDeleteDialog(false)} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={confirmBulkDeleteByAreaCode} 
            variant="contained" 
            color="error"
            disabled={deleteLoading || !bulkDeleteFormData.areaCode}
            startIcon={deleteLoading ? <CircularProgress size={16} /> : <DeleteSweepIcon />}
          >
            {deleteLoading ? 'Deleting...' : 'Bulk Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PhoneNumbersPage;
