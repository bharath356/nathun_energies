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
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  Today as TodayIcon,
  Event as TomorrowIcon,
  DateRange as DateRangeIcon,
  Clear as ClearIcon,
  FilterList as FilterIcon,
  Schedule as ScheduleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { User, FollowUp } from '../shared/types';

export interface FollowUpsFilterState {
  dateRange: {
    preset: 'today' | 'tomorrow' | 'thisweek' | 'nextweek' | 'thismonth' | 'overdue' | 'custom' | '';
    startDate: string;
    endDate: string;
  };
  assignee: string; // userId for admin filtering
  status: FollowUp['status'] | '';
  priority: number | '';
  overdue: boolean;
}

interface FollowUpsFilterDialogProps {
  open: boolean;
  onClose: () => void;
  onApply: (filters: FollowUpsFilterState) => void;
  onClear: () => void;
  currentFilters: FollowUpsFilterState;
  isAdmin: boolean;
  users: User[]; // Available users for assignee filtering
}

const FollowUpsFilterDialog: React.FC<FollowUpsFilterDialogProps> = ({
  open,
  onClose,
  onApply,
  onClear,
  currentFilters,
  isAdmin,
  users,
}) => {
  const [filters, setFilters] = useState<FollowUpsFilterState>(currentFilters);

  // Update local state when currentFilters change
  useEffect(() => {
    setFilters(currentFilters);
  }, [currentFilters]);

  // Helper function to get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Helper function to get tomorrow's date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Helper function to get date N days from now
  const getDaysFromNow = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  // Helper function to get start of current week (Monday)
  const getStartOfWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };

  // Helper function to get end of current week (Sunday)
  const getEndOfWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 0 : 7); // Adjust when day is Sunday
    const sunday = new Date(today.setDate(diff));
    return sunday.toISOString().split('T')[0];
  };

  // Helper function to get start of next week
  const getStartOfNextWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 1 : 8); // Next Monday
    const nextMonday = new Date(today.setDate(diff));
    return nextMonday.toISOString().split('T')[0];
  };

  // Helper function to get end of next week
  const getEndOfNextWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? 7 : 14); // Next Sunday
    const nextSunday = new Date(today.setDate(diff));
    return nextSunday.toISOString().split('T')[0];
  };

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

  // Handle date preset selection
  const handleDatePresetChange = (preset: FollowUpsFilterState['dateRange']['preset']) => {
    let startDate = '';
    let endDate = '';
    let overdue = false;

    switch (preset) {
      case 'today':
        startDate = getTodayDate();
        endDate = getTodayDate();
        break;
      case 'tomorrow':
        startDate = getTomorrowDate();
        endDate = getTomorrowDate();
        break;
      case 'thisweek':
        startDate = getStartOfWeek();
        endDate = getEndOfWeek();
        break;
      case 'nextweek':
        startDate = getStartOfNextWeek();
        endDate = getEndOfNextWeek();
        break;
      case 'thismonth':
        const monthRange = getCurrentMonthRange();
        startDate = monthRange.startDate;
        endDate = monthRange.endDate;
        break;
      case 'overdue':
        // For overdue, we'll use the overdue flag instead of date range
        overdue = true;
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
      overdue,
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
      overdue: false, // Clear overdue when setting custom dates
    }));
  };

  // Handle assignee selection
  const handleAssigneeChange = (userId: string) => {
    setFilters(prev => ({
      ...prev,
      assignee: userId,
    }));
  };

  // Handle status/priority changes
  const handleFilterChange = (field: 'status' | 'priority', value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  // Handle overdue checkbox
  const handleOverdueChange = (checked: boolean) => {
    setFilters(prev => ({
      ...prev,
      overdue: checked,
      // Clear date range when overdue is selected
      ...(checked && {
        dateRange: { preset: 'overdue', startDate: '', endDate: '' }
      })
    }));
  };

  // Apply filters
  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  // Clear all filters
  const handleClear = () => {
    const clearedFilters: FollowUpsFilterState = {
      dateRange: { preset: '', startDate: '', endDate: '' },
      assignee: '',
      status: '',
      priority: '',
      overdue: false,
    };
    setFilters(clearedFilters);
    onClear();
    onClose();
  };

  // Reset to current month's follow-ups
  const handleResetToCurrentMonth = () => {
    const monthRange = getCurrentMonthRange();
    const monthFilters: FollowUpsFilterState = {
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
    setFilters(monthFilters);
    onApply(monthFilters);
    onClose();
  };

  // Get active filter count
  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.dateRange.startDate || filters.dateRange.endDate || filters.overdue) count++;
    if (filters.assignee) count++;
    if (filters.status) count++;
    if (filters.priority) count++;
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
            <Typography variant="h6">Filter Follow-ups</Typography>
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
                { value: 'tomorrow', label: 'Tomorrow', icon: <TomorrowIcon /> },
                { value: 'thisweek', label: 'This Week', icon: <ScheduleIcon /> },
                { value: 'nextweek', label: 'Next Week', icon: <ScheduleIcon /> },
                { value: 'thismonth', label: 'This Month', icon: <DateRangeIcon /> },
                { value: 'overdue', label: 'Overdue', icon: <WarningIcon /> },
                { value: 'custom', label: 'Custom Range' },
              ].map((preset) => (
                <Button
                  key={preset.value}
                  variant={filters.dateRange.preset === preset.value || (preset.value === 'overdue' && filters.overdue) ? 'contained' : 'outlined'}
                  size="small"
                  startIcon={preset.icon}
                  onClick={() => handleDatePresetChange(preset.value as any)}
                  color={preset.value === 'overdue' ? 'warning' : 'primary'}
                >
                  {preset.label}
                </Button>
              ))}
            </Box>

            {/* Overdue Checkbox */}
            <Box mb={2}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={filters.overdue}
                    onChange={(e) => handleOverdueChange(e.target.checked)}
                    color="warning"
                  />
                }
                label={
                  <Box display="flex" alignItems="center" gap={1}>
                    <WarningIcon color="warning" fontSize="small" />
                    <Typography>Show only overdue follow-ups</Typography>
                  </Box>
                }
              />
            </Box>

            {/* Custom Date Inputs */}
            {!filters.overdue && (
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
            )}
          </Paper>

          {/* Assignee Filter (Admin Only) */}
          {isAdmin && (
            <Paper elevation={1} sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Assignee Filter
              </Typography>
              <Autocomplete
                options={users}
                getOptionLabel={(user) => getUserDisplayName(user)}
                value={users.find(u => u.userId === filters.assignee) || null}
                onChange={(_, user) => handleAssigneeChange(user?.userId || '')}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Select Assignee"
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
                clearText="Clear assignee filter"
              />
            </Paper>
          )}

          {/* Status, Priority Filters */}
          <Paper elevation={1} sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Status & Priority
            </Typography>
            <Box display="flex" gap={2} mb={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  label="Status"
                >
                  <MenuItem value="">All Statuses</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="cancelled">Cancelled</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>Priority</InputLabel>
                <Select
                  value={filters.priority}
                  onChange={(e) => handleFilterChange('priority', e.target.value as number)}
                  label="Priority"
                >
                  <MenuItem value="">All Priorities</MenuItem>
                  <MenuItem value={5}>5 Stars (Highest)</MenuItem>
                  <MenuItem value={4}>4 Stars</MenuItem>
                  <MenuItem value={3}>3 Stars</MenuItem>
                  <MenuItem value={2}>2 Stars</MenuItem>
                  <MenuItem value={1}>1 Star (Lowest)</MenuItem>
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
            <Button onClick={handleResetToCurrentMonth} color="primary" variant="outlined">
              Reset to This Month
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

export default FollowUpsFilterDialog;
