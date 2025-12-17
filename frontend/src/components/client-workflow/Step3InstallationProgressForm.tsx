import React from 'react';
import {
  Box,
  Typography,
  FormControlLabel,
  Checkbox,
  Paper,
  Divider
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  RadioButtonUnchecked as UncheckedIcon
} from '@mui/icons-material';
import { Step3InstallationProgress } from '../../shared/types';
import MultipleGpsImageUpload from './MultipleGpsImageUpload';

interface Step3InstallationProgressFormProps {
  clientId: string;
  data: Step3InstallationProgress;
  onChange: (updates: Partial<Step3InstallationProgress>) => void;
  onGpsImageUpload: (stepName: string, file: File) => Promise<void>;
  onGpsImageDelete: (stepName: string, documentId: string) => Promise<void>;
  disabled?: boolean;
  loading?: boolean;
}

const Step3InstallationProgressForm: React.FC<Step3InstallationProgressFormProps> = ({
  clientId,
  data,
  onChange,
  onGpsImageUpload,
  onGpsImageDelete,
  disabled = false,
  loading = false
}) => {
  const handleChange = (field: 'materialDispatchedOnSite' | 'structureAssemblyDone' | 'panelInstalled' | 'invertorConnected' | 'dualSignNetMeteringAgreementDone' | 'plantStarted') => (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ [field]: event.target.checked });
  };

  const progressItems = [
    {
      key: 'materialDispatchedOnSite' as const,
      label: 'Material dispatched on site?',
      description: 'Has all the required material been dispatched to the installation site?',
      gpsKey: 'materialDispatch'
    },
    {
      key: 'structureAssemblyDone' as const,
      label: 'Structure Assembly Done?',
      description: 'Has the mounting structure been assembled and installed?',
      gpsKey: 'structureAssembly'
    },
    {
      key: 'panelInstalled' as const,
      label: 'Panel Installed?',
      description: 'Have all solar panels been installed on the structure?',
      gpsKey: 'panelInstallation'
    },
    {
      key: 'invertorConnected' as const,
      label: 'Invertor connected?',
      description: 'Has the invertor been connected and system commissioned?',
      gpsKey: 'invertorConnection'
    },
    {
      key: 'dualSignNetMeteringAgreementDone' as const,
      label: 'Dual Sign Net Metering Agreement done?',
      description: 'Has the dual sign net metering agreement been completed?',
      gpsKey: 'netMeteringAgreement'
    },
    {
      key: 'plantStarted' as const,
      label: 'Plant Started?',
      description: 'Has the solar plant been started and is operational?',
      gpsKey: 'plantStarted'
    }
  ];

  const completedCount = progressItems.filter(item => data[item.key]).length;
  const totalCount = progressItems.length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Installation Progress
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Track the progress of material dispatch and installation milestones
      </Typography>

      {/* Progress Summary */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'primary.50' }}>
        <Typography variant="h6" gutterBottom>
          Progress Summary
        </Typography>
        <Typography variant="body1">
          {completedCount} of {totalCount} milestones completed
        </Typography>
        <Box sx={{ mt: 1 }}>
          {completedCount === totalCount && (
            <Typography variant="body2" color="success.main" fontWeight="medium">
              ✓ Installation completed successfully!
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Progress Items */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {progressItems.map((item) => (
          <Paper 
            key={item.key}
            variant="outlined" 
            sx={{ 
              p: 2, 
              backgroundColor: data[item.key] ? 'success.50' : 'grey.50',
              borderColor: data[item.key] ? 'success.main' : 'grey.300'
            }}
          >
            <Box>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={data[item.key]}
                    onChange={handleChange(item.key)}
                    disabled={disabled}
                    icon={<UncheckedIcon />}
                    checkedIcon={<CheckIcon color="success" />}
                  />
                }
                label={
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {item.label}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.description}
                    </Typography>
                  </Box>
                }
                sx={{ alignItems: 'flex-start', m: 0 }}
              />
              
              <Divider sx={{ my: 2 }} />
              
              <MultipleGpsImageUpload
                stepName={item.gpsKey}
                stepLabel={item.label}
                clientId={clientId}
                gpsImages={data.gpsImages[item.gpsKey as keyof typeof data.gpsImages]}
                onUpload={onGpsImageUpload}
                onDelete={onGpsImageDelete}
                disabled={disabled}
                loading={loading}
                maxImages={5}
              />
            </Box>
          </Paper>
        ))}
      </Box>
    </Box>
  );
};

export default Step3InstallationProgressForm;
