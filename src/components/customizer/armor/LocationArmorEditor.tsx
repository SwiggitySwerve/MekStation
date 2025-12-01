/**
 * Location Armor Editor Component
 * 
 * Panel for editing armor values on a selected location.
 * Supports front and rear armor for torso locations.
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
  return location; // MechLocation values are already display-friendly
}

// =============================================================================
// Component
// =============================================================================

/**
 * Editor panel for a single armor location
 */
export function LocationArmorEditor({
  location,
  data,
  tonnage,
  readOnly = false,
  onChange,
  onClose,
}: LocationArmorEditorProps) {
  const showRear = hasRearArmor(location);
  const maxArmor = useMemo(
    () => getMaxArmorForLocation(tonnage, location),
    [tonnage, location]
  );
  
  // For torsos, front + rear cannot exceed max
  const maxFront = showRear && data.rear !== undefined
    ? maxArmor - (data.rear ?? 0)
    : maxArmor;
  const maxRear = showRear
    ? maxArmor - data.current
    : 0;
  
  const totalForLocation = data.current + (data.rear ?? 0);
  
  // Handlers
  const handleFrontChange = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(value, maxArmor));
    onChange(clamped, showRear ? data.rear : undefined);
  }, [maxArmor, onChange, showRear, data.rear]);
  
  const handleRearChange = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(value, maxRear));
    onChange(data.current, clamped);
  }, [maxRear, onChange, data.current]);
  
  const handleMaxFront = useCallback(() => {
    // Set front to max, keeping rear as-is (or 0 if no rear)
    const newFront = showRear ? maxArmor - (data.rear ?? 0) : maxArmor;
    onChange(newFront, showRear ? data.rear : undefined);
  }, [maxArmor, onChange, showRear, data.rear]);
  
  const handleMaxRear = useCallback(() => {
    // Set rear to max, keeping front as-is
    if (!showRear) return;
    const newRear = maxArmor - data.current;
    onChange(data.current, newRear);
  }, [maxArmor, onChange, showRear, data.current]);
  
  const handleMaxAll = useCallback(() => {
    // Maximize location (default 2:1 front:rear ratio for torsos)
    if (showRear) {
      const frontPortion = Math.floor(maxArmor * 0.67);
      const rearPortion = maxArmor - frontPortion;
      onChange(frontPortion, rearPortion);
    } else {
      onChange(maxArmor);
    }
  }, [maxArmor, onChange, showRear]);
  
  const handleClear = useCallback(() => {
    onChange(0, showRear ? 0 : undefined);
  }, [onChange, showRear]);
  
  const handleBalance = useCallback(() => {
    // Balance front and rear evenly for torsos
    if (!showRear) return;
    const half = Math.floor(totalForLocation / 2);
    const remainder = totalForLocation - half * 2;
    onChange(half + remainder, half); // Give extra point to front
  }, [showRear, totalForLocation, onChange]);
  
  return (
    <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-md font-semibold text-white">{getLocationName(location)}</h4>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {totalForLocation} / {maxArmor}
          </span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-700 rounded transition-colors"
            aria-label="Close editor"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="space-y-3">
        {/* Front Armor */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <label className="text-sm text-slate-400">
              {showRear ? 'Front Armor' : 'Armor'}
            </label>
            <span className="text-xs text-slate-500">Max: {maxFront}</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={maxArmor}
              value={data.current}
              onChange={(e) => handleFrontChange(parseInt(e.target.value, 10))}
              disabled={readOnly}
              className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
            <input
              type="number"
              value={data.current}
              onChange={(e) => handleFrontChange(parseInt(e.target.value, 10) || 0)}
              disabled={readOnly}
              min={0}
              max={maxArmor}
              className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
        </div>
        
        {/* Rear Armor (torsos only) */}
        {showRear && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-400">Rear Armor</label>
              <span className="text-xs text-slate-500">Max: {maxRear}</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min={0}
                max={maxArmor - data.current}
                value={data.rear ?? 0}
                onChange={(e) => handleRearChange(parseInt(e.target.value, 10))}
                disabled={readOnly}
                className="flex-1 h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <input
                type="number"
                value={data.rear ?? 0}
                onChange={(e) => handleRearChange(parseInt(e.target.value, 10) || 0)}
                disabled={readOnly}
                min={0}
                max={maxArmor - data.current}
                className="w-14 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
            </div>
          </div>
        )}
        
        {/* Quick Actions */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
          <button
            onClick={handleMaxAll}
            disabled={readOnly}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-xs transition-colors"
          >
            Max
          </button>
          {showRear && (
            <>
              <button
                onClick={handleMaxFront}
                disabled={readOnly}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-xs transition-colors"
              >
                Max Front
              </button>
              <button
                onClick={handleMaxRear}
                disabled={readOnly}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-xs transition-colors"
              >
                Max Rear
              </button>
              <button
                onClick={handleBalance}
                disabled={readOnly}
                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-xs transition-colors"
              >
                Balance
              </button>
            </>
          )}
          <button
            onClick={handleClear}
            disabled={readOnly}
            className="px-2 py-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-slate-600 text-white text-xs transition-colors"
          >
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
