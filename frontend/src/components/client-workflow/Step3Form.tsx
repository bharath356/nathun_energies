import React, { useState, useEffect } from 'react';
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
  Straighten as MeasurementIcon,
  Build as InstallationIcon,
  Description as DocumentIcon,
  Update as UpdateIcon,
  Save as SaveIcon,
  SaveAlt as SaveAllIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  Step3SiteSurveyData,
  SaveStep3DataRequest,
  Step3SiteMeasurement,
  Step3InstallationProgress,
  Step3PlantDetailsUpdate
} from '../../shared/types';

// Import sub-components
import Step3SiteMeasurementForm from './Step3SiteMeasurementForm';
import Step3InstallationProgressForm from './Step3InstallationProgressForm';
import Step3LegalAgreementsForm from './Step3LegalAgreementsForm';
import Step3PlantDetailsUpdateForm from './Step3PlantDetailsUpdateForm';

interface Step3FormProps {
  clientId: string;
  onDataChange?: (data: Step3SiteSurveyData) => void;
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
      id={`step3-tabpanel-${index}`}
      aria-labelledby={`step3-tab-${index}`}
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

type TabKey = 'siteMeasurement' | 'installationProgress' | 'legalAgreements' | 'plantDetailsUpdate';

const Step3Form: React.FC<Step3FormProps> = ({ clientId, onDataChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Server data (last saved state)
  const [serverData, setServerData] = useState<Step3SiteSurveyData | null>(null);
  
  // Local data (current form state)
  const [localData, setLocalData] = useState<Step3SiteSurveyData | null>(null);
  
  // Dirty state tracking
  const [dirtyTabs, setDirtyTabs] = useState<Set<TabKey>>(new Set());
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(null);

  // Load Step 3 data on component mount
  useEffect(() => {
    loadStep3Data();
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

  const loadStep3Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStep3Data(clientId);
      setServerData(data);
      setLocalData(data);
      setDirtyTabs(new Set());
      
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error: any) {
      console.error('Error loading Step 3 data:', error);
      setError('Failed to load Step 3 data');
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

  const saveStep3Data = async (updates: SaveStep3DataRequest, tabKey?: TabKey) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedData = await apiService.updateStep3Data(clientId, updates);
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
      console.error('Error saving Step 3 data:', error);
      setError(error.response?.data?.message || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (!localData || !serverData) return;

    const updates: SaveStep3DataRequest = {};
    
    // Compare local data with server data to determine what changed
    if (dirtyTabs.has('siteMeasurement')) {
      updates.siteMeasurement = localData.siteMeasurement;
    }
    if (dirtyTabs.has('installationProgress')) {
      updates.installationProgress = localData.installationProgress;
    }
    if (dirtyTabs.has('plantDetailsUpdate')) {
      updates.plantDetailsUpdate = localData.plantDetailsUpdate;
    }
    if (localData.notes !== serverData.notes) {
      updates.notes = localData.notes;
    }

    if (Object.keys(updates).length > 0) {
      await saveStep3Data(updates);
    }
  };

  const saveCurrentTab = async () => {
    if (!localData || !serverData) return;

    const tabs = [
      { key: 'siteMeasurement' as TabKey, data: localData.siteMeasurement },
      { key: 'installationProgress' as TabKey, data: localData.installationProgress },
      { key: 'legalAgreements' as TabKey, data: null }, // Documents handled separately
      { key: 'plantDetailsUpdate' as TabKey, data: localData.plantDetailsUpdate }
    ];

    const currentTabData = tabs[activeTab];
    if (currentTabData && dirtyTabs.has(currentTabData.key)) {
      const updates: SaveStep3DataRequest = {};
      
      if (currentTabData.key === 'siteMeasurement') {
        updates.siteMeasurement = localData.siteMeasurement;
      } else if (currentTabData.key === 'installationProgress') {
        updates.installationProgress = localData.installationProgress;
      } else if (currentTabData.key === 'plantDetailsUpdate') {
        updates.plantDetailsUpdate = localData.plantDetailsUpdate;
      }

      if (Object.keys(updates).length > 0) {
        await saveStep3Data(updates, currentTabData.key);
      }
    }
  };

  // Local state update handlers
  const handleSiteMeasurementChange = (siteMeasurement: Partial<Step3SiteMeasurement>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      siteMeasurement: { ...prev!.siteMeasurement, ...siteMeasurement }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('siteMeasurement'));
  };

  const handleInstallationProgressChange = (installationProgress: Partial<Step3InstallationProgress>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      installationProgress: { ...prev!.installationProgress, ...installationProgress }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('installationProgress'));
  };

  const handlePlantDetailsUpdateChange = (plantDetailsUpdate: Partial<Step3PlantDetailsUpdate>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      plantDetailsUpdate: { ...prev!.plantDetailsUpdate, ...plantDetailsUpdate }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('plantDetailsUpdate'));
  };

  const handleDocumentsChange = () => {
    // Reload data when documents change (documents are handled separately)
    loadStep3Data();
  };

  // GPS Image upload handlers
  const handleGpsImageUpload = async (stepName: string, file: File) => {
    try {
      setError(null);
      await apiService.uploadStep3GpsImage(clientId, stepName, file);
      // Reload data to get the updated GPS image
      await loadStep3Data();
      setSuccess(`GPS image uploaded successfully for ${stepName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error uploading GPS image:', error);
      setError(error.response?.data?.message || 'Failed to upload GPS image');
    }
  };

  const handleGpsImageDelete = async (stepName: string, documentId: string) => {
    try {
      setError(null);
      await apiService.deleteStep3GpsImage(clientId, stepName, documentId);
      // Reload data to get the updated state
      await loadStep3Data();
      setSuccess(`GPS image deleted successfully for ${stepName}`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (error: any) {
      console.error('Error deleting GPS image:', error);
      setError(error.response?.data?.message || 'Failed to delete GPS image');
    }
  };


  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!localData) {
    return (
      <Alert severity="error">
        Failed to load Step 3 data. Please try refreshing the page.
      </Alert>
    );
  }

  const tabs = [
    { label: 'Site Measurement', icon: <MeasurementIcon />, component: 'siteMeasurement' },
    { label: 'Installation Progress', icon: <InstallationIcon />, component: 'installationProgress' },
    { label: 'Legal Agreements', icon: <DocumentIcon />, component: 'legalAgreements' },
    { label: 'Plant Details Update', icon: <UpdateIcon />, component: 'plantDetailsUpdate' }
  ];

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 3: Site Survey and Installation
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Manage site measurements, installation progress, and legal documentation
        </Typography>
      </Box>

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

      {/* Main Form */}
      <Paper sx={{ width: '100%' }}>
        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(event, newValue) => setActiveTab(newValue)}
            variant="scrollable"
            scrollButtons="auto"
            aria-label="Step 3 form tabs"
          >
            {tabs.map((tab, index) => (
              <Tab
                key={index}
                icon={tab.icon}
                label={tab.label}
                id={`step3-tab-${index}`}
                aria-controls={`step3-tabpanel-${index}`}
                sx={{ minHeight: 72 }}
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab Panels */}
        <TabPanel value={activeTab} index={0}>
          <Step3SiteMeasurementForm
            data={localData.siteMeasurement}
            onChange={handleSiteMeasurementChange}
            disabled={saving}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Step3InstallationProgressForm
            clientId={clientId}
            data={localData.installationProgress}
            onChange={handleInstallationProgressChange}
            onGpsImageUpload={handleGpsImageUpload}
            onGpsImageDelete={handleGpsImageDelete}
            disabled={saving}
            loading={loading}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Step3LegalAgreementsForm
            clientId={clientId}
            agreements={localData.legalAgreements}
            onChange={handleDocumentsChange}
          />
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Step3PlantDetailsUpdateForm
            data={localData.plantDetailsUpdate}
            onChange={handlePlantDetailsUpdateChange}
            disabled={saving}
          />
        </TabPanel>
      </Paper>

      {/* Unsaved Changes Warning */}
      {dirtyTabs.size > 0 && (
        <Alert 
          severity="warning" 
          sx={{ mt: 2 }}
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                color="inherit"
                size="small"
                startIcon={<SaveIcon />}
                onClick={saveCurrentTab}
                disabled={!tabs[activeTab] || !dirtyTabs.has(tabs[activeTab].component as TabKey) || saving}
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
          {dirtyTabs.size > 0 && (
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

export default Step3Form;
