import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { LoadingProvider } from './context/LoadingContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CallsPage from './pages/CallsPage';
import FollowUpsPage from './pages/FollowUpsPage';
import PhoneNumbersPage from './pages/PhoneNumbersPage';
import UsersPage from './pages/UsersPage';
import ProfilePage from './pages/ProfilePage';
import ClientsPage from './pages/ClientsPage';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <LoadingProvider>
          <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="/dashboard" element={<DashboardPage />} />
                      <Route path="/calls" element={<CallsPage />} />
                      <Route path="/follow-ups" element={<FollowUpsPage />} />
                      <Route path="/phone-numbers" element={<PhoneNumbersPage />} />
                      <Route path="/clients" element={<ClientsPage />} />
                      <Route path="/users" element={
                        <AdminRoute>
                          <UsersPage />
                        </AdminRoute>
                      } />
                      <Route path="/profile" element={<ProfilePage />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              }
            />
          </Routes>
          </Router>
        </LoadingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
