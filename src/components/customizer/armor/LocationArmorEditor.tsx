/**
 * Location Armor Editor Component
 * 
 * Compact panel for editing armor values on a selected location.
 * Full control over total, front, and rear armor values.
 * Visual split slider shows front (orange) vs rear (blue).
 * 
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { LocationArmorData } from './ArmorDiagram';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';

// =============================================================================
// Types
// =============================================================================

interface LocationArmorEditorProps {
  /** The location being edited */
  location: MechLocation;
  /** Current armor data for the location */
  data: LocationArmorData;
  /** Unit tonnage (for max calculations) */
  tonnage: number;
  /** Read-only mode */
  readOnly?: boolean;
  /** Called when armor values change */
  onChange: (front: number, rear?: number) => void;
  /** Called when closing the editor */
  onClose: () => void;
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Check if a location has rear armor
 */
function hasRearArmor(location: MechLocation): boolean {
  return [
    MechLocation.CENTER_TORSO,
    MechLocation.LEFT_TORSO,
    MechLocation.RIGHT_TORSO,
  ].includes(location);
}

/**
 * Get display name for location
 */
function getLocationName(location: MechLocation): string {
  return location;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Compact editor panel for a single armor location
 */
export function LocationArmorEditor({
  location,
  data,
  tonnage,
  readOnly = false,
  onChange,
  onClose,
}: LocationArmorEditorProps): React.ReactElement {
  const showRear = hasRearArmor(location);
  const maxArmor = useMemo(
    () => getMaxArmorForLocation(tonnage, location),
    [tonnage, location]
  );
  
  // Total armor pool for this location
  const totalPool = data.current + (data.rear ?? 0);
  
  // Calculate percentages for the split slider
  const frontPercent = totalPool > 0 ? (data.current / totalPool) * 100 : 75;
  const rearPercent = totalPool > 0 ? ((data.rear ?? 0) / totalPool) * 100 : 25;
  
  // Handlers
  const handleTotalChange = useCallback((value: number) => {
    const newTotal = Math.max(0, Math.min(value, maxArmor));
    if (showRear) {
      // Maintain front/rear ratio when changing total
      const currentRatio = totalPool > 0 ? data.current / totalPool : 0.75;
      const newFront = Math.round(newTotal * currentRatio);
      const newRear = newTotal - newFront;
      onChange(newFront, newRear);
    } else {
      onChange(newTotal);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- data is a prop, not a ref; using data.current directly is intentional
  }, [maxArmor, onChange, showRear, totalPool, data.current]);
  
  const handleFrontChange = useCallback((value: number) => {
    const rear = data.rear ?? 0;
    // Front can go from 0 to maxArmor - rear
    const maxFront = maxArmor - rear;
    const newFront = Math.max(0, Math.min(value, maxFront));
    onChange(newFront, showRear ? rear : undefined);
  }, [maxArmor, onChange, showRear, data.rear]);
  
  const handleRearChange = useCallback((value: number) => {
    // Rear can go from 0 to maxArmor - front
    const maxRear = maxArmor - data.current;
    const newRear = Math.max(0, Math.min(value, maxRear));
    onChange(data.current, newRear);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- data is a prop, not a ref; using data.current directly is intentional
  }, [maxArmor, onChange, data.current]);
  
  // Handle split slider - adjusts front within current total pool
  const handleSplitChange = useCallback((value: number) => {
    if (totalPool === 0) return;
    const newFront = Math.max(0, Math.min(value, totalPool));
    const newRear = totalPool - newFront;
    onChange(newFront, newRear);
  }, [totalPool, onChange]);
  
  // Common styles
  const inputClass = "w-12 px-1 py-0.5 bg-slate-700 border border-slate-600 rounded text-white text-xs text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelClass = "text-[10px] font-medium uppercase w-10";
  const sliderClass = "flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer";

  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-3" data-testid="location-armor-editor">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-semibold text-white">{getLocationName(location)}</h4>
        <button
          onClick={onClose}
          className="p-0.5 hover:bg-slate-700 rounded transition-colors"
          aria-label="Close editor"
        >
          <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Total row with slider */}
      <div className="flex items-center gap-2 mb-2">
        <span className={`${labelClass} text-slate-300`}>Total</span>
        <input
          type="range"
          min={0}
          max={maxArmor}
          value={totalPool}
          onChange={(e) => handleTotalChange(parseInt(e.target.value, 10))}
          disabled={readOnly}
          className={`${sliderClass} accent-slate-400`}
        />
        <input
          type="number"
          value={totalPool}
          onChange={(e) => handleTotalChange(parseInt(e.target.value, 10) || 0)}
          disabled={readOnly}
          min={0}
          max={maxArmor}
          className={inputClass}
        />
        <span className="text-[10px] text-slate-500">/{maxArmor}</span>
      </div>
      
      {showRear && (
        <>
          {/* Split slider with visual front/rear display */}
          <div className="mb-2">
            <div className="flex items-center gap-2">
              <span className={`${labelClass} text-slate-300`}>Split</span>
              {/* Custom visual split bar */}
              <div className="flex-1 relative">
                {/* Background bar showing front (orange) and rear (blue) */}
                <div className="h-3 rounded overflow-hidden flex">
                  <div 
                    className="bg-amber-500 transition-all"
                    style={{ width: `${frontPercent}%` }}
                  />
                  <div 
                    className="bg-sky-500 transition-all"
                    style={{ width: `${rearPercent}%` }}
                  />
                </div>
                {/* Invisible range input for interaction */}
                <input
                  type="range"
                  min={0}
                  max={totalPool}
                  value={data.current}
                  onChange={(e) => handleSplitChange(parseInt(e.target.value, 10))}
                  disabled={readOnly || totalPool === 0}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
              </div>
            </div>
          </div>
          
          {/* Front/Rear number inputs */}
          <div className="flex items-center gap-3">
            {/* Front */}
            <div className="flex items-center gap-1.5">
              <span className={`${labelClass} text-amber-400`}>Front</span>
              <input
                type="number"
                value={data.current}
                onChange={(e) => handleFrontChange(parseInt(e.target.value, 10) || 0)}
                disabled={readOnly}
                min={0}
                max={maxArmor - (data.rear ?? 0)}
                className={inputClass}
              />
            </div>
            
            {/* Rear */}
            <div className="flex items-center gap-1.5">
              <span className={`${labelClass} text-sky-400`}>Rear</span>
              <input
                type="number"
                value={data.rear ?? 0}
                onChange={(e) => handleRearChange(parseInt(e.target.value, 10) || 0)}
                disabled={readOnly}
                min={0}
                max={maxArmor - data.current}
                className={inputClass}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
