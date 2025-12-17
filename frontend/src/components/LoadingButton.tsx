import React from 'react';
import { Button, ButtonProps, CircularProgress, Box } from '@mui/material';
import { useLoading } from '../context/LoadingContext';

interface LoadingButtonProps extends Omit<ButtonProps, 'onClick'> {
  actionId: string;
  onClick: () => Promise<void> | void;
  loadingText?: string;
  showLoadingIcon?: boolean;
  disableWhenAnyActionLoading?: boolean;
  children: React.ReactNode;
}

const LoadingButton: React.FC<LoadingButtonProps> = ({
  actionId,
  onClick,
  loadingText,
  showLoadingIcon = true,
  disableWhenAnyActionLoading = false,
  children,
  disabled = false,
  startIcon,
  ...buttonProps
}) => {
  const { isActionLoading, isAnyActionLoading, setActionLoading } = useLoading();

  const isCurrentActionLoading = isActionLoading(actionId);
  const isAnyLoading = isAnyActionLoading();
  
  // Determine if button should be disabled
  const shouldDisable = disabled || 
    isCurrentActionLoading || 
    (disableWhenAnyActionLoading && isAnyLoading);

  const handleClick = async () => {
    if (shouldDisable) return;

    try {
      setActionLoading(actionId, true);
      await onClick();
    } catch (error) {
      console.error(`Error in action ${actionId}:`, error);
      // Error handling is typically done in the onClick handler
      // We just ensure loading state is cleared
    } finally {
      setActionLoading(actionId, false);
    }
  };

  // Determine what to show as start icon
  const getStartIcon = () => {
    if (isCurrentActionLoading && showLoadingIcon) {
      return <CircularProgress size={16} color="inherit" />;
    }
    return startIcon;
  };

  // Determine button text
  const getButtonText = () => {
    if (isCurrentActionLoading && loadingText) {
      return loadingText;
    }
    return children;
  };

  return (
    <Button
      {...buttonProps}
      disabled={shouldDisable}
      onClick={handleClick}
      startIcon={getStartIcon()}
    >
      <Box component="span" sx={{ 
        display: 'flex', 
        alignItems: 'center',
        minWidth: isCurrentActionLoading ? 'auto' : 'inherit'
      }}>
        {getButtonText()}
      </Box>
    </Button>
  );
};

export default LoadingButton;
