import React from 'react';
import { Box, Link } from '@mui/material';
import { Phone as PhoneIcon } from '@mui/icons-material';

interface PhoneNumberLinkProps {
  phoneNumber: string;
  showIcon?: boolean;
  className?: string;
  sx?: any;
  maskNumber?: boolean;
}

const PhoneNumberLink: React.FC<PhoneNumberLinkProps> = ({ 
  phoneNumber, 
  showIcon = true, 
  className,
  sx = {},
  maskNumber = false
}) => {
  // Clean phone number for tel: protocol (remove all non-digit characters except +)
  const cleanPhoneNumber = phoneNumber.replace(/[^\d+]/g, '');
  
  // Mask phone number if requested (show first 3 and last 3 digits)
  const displayPhoneNumber = maskNumber 
    ? phoneNumber.slice(0, 3) + '****' + phoneNumber.slice(-3)
    : phoneNumber;
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        ...sx
      }} 
      className={className}
    >
      {showIcon && <PhoneIcon fontSize="small" />}
      <Link 
        href={`tel:${cleanPhoneNumber}`}
        sx={{ 
          textDecoration: 'none', 
          color: 'inherit',
          cursor: 'pointer',
          '&:hover': {
            textDecoration: 'underline',
            color: 'primary.main'
          }
        }}
      >
        {displayPhoneNumber}
      </Link>
    </Box>
  );
};

export default PhoneNumberLink;
