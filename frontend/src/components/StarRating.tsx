import React from 'react';
import { Box, IconButton, Typography, Tooltip } from '@mui/material';
import { Star, StarBorder } from '@mui/icons-material';

interface StarRatingProps {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
  helperText?: string;
}

const StarRating: React.FC<StarRatingProps> = ({
  value = 2,
  onChange,
  readonly = false,
  size = 'medium',
  showLabel = false,
  helperText
}) => {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null);

  const handleStarClick = (rating: number) => {
    if (!readonly && onChange) {
      onChange(rating);
    }
  };

  const handleStarHover = (rating: number) => {
    if (!readonly) {
      setHoverValue(rating);
    }
  };

  const handleMouseLeave = () => {
    if (!readonly) {
      setHoverValue(null);
    }
  };

  const getStarSize = () => {
    switch (size) {
      case 'small':
        return { fontSize: '1rem' };
      case 'large':
        return { fontSize: '2rem' };
      default:
        return { fontSize: '1.5rem' };
    }
  };

  const getIconButtonSize = () => {
    switch (size) {
      case 'small':
        return 'small' as const;
      case 'large':
        return 'large' as const;
      default:
        return 'medium' as const;
    }
  };

  const getPriorityLabel = (rating: number) => {
    switch (rating) {
      case 5:
        return 'Highest Priority';
      case 4:
        return 'High Priority';
      case 3:
        return 'Medium Priority';
      case 2:
        return 'Low Priority';
      case 1:
        return 'Lowest Priority';
      default:
        return 'No Priority';
    }
  };

  const getPriorityColor = (rating: number) => {
    // Use gold/amber colors for all priority levels
    switch (rating) {
      case 5:
        return '#ff8f00'; // Deep amber/gold
      case 4:
        return '#ffa000'; // Amber
      case 3:
        return '#ffb300'; // Light amber
      case 2:
        return '#ffc107'; // Gold
      case 1:
        return '#ffca28'; // Light gold
      default:
        return '#ffca28';
    }
  };

  const displayValue = hoverValue !== null ? hoverValue : value;

  return (
    <Box>
      <Box 
        display="flex" 
        alignItems="center" 
        gap={0.5}
        onMouseLeave={handleMouseLeave}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isActive = star <= displayValue;
          const StarIcon = isActive ? Star : StarBorder;
          
          return (
            <Tooltip 
              key={star} 
              title={readonly ? '' : `${star} star${star > 1 ? 's' : ''} - ${getPriorityLabel(star)}`}
              arrow
            >
              <span>
                {readonly ? (
                  <StarIcon 
                    sx={{ 
                      ...getStarSize(),
                      color: isActive ? getPriorityColor(star) : '#e0e0e0',
                      cursor: 'default'
                    }} 
                  />
                ) : (
                  <IconButton
                    size={getIconButtonSize()}
                    onClick={() => handleStarClick(star)}
                    onMouseEnter={() => handleStarHover(star)}
                    sx={{ 
                      padding: size === 'small' ? '2px' : '4px',
                      '&:hover': {
                        backgroundColor: 'transparent'
                      }
                    }}
                  >
                    <StarIcon 
                      sx={{ 
                        ...getStarSize(),
                        color: isActive ? getPriorityColor(star) : '#e0e0e0',
                        transition: 'color 0.2s ease-in-out'
                      }} 
                    />
                  </IconButton>
                )}
              </span>
            </Tooltip>
          );
        })}
        
        {showLabel && (
          <Typography 
            variant={size === 'small' ? 'caption' : 'body2'} 
            sx={{ 
              ml: 1, 
              color: getPriorityColor(displayValue),
              fontWeight: 500
            }}
          >
            {getPriorityLabel(displayValue)}
          </Typography>
        )}
      </Box>
      
      {helperText && (
        <Typography 
          variant="caption" 
          color="text.secondary" 
          sx={{ mt: 0.5, display: 'block' }}
        >
          {helperText}
        </Typography>
      )}
    </Box>
  );
};

export default StarRating;
