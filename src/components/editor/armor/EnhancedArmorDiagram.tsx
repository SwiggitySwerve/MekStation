import React, { useRef, useEffect, useState, useCallback } from 'react';
import { EditableUnit } from '../../../types/editor';
import { IArmorDef } from '../../../types/core/ComponentInterfaces';
import { 
  getMaxArmorForLocation, 
  ALLOCATION_PATTERNS,
  calculateArmorWeight,
  getTotalArmorPoints,
  hasRearArmor
} from '../../../utils/armorAllocationHelpers';

// Define the armor allocation structure based on EditableUnit
import { ArmorAllocationMap } from './CompactArmorAllocationPanel';

interface EnhancedArmorDiagramProps {
  unit: EditableUnit;
  armorAllocation: ArmorAllocationMap;
  onArmorChange: (location: string, value: number, isRear?: boolean) => void;
  mode?: 'compact' | 'normal' | 'large';
  displayMode?: 'diagram' | 'grid' | 'hybrid';
  readOnly?: boolean;
}

interface Dimensions {
  width: number;
  height: number;
}

// Custom hook for container-aware sizing
const useContainerQuery = (ref: React.RefObject<HTMLDivElement | null>): Dimensions => {
  const [dimensions, setDimensions] = useState<Dimensions>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;

    const observer = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height });
    });

    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return dimensions;
};

// Armor value component with inline editing
const ArmorValue: React.FC<{
  location: string;
  value: number;
  maxValue: number;
  isRear?: boolean;
  readOnly?: boolean;
  onChange: (value: number) => void;
  compact?: boolean;
}> = ({ location, value, maxValue, isRear, readOnly, onChange, compact }) => {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState(value);

  const handleClick = useCallback(() => {
    if (readOnly || compact) return;
    setEditing(true);
    setTempValue(value);
  }, [readOnly, compact, value]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Math.max(0, Math.min(maxValue, parseInt(e.target.value) || 0));
    setTempValue(newValue);
  }, [maxValue]);

  const handleBlur = useCallback(() => {
    setEditing(false);
    if (tempValue !== value) {
      onChange(tempValue);
    }
  }, [tempValue, value, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setEditing(false);
      setTempValue(value);
    }
  }, [handleBlur, value]);

  // Color coding based on armor level
  const getColorClass = () => {
    const percentage = (value / maxValue) * 100;
    if (percentage === 0) return 'text-gray-400';
    if (percentage < 25) return 'text-red-500';
    if (percentage < 75) return 'text-yellow-500';
    return 'text-green-500';
  };

  if (editing && !compact) {
    return (
      <input
        type="number"
        value={tempValue}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className="w-12 h-6 text-center text-xs bg-slate-700 border border-blue-500 rounded"
        autoFocus
        min={0}
        max={maxValue}
        step={1}
      />
    );
  }

  return (
    <div
      onClick={handleClick}
      className={`
        ${compact ? 'text-xs' : 'text-sm'} 
        font-bold 
        ${getColorClass()} 
        ${!readOnly && !compact ? 'cursor-pointer hover:bg-slate-700 rounded px-1' : ''}
        transition-colors
      `}
      title={`${location}${isRear ? ' Rear' : ''}: ${value}/${maxValue}`}
    >
      {value}
    </div>
  );
};

const EnhancedArmorDiagram: React.FC<EnhancedArmorDiagramProps> = ({
  unit,
  armorAllocation,
  onArmorChange,
  mode = 'normal',
  displayMode = 'hybrid',
  readOnly = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useContainerQuery(containerRef);
  const [scale, setScale] = useState(1);
  const [hoveredLocation, setHoveredLocation] = useState<string | null>(null);
  const [showPatternMenu, setShowPatternMenu] = useState(false);

  // Calculate optimal scale based on container size
  useEffect(() => {
    if (dimensions.width === 0 || dimensions.height === 0) return;

    const baseWidth = mode === 'compact' ? 200 : mode === 'large' ? 600 : 400;
    const baseHeight = mode === 'compact' ? 250 : mode === 'large' ? 750 : 500;
    
    const scaleX = dimensions.width / baseWidth;
    const scaleY = dimensions.height / baseHeight;
    const optimalScale = Math.min(scaleX, scaleY, 1.5);
    
    setScale(optimalScale);
  }, [dimensions, mode]);

  // Get max armor values based on tonnage and location
  const getMaxArmor = (location: string): number => {
    return getMaxArmorForLocation(location, unit.tonnage || 0);
  };

  // Handle armor click interactions
  const handleLocationClick = useCallback((location: string, isRear: boolean = false, delta: number = 1) => {
    if (readOnly) return;
    
    const currentValue = isRear 
      ? armorAllocation[location]?.rear || 0
      : armorAllocation[location]?.front || 0;
    
    const maxValue = isRear 
      ? Math.floor(getMaxArmor(location) * 0.5) // Rear armor max is half of location max
      : getMaxArmor(location);
    
    const newValue = Math.max(0, Math.min(maxValue, currentValue + delta));
    onArmorChange(location, newValue, isRear);
  }, [readOnly, armorAllocation, onArmorChange]);

  // Render mech silhouette based on config
  const renderMechSilhouette = () => {
    const isCompact = mode === 'compact';
    const strokeWidth = isCompact ? 2 : 3;
    const fontSize = isCompact ? 10 : 14;

    return (
      <g transform={`scale(${scale})`}>
        {/* Head */}
        <g
          onMouseEnter={() => setHoveredLocation('head')}
          onMouseLeave={() => setHoveredLocation(null)}
          onClick={() => handleLocationClick('head')}
          className="cursor-pointer"
        >
          <rect
            x="175" y="20" width="50" height="40"
            fill={hoveredLocation === 'head' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
          />
          <foreignObject x="175" y="30" width="50" height="20">
            <ArmorValue
              location="head"
              value={armorAllocation.head?.front || 0}
              maxValue={getMaxArmor('head')}
              readOnly={readOnly}
              onChange={(value) => onArmorChange('head', value)}
              compact={isCompact}
            />
          </foreignObject>
        </g>

        {/* Center Torso */}
        <g
          onMouseEnter={() => setHoveredLocation('center_torso')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="150" y="70" width="100" height="120"
            fill={hoveredLocation === 'center_torso' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('center_torso')}
            className="cursor-pointer"
          />
          <foreignObject x="150" y="100" width="100" height="30">
            <div className="text-center">
              <ArmorValue
                location="center_torso"
                value={armorAllocation.center_torso?.front || 0}
                maxValue={getMaxArmor('center_torso')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('center_torso', value)}
                compact={isCompact}
              />
              {armorAllocation.center_torso?.rear !== undefined && (
                <div className="text-xs text-gray-400">
                  R: <ArmorValue
                    location="center_torso"
                    value={armorAllocation.center_torso.rear}
                    maxValue={Math.floor(getMaxArmor('center_torso') * 0.5)}
                    isRear
                    readOnly={readOnly}
                    onChange={(value) => onArmorChange('center_torso', value, true)}
                    compact={isCompact}
                  />
                </div>
              )}
            </div>
          </foreignObject>
        </g>

        {/* Left Torso */}
        <g
          onMouseEnter={() => setHoveredLocation('left_torso')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="80" y="80" width="60" height="100"
            fill={hoveredLocation === 'left_torso' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('left_torso')}
            className="cursor-pointer"
          />
          <foreignObject x="80" y="110" width="60" height="30">
            <div className="text-center">
              <ArmorValue
                location="left_torso"
                value={armorAllocation.left_torso?.front || 0}
                maxValue={getMaxArmor('left_torso')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('left_torso', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Right Torso */}
        <g
          onMouseEnter={() => setHoveredLocation('right_torso')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="260" y="80" width="60" height="100"
            fill={hoveredLocation === 'right_torso' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('right_torso')}
            className="cursor-pointer"
          />
          <foreignObject x="260" y="110" width="60" height="30">
            <div className="text-center">
              <ArmorValue
                location="right_torso"
                value={armorAllocation.right_torso?.front || 0}
                maxValue={getMaxArmor('right_torso')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('right_torso', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Left Arm */}
        <g
          onMouseEnter={() => setHoveredLocation('left_arm')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="20" y="90" width="50" height="80"
            fill={hoveredLocation === 'left_arm' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('left_arm')}
            className="cursor-pointer"
          />
          <foreignObject x="20" y="120" width="50" height="20">
            <div className="text-center">
              <ArmorValue
                location="left_arm"
                value={armorAllocation.left_arm?.front || 0}
                maxValue={getMaxArmor('left_arm')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('left_arm', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Right Arm */}
        <g
          onMouseEnter={() => setHoveredLocation('right_arm')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="330" y="90" width="50" height="80"
            fill={hoveredLocation === 'right_arm' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('right_arm')}
            className="cursor-pointer"
          />
          <foreignObject x="330" y="120" width="50" height="20">
            <div className="text-center">
              <ArmorValue
                location="right_arm"
                value={armorAllocation.right_arm?.front || 0}
                maxValue={getMaxArmor('right_arm')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('right_arm', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Left Leg */}
        <g
          onMouseEnter={() => setHoveredLocation('left_leg')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="120" y="200" width="60" height="120"
            fill={hoveredLocation === 'left_leg' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('left_leg')}
            className="cursor-pointer"
          />
          <foreignObject x="120" y="250" width="60" height="20">
            <div className="text-center">
              <ArmorValue
                location="left_leg"
                value={armorAllocation.left_leg?.front || 0}
                maxValue={getMaxArmor('left_leg')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('left_leg', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Right Leg */}
        <g
          onMouseEnter={() => setHoveredLocation('right_leg')}
          onMouseLeave={() => setHoveredLocation(null)}
        >
          <rect
            x="220" y="200" width="60" height="120"
            fill={hoveredLocation === 'right_leg' ? '#374151' : '#1f2937'}
            stroke="#60a5fa"
            strokeWidth={strokeWidth}
            rx="5"
            onClick={() => handleLocationClick('right_leg')}
            className="cursor-pointer"
          />
          <foreignObject x="220" y="250" width="60" height="20">
            <div className="text-center">
              <ArmorValue
                location="right_leg"
                value={armorAllocation.right_leg?.front || 0}
                maxValue={getMaxArmor('right_leg')}
                readOnly={readOnly}
                onChange={(value) => onArmorChange('right_leg', value)}
                compact={isCompact}
              />
            </div>
          </foreignObject>
        </g>

        {/* Rear armor indicators for torsos */}
        {displayMode === 'hybrid' && (
          <>
            {/* Left Torso Rear */}
            {armorAllocation.left_torso?.rear !== undefined && (
              <g>
                <rect
                  x="90" y="185" width="40" height="20"
                  fill="#374151"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  rx="3"
                  opacity="0.8"
                />
                <foreignObject x="90" y="185" width="40" height="20">
                  <div className="text-center text-xs">
                    <ArmorValue
                      location="left_torso"
                      value={armorAllocation.left_torso.rear}
                      maxValue={Math.floor(getMaxArmor('left_torso') * 0.5)}
                      isRear
                      readOnly={readOnly}
                      onChange={(value) => onArmorChange('left_torso', value, true)}
                      compact={true}
                    />
                  </div>
                </foreignObject>
              </g>
            )}

            {/* Right Torso Rear */}
            {armorAllocation.right_torso?.rear !== undefined && (
              <g>
                <rect
                  x="270" y="185" width="40" height="20"
                  fill="#374151"
                  stroke="#60a5fa"
                  strokeWidth={1}
                  rx="3"
                  opacity="0.8"
                />
                <foreignObject x="270" y="185" width="40" height="20">
                  <div className="text-center text-xs">
                    <ArmorValue
                      location="right_torso"
                      value={armorAllocation.right_torso.rear}
                      maxValue={Math.floor(getMaxArmor('right_torso') * 0.5)}
                      isRear
                      readOnly={readOnly}
                      onChange={(value) => onArmorChange('right_torso', value, true)}
                      compact={true}
                    />
                  </div>
                </foreignObject>
              </g>
            )}
          </>
        )}
      </g>
    );
  };

  // Calculate total armor allocation
  const totalArmorPoints = Object.entries(armorAllocation).reduce((total, [_, location]) => {
    return total + (location.front || 0) + (location.rear || 0);
  }, 0);

  const maxArmorPoints = Object.keys(armorAllocation).reduce((total, location) => {
    return total + getMaxArmor(location);
  }, 0);

  // Handle auto-allocate with pattern selection
  const handleAutoAllocate = useCallback(() => {
    setShowPatternMenu(!showPatternMenu);
  }, [showPatternMenu]);

  // Apply allocation pattern
  const applyPattern = useCallback((pattern: typeof ALLOCATION_PATTERNS[0]) => {
    // Get max points for all locations
    const maxPoints: { [location: string]: number } = {};
    Object.keys(armorAllocation).forEach(location => {
      maxPoints[location] = getMaxArmor(location);
    });

    // Apply the pattern
    const newAllocation = pattern.allocate(maxPoints);
    
    // Update each location
    Object.entries(newAllocation).forEach(([location, armor]) => {
      onArmorChange(location, armor.front, false);
      if (armor.rear !== undefined) {
        onArmorChange(location, armor.rear, true);
      }
    });

    setShowPatternMenu(false);
  }, [armorAllocation, onArmorChange]);

  // Maximize armor allocation
  const handleMaximizeArmor = useCallback(() => {
    // Use the Maximum Protection pattern
    const maxProtectionPattern = ALLOCATION_PATTERNS.find(p => p.name === 'Maximum Protection');
    if (maxProtectionPattern) {
      applyPattern(maxProtectionPattern);
    }
  }, [applyPattern]);

  // Close pattern menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showPatternMenu) {
        setShowPatternMenu(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showPatternMenu]);

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* Compact header with allocation bar */}
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="text-sm font-medium text-gray-300">
          Armor: {armorAllocation.head?.type?.name || 'Standard'}
        </span>
        <div className="flex items-center space-x-2">
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${(totalArmorPoints / maxArmorPoints) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-400">
            {totalArmorPoints.toFixed(0)}/{maxArmorPoints.toFixed(0)} pts
          </span>
        </div>
      </div>

      {/* SVG Diagram */}
      <div className="flex-1 flex items-center justify-center">
        <svg
          viewBox="0 0 400 500"
          className="w-full h-full"
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        >
          {renderMechSilhouette()}
        </svg>
      </div>

      {/* Floating action buttons */}
      {!readOnly && (
        <div className="absolute bottom-2 right-2 flex flex-col space-y-1">
          <div className="flex space-x-1">
            <button
              onClick={handleAutoAllocate}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded shadow"
              title="Auto-Allocate"
            >
              Auto
            </button>
            <button
              onClick={handleMaximizeArmor}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded shadow"
              title="Maximize Armor"
            >
              Max
            </button>
          </div>
          {/* Pattern dropdown */}
          {showPatternMenu && (
            <div className="absolute bottom-full mb-1 right-0 bg-slate-800 border border-slate-600 rounded shadow-lg">
              {ALLOCATION_PATTERNS.map((pattern) => (
                <button
                  key={pattern.name}
                  onClick={() => applyPattern(pattern)}
                  className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-700"
                  title={pattern.description}
                >
                  {pattern.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedArmorDiagram;
