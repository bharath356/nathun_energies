import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Alert,
  Card,
  CardContent,
  Tooltip,
  CircularProgress,
  Switch,
  FormControlLabel
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminIcon,
  Group as GroupIcon,
  Refresh as RefreshIcon,
  ToggleOn as ToggleOnIcon,
  ToggleOff as ToggleOffIcon
} from '@mui/icons-material';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { User, CreateUserRequest } from '../shared/types';
import { Navigate } from 'react-router-dom';

const UsersPage: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const { setPageLoading } = useLoading();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'caller' as 'admin' | 'caller',
    isActive: true
  });

  // Helper function to format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch users data
  const fetchData = async () => {
    try {
      setLoading(true);
      setPageLoading('users', true);
      setError(null);

      const usersData = await apiService.getUsers();
      console.log('Fetched users:', usersData);
      if (Array.isArray(usersData)) {
        setUsers(usersData);
      } else {
        console.error('Users data is not an array:', usersData);
        setUsers([]);
      }
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(`Failed to load users: ${error?.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
      setPageLoading('users', false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect non-admin users
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  // Handle form submission
  const handleSubmit = async () => {
    try {
      // Validation
      if (!formData.email || !formData.firstName) {
        setError('Email and first name are required');
        return;
      }

      if (!editingUser && !formData.password) {
        setError('Password is required for new users');
        return;
      }

      if (editingUser) {
        // Update existing user
        const updateData: Partial<User & { password?: string }> = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive
        };

        // Include password if provided
        if (formData.password && formData.password.trim() !== '') {
          updateData.password = formData.password;
        }

        await apiService.updateUser(editingUser.userId, updateData);
      } else {
        // Create new user
        const createData: CreateUserRequest = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
          role: formData.role
        };

        await apiService.register(createData);
      }

      setOpenDialog(false);
      setEditingUser(null);
      resetForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error saving user:', error);
      setError(`Failed to save user: ${error?.message || 'Unknown error'}`);
    }
  };

  // Handle user status toggle
  const handleStatusToggle = async (userId: string, currentStatus: boolean) => {
    try {
      await apiService.updateUser(userId, { isActive: !currentStatus });
      await fetchData();
    } catch (error: any) {
      console.error('Error updating user status:', error);
      setError(`Failed to update user status: ${error?.message || 'Unknown error'}`);
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      role: 'caller',
      isActive: true
    });
  };

  // Open dialog for editing
  const handleEdit = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setFormData({
      firstName: userToEdit.firstName || '',
      lastName: userToEdit.lastName || '',
      email: userToEdit.email,
      password: '', // Don't pre-fill password for security
      role: userToEdit.role,
      isActive: userToEdit.isActive
    });
    setOpenDialog(true);
  };

  // Open dialog for creating
  const handleCreate = () => {
    setEditingUser(null);
    resetForm();
    setOpenDialog(true);
  };

  // Get role color
  const getRoleColor = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return 'error';
      case 'caller':
        return 'primary';
      default:
        return 'default';
    }
  };

  // Get role icon
  const getRoleIcon = (role: User['role']) => {
    switch (role) {
      case 'admin':
        return <AdminIcon fontSize="small" />;
      case 'caller':
        return <PersonIcon fontSize="small" />;
      default:
        return <PersonIcon fontSize="small" />;
    }
  };

  // Get user statistics
  const getStats = () => {
    const total = users.length;
    const active = users.filter(u => u.isActive).length;
    const admins = users.filter(u => u.role === 'admin').length;
    const callers = users.filter(u => u.role === 'caller').length;

    return { total, active, admins, callers };
  };

  // Get user display name
  const getUserDisplayName = (user: User) => {
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return fullName || user.email;
  };

  const stats = getStats();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Users
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={fetchData}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreate}
          >
            Add User
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Statistics Cards */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {stats.total}
              </Typography>
              <Typography variant="body2">Total Users</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {stats.active}
              </Typography>
              <Typography variant="body2">Active Users</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="error.main">
                {stats.admins}
              </Typography>
              <Typography variant="body2">Administrators</Typography>
            </CardContent>
          </Card>
        </Box>
        <Box sx={{ flex: '1 1 200px', minWidth: 200 }}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {stats.callers}
              </Typography>
              <Typography variant="body2">Callers</Typography>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Created</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  <Typography variant="body2" color="text.secondary">
                    No users found
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              users.map((userItem) => (
                <TableRow key={userItem.userId}>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getRoleIcon(userItem.role)}
                      {getUserDisplayName(userItem)}
                    </Box>
                  </TableCell>
                  <TableCell>{userItem.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={userItem.role.toUpperCase()} 
                      color={getRoleColor(userItem.role)}
                      size="small"
                      icon={getRoleIcon(userItem.role)}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={userItem.isActive ? 'ACTIVE' : 'INACTIVE'} 
                      color={userItem.isActive ? 'success' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {formatDate(userItem.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit User">
                        <IconButton
                          size="small"
                          onClick={() => handleEdit(userItem)}
                        >
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={userItem.isActive ? 'Deactivate User' : 'Activate User'}>
                        <IconButton
                          size="small"
                          color={userItem.isActive ? 'success' : 'warning'}
                          onClick={() => handleStatusToggle(userItem.userId, userItem.isActive)}
                        >
                          {userItem.isActive ? <ToggleOffIcon /> : <ToggleOnIcon />}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Create/Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingUser ? 'Edit User' : 'Create New User'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="First Name"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              required
              fullWidth
            />

            <TextField
              label="Last Name"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              fullWidth
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              fullWidth
              disabled={!!editingUser} // Don't allow email changes for existing users
            />

            <TextField
              label="Password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
              fullWidth
              helperText={editingUser ? "Leave empty to keep current password (minimum 6 characters if changing)" : "Minimum 6 characters"}
            />

            <FormControl fullWidth>
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'caller' })}
                label="Role"
              >
                <MenuItem value="caller">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PersonIcon fontSize="small" />
                    Caller
                  </Box>
                </MenuItem>
                <MenuItem value="admin">
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AdminIcon fontSize="small" />
                    Administrator
                  </Box>
                </MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Active User"
            />

            {editingUser && (
              <Alert severity="info">
                As an admin, you can optionally set a new password for this user. Leave the password field empty to keep the current password unchanged.
              </Alert>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {editingUser ? 'Update User' : 'Create User'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage;
