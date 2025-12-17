import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Card, 
  CardContent, 
  CardHeader,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { apiService } from '../services/api';

const DashboardPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { setPageLoading } = useLoading();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCalls: 0,
    completedCalls: 0,
    pendingCalls: 0,
    totalFollowUps: 0,
    pendingFollowUps: 0,
    totalPhoneNumbers: 0,
    assignedPhoneNumbers: 0
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setPageLoading('dashboard', true);
        
        // Fetch calls
        const calls = await apiService.getCalls();
        
        // Fetch follow-ups
        const followUps = await apiService.getFollowUps();
        
        // Fetch phone numbers
        const phoneNumbers = await apiService.getPhoneNumbers();
        
        setStats({
          totalCalls: calls.length,
          completedCalls: calls.filter(call => call.status === 'completed').length,
          pendingCalls: calls.filter(call => call.status === 'pending').length,
          totalFollowUps: followUps.length,
          pendingFollowUps: followUps.filter(followUp => followUp.status === 'pending').length,
          totalPhoneNumbers: phoneNumbers.length,
          assignedPhoneNumbers: phoneNumbers.filter(phone => phone.assignedTo).length
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
        setPageLoading('dashboard', false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="subtitle1" gutterBottom>
        Welcome back, {user?.firstName} {user?.lastName}!
      </Typography>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardHeader title="Calls" />
            <CardContent>
              <Typography variant="h3" color="primary">
                {stats.totalCalls}
              </Typography>
              <Typography variant="body1">Total Calls</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Completed: {stats.completedCalls}
                </Typography>
                <Typography variant="body2">
                  Pending: {stats.pendingCalls}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardHeader title="Follow-ups" />
            <CardContent>
              <Typography variant="h3" color="primary">
                {stats.totalFollowUps}
              </Typography>
              <Typography variant="body1">Total Follow-ups</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Pending: {stats.pendingFollowUps}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ flex: '1 1 300px', minWidth: 300 }}>
          <Card>
            <CardHeader title="Phone Numbers" />
            <CardContent>
              <Typography variant="h3" color="primary">
                {stats.totalPhoneNumbers}
              </Typography>
              <Typography variant="body1">Total Phone Numbers</Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Assigned: {stats.assignedPhoneNumbers}
                </Typography>
                <Typography variant="body2">
                  Available: {stats.totalPhoneNumbers - stats.assignedPhoneNumbers}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Quick Actions
        </Typography>
        <Paper sx={{ p: 2 }}>
          <Typography variant="body1">
            Use the sidebar menu to navigate to different sections of the application.
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
};

export default DashboardPage;
