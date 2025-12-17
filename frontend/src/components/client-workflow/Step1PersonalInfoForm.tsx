import React from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography
} from '@mui/material';
import { Step1PersonalInfo } from '../../shared/types';

interface Step1PersonalInfoFormProps {
  data: Step1PersonalInfo;
  onChange: (data: Partial<Step1PersonalInfo>) => void;
  disabled?: boolean;
}

const Step1PersonalInfoForm: React.FC<Step1PersonalInfoFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleChange = (field: keyof Step1PersonalInfo, value: string) => {
    onChange({ [field]: value });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <TextField
            fullWidth
            label="Client Name"
            value={data.name || ''}
            onChange={(e) => handleChange('name', e.target.value)}
            disabled={disabled}
            required
          />
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <TextField
            fullWidth
            label="Primary Phone"
            value={data.phone1 || ''}
            onChange={(e) => handleChange('phone1', e.target.value)}
            disabled={disabled}
            required
            type="tel"
          />
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <TextField
            fullWidth
            label="Secondary Phone (Optional)"
            value={data.phone2 || ''}
            onChange={(e) => handleChange('phone2', e.target.value)}
            disabled={disabled}
            type="tel"
          />
        </Box>
        
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <TextField
            fullWidth
            label="Referral Source (Optional)"
            value={data.referral || ''}
            onChange={(e) => handleChange('referral', e.target.value)}
            disabled={disabled}
          />
        </Box>
      </Box>
      
      <TextField
        fullWidth
        label="Address"
        value={data.address || ''}
        onChange={(e) => handleChange('address', e.target.value)}
        disabled={disabled}
        required
        multiline
        rows={3}
      />
      
      <TextField
        fullWidth
        label="Google Maps URL (Optional)"
        value={data.googleMapsUrl || ''}
        onChange={(e) => handleChange('googleMapsUrl', e.target.value)}
        disabled={disabled}
        placeholder="https://maps.google.com/..."
      />
      
      <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Box sx={{ flex: 1, minWidth: 250 }}>
          <FormControl fullWidth>
            <InputLabel>Status</InputLabel>
            <Select
              value={data.status || 'discussion in progress'}
              onChange={(e) => handleChange('status', e.target.value as Step1PersonalInfo['status'])}
              disabled={disabled}
              label="Status"
            >
              <MenuItem value="discussion in progress">Discussion in Progress</MenuItem>
              <MenuItem value="work in progress">Work in Progress</MenuItem>
              <MenuItem value="dropped">Dropped</MenuItem>
              <MenuItem value="completed">Completed</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>
      
      <TextField
        fullWidth
        label="Comments (Optional)"
        value={data.comment || ''}
        onChange={(e) => handleChange('comment', e.target.value)}
        disabled={disabled}
        multiline
        rows={3}
        placeholder="Add any additional comments or notes..."
      />
    </Box>
  );
};

export default Step1PersonalInfoForm;
