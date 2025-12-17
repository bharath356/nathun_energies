import React from 'react';
import {
  Box,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Typography,
  Paper
} from '@mui/material';
import {
  AccountBalance as BankIcon,
  Payment as CashIcon,
  CreditCard as DigitalIcon
} from '@mui/icons-material';
import { Step1ClientData } from '../../shared/types';

interface Step1PaymentModeFormProps {
  paymentMode: Step1ClientData['paymentMode'];
  onChange: (paymentMode: Step1ClientData['paymentMode']) => void;
  disabled?: boolean;
}

const Step1PaymentModeForm: React.FC<Step1PaymentModeFormProps> = ({
  paymentMode,
  onChange,
  disabled = false
}) => {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value as Step1ClientData['paymentMode']);
  };

  const paymentOptions = [
    {
      value: 'CASH' as const,
      label: 'Cash Payment',
      description: 'Direct cash payment for the solar installation',
      icon: <CashIcon />
    },
    {
      value: 'Loan' as const,
      label: 'Loan Financing',
      description: 'Bank loan or financing for the solar installation',
      icon: <BankIcon />
    },
    {
      value: 'Digital Payment' as const,
      label: 'Digital Payment',
      description: 'Online payment, UPI, or digital wallet',
      icon: <DigitalIcon />
    }
  ];

  return (
    <Box>
      <FormControl component="fieldset" fullWidth>
        <FormLabel component="legend" sx={{ mb: 2 }}>
          Select the preferred payment method for this client
        </FormLabel>
        
        <RadioGroup
          value={paymentMode || 'CASH'}
          onChange={handleChange}
          sx={{ gap: 2 }}
        >
          {paymentOptions.map((option) => (
            <Paper
              key={option.value}
              variant="outlined"
              sx={{
                p: 2,
                border: paymentMode === option.value ? 2 : 1,
                borderColor: paymentMode === option.value ? 'primary.main' : 'divider',
                backgroundColor: paymentMode === option.value ? 'primary.50' : 'transparent'
              }}
            >
              <FormControlLabel
                value={option.value}
                control={<Radio disabled={disabled} />}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                    <Box sx={{ color: paymentMode === option.value ? 'primary.main' : 'text.secondary' }}>
                      {option.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="medium">
                        {option.label}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {option.description}
                      </Typography>
                    </Box>
                  </Box>
                }
                sx={{ 
                  margin: 0,
                  width: '100%',
                  '& .MuiFormControlLabel-label': {
                    width: '100%'
                  }
                }}
              />
            </Paper>
          ))}
        </RadioGroup>
      </FormControl>
    </Box>
  );
};

export default Step1PaymentModeForm;
