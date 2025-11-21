import React, { memo } from 'react';
import { ArmorValueProps, SIZE_CONFIG } from './types';

const ArmorValue: React.FC<ArmorValueProps> = ({
  location,
  value,
  rearValue,
  x,
  y,
  size = 'medium',
  theme = 'light',
  interactive = false,
  onHover,
  onClick,
}) => {
  const config = SIZE_CONFIG[size];
  
  // Color scheme based on theme
  const colors = {
    background: theme === 'light' ? '#FFFFFF' : '#374151',
    border: theme === 'light' ? '#D1D5DB' : '#6B7280',
    text: theme === 'light' ? '#111827' : '#F9FAFB',
    shadow: theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)',
  };

  const handleInteraction = (event: React.MouseEvent) => {
    if (event.type === 'mouseenter' && onHover) {
      onHover(location);
    } else if (event.type === 'mouseleave' && onHover) {
      onHover(null);
    } else if (event.type === 'click' && onClick) {
      onClick(location);
    }
  };

  // Calculate positioning based on size scale
  const scale = config.width / SIZE_CONFIG.medium.width;
  const scaledX = x * scale;
  const scaledY = y * scale;
  const scaledFontSize = config.fontSize;
  const scaledPadding = config.padding;

  // Create display value(s)
  const displayValue = value !== undefined && value !== null ? value.toString() : 'N/A';
  const hasRearArmor = rearValue !== undefined && rearValue !== null && rearValue > 0;
  const displayRearValue = hasRearArmor ? rearValue!.toString() : '';

  return (
    <g
      className="armor-value-group"
      onMouseEnter={interactive ? handleInteraction : undefined}
      onMouseLeave={interactive ? handleInteraction : undefined}
      onClick={interactive ? handleInteraction : undefined}
      style={{ cursor: interactive ? 'pointer' : 'default' }}
    >
      {/* Main armor value */}
      <g transform={`translate(${scaledX}, ${scaledY})`}>
        {/* Background circle/rectangle */}
        <circle
          cx={0}
          cy={0}
          r={scaledFontSize + scaledPadding}
          fill={colors.background}
          stroke={colors.border}
          strokeWidth={1}
          filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.1))"
        />
        
        {/* Armor value text */}
        <text
          x={0}
          y={0}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={scaledFontSize}
          fontWeight="600"
          fill={colors.text}
          fontFamily="monospace"
        >
          {displayValue}
        </text>
        
        {/* Location label (smaller, below the value) */}
        <text
          x={0}
          y={scaledFontSize + scaledPadding + 12}
          textAnchor="middle"
          dominantBaseline="central"
          fontSize={Math.max(8, scaledFontSize - 3)}
          fontWeight="400"
          fill={colors.text}
          opacity={0.7}
          fontFamily="sans-serif"
        >
          {location.length > 10 ? location.substring(0, 8) + '...' : location}
        </text>
      </g>

      {/* Rear armor value (if applicable) */}
      {hasRearArmor && (
        <g transform={`translate(${scaledX}, ${scaledY + scaledFontSize * 2 + scaledPadding * 2})`}>
          {/* Background for rear armor */}
          <rect
            x={-(scaledFontSize + scaledPadding / 2)}
            y={-(scaledFontSize / 2 + scaledPadding / 2)}
            width={(scaledFontSize + scaledPadding / 2) * 2}
            height={scaledFontSize + scaledPadding}
            rx={3}
            fill={colors.background}
            stroke={colors.border}
            strokeWidth={1}
            opacity={0.9}
            filter="drop-shadow(1px 1px 2px rgba(0,0,0,0.1))"
          />
          
          {/* Rear armor value text */}
          <text
            x={0}
            y={0}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.max(8, scaledFontSize - 2)}
            fontWeight="500"
            fill={colors.text}
            fontFamily="monospace"
          >
            {displayRearValue}
          </text>
          
          {/* "Rear" label */}
          <text
            x={0}
            y={scaledFontSize + 8}
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.max(6, scaledFontSize - 4)}
            fontWeight="400"
            fill={colors.text}
            opacity={0.6}
            fontFamily="sans-serif"
          >
            rear
          </text>
        </g>
      )}

      {/* Connection line from armor value to mech body (visual guide) */}
      {interactive && (
        <line
          x1={scaledX}
          y1={scaledY - (scaledFontSize + scaledPadding)}
          x2={scaledX}
          y2={scaledY - (scaledFontSize + scaledPadding + 10)}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="2,2"
          opacity={0.5}
        />
      )}
    </g>
  );
};

export default memo(ArmorValue);
