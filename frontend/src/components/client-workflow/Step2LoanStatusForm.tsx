import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Grid
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { Step2LoanStatus } from '../../shared/types';

interface Step2LoanStatusFormProps {
  data: Step2LoanStatus;
  onChange: (updates: Partial<Step2LoanStatus>) => void;
  disabled?: boolean;
}

const Step2LoanStatusForm: React.FC<Step2LoanStatusFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleChange = (field: keyof Step2LoanStatus) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: event.target.checked });
  };

  const statusItems = [
    {
      key: 'loanRegistrationDone' as keyof Step2LoanStatus,
      label: 'Loan registration done?',
      description: 'Has the loan been registered with the financial institution?'
    },
    {
      key: 'fileSubmittedToBranch' as keyof Step2LoanStatus,
      label: 'File submitted to branch?',
      description: 'Has the complete loan file been submitted to the bank branch?'
    },
    {
      key: 'loanApprovedAndSigned' as keyof Step2LoanStatus,
      label: 'Loan approved and customer signed?',
      description: 'Has the loan been approved and loan agreement signed by customer?'
    },
    {
      key: 'loanDisbursed' as keyof Step2LoanStatus,
      label: 'Loan disbursed?',
      description: 'Has the loan amount been disbursed to the customer account?'
    }
  ];

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Loan Process Status
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Track the progress of the loan application and approval process
      </Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
        {statusItems.map((item) => (
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
                  checked={data[item.key]}
                  onChange={handleChange(item.key)}
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

      {/* Progress Summary */}
      <Box sx={{ mt: 3 }}>
        <Paper variant="outlined" sx={{ p: 2, backgroundColor: 'primary.50' }}>
          <Typography variant="h6" gutterBottom>
            Progress Summary
          </Typography>
          <Typography variant="body1">
            {Object.values(data).filter(Boolean).length} of {Object.keys(data).length} steps completed
          </Typography>
          <Box sx={{ mt: 1 }}>
            {Object.values(data).every(Boolean) && (
              <Typography variant="body2" color="success.main" fontWeight="medium">
                ✓ Loan process completed successfully!
              </Typography>
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default Step2LoanStatusForm;
