import React from 'react';
import { Box, Typography } from '@mui/material';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Profile
      </Typography>
      <Typography variant="body1">
        Welcome, {user?.firstName} {user?.lastName}!
      </Typography>
      <Typography variant="body2" sx={{ mt: 2 }}>
        Email: {user?.email}
      </Typography>
      <Typography variant="body2">
        Role: {user?.role}
      </Typography>
      <Typography variant="body1" sx={{ mt: 2 }}>
        Profile management functionality will be implemented here.
      </Typography>
    </Box>
  );
};

export default ProfilePage;
