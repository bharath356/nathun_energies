import React from 'react';
import {
  Box,
  TextField,
  Typography,
  Alert
} from '@mui/material';
import { Step1Dates } from '../../shared/types';

interface Step1DatesFormProps {
  data: Step1Dates;
  onChange: (data: Partial<Step1Dates>) => void;
  disabled?: boolean;
}

const Step1DatesForm: React.FC<Step1DatesFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleChange = (field: keyof Step1Dates, value: string) => {
    onChange({ [field]: value });
  };

  const isFollowUpOverdue = data.nextFollowUpDate && new Date(data.nextFollowUpDate) < new Date();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <TextField
        fullWidth
        label="First Contact Date"
        type="date"
        value={data.firstContactDate || ''}
        onChange={(e) => handleChange('firstContactDate', e.target.value)}
        disabled={disabled}
        required
        InputLabelProps={{
          shrink: true,
        }}
        helperText="Date when the client was first contacted"
      />
      
      <TextField
        fullWidth
        label="Next Follow-up Date (Optional)"
        type="date"
        value={data.nextFollowUpDate || ''}
        onChange={(e) => handleChange('nextFollowUpDate', e.target.value)}
        disabled={disabled}
        InputLabelProps={{
          shrink: true,
        }}
        helperText="Schedule the next follow-up call or meeting"
        error={!!isFollowUpOverdue}
      />
      
      {isFollowUpOverdue && (
        <Alert severity="warning">
          The follow-up date has passed. Please update or complete the follow-up.
        </Alert>
      )}
      
      {data.nextFollowUpDate && !isFollowUpOverdue && (
        <Alert severity="info">
          Follow-up scheduled for {new Date(data.nextFollowUpDate).toLocaleDateString()}
        </Alert>
      )}
    </Box>
  );
};

export default Step1DatesForm;
