import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Box, Typography, Paper, Alert } from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';

interface AdminRouteProps {
  children: ReactNode;
}

const AdminRoute: React.FC<AdminRouteProps> = ({ children }) => {
  const { user, isAuthenticated, isAdmin, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <Paper sx={{ p: 4, textAlign: 'center', maxWidth: 500 }}>
          <LockIcon sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            Access Restricted
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            This feature is only available to administrators. You currently have caller-level access which includes call management features.
          </Typography>
          <Alert severity="info">
            <Typography variant="body2">
              <strong>Available Features:</strong><br />
              • Dashboard (Call Statistics)<br />
              • Calls Management<br />
              • Follow-ups Management<br />
              • Phone Numbers Management
            </Typography>
          </Alert>
        </Paper>
      </Box>
    );
  }

  // Render children if user is admin
  return <>{children}</>;
};

export default AdminRoute;
