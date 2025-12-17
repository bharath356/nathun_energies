import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  IconButton,
  Chip,
  Alert
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  SolarPower as SolarIcon,
  ElectricBolt as InvertorIcon,
  Settings as OtherIcon,
  Summarize as SummaryIcon
} from '@mui/icons-material';
import { 
  Step1PlantDetails, 
  Step1PlantSummary, 
  Step1SolarPanel, 
  Step1Invertor 
} from '../../shared/types';

interface Step1PlantDetailsFormProps {
  data: Step1PlantDetails;
  onChange: (data: Partial<Step1PlantDetails>) => void;
  disabled?: boolean;
}

const Step1PlantDetailsForm: React.FC<Step1PlantDetailsFormProps> = ({
  data,
  onChange,
  disabled = false
}) => {
  const [expandedPanel, setExpandedPanel] = useState<string | false>('summary');

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpandedPanel(isExpanded ? panel : false);
  };

  // Summary handlers
  const handleSummaryChange = (field: keyof Step1PlantSummary, value: any) => {
    const updatedSummary = { ...data.summary, [field]: value };
    onChange({ summary: updatedSummary });
  };


  // Solar Panel handlers
  const addSolarPanel = () => {
    const newPanel: Step1SolarPanel = {
      id: `panel_${Date.now()}`,
      brand: '',
      dcrNonDcrId: '',
      wattagePerPanel: 0,
      quantity: 1
    };
    const updatedPanels = [...data.solarPanels, newPanel];
    onChange({ solarPanels: updatedPanels });
  };

  const updateSolarPanel = (index: number, field: keyof Step1SolarPanel, value: any) => {
    const updatedPanels = [...data.solarPanels];
    updatedPanels[index] = { ...updatedPanels[index], [field]: value };
    onChange({ solarPanels: updatedPanels });
  };

  const removeSolarPanel = (index: number) => {
    const updatedPanels = data.solarPanels.filter((_, i) => i !== index);
    onChange({ solarPanels: updatedPanels });
  };

  // Invertor handlers
  const addInvertor = () => {
    const newInvertor: Step1Invertor = {
      id: `invertor_${Date.now()}`,
      brand: '',
      modelNo: '',
      phase: '',
      wattage: 0,
      serialNumber: '',
      quantity: 1
    };
    const updatedInvertors = [...data.invertors, newInvertor];
    onChange({ invertors: updatedInvertors });
  };

  const updateInvertor = (index: number, field: keyof Step1Invertor, value: any) => {
    const updatedInvertors = [...data.invertors];
    updatedInvertors[index] = { ...updatedInvertors[index], [field]: value };
    onChange({ invertors: updatedInvertors });
  };

  const removeInvertor = (index: number) => {
    const updatedInvertors = data.invertors.filter((_, i) => i !== index);
    onChange({ invertors: updatedInvertors });
  };

  // Other Items handlers
  const addOtherItem = () => {
    const key = `item_${Date.now()}`;
    const updatedOtherItems = { ...data.otherItems, [key]: '' };
    onChange({ otherItems: updatedOtherItems });
  };

  const updateOtherItem = (oldKey: string, newKey: string, value: string) => {
    const updatedOtherItems = { ...data.otherItems };
    if (oldKey !== newKey) {
      delete updatedOtherItems[oldKey];
    }
    updatedOtherItems[newKey] = value;
    onChange({ otherItems: updatedOtherItems });
  };

  const removeOtherItem = (key: string) => {
    const updatedOtherItems = { ...data.otherItems };
    delete updatedOtherItems[key];
    onChange({ otherItems: updatedOtherItems });
  };

  const calculateTotalWattage = () => {
    return data.solarPanels.reduce((total, panel) => total + (panel.wattagePerPanel * panel.quantity), 0);
  };

  const calculateTotalPanels = () => {
    return data.solarPanels.reduce((total, panel) => total + panel.quantity, 0);
  };

  const calculateTotalInvertors = () => {
    return data.invertors.reduce((total, invertor) => total + invertor.quantity, 0);
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Plant Details
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Configure the solar plant specifications, components, and additional items
      </Typography>

      {/* Summary Statistics */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3, backgroundColor: 'primary.50' }}>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {calculateTotalWattage()}W
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Total Wattage
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {calculateTotalPanels()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Solar Panels
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {calculateTotalInvertors()}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Invertors
            </Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: 150, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {Object.keys(data.otherItems).length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Other Items
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Plant Summary */}
      <Accordion 
        expanded={expandedPanel === 'summary'} 
        onChange={handleAccordionChange('summary')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SummaryIcon color="primary" />
            <Typography variant="h6">Plant Summary</Typography>
            <Chip 
              label={data.summary.wattage} 
              size="small" 
              color="primary" 
              variant="outlined" 
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 250 }}>
                <TextField
                  fullWidth
                  label="Plant Wattage"
                  value={data.summary.wattage || ''}
                  onChange={(e) => handleSummaryChange('wattage', e.target.value)}
                  disabled={disabled}
                  placeholder="e.g., 2kW, 3.5kW, 5kW"
                  required
                />
              </Box>
            </Box>
            
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Solar Panels */}
      <Accordion 
        expanded={expandedPanel === 'panels'} 
        onChange={handleAccordionChange('panels')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SolarIcon color="primary" />
            <Typography variant="h6">Solar Panels</Typography>
            <Chip 
              label={`${data.solarPanels.length} types`} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addSolarPanel}
              disabled={disabled}
            >
              Add Solar Panel Type
            </Button>
          </Box>
          
          {data.solarPanels.length === 0 ? (
            <Alert severity="info">
              No solar panels configured. Click "Add Solar Panel Type" to get started.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.solarPanels.map((panel, index) => (
                <Paper key={panel.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Solar Panel #{index + 1}
                    </Typography>
                    <IconButton
                      color="error"
                      onClick={() => removeSolarPanel(index)}
                      disabled={disabled}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 250 }}>
                        <FormControl fullWidth required>
                          <InputLabel>Brand</InputLabel>
                          <Select
                            value={panel.brand}
                            onChange={(e) => updateSolarPanel(index, 'brand', e.target.value)}
                            disabled={disabled}
                            label="Brand"
                          >
                            <MenuItem value="Adani">Adani</MenuItem>
                            <MenuItem value="Waaree">Waaree</MenuItem>
                            <MenuItem value="RayZon">RayZon</MenuItem>
                            <MenuItem value="Tata">Tata</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 250 }}>
                        <FormControl fullWidth required>
                          <InputLabel>DCR/NONDCR</InputLabel>
                          <Select
                            value={panel.dcrNonDcrId}
                            onChange={(e) => updateSolarPanel(index, 'dcrNonDcrId', e.target.value)}
                            disabled={disabled}
                            label="DCR/NONDCR"
                          >
                            <MenuItem value="DCR">DCR</MenuItem>
                            <MenuItem value="NON DCR">NON DCR</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <TextField
                          fullWidth
                          label="Wattage per Panel"
                          type="number"
                          value={panel.wattagePerPanel ?? ''}
                          onChange={(e) => updateSolarPanel(index, 'wattagePerPanel', e.target.value === '' ? 0 : parseInt(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          disabled={disabled}
                          inputProps={{ min: 0 }}
                          placeholder="Enter wattage"
                          required
                        />
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          value={panel.quantity ?? ''}
                          onChange={(e) => updateSolarPanel(index, 'quantity', e.target.value === '' ? 1 : parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          disabled={disabled}
                          inputProps={{ min: 1 }}
                          placeholder="Enter quantity"
                          required
                        />
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <Box sx={{ p: 2, backgroundColor: 'grey.50', borderRadius: 1, height: '56px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                          <Typography variant="body2" color="text.secondary">
                            Total Wattage
                          </Typography>
                          <Typography variant="h6" color="primary.main">
                            {panel.wattagePerPanel * panel.quantity}W
                          </Typography>
                        </Box>
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Invertors */}
      <Accordion 
        expanded={expandedPanel === 'invertors'} 
        onChange={handleAccordionChange('invertors')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InvertorIcon color="primary" />
            <Typography variant="h6">Invertors</Typography>
            <Chip 
              label={`${data.invertors.length} types`} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addInvertor}
              disabled={disabled}
            >
              Add Invertor Type
            </Button>
          </Box>
          
          {data.invertors.length === 0 ? (
            <Alert severity="info">
              No invertors configured. Click "Add Invertor Type" to get started.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {data.invertors.map((invertor, index) => (
                <Paper key={invertor.id} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Invertor #{index + 1}
                    </Typography>
                    <IconButton
                      color="error"
                      onClick={() => removeInvertor(index)}
                      disabled={disabled}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                  
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 250 }}>
                        <TextField
                          fullWidth
                          label="Brand"
                          value={invertor.brand}
                          onChange={(e) => updateInvertor(index, 'brand', e.target.value)}
                          disabled={disabled}
                          required
                        />
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 250 }}>
                        <TextField
                          fullWidth
                          label="Model No."
                          value={invertor.modelNo}
                          onChange={(e) => updateInvertor(index, 'modelNo', e.target.value)}
                          disabled={disabled}
                        />
                      </Box>
                    </Box>
                    
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <FormControl fullWidth>
                          <InputLabel>Phase</InputLabel>
                          <Select
                            value={invertor.phase}
                            onChange={(e) => updateInvertor(index, 'phase', e.target.value)}
                            disabled={disabled}
                            label="Phase"
                          >
                            <MenuItem value="Single Phase">Single Phase</MenuItem>
                            <MenuItem value="Three Phase">Three Phase</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <TextField
                          fullWidth
                          label="KW"
                          type="number"
                          value={invertor.wattage ?? ''}
                          onChange={(e) => updateInvertor(index, 'wattage', e.target.value === '' ? 0 : parseFloat(e.target.value) || 0)}
                          onFocus={(e) => e.target.select()}
                          disabled={disabled}
                          inputProps={{ min: 0, step: 0.1 }}
                          placeholder="e.g., 3.6"
                          required
                        />
                      </Box>
                      
                      <Box sx={{ flex: 1, minWidth: 200 }}>
                        <TextField
                          fullWidth
                          label="Quantity"
                          type="number"
                          value={invertor.quantity ?? ''}
                          onChange={(e) => updateInvertor(index, 'quantity', e.target.value === '' ? 1 : parseInt(e.target.value) || 1)}
                          onFocus={(e) => e.target.select()}
                          disabled={disabled}
                          inputProps={{ min: 1 }}
                          placeholder="Enter quantity"
                          required
                        />
                      </Box>
                    </Box>
                    
                    <TextField
                      fullWidth
                      label="Serial Number"
                      value={invertor.serialNumber}
                      onChange={(e) => updateInvertor(index, 'serialNumber', e.target.value)}
                      disabled={disabled}
                      placeholder="Enter serial number or range"
                    />
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>

      {/* Other Items */}
      <Accordion 
        expanded={expandedPanel === 'other'} 
        onChange={handleAccordionChange('other')}
        sx={{ mb: 2 }}
      >
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <OtherIcon color="primary" />
            <Typography variant="h6">Other Items</Typography>
            <Chip 
              label={`${Object.keys(data.otherItems).length} items`} 
              size="small" 
              color="secondary" 
              variant="outlined" 
            />
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={addOtherItem}
              disabled={disabled}
            >
              Add Other Item
            </Button>
          </Box>
          
          {Object.keys(data.otherItems).length === 0 ? (
            <Alert severity="info">
              No other items configured. Use this section for pillar details, wire specifications, mounting structures, etc.
            </Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {Object.entries(data.otherItems).map(([key, value], index) => (
                <Paper key={key} variant="outlined" sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'flex-start' }}>
                    <Box sx={{ flex: 1, minWidth: 250 }}>
                      <TextField
                        fullWidth
                        label="Item Name"
                        value={key}
                        onChange={(e) => updateOtherItem(key, e.target.value, value)}
                        disabled={disabled}
                        placeholder="e.g., Pillar Details, Wire Specifications"
                      />
                    </Box>
                    
                    <Box sx={{ flex: 2, minWidth: 300 }}>
                      <TextField
                        fullWidth
                        label="Details"
                        value={value}
                        onChange={(e) => updateOtherItem(key, key, e.target.value)}
                        disabled={disabled}
                        placeholder="Enter item details or specifications"
                        multiline
                        rows={2}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', pt: 1 }}>
                      <IconButton
                        color="error"
                        onClick={() => removeOtherItem(key)}
                        disabled={disabled}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default Step1PlantDetailsForm;
