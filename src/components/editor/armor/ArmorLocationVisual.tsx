import React, { useState, useCallback, useMemo, useEffect } from 'react';

interface ArmorLocationVisualProps {
  location: string;
  x: number;
  y: number;
  width: number;
  height: number;
  armorData: {
    front: number;
    rear: number;
    max: number;
  };
  hasRear: boolean;
  isSelected: boolean;
  isHovered: boolean;
  isEditing: boolean;
  onClick: () => void;
  onHover: (location: string | null) => void;
  onArmorChange: (front: number, rear: number) => void;
  onEditClose: () => void;
  readOnly: boolean;
  showLabel: boolean;
  showTooltip: boolean;
}

const ArmorLocationVisual: React.FC<ArmorLocationVisualProps> = ({
  location,
  x,
  y,
  width,
  height,
  armorData,
  hasRear,
  isSelected,
  isHovered,
  isEditing,
  onClick,
  onHover,
  onArmorChange,
  onEditClose,
  readOnly,
  showLabel,
  showTooltip,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartValue, setDragStartValue] = useState(0);
  const [dragTarget, setDragTarget] = useState<'front' | 'rear' | null>(null);
  const [editValues, setEditValues] = useState({ front: 0, rear: 0 });

  // Calculate armor percentage
  const totalArmor = armorData.front + armorData.rear;
  const armorPercentage = armorData.max > 0 ? (totalArmor / armorData.max) * 100 : 0;

  // Get fill color based on armor percentage
  const getFillColor = useMemo(() => {
    if (armorPercentage >= 90) return '#10b981'; // green-500
    if (armorPercentage >= 60) return '#eab308'; // yellow-500
    if (armorPercentage >= 20) return '#f97316'; // orange-500
    return '#ef4444'; // red-500
  }, [armorPercentage]);

  // Get stroke color based on state
  const getStrokeColor = () => {
    if (isSelected) return '#3b82f6'; // blue-500
    if (isHovered) return '#60a5fa'; // blue-400
    return '#4b5563'; // gray-600
  };

  // Get location abbreviation
  const getLocationAbbr = (loc: string): string => {
    const abbrevMap: { [key: string]: string } = {
      'Head': 'HD',
      'Left Arm': 'LA',
      'Right Arm': 'RA',
      'Left Torso': 'LT',
      'Center Torso': 'CT',
      'Right Torso': 'RT',
      'Left Leg': 'LL',
      'Right Leg': 'RL',
    };
    return abbrevMap[loc] || loc.substring(0, 2).toUpperCase();
  };

  // Handle mouse events
  const handleMouseEnter = useCallback(() => {
    onHover(location);
  }, [location, onHover]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) {
      onHover(null);
    }
  }, [isDragging, onHover]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onClick();
  }, [onClick]);

  // Sync edit values when editing starts
  useEffect(() => {
    if (isEditing) {
      setEditValues({ front: armorData.front, rear: armorData.rear });
    }
  }, [isEditing, armorData]);

  // Handle edit form submission
  const handleEditSubmit = useCallback(() => {
    const newFront = Math.max(0, Math.min(armorData.max, editValues.front));
    const newRear = hasRear ? Math.max(0, Math.min(armorData.max - newFront, editValues.rear)) : 0;
    onArmorChange(newFront, newRear);
    onEditClose();
  }, [editValues, armorData.max, hasRear, onArmorChange, onEditClose]);

  // Handle edit form cancellation
  const handleEditCancel = useCallback(() => {
    onEditClose();
  }, [onEditClose]);

  // Close popup on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        handleEditCancel();
      } else if (e.key === 'Enter' && isEditing) {
        handleEditSubmit();
      }
    };
    
    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing, handleEditCancel, handleEditSubmit]);

  // Create stable references for drag handlers
  const dragDataRef = React.useRef({
    startY: 0,
    startValue: 0,
    target: null as 'front' | 'rear' | null,
  });

  // Drag handlers for armor adjustment
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging || !dragDataRef.current.target) return;
    
    const deltaY = dragDataRef.current.startY - e.clientY;
    const sensitivity = 0.5;
    const deltaArmor = Math.round(deltaY * sensitivity);
    
    const newValue = Math.max(0, Math.min(armorData.max, dragDataRef.current.startValue + deltaArmor));
    
    if (dragDataRef.current.target === 'front') {
      onArmorChange(newValue, armorData.rear);
    } else {
      onArmorChange(armorData.front, newValue);
    }
  }, [isDragging, armorData, onArmorChange]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    dragDataRef.current.target = null;
    
    // Remove global event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  const handleMouseDown = useCallback((e: React.MouseEvent, target: 'front' | 'rear') => {
    if (readOnly) return;
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    dragDataRef.current = {
      startY: e.clientY,
      startValue: target === 'front' ? armorData.front : armorData.rear,
      target: target,
    };
    
    // Add global mouse event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [readOnly, armorData, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Calculate fill heights
  const frontFillHeight = hasRear ? (height / 2) * (armorData.front / armorData.max) : height * (armorData.front / armorData.max);
  const rearFillHeight = hasRear ? (height / 2) * (armorData.rear / armorData.max) : 0;

  return (
    <g
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ cursor: readOnly ? 'default' : 'pointer' }}
    >
      {/* Main location rectangle */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill="#1f2937"
        stroke={getStrokeColor()}
        strokeWidth={isSelected ? 3 : 2}
        rx={4}
        ry={4}
      />

      {/* Front armor fill */}
      <rect
        x={x + 2}
        y={y + height - frontFillHeight - 2}
        width={width - 4}
        height={frontFillHeight}
        fill={getFillColor}
        opacity={0.7}
        rx={2}
        ry={2}
        onMouseDown={(e) => handleMouseDown(e, 'front')}
      />

      {/* Rear armor fill (if applicable) */}
      {hasRear && (
        <>
          <line
            x1={x}
            y1={y + height / 2}
            x2={x + width}
            y2={y + height / 2}
            stroke="#4b5563"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <rect
            x={x + 2}
            y={y + 2}
            width={width - 4}
            height={rearFillHeight}
            fill={getFillColor}
            opacity={0.5}
            rx={2}
            ry={2}
            onMouseDown={(e) => handleMouseDown(e, 'rear')}
          />
        </>
      )}

      {/* Location label */}
      {showLabel && (
        <text
          x={x + width / 2}
          y={y + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize="14"
          fontWeight="bold"
          pointerEvents="none"
        >
          {getLocationAbbr(location)}
        </text>
      )}

      {/* Armor values */}
      <text
        x={x + width / 2}
        y={hasRear ? y + height * 0.75 : y + height / 2 + 15}
        textAnchor="middle"
        dominantBaseline="middle"
        fill="white"
        fontSize="12"
        pointerEvents="none"
      >
        {armorData.front}
      </text>

      {hasRear && (
        <text
          x={x + width / 2}
          y={y + height * 0.25}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#d1d5db"
          fontSize="10"
          pointerEvents="none"
        >
          {armorData.rear}
        </text>
      )}

      {/* Edit Popup */}
      {isEditing && !readOnly && (
        <g>
          {/* Background overlay - clicking dismisses and saves */}
          <rect
            x={0}
            y={0}
            width={10000}
            height={10000}
            fill="rgba(0,0,0,0.3)"
            onClick={handleEditSubmit}
            style={{ cursor: 'pointer' }}
          />
          
          {/* Popup container */}
          <rect
            x={x - 20}
            y={y + height / 2 - (hasRear ? 60 : 40)}
            width={width + 40}
            height={hasRear ? 120 : 80}
            fill="#1f2937"
            stroke="#3b82f6"
            strokeWidth={2}
            rx={6}
            ry={6}
            onClick={(e) => e.stopPropagation()}
          />
          
          {/* Location name header */}
          <text 
            x={x + width / 2} 
            y={y + height / 2 - (hasRear ? 45 : 25)} 
            textAnchor="middle" 
            fill="#60a5fa" 
            fontSize="14"
            fontWeight="bold"
          >
            {location}
          </text>
          
          {/* Front armor input */}
          <text x={x + width / 2} y={y + height / 2 - (hasRear ? 20 : 5)} textAnchor="middle" fill="#d1d5db" fontSize="11">
            Front Armor
          </text>
          <foreignObject x={x - 10} y={y + height / 2 - (hasRear ? 10 : 0) + 5} width={width + 20} height={30}>
            <input
              type="number"
              value={editValues.front}
              onChange={(e) => setEditValues({ ...editValues, front: parseInt(e.target.value) || 0 })}
              min={0}
              max={armorData.max}
              style={{
                width: '100%',
                background: '#111827',
                color: 'white',
                border: '2px solid #374151',
                borderRadius: '4px',
                padding: '6px 8px',
                fontSize: '14px',
                textAlign: 'center',
                outline: 'none'
              }}
              onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
              onBlur={(e) => e.target.style.borderColor = '#374151'}
              autoFocus
            />
          </foreignObject>
          
          {/* Rear armor input */}
          {hasRear && (
            <>
              <text x={x + width / 2} y={y + height / 2 + 30} textAnchor="middle" fill="#d1d5db" fontSize="11">
                Rear Armor
              </text>
              <foreignObject x={x - 10} y={y + height / 2 + 35} width={width + 20} height={30}>
                <input
                  type="number"
                  value={editValues.rear}
                  onChange={(e) => setEditValues({ ...editValues, rear: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={armorData.max - editValues.front}
                  style={{
                    width: '100%',
                    background: '#111827',
                    color: 'white',
                    border: '2px solid #374151',
                    borderRadius: '4px',
                    padding: '6px 8px',
                    fontSize: '14px',
                    textAlign: 'center',
                    outline: 'none'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                  onBlur={(e) => e.target.style.borderColor = '#374151'}
                />
              </foreignObject>
            </>
          )}
          
          {/* Help text */}
          <text 
            x={x + width / 2} 
            y={y + height / 2 + (hasRear ? 72 : 42)} 
            textAnchor="middle" 
            fill="#6b7280" 
            fontSize="9"
            fontStyle="italic"
          >
            Click outside or press Enter to save • Esc to cancel
          </text>
        </g>
      )}

      {/* Tooltip */}
      {showTooltip && isHovered && !isEditing && (
        <g>
          <rect
            x={x + width + 5}
            y={y}
            width={120}
            height={hasRear ? 80 : 60}
            fill="#1f2937"
            stroke="#4b5563"
            strokeWidth={1}
            rx={4}
            ry={4}
          />
          <text x={x + width + 10} y={y + 15} fill="white" fontSize="12" fontWeight="bold">
            {location}
          </text>
          <text x={x + width + 10} y={y + 30} fill="#d1d5db" fontSize="10">
            Front: {armorData.front}/{armorData.max}
          </text>
          {hasRear && (
            <text x={x + width + 10} y={y + 45} fill="#d1d5db" fontSize="10">
              Rear: {armorData.rear}/{armorData.max}
            </text>
          )}
          <text x={x + width + 10} y={hasRear ? y + 60 : y + 45} fill="#d1d5db" fontSize="10">
            Coverage: {Math.round(armorPercentage)}%
          </text>
        </g>
      )}
    </g>
  );
};

export default ArmorLocationVisual;
