import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Paper,
  InputAdornment,
  Button,
  IconButton,
  Alert
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { Step3SiteMeasurement, Step3LegDimension } from '../../shared/types';

interface Step3SiteMeasurementFormProps {
  data: Step3SiteMeasurement;
  onChange: (updates: Partial<Step3SiteMeasurement>) => void;
  disabled?: boolean;
}

const Step3SiteMeasurementForm: React.FC<Step3SiteMeasurementFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const handleNumberOfLegsChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newCount = parseInt(event.target.value) || 0;
    
    // Adjust the legDimensions array to match the new count
    let newLegDimensions = [...data.legDimensions];
    
    if (newCount > newLegDimensions.length) {
      // Add new legs
      for (let i = newLegDimensions.length; i < newCount; i++) {
        newLegDimensions.push({
          id: `leg_${Date.now()}_${i}`,
          height: 0
        });
      }
    } else if (newCount < newLegDimensions.length) {
      // Remove excess legs
      newLegDimensions = newLegDimensions.slice(0, newCount);
    }
    
    onChange({ 
      numberOfLegs: newCount,
      legDimensions: newLegDimensions
    });
  };

  const handleLegHeightChange = (index: number, height: number) => {
    const updatedLegDimensions = [...data.legDimensions];
    updatedLegDimensions[index] = { ...updatedLegDimensions[index], height };
    onChange({ legDimensions: updatedLegDimensions });
  };

  const addLeg = () => {
    const newLeg: Step3LegDimension = {
      id: `leg_${Date.now()}`,
      height: 0
    };
    const updatedLegDimensions = [...data.legDimensions, newLeg];
    onChange({ 
      numberOfLegs: updatedLegDimensions.length,
      legDimensions: updatedLegDimensions 
    });
  };

  const removeLeg = (index: number) => {
    const updatedLegDimensions = data.legDimensions.filter((_, i) => i !== index);
    onChange({ 
      numberOfLegs: updatedLegDimensions.length,
      legDimensions: updatedLegDimensions 
    });
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ notes: event.target.value });
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Site Measurement Details
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Record the leg dimensions for the solar plant installation structure
      </Typography>

      <Paper variant="outlined" sx={{ p: 3 }}>
        {/* Number of Legs */}
        <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
          Legs Configuration
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
          <TextField
            label="Number of Legs"
            type="number"
            value={data.numberOfLegs ?? ''}
            onChange={handleNumberOfLegsChange}
            onFocus={(e) => e.target.select()}
            disabled={disabled}
            inputProps={{ min: 0, max: 50 }}
            placeholder="Enter number"
            sx={{ width: 200 }}
          />
          
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={addLeg}
            disabled={disabled}
            size="small"
          >
            Add Leg
          </Button>
        </Box>

        {/* Leg Dimensions */}
        {data.legDimensions.length > 0 ? (
          <>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom sx={{ mt: 3 }}>
              Leg Heights
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
              {data.legDimensions.map((leg, index) => (
                <Box key={leg.id} sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ minWidth: 80 }}>
                    Leg #{index + 1}:
                  </Typography>
                  
                  <TextField
                    label="Height"
                    type="number"
                    value={leg.height ?? ''}
                    onChange={(e) => handleLegHeightChange(index, e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                    onFocus={(e) => e.target.select()}
                    disabled={disabled}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">ft</InputAdornment>
                    }}
                    placeholder="Enter height in feet"
                    inputProps={{ min: 0, step: 0.1 }}
                    sx={{ flex: 1, maxWidth: 200 }}
                  />
                  
                  <IconButton
                    color="error"
                    onClick={() => removeLeg(index)}
                    disabled={disabled}
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                </Box>
              ))}
            </Box>

            {/* Summary */}
            <Box sx={{ p: 2, backgroundColor: 'primary.50', borderRadius: 1, mb: 3 }}>
              <Typography variant="subtitle2" gutterBottom>
                Summary
              </Typography>
              <Box sx={{ display: 'flex', gap: 4 }}>
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {data.numberOfLegs}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Legs
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {data.legDimensions.reduce((sum, leg) => sum + leg.height, 0).toFixed(1)} ft
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Total Height
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="primary.main">
                    {data.legDimensions.length > 0 ? (data.legDimensions.reduce((sum, leg) => sum + leg.height, 0) / data.legDimensions.length).toFixed(1) : '0'} ft
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Average Height
                  </Typography>
                </Box>
              </Box>
            </Box>
          </>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            No legs configured. Enter the number of legs or click "Add Leg" to get started.
          </Alert>
        )}

        {/* Notes */}
        <TextField
          fullWidth
          label="Additional Notes"
          value={data.notes || ''}
          onChange={handleNotesChange}
          disabled={disabled}
          placeholder="Any additional measurements or observations about the site"
          multiline
          rows={3}
        />
      </Paper>
    </Box>
  );
};

export default Step3SiteMeasurementForm;
