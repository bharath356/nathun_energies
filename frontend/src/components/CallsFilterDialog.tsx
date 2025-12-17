import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Chip,
  Autocomplete,
  Divider,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Today as TodayIcon,
  DateRange as DateRangeIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { User, Call } from '../shared/types';

export interface CallsFilterState {
  dateRange: {
    preset: 'today' | 'yesterday' | 'last7days' | 'last30days' | 'custom' | '';
    startDate: string;
    endDate: string;
  };
  caller: string; // userId for admin filtering
  status: Call['status'] | '';
  outcome: Call['outcome'] | '';
}

interface CallsFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: CallsFilterState) => void;
  onClear: () => void;
  currentFilters: CallsFilterState;
  isAdmin: boolean;
  users: User[]; // Available users for caller filtering
}

const CallsFilterDialog: React.FC<CallsFilterDialogProps> = ({
  open,
  onClose,
  onApply,
  onClear,
  currentFilters,
  isAdmin,
  users,
}) => {
  const [filters, setFilters] = useState<CallsFilterState>(currentFilters);

  // Update local state when currentFilters change
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to get date N days ago
  const getDaysAgo = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  // Handle date preset selection
  const handleDatePresetChange = (preset: CallsFilterState['dateRange']['preset']) => {
    let startDate = '';
    let endDate = '';

    switch (preset) {
      case 'today':
        startDate = getTodayDate();
        endDate = getTodayDate();
        break;
      case 'yesterday':
        startDate = getDaysAgo(1);
        endDate = getDaysAgo(1);
        break;
      case 'last7days':
        startDate = getDaysAgo(7);
        endDate = getTodayDate();
        break;
      case 'last30days':
        startDate = getDaysAgo(30);
        endDate = getTodayDate();
        break;
      case 'custom':
        // Keep existing dates or set to empty for user input
        break;
      default:
        startDate = '';
        endDate = '';
    }

    setFilters(prev => ({
      ...prev,
      dateRange: {
        preset,
        startDate,
        endDate,
      },
    }));
  };

  // Handle manual date changes
  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        preset: 'custom',
        [field]: value,
      },
    }));
  };

  // Handle caller selection
  const handleCallerChange = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      caller: userId,
    }));
  };

  // Handle status/outcome changes
  const handleFilterChange = (field: 'status' | 'outcome', value: string) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Apply filters
  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Clear all filters
  const handleClear = () => {
    const clearedFilters: CallsFilterState = {
      dateRange: { preset: '', startDate: '', endDate: '' },
      caller: '',
      status: '',
      outcome: '',
    };
    setFilters(clearedFilters);
    onClear();
    onClose();
  };

  // Reset to today's calls
  const handleResetToToday = () => {
    const todayFilters: CallsFilterState = {
      dateRange: { preset: 'today', startDate: getTodayDate(), endDate: getTodayDate() },
      caller: '',
      status: '',
      outcome: '',
    };
    setFilters(todayFilters);
    onApply(todayFilters);
    onClose();
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.caller) count++;
    if (filters.status) count++;
    if (filters.outcome) count++;
    return count;
  };

  // Get user display name
  const getUserDisplayName = (user: User) => {
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.email;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={1}>
            <FilterIcon />
            <Typography variant="h6">Filter Calls</Typography>
            {getActiveFilterCount() > 0 && (
              <Chip 
                label={`${getActiveFilterCount()} active`} 
                size="small" 
                color="primary" 
              />
            )}
          </Box>
          <Tooltip title="Close">
            <IconButton onClick={onClose} size="small">
              <ClearIcon />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Date Range Section */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DateRangeIcon />
              Date Range
            </Typography>
            
            {/* Date Presets */}
            <Box display="flex" flexWrap="wrap" gap={1} mb={2}>
              {[
                { value: 'today', label: 'Today', icon: <TodayIcon /> },
                { value: 'yesterday', label: 'Yesterday' },
                { value: 'last7days', label: 'Last 7 Days' },
                { value: 'last30days', label: 'Last 30 Days' },
                { value: 'custom', label: 'Custom Range' },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant={filters.dateRange.preset === preset.value ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={preset.icon}
                  onClick={() => handleDatePresetChange(preset.value as any)}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>

            {/* Custom Date Inputs */}
            <Box display="flex" gap={2}>
              <TextField
                label="Start Date"
                type="date"
                value={filters.dateRange.startDate}
                onChange={(e) => handleDateChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
              <TextField
                label="End Date"
                type="date"
                value={filters.dateRange.endDate}
                onChange={(e) => handleDateChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                size="small"
              />
            </Box>
          </Paper>

          {/* Caller Filter (Admin Only) */}
          {isAdmin && (
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Caller Filter
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(user) => getUserDisplayName(user)}
                value={users.find(u => u.userId === filters.caller) || null}
                onChange={(_, user) => handleCallerChange(user?.userId || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Caller"
                    placeholder="Search by name or email..."
                    size="small"
                  />
                )}
                renderOption={(props, user) => (
                  <Box component="li" {...props}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {getUserDisplayName(user)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {user.email}
                      </Typography>
                    </Box>
                  </Box>
                )}
                fullWidth
                clearOnEscape
                clearText="Clear caller filter"
              />
            </Paper>
          )}

          {/* Status and Outcome Filters */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status & Outcome
            </Typography>
            <Box display="flex" gap={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="in-progress">In Progress</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                  <MenuItem value="no-answer">No Answer</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Outcome</InputLabel>
                <Select
                  value={filters.outcome}
                  onChange={(e) => handleFilterChange('outcome', e.target.value)}
                  label="Outcome"
                >
                  <MenuItem value="">All Outcomes</MenuItem>
                  <MenuItem value="interested">Interested</MenuItem>
                  <MenuItem value="not-interested">Not Interested</MenuItem>
                  <MenuItem value="callback">Callback Requested</MenuItem>
                  <MenuItem value="wrong-number">Wrong Number</MenuItem>
                  <MenuItem value="no-answer">No Answer</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <DialogActions>
        <Box display="flex" justifyContent="space-between" width="100%" px={1}>
          <Box display="flex" gap={1}>
            <Button onClick={handleClear} color="error" variant="outlined">
              Clear All
            </Button>
            <Button onClick={handleResetToToday} color="primary" variant="outlined">
              Reset to Today
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={handleApply} variant="contained" color="primary">
              Apply Filters
            </Button>
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default CallsFilterDialog;
