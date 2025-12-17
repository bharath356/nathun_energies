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
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Payment as PaymentIcon,
  SolarPower as SolarIcon,
  AttachFile as DocumentIcon,
  AttachMoney as PricingIcon,
  Settings as RequirementsIcon,
  Save as SaveIcon,
  SaveAlt as SaveAllIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { apiService } from '../../services/api';
import {
  Step1ClientData,
  Step1PersonalInfo,
  Step1Dates,
  Step1PlantDetails,
  Step1PricingDetails,
  Step1SpecialRequirements,
  Step1Documents,
  SaveStep1DataRequest
} from '../../shared/types';

// Import sub-components
import Step1PersonalInfoForm from './Step1PersonalInfoForm';
import Step1DatesForm from './Step1DatesForm';
import Step1PaymentModeForm from './Step1PaymentModeForm';
import Step1PlantDetailsForm from './Step1PlantDetailsForm';
import Step1DocumentsForm from './Step1DocumentsForm';
import Step1PricingForm from './Step1PricingForm';
import Step1SpecialRequirementsForm from './Step1SpecialRequirementsForm';

interface Step1FormProps {
  clientId: string;
  onDataChange?: (data: Step1ClientData) => void;
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
      id={`step1-tabpanel-${index}`}
      aria-labelledby={`step1-tab-${index}`}
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

type TabKey = 'personalInfo' | 'dates' | 'paymentMode' | 'plantDetails' | 'documents' | 'pricing' | 'specialRequirements';

const Step1Form: React.FC<Step1FormProps> = ({ clientId, onDataChange }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Server data (last saved state)
  const [serverData, setServerData] = useState<Step1ClientData | null>(null);
  
  // Local data (current form state)
  const [localData, setLocalData] = useState<Step1ClientData | null>(null);
  
  // Dirty state tracking
  const [dirtyTabs, setDirtyTabs] = useState<Set<TabKey>>(new Set());
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<number | null>(null);

  // Load Step 1 data on component mount
  useEffect(() => {
    loadStep1Data();
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

  const loadStep1Data = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.getStep1Data(clientId);
      setServerData(data);
      setLocalData(data);
      setDirtyTabs(new Set());
      
      if (onDataChange) {
        onDataChange(data);
      }
    } catch (error: any) {
      console.error('Error loading Step 1 data:', error);
      setError('Failed to load Step 1 data');
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

  const saveStep1Data = async (updates: SaveStep1DataRequest, tabKey?: TabKey) => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const updatedData = await apiService.updateStep1Data(clientId, updates);
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
      console.error('Error saving Step 1 data:', error);
      setError(error.response?.data?.message || 'Failed to save data');
    } finally {
      setSaving(false);
    }
  };

  const saveAllChanges = async () => {
    if (!localData || !serverData) return;

    const updates: SaveStep1DataRequest = {};
    
    // Compare local data with server data to determine what changed
    if (dirtyTabs.has('personalInfo')) {
      updates.personalInfo = localData.personalInfo;
    }
    if (dirtyTabs.has('dates')) {
      updates.dates = localData.dates;
    }
    if (dirtyTabs.has('paymentMode')) {
      updates.paymentMode = localData.paymentMode;
    }
    if (dirtyTabs.has('plantDetails')) {
      updates.plantDetails = localData.plantDetails;
    }
    if (dirtyTabs.has('pricing') && user?.role === 'admin') {
      updates.pricingDetails = localData.pricingDetails;
    }
    if (dirtyTabs.has('specialRequirements')) {
      updates.specialRequirements = localData.specialRequirements;
    }

    if (Object.keys(updates).length > 0) {
      await saveStep1Data(updates);
    }
  };

  const saveCurrentTab = async () => {
    if (!localData || !serverData) return;

    const tabsData = [
      { key: 'personalInfo' as TabKey, data: localData.personalInfo },
      { key: 'specialRequirements' as TabKey, data: localData.specialRequirements },
      { key: 'dates' as TabKey, data: localData.dates },
      { key: 'paymentMode' as TabKey, data: localData.paymentMode },
      { key: 'plantDetails' as TabKey, data: localData.plantDetails },
      { key: 'documents' as TabKey, data: null }, // Documents handled separately
      ...(user?.role === 'admin' ? [{ key: 'pricing' as TabKey, data: localData.pricingDetails }] : [])
    ];

    const currentTabData = tabsData[activeTab];
    if (currentTabData && dirtyTabs.has(currentTabData.key)) {
      const updates: SaveStep1DataRequest = {};
      
      if (currentTabData.key === 'personalInfo') {
        updates.personalInfo = localData.personalInfo;
      } else if (currentTabData.key === 'specialRequirements') {
        updates.specialRequirements = localData.specialRequirements;
      } else if (currentTabData.key === 'dates') {
        updates.dates = localData.dates;
      } else if (currentTabData.key === 'paymentMode') {
        updates.paymentMode = localData.paymentMode;
      } else if (currentTabData.key === 'plantDetails') {
        updates.plantDetails = localData.plantDetails;
      } else if (currentTabData.key === 'pricing' && user?.role === 'admin') {
        updates.pricingDetails = localData.pricingDetails;
      }

      if (Object.keys(updates).length > 0) {
        await saveStep1Data(updates, currentTabData.key);
      }
    }
  };

  // Local state update handlers
  const handlePersonalInfoChange = (personalInfo: Partial<Step1PersonalInfo>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      personalInfo: { ...prev!.personalInfo, ...personalInfo }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('personalInfo'));
  };

  const handleDatesChange = (dates: Partial<Step1Dates>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      dates: { ...prev!.dates, ...dates }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('dates'));
  };

  const handlePaymentModeChange = (paymentMode: Step1ClientData['paymentMode']) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      paymentMode
    }));
    
    setDirtyTabs(prev => new Set(prev).add('paymentMode'));
  };

  const handlePlantDetailsChange = (plantDetails: Partial<Step1PlantDetails>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      plantDetails: { ...prev!.plantDetails, ...plantDetails }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('plantDetails'));
  };

  const handlePricingDetailsChange = (pricingDetails: Partial<Step1PricingDetails>) => {
    if (!localData || user?.role !== 'admin') return;
    
    setLocalData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        pricingDetails: { 
          ...(prev.pricingDetails || {}),
          ...pricingDetails,
          // Ensure paymentLogs is always an array
          paymentLogs: pricingDetails.paymentLogs || prev.pricingDetails?.paymentLogs || []
        }
      };
    });
    
    setDirtyTabs(prev => new Set(prev).add('pricing'));
  };

  const handleSpecialRequirementsChange = (specialRequirements: Partial<Step1SpecialRequirements>) => {
    if (!localData) return;
    
    setLocalData(prev => ({
      ...prev!,
      specialRequirements: { ...prev!.specialRequirements, ...specialRequirements }
    }));
    
    setDirtyTabs(prev => new Set(prev).add('specialRequirements'));
  };

  const handleDocumentsChange = () => {
    // Reload data when documents change (documents are handled separately)
    loadStep1Data();
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
        Failed to load Step 1 data. Please try refreshing the page.
      </Alert>
    );
  }

  const tabs = [
    { label: 'Personal Info', icon: <PersonIcon />, component: 'personalInfo' as TabKey },
    { label: 'Special Requirements', icon: <RequirementsIcon />, component: 'specialRequirements' as TabKey },
    { label: 'Dates', icon: <CalendarIcon />, component: 'dates' as TabKey },
    { label: 'Payment Mode', icon: <PaymentIcon />, component: 'paymentMode' as TabKey },
    { label: 'Plant Details', icon: <SolarIcon />, component: 'plantDetails' as TabKey },
    { label: 'Documents', icon: <DocumentIcon />, component: 'documents' as TabKey },
    ...(user?.role === 'admin' ? [{ label: 'Pricing', icon: <PricingIcon />, component: 'pricing' as TabKey }] : [])
  ];

  const isDirty = dirtyTabs.size > 0;
  const currentTabKey = tabs[activeTab]?.component;
  const isCurrentTabDirty = currentTabKey ? dirtyTabs.has(currentTabKey) : false;

  return (
    <Box sx={{ width: '100%' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Step 1: Client Finalization & Loan Process
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Complete client details, KYC documentation, and loan processing
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
            aria-label="Step 1 form tabs"
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
                id={`step1-tab-${index}`}
                aria-controls={`step1-tabpanel-${index}`}
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
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Personal Information</Typography>
              {dirtyTabs.has('personalInfo') && (
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
            <Step1PersonalInfoForm
              data={localData.personalInfo}
              onChange={handlePersonalInfoChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={1}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Special Requirements</Typography>
              {dirtyTabs.has('specialRequirements') && (
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
            <Step1SpecialRequirementsForm
              clientId={clientId}
              data={localData.specialRequirements}
              onChange={handleSpecialRequirementsChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={2}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Important Dates</Typography>
              {dirtyTabs.has('dates') && (
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
            <Step1DatesForm
              data={localData.dates}
              onChange={handleDatesChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={3}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Payment Mode</Typography>
              {dirtyTabs.has('paymentMode') && (
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
            <Step1PaymentModeForm
              paymentMode={localData.paymentMode}
              onChange={handlePaymentModeChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={4}>
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Plant Details</Typography>
              {dirtyTabs.has('plantDetails') && (
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
            <Step1PlantDetailsForm
              data={localData.plantDetails}
              onChange={handlePlantDetailsChange}
              disabled={saving}
            />
          </Box>
        </TabPanel>

        <TabPanel value={activeTab} index={5}>
          <Step1DocumentsForm
            clientId={clientId}
            documents={localData.documents}
            onChange={handleDocumentsChange}
          />
        </TabPanel>

        {user?.role === 'admin' && (
          <TabPanel value={activeTab} index={6}>
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6">Pricing Details</Typography>
                {dirtyTabs.has('pricing') && (
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
              <Step1PricingForm
                clientId={clientId}
                data={localData.pricingDetails}
                documents={localData.documents}
                onChange={handlePricingDetailsChange}
                onDocumentsChange={handleDocumentsChange}
                disabled={saving}
              />
            </Box>
          </TabPanel>
        )}
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

export default Step1Form;
