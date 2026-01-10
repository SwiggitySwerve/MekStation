/**
 * Location Armor Editor Component
 *
 * Compact panel for editing armor values on a selected location.
 * Direct controls for front and rear armor with independent sliders.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useCallback, useMemo } from 'react';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { LocationArmorData } from './ArmorDiagram';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';
import { FRONT_ARMOR_COLOR, REAR_ARMOR_COLOR } from './shared/ArmorFills';

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
 * Uses direct front/rear controls instead of split slider
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

  const front = data.current;
  const rear = data.rear ?? 0;
  const total = front + rear;

  // Calculate max for each slider (capped by what the other allows)
  const maxFront = maxArmor - rear;
  const maxRear = maxArmor - front;

  // Handlers
  const handleFrontChange = useCallback((value: number) => {
    const newFront = Math.max(0, Math.min(value, maxFront));
    onChange(newFront, showRear ? rear : undefined);
  }, [maxFront, onChange, showRear, rear]);

  const handleRearChange = useCallback((value: number) => {
    const newRear = Math.max(0, Math.min(value, maxRear));
    onChange(front, newRear);
  }, [maxRear, onChange, front]);

  // Common styles
  const inputClass = "w-14 px-1.5 py-1 bg-surface-raised border border-border-theme-strong rounded text-white text-sm text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none";
  const labelClass = "text-xs font-semibold uppercase tracking-wide";
  const sliderTrackClass = "flex-1 h-2 rounded-lg appearance-none cursor-pointer";

  return (
    <div className="bg-surface-base rounded-lg border border-border-theme p-4" data-testid="location-armor-editor">
      {/* Header Row */}
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-base font-semibold text-white">{getLocationName(location)}</h4>
        <button
          onClick={onClose}
          className="p-1 hover:bg-surface-raised rounded transition-colors"
          aria-label="Close editor"
        >
          <svg className="w-4 h-4 text-text-theme-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Front Armor Control */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className={labelClass} style={{ color: FRONT_ARMOR_COLOR }}>Front</span>
          <span className="text-xs text-text-theme-secondary">max {maxFront}</span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={maxFront}
            value={front}
            onChange={(e) => handleFrontChange(parseInt(e.target.value, 10))}
            disabled={readOnly}
            className={sliderTrackClass}
            style={{
              background: `linear-gradient(to right, ${FRONT_ARMOR_COLOR} 0%, ${FRONT_ARMOR_COLOR} ${maxFront > 0 ? (front / maxFront) * 100 : 0}%, #475569 ${maxFront > 0 ? (front / maxFront) * 100 : 0}%, #475569 100%)`,
            }}
          />
          <input
            type="number"
            value={front}
            onChange={(e) => handleFrontChange(parseInt(e.target.value, 10) || 0)}
            disabled={readOnly}
            min={0}
            max={maxFront}
            className={inputClass}
            style={{ borderColor: FRONT_ARMOR_COLOR }}
          />
        </div>
      </div>

      {/* Rear Armor Control (only for torso locations) */}
      {showRear && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className={labelClass} style={{ color: REAR_ARMOR_COLOR }}>Rear</span>
            <span className="text-xs text-text-theme-secondary">max {maxRear}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={maxRear}
              value={rear}
              onChange={(e) => handleRearChange(parseInt(e.target.value, 10))}
              disabled={readOnly}
              className={sliderTrackClass}
              style={{
                background: `linear-gradient(to right, ${REAR_ARMOR_COLOR} 0%, ${REAR_ARMOR_COLOR} ${maxRear > 0 ? (rear / maxRear) * 100 : 0}%, #475569 ${maxRear > 0 ? (rear / maxRear) * 100 : 0}%, #475569 100%)`,
              }}
            />
            <input
              type="number"
              value={rear}
              onChange={(e) => handleRearChange(parseInt(e.target.value, 10) || 0)}
              disabled={readOnly}
              min={0}
              max={maxRear}
              className={inputClass}
              style={{ borderColor: REAR_ARMOR_COLOR }}
            />
          </div>
        </div>
      )}

      {/* Total Summary Bar */}
      <div className="pt-3 border-t border-border-theme">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-medium text-text-theme-secondary uppercase tracking-wide">Total</span>
          <span className="text-sm font-semibold text-white">
            {total} <span className="text-text-theme-secondary font-normal">/ {maxArmor}</span>
          </span>
        </div>
        {/* Visual bar showing total allocation */}
        <div className="h-2 bg-surface-raised rounded-full overflow-hidden flex">
          {/* Front portion */}
          <div
            className="h-full transition-all duration-150"
            style={{
              width: `${maxArmor > 0 ? (front / maxArmor) * 100 : 0}%`,
              backgroundColor: FRONT_ARMOR_COLOR,
            }}
          />
          {/* Rear portion */}
          {showRear && (
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${maxArmor > 0 ? (rear / maxArmor) * 100 : 0}%`,
                backgroundColor: REAR_ARMOR_COLOR,
              }}
            />
          )}
        </div>
        {/* Legend for torso */}
        {showRear && (
          <div className="flex items-center justify-center gap-4 mt-2 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: FRONT_ARMOR_COLOR }} />
              <span className="text-text-theme-secondary">Front ({front})</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: REAR_ARMOR_COLOR }} />
              <span className="text-text-theme-secondary">Rear ({rear})</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
