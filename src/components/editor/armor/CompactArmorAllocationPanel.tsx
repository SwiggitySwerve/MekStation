import React, { useState, useCallback } from 'react';
import { EditableUnit, ArmorType } from '../../../types/editor';
import { 
  getMaxArmorForLocation,
  calculateArmorWeight,
  getTotalArmorPoints,
  hasRearArmor,
  ALLOCATION_PATTERNS
} from '../../../utils/armorAllocationHelpers';

// Define the armor allocation structure based on EditableUnit
type ArmorAllocation = EditableUnit['armorAllocation'];

interface CompactArmorAllocationPanelProps {
  unit: EditableUnit;
  armorAllocation: ArmorAllocation;
  onArmorChange: (location: string, value: number, isRear?: boolean) => void;
  readOnly?: boolean;
}

// Location row component
const LocationRow: React.FC<{
  location: string;
  armor: { front: number; rear?: number; maxArmor: number };
  maxFront: number;
  maxRear?: number;
  onArmorChange: (value: number, isRear?: boolean) => void;
  readOnly?: boolean;
}> = ({ location, armor, maxFront, maxRear, onArmorChange, readOnly }) => {
  const locationName = location.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  const hasRear = maxRear !== undefined && maxRear > 0;

  // Progress bar color based on armor percentage
  const getProgressColor = (current: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage === 0) return 'bg-gray-600';
    if (percentage < 25) return 'bg-red-500';
    if (percentage < 75) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center text-xs">
      {/* Location Name */}
      <div className="col-span-3 font-medium truncate" title={locationName}>
        {locationName}
      </div>

      {/* Front Armor */}
      <div className="col-span-4">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onArmorChange(Math.max(0, armor.front - 1))}
            disabled={readOnly || armor.front === 0}
            className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          
          <div className="flex-1">
            <div className="relative h-4 bg-slate-700 rounded overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${getProgressColor(armor.front, maxFront)} transition-all`}
                style={{ width: `${(armor.front / maxFront) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {armor.front}/{maxFront}
              </div>
            </div>
          </div>

          <button
            onClick={() => onArmorChange(Math.min(maxFront, armor.front + 1))}
            disabled={readOnly || armor.front === maxFront}
            className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-50"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Rear Armor (if applicable) */}
      {hasRear ? (
        <div className="col-span-4">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => onArmorChange(Math.max(0, (armor.rear || 0) - 1), true)}
              disabled={readOnly || (armor.rear || 0) === 0}
              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            
            <div className="flex-1">
              <div className="relative h-4 bg-slate-700 rounded overflow-hidden">
                <div
                  className={`absolute inset-y-0 left-0 ${getProgressColor(armor.rear || 0, maxRear)} transition-all`}
                  style={{ width: `${((armor.rear || 0) / maxRear) * 100}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                  {armor.rear || 0}/{maxRear}
                </div>
              </div>
            </div>

            <button
              onClick={() => onArmorChange(Math.min(maxRear, (armor.rear || 0) + 1), true)}
              disabled={readOnly || (armor.rear || 0) === maxRear}
              className="p-0.5 hover:bg-slate-700 rounded disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="col-span-4 text-center text-gray-500">-</div>
      )}

      {/* Quick Actions */}
      <div className="col-span-1 flex justify-end">
        <button
          onClick={() => {
            onArmorChange(maxFront);
            if (hasRear && maxRear) {
              onArmorChange(Math.floor(maxRear * 0.5), true);
            }
          }}
          disabled={readOnly}
          className="p-0.5 hover:bg-slate-700 rounded text-green-400 disabled:opacity-50"
          title="Maximize this location"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
};

const CompactArmorAllocationPanel: React.FC<CompactArmorAllocationPanelProps> = ({
  unit,
  armorAllocation,
  onArmorChange,
  readOnly = false,
}) => {
  const [showPatterns, setShowPatterns] = useState(false);

  // Calculate totals
  const totalArmorPoints = getTotalArmorPoints(armorAllocation);
  const armorType = armorAllocation.head?.type || { name: 'Standard', pointsPerTon: 16 } as ArmorType;
  const armorWeight = calculateArmorWeight(totalArmorPoints, armorType);

  // Get location order
  const locations = [
    'head',
    'center_torso',
    'left_torso',
    'right_torso',
    'left_arm',
    'right_arm',
    'left_leg',
    'right_leg'
  ];

  // Apply pattern
  const applyPattern = useCallback((pattern: typeof ALLOCATION_PATTERNS[0]) => {
    const maxPoints: { [location: string]: number } = {};
    locations.forEach(location => {
      maxPoints[location] = getMaxArmorForLocation(location, unit.mass);
    });

    const newAllocation = pattern.allocate(maxPoints);
    
    Object.entries(newAllocation).forEach(([location, armor]) => {
      onArmorChange(location, armor.front, false);
      if (armor.rear !== undefined) {
        onArmorChange(location, armor.rear, true);
      }
    });

    setShowPatterns(false);
  }, [locations, unit.mass, onArmorChange]);

  return (
    <div className="bg-slate-800 rounded-lg p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Armor Allocation</h3>
        <div className="text-xs text-gray-400">
          {totalArmorPoints} pts / {armorWeight}t
        </div>
      </div>

      {/* Column Headers */}
      <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-400 mb-2">
        <div className="col-span-3">Location</div>
        <div className="col-span-4 text-center">Front</div>
        <div className="col-span-4 text-center">Rear</div>
        <div className="col-span-1"></div>
      </div>

      {/* Location Rows */}
      <div className="space-y-1">
        {locations.map(location => {
          const armor = armorAllocation[location];
          if (!armor) return null;

          const maxFront = getMaxArmorForLocation(location, unit.mass);
          const maxRear = hasRearArmor(location) ? Math.floor(maxFront * 0.5) : undefined;

          return (
            <LocationRow
              key={location}
              location={location}
              armor={armor}
              maxFront={maxFront}
              maxRear={maxRear}
              onArmorChange={(value, isRear) => onArmorChange(location, value, isRear)}
              readOnly={readOnly}
            />
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="mt-3 pt-3 border-t border-slate-700">
        <div className="flex items-center justify-between">
          <div className="relative">
            <button
              onClick={() => setShowPatterns(!showPatterns)}
              disabled={readOnly}
              className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded disabled:opacity-50"
            >
              Patterns ▼
            </button>
            
            {showPatterns && (
              <div className="absolute bottom-full mb-1 left-0 bg-slate-900 border border-slate-700 rounded shadow-lg z-10">
                {ALLOCATION_PATTERNS.map(pattern => (
                  <button
                    key={pattern.name}
                    onClick={() => applyPattern(pattern)}
                    className="block w-full text-left px-3 py-1 text-xs hover:bg-slate-800 whitespace-nowrap"
                    title={pattern.description}
                  >
                    {pattern.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex space-x-1">
            <button
              onClick={() => {
                // Clear all armor
                locations.forEach(location => {
                  onArmorChange(location, 0, false);
                  if (hasRearArmor(location)) {
                    onArmorChange(location, 0, true);
                  }
                });
              }}
              disabled={readOnly}
              className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
            >
              Clear
            </button>
            
            <button
              onClick={() => {
                // Apply max protection pattern
                const maxPattern = ALLOCATION_PATTERNS.find(p => p.name === 'Maximum Protection');
                if (maxPattern) applyPattern(maxPattern);
              }}
              disabled={readOnly}
              className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 rounded disabled:opacity-50"
            >
              Max All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompactArmorAllocationPanel;
