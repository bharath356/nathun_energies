import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  TextField
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { Step3PlantDetailsUpdate } from '../../shared/types';

interface Step3PlantDetailsUpdateFormProps {
  data: Step3PlantDetailsUpdate;
  onChange: (updates: Partial<Step3PlantDetailsUpdate>) => void;
  disabled?: boolean;
}

const Step3PlantDetailsUpdateForm: React.FC<Step3PlantDetailsUpdateFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleCheckboxChange = (field: 'panelDetailsUpdated' | 'invertorDetailsUpdated') => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const updates: Partial<Step3PlantDetailsUpdate> = { [field]: event.target.checked };
    
    // Update lastUpdatedAt when any checkbox is changed
    if (event.target.checked) {
      updates.lastUpdatedAt = new Date().toISOString();
    }
    
    onChange(updates);
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ notes: event.target.value });
  };

  const updateItems = [
    {
      key: 'panelDetailsUpdated' as const,
      label: 'Updated panel details in plant details tab of Step1?',
      description: 'Have the solar panel specifications been updated in Step 1 based on actual installation?'
    },
    {
      key: 'invertorDetailsUpdated' as const,
      label: 'Updated invertor details in plant details tab of Step1?',
      description: 'Have the invertor specifications been updated in Step 1 based on actual installation?'
    }
  ];

  const completedCount = updateItems.filter(item => data[item.key] === true).length;
  const totalCount = updateItems.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Plant Details Update
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Track updates to plant details in Step 1 based on actual installation
      </Typography>

      {/* Progress Summary */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'primary.50' }}>
        <Typography variant="h6" gutterBottom>
          Update Status
        </Typography>
        <Typography variant="body1">
          {completedCount} of {totalCount} updates completed
        </Typography>
        {data.lastUpdatedAt && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Last updated: {new Date(data.lastUpdatedAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Typography>
        )}
        <Box sx={{ mt: 1 }}>
          {completedCount === totalCount && (
            <Typography variant="body2" color="success.main" fontWeight="medium">
              ✓ All plant details have been updated!
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Update Items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
        {updateItems.map((item) => (
          <Paper 
            key={item.key}
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: data[item.key] ? 'success.50' : 'grey.50',
              borderColor: data[item.key] ? 'success.main' : 'grey.300'
            }}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={data[item.key] || false}
                  onChange={handleCheckboxChange(item.key)}
                  disabled={disabled}
                  icon={<UncheckedIcon />}
                  checkedIcon={<CheckIcon color="success" />}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle1" fontWeight="medium">
                    {item.label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0 }}
            />
          </Paper>
        ))}
      </Box>

      {/* Notes Section */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Update Notes
        </Typography>
        <TextField
          fullWidth
          label="Notes"
          value={data.notes || ''}
          onChange={handleNotesChange}
          disabled={disabled}
          placeholder="Add any notes about the plant details updates..."
          multiline
          rows={3}
        />
      </Paper>

      {/* Information Box */}
      <Paper variant="outlined" sx={{ p: 2, mt: 3, backgroundColor: 'info.50' }}>
        <Typography variant="subtitle2" gutterBottom>
          Important:
        </Typography>
        <Typography variant="body2">
          After completing the installation, ensure that the actual panel and invertor details 
          are updated in Step 1 to reflect the final installed configuration. This ensures 
          accurate records for warranty, maintenance, and performance monitoring.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Step3PlantDetailsUpdateForm;
