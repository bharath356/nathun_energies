import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip
} from '@mui/material';
import {
  Description as DocumentIcon,
  CheckCircle as StatusIcon,
  Save as SaveIcon,
  SaveAlt as SaveAllIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  Step2LoanData,
  Step2LoanDocuments,
  Step2LoanStatus,
  SaveStep2DataRequest
} from '../../shared/types';

// Import sub-components (to be created)
import Step2LoanDocumentsForm from './Step2LoanDocumentsForm';
import Step2LoanStatusForm from './Step2LoanStatusForm';

interface Step2FormProps {
  clientId: string;
  onDataChange?: (data: Step2LoanData) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`step2-tabpanel-${index}`}
      aria-labelledby={`step2-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

type TabKey = 'loanDocuments' | 'loanStatus';

const Step2Form: React.FC<Step2FormProps> = ({ clientId, onDataChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Server data (last saved state)
  const [serverData, setServerData] = useState<Step2LoanData | null>(null);
  
  // Local data (current form state)
  const [localData, setLocalData] = useState<Step2LoanData | null>(null);
  
  // Dirty state tracking
  const [dirtyTabs, setDirtyTabs] = useState<Set<TabKey>>(new Set());
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(null);

  // Load Step 2 data on component mount
  useEffect(() => {
    loadStep2Data();
  }, [clientId]);

  // Add beforeunload event listener for navigation warning
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyTabs.size > 0) {
        e.preventDefault();
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
        return e.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [dirtyTabs.size]);

  const loadStep2Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStep2Data(clientId);
      setServerData(data);
      setLocalData(data);
      setDirtyTabs(new Set());
      
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error: any) {
      console.error('Error loading Step 2 data:', error);
      if (error.response?.status === 400) {
        setError('Step 2 is only available for clients with loan payment mode');
      } else {
        setError('Failed to load Step 2 data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    if (dirtyTabs.size > 0) {
      setPendingNavigation(newValue);
      setShowUnsavedWarning(true);
    } else {
      setActiveTab(newValue);
    }
  };

  const confirmNavigation = () => {
    if (pendingNavigation !== null) {
      setActiveTab(pendingNavigation);
      setPendingNavigation(null);
    }
    setShowUnsavedWarning(false);
  };

  const cancelNavigation = () => {
    setPendingNavigation(null);
    setShowUnsavedWarning(false);
  };

  const saveStep2Data = async (updates: SaveStep2DataRequest, tabKey?: TabKey) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedData = await apiService.updateStep2Data(clientId, updates);
      setServerData(updatedData);
      setLocalData(updatedData);
      
      // Clear dirty state for saved tabs
      if (tabKey) {
        setDirtyTabs(prev => {
          const newSet = new Set(prev);
          newSet.delete(tabKey);
          return newSet;
        });
      } else {
        // Clear all dirty tabs if saving all
        setDirtyTabs(new Set());
      }
      
      if (onDataChange) {
        onDataChange(updatedData);
      }
      
      setSuccess(tabKey ? `${tabKey} saved successfully` : 'All changes saved successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error saving Step 2 data:', error);
      setError(error.response?.data?.message || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (!localData || !serverData) return;

    const updates: SaveStep2DataRequest = {};
    
    // Compare local data with server data to determine what changed
    if (dirtyTabs.has('loanStatus')) {
      updates.loanStatus = localData.loanStatus;
    }
    if (localData.notes !== serverData.notes) {
      updates.notes = localData.notes;
    }

    if (Object.keys(updates).length > 0) {
      await saveStep2Data(updates);
    }
  };

  const saveCurrentTab = async () => {
    if (!localData || !serverData) return;

    const tabs = [
      { key: 'loanDocuments' as TabKey, data: null }, // Documents handled separately
      { key: 'loanStatus' as TabKey, data: localData.loanStatus }
    ];

    const currentTabData = tabs[activeTab];
    if (currentTabData && dirtyTabs.has(currentTabData.key)) {
      const updates: SaveStep2DataRequest = {};
      
      if (currentTabData.key === 'loanStatus') {
        updates.loanStatus = localData.loanStatus;
      }

      if (Object.keys(updates).length > 0) {
        await saveStep2Data(updates, currentTabData.key);
      }
    }
  };

  // Local state update handlers
  const handleLoanStatusChange = (loanStatus: Partial<Step2LoanStatus>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      loanStatus: { ...prev!.loanStatus, ...loanStatus }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('loanStatus'));
  };

  const handleDocumentsChange = () => {
    // Reload data when documents change (documents are handled separately)
    loadStep2Data();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error && !localData) {
    return (
      <Alert severity="error">
        {error}
      </Alert>
    );
  }

  if (!localData) {
    return (
      <Alert severity="error">
        Failed to load Step 2 data. Please try refreshing the page.
      </Alert>
    );
  }

  const tabs = [
    { label: 'Loan Documents', icon: <DocumentIcon />, component: 'loanDocuments' as TabKey },
    { label: 'Loan Status', icon: <StatusIcon />, component: 'loanStatus' as TabKey }
  ];

  const isDirty = dirtyTabs.size > 0;
  const currentTabKey = tabs[activeTab]?.component;
  const isCurrentTabDirty = currentTabKey ? dirtyTabs.has(currentTabKey) : false;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 2: Loan Process
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage loan documentation and track loan approval process
        </Typography>
      </Box>

      {/* Unsaved Changes Warning */}
      {isDirty && (
        <Alert 
          severity="warning" 
          sx={{ mb: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                startIcon={<SaveIcon />}
                onClick={saveCurrentTab}
                disabled={!isCurrentTabDirty || saving}
              >
                Save Current
              </Button>
              <Button
                color="inherit"
                size="small"
                startIcon={<SaveAllIcon />}
                onClick={saveAllChanges}
                disabled={saving}
              >
                Save All
              </Button>
            </Box>
          }
        >
          You have unsaved changes in {dirtyTabs.size} section{dirtyTabs.size > 1 ? 's' : ''}
        </Alert>
      )}

      {/* Status Messages */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {/* Saving Indicator */}
      {saving && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CircularProgress size={16} />
          <Typography variant="body2" color="text.secondary">
            Saving...
          </Typography>
        </Box>
      )}

      {/* Main Form */}
      <Paper sx={{ width: '100%' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Step 2 form tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {tab.label}
                    {dirtyTabs.has(tab.component) && (
                      <Chip
                        size="small"
                        label="•"
                        sx={{
                          minWidth: 8,
                          width: 8,
                          height: 8,
                          backgroundColor: 'warning.main',
                          color: 'warning.contrastText',
                          fontSize: '12px',
                          '& .MuiChip-label': {
                            px: 0
                          }
                        }}
                      />
                    )}
                  </Box>
                }
                id={`step2-tab-${index}`}
                aria-controls={`step2-tabpanel-${index}`}
                sx={{ 
                  minHeight: 72,
                  ...(dirtyTabs.has(tab.component) && {
                    backgroundColor: 'warning.50',
                    borderLeft: 3,
                    borderLeftColor: 'warning.main'
                  })
                }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <Step2LoanDocumentsForm
            clientId={clientId}
            documents={localData.loanDocuments}
            onChange={handleDocumentsChange}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Loan Status</Typography>
              {dirtyTabs.has('loanStatus') && (
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<SaveIcon />}
                  onClick={saveCurrentTab}
                  disabled={saving}
                >
                  Save Changes
                </Button>
              )}
            </Box>
            <Step2LoanStatusForm
              data={localData.loanStatus}
              onChange={handleLoanStatusChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>
      </Paper>

      {/* Navigation and Save Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
          disabled={activeTab === 0}
        >
          Previous
        </Button>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {isDirty && (
            <Button
              variant="contained"
              color="success"
              startIcon={<SaveAllIcon />}
              onClick={saveAllChanges}
              disabled={saving}
            >
              Save All Changes ({dirtyTabs.size})
            </Button>
          )}
        </Box>
        
        <Button
          variant="contained"
          onClick={() => setActiveTab(Math.min(tabs.length - 1, activeTab + 1))}
          disabled={activeTab === tabs.length - 1}
        >
          Next
        </Button>
      </Box>

      {/* Unsaved Changes Warning Dialog */}
      <Dialog open={showUnsavedWarning} onClose={cancelNavigation}>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningIcon color="warning" />
          Unsaved Changes
        </DialogTitle>
        <DialogContent>
          <Typography>
            You have unsaved changes in {dirtyTabs.size} section{dirtyTabs.size > 1 ? 's' : ''}. 
            Do you want to continue without saving?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelNavigation}>Cancel</Button>
          <Button onClick={confirmNavigation} color="warning" variant="contained">
            Continue Without Saving
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Step2Form;
