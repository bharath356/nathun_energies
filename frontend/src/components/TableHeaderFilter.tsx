import React, { useState, useRef } from 'react';
import {
  IconButton,
  Popover,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Typography,
  Divider,
  Chip,
  Stack
} from '@mui/material';
import {
  FilterList as FilterIcon,
  Clear as ClearIcon,
  Check as CheckIcon
} from '@mui/icons-material';

export interface FilterOption {
  value: string;
  label: string;
}

export interface TableHeaderFilterProps {
  title: string;
  type: 'text' | 'select' | 'date-range' | 'number-range';
  value?: any;
  onChange: (value: any) => void;
  options?: FilterOption[];
  placeholder?: string;
  hasActiveFilter?: boolean;
}

const TableHeaderFilter: React.FC<TableHeaderFilterProps> = ({
  title,
  type,
  value,
  onChange,
  options = [],
  placeholder,
  hasActiveFilter = false
}) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
    setLocalValue(value);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleApply = () => {
    onChange(localValue);
    handleClose();
  };

  const handleClear = () => {
    const clearValue = type === 'date-range' || type === 'number-range' 
      ? { start: '', end: '' } 
      : '';
    setLocalValue(clearValue);
    onChange(clearValue);
    handleClose();
  };

  const handleTextChange = (newValue: string) => {
    setLocalValue(newValue);
    
    // Debounce text input
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, 300);
  };

  const renderFilterContent = () => {
    switch (type) {
      case 'text':
        return (
          <TextField
            label={placeholder || `Filter ${title}`}
            value={localValue || ''}
            onChange={(e) => handleTextChange(e.target.value)}
            size="small"
            fullWidth
            autoFocus
          />
        );

      case 'select':
        return (
          <FormControl size="small" fullWidth>
            <InputLabel>{`Filter ${title}`}</InputLabel>
            <Select
              value={localValue || ''}
              onChange={(e) => setLocalValue(e.target.value)}
              label={`Filter ${title}`}
            >
              <MenuItem value="">All</MenuItem>
              {options.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'date-range':
        return (
          <Stack spacing={2}>
            <TextField
              label="From Date"
              type="date"
              value={localValue?.start || ''}
              onChange={(e) => setLocalValue({ ...(localValue || {}), start: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
            <TextField
              label="To Date"
              type="date"
              value={localValue?.end || ''}
              onChange={(e) => setLocalValue({ ...(localValue || {}), end: e.target.value })}
              InputLabelProps={{ shrink: true }}
              size="small"
              fullWidth
            />
          </Stack>
        );

      case 'number-range':
        return (
          <Stack spacing={2}>
            <TextField
              label="Min Value"
              type="number"
              value={localValue?.start || ''}
              onChange={(e) => setLocalValue({ ...(localValue || {}), start: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label="Max Value"
              type="number"
              value={localValue?.end || ''}
              onChange={(e) => setLocalValue({ ...(localValue || {}), end: e.target.value })}
              size="small"
              fullWidth
            />
          </Stack>
        );

      default:
        return null;
    }
  };

  const getFilterSummary = () => {
    if (!hasActiveFilter) return null;

    switch (type) {
      case 'text':
        return value ? `"${value}"` : null;
      case 'select':
        const option = options.find(opt => opt.value === value);
        return option ? option.label : null;
      case 'date-range':
        if (value?.start && value?.end) {
          return `${value.start} to ${value.end}`;
        } else if (value?.start) {
          return `From ${value.start}`;
        } else if (value?.end) {
          return `To ${value.end}`;
        }
        return null;
      case 'number-range':
        if (value?.start && value?.end) {
          return `${value.start} - ${value.end}`;
        } else if (value?.start) {
          return `≥ ${value.start}`;
        } else if (value?.end) {
          return `≤ ${value.end}`;
        }
        return null;
      default:
        return null;
    }
  };

  const filterSummary = getFilterSummary();

  return (
    <>
      <IconButton
        size="small"
        onClick={handleClick}
        color={hasActiveFilter ? 'primary' : 'default'}
        sx={{ ml: 0.5 }}
      >
        <FilterIcon fontSize="small" />
      </IconButton>
      
      {filterSummary && (
        <Chip
          label={filterSummary}
          size="small"
          onDelete={handleClear}
          color="primary"
          variant="outlined"
          sx={{ ml: 0.5, maxWidth: 120 }}
        />
      )}

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
      >
        <Box sx={{ p: 2, minWidth: 250 }}>
          <Typography variant="subtitle2" gutterBottom>
            Filter {title}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            {renderFilterContent()}
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button
              size="small"
              onClick={handleClear}
              startIcon={<ClearIcon />}
            >
              Clear
            </Button>
            {(type === 'date-range' || type === 'number-range' || type === 'select') && (
              <Button
                size="small"
                variant="contained"
                onClick={handleApply}
                startIcon={<CheckIcon />}
              >
                Apply
              </Button>
            )}
          </Box>
        </Box>
      </Popover>
    </>
  );
};

export default TableHeaderFilter;
