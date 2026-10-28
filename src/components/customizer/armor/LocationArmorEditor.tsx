/**
 * Location Armor Editor Component
 *
 * Compact panel for editing armor values on a selected location.
 * Direct controls for front and rear armor with independent sliders. Every
 * location uses one header pattern: plain "Front" / "Rear" labels (the value
 * sits in the input beside each slider) and the location maximum once, on the
 * Total line. Front and rear share that maximum, so no per-side max is shown.
 *
 * @spec openspec/specs/armor-diagram/spec.md
 */

import React, { useCallback, useMemo } from 'react';

import type { LocationArmorData } from '@/types/construction/LocationArmorData';

import { AppIcon } from '@/components/ui/AppIcon';
import { MechLocation } from '@/types/construction/CriticalSlotAllocation';
import { getMaxArmorForLocation } from '@/utils/construction/armorCalculations';

import { getArmorFaceMaximums } from './shared/ArmorFaceMaximums';
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
  /**
   * Render as an inset panel inside another card (the armor inspector)
   * instead of a card of its own.
   */
  embedded?: boolean;
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
  embedded = false,
}: LocationArmorEditorProps): React.ReactElement {
  const showRear = hasRearArmor(location);
  const maxArmor = useMemo(
    () => getMaxArmorForLocation(tonnage, location),
    [tonnage, location],
  );

  const front = data.current;
  const rear = data.rear ?? 0;
  const total = front + rear;

  // Calculate max for each slider (capped by what the other allows)
  const { front: maxFront, rear: maxRear } = getArmorFaceMaximums(
    maxArmor,
    front,
    rear,
  );

  // Handlers
  const handleFrontChange = useCallback(
    (value: number) => {
      const newFront = Math.max(0, Math.min(value, maxFront));
      onChange(newFront, showRear ? rear : undefined);
    },
    [maxFront, onChange, showRear, rear],
  );

  const handleRearChange = useCallback(
    (value: number) => {
      const newRear = Math.max(0, Math.min(value, maxRear));
      onChange(front, newRear);
    },
    [maxRear, onChange, front],
  );

  // Common styles
  const inputClass =
    'min-h-11 w-16 px-1.5 py-1 bg-surface-raised border border-border-theme-strong rounded text-text-theme-primary text-sm text-center font-medium [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none';
  const labelClass = 'text-xs font-semibold uppercase tracking-wide';
  // Embedded, the editor is a raised panel, so its empty tracks drop to the
  // page tone to stay visible against it.
  const emptyTrack = embedded ? 'var(--surface-deep)' : 'var(--surface-raised)';
  // A 24px hit area around a centred 8px track (the inline gradient's size).
  const sliderTrackClass =
    'flex-1 h-6 bg-transparent bg-[length:100%_8px] bg-center bg-no-repeat appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-current [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-current';

  return (
    <div
      className={
        embedded
          ? 'bg-surface-raised border-border-theme rounded-lg border p-3'
          : 'bg-surface-base border-border-theme rounded-lg border p-4'
      }
      data-testid="location-armor-editor"
    >
      {/* Header Row */}
      <div
        className={`flex items-center justify-between ${embedded ? 'mb-1' : 'mb-4'}`}
      >
        <h4 className="text-text-theme-primary text-base font-semibold">
          {getLocationName(location)}
        </h4>
        <button
          onClick={onClose}
          className={`${embedded ? 'hover:bg-border-theme' : 'hover:bg-surface-raised'} focus-visible:ring-accent flex min-h-11 min-w-11 items-center justify-center rounded p-1 transition-colors focus-visible:ring-2`}
          aria-label="Close editor"
        >
          <AppIcon
            name="close"
            size="inline"
            className="text-text-theme-secondary"
            aria-hidden="true"
          />
        </button>
      </div>

      {/* Front Armor Control */}
      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between">
          <span className={labelClass} style={{ color: FRONT_ARMOR_COLOR }}>
            Front
          </span>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            aria-label={`${location} front armor`}
            min={0}
            max={maxFront}
            value={front}
            onChange={(e) => handleFrontChange(parseInt(e.target.value, 10))}
            disabled={readOnly}
            className={sliderTrackClass}
            style={{
              color: FRONT_ARMOR_COLOR,
              backgroundImage: `linear-gradient(to right, ${FRONT_ARMOR_COLOR} 0%, ${FRONT_ARMOR_COLOR} ${maxFront > 0 ? (front / maxFront) * 100 : 0}%, ${emptyTrack} ${maxFront > 0 ? (front / maxFront) * 100 : 0}%, ${emptyTrack} 100%)`,
            }}
          />
          <input
            type="number"
            aria-label={`${location} front armor`}
            value={front}
            onChange={(e) =>
              handleFrontChange(parseInt(e.target.value, 10) || 0)
            }
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
          <div className="mb-1.5 flex items-center justify-between">
            <span className={labelClass} style={{ color: REAR_ARMOR_COLOR }}>
              Rear
            </span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              aria-label={`${location} rear armor`}
              min={0}
              max={maxRear}
              value={rear}
              onChange={(e) => handleRearChange(parseInt(e.target.value, 10))}
              disabled={readOnly}
              className={sliderTrackClass}
              style={{
                color: REAR_ARMOR_COLOR,
                backgroundImage: `linear-gradient(to right, ${REAR_ARMOR_COLOR} 0%, ${REAR_ARMOR_COLOR} ${maxRear > 0 ? (rear / maxRear) * 100 : 0}%, ${emptyTrack} ${maxRear > 0 ? (rear / maxRear) * 100 : 0}%, ${emptyTrack} 100%)`,
              }}
            />
            <input
              type="number"
              aria-label={`${location} rear armor`}
              value={rear}
              onChange={(e) =>
                handleRearChange(parseInt(e.target.value, 10) || 0)
              }
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
      <div className="border-border-theme border-t pt-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-text-theme-secondary text-xs font-medium tracking-wide uppercase">
            Total
          </span>
          <span className="text-text-theme-primary text-sm font-semibold">
            {total}{' '}
            <span className="text-text-theme-secondary font-normal">
              / {maxArmor}
            </span>
          </span>
        </div>
        {/* Visual bar showing total allocation */}
        <div
          className={`${embedded ? 'bg-surface-deep' : 'bg-surface-raised'} flex h-2 overflow-hidden rounded-full`}
        >
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
      </div>
    </div>
  );
}
