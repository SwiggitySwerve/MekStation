/**
 * TacticalLensControls
 *
 * Small lens-picker + intensity-slider panel that lives in the left-tray
 * ShellSlot. Renders one button per lens preset and a range slider for the
 * active lens's intensity.
 *
 * Design constraints:
 * - Stateless with respect to lens selection — all state is owned by the
 *   parent (GameplayLayout) via `useTacticalLensState`. Props-only contract
 *   keeps this component trivially testable.
 * - "No lens" clears the active lens, restoring default layer visibility.
 * - Intensity slider is only visible when a lens is active.
 *
 * @spec openspec/changes/add-tactical-map-lenses-feed-replay/specs/tactical-map-interface/spec.md
 *   "Tactical Map Lenses" ADDED requirement
 */

import React, { useCallback } from 'react';

import {
  LENS_PRESETS,
  type TacticalLensId,
} from '@/types/gameplay/TacticalLensInterfaces';

// =============================================================================
// Props
// =============================================================================

export interface TacticalLensControlsProps {
  /** Currently active lens id, or null for the default view. */
  activeLens: TacticalLensId | null;
  /** Callback when the player picks a lens (or clears with null). */
  onLensChange: (id: TacticalLensId | null) => void;
  /** Intensity of the active lens overlay (0–1). */
  lensIntensity: number;
  /** Callback when the player drags the intensity slider. */
  onIntensityChange: (intensity: number) => void;
  /** Optional extra class names for the root element. */
  className?: string;
}

// =============================================================================
// Component
// =============================================================================

/**
 * Lens picker buttons + intensity slider for the tactical map left tray.
 *
 * Each lens button is a toggle: clicking the already-active lens clears it
 * (returns to the default all-layers view). Clicking an inactive lens
 * activates it and hides the intensity slider until the lens is set.
 */
export function TacticalLensControls({
  activeLens,
  onLensChange,
  lensIntensity,
  onIntensityChange,
  className = '',
}: TacticalLensControlsProps): React.ReactElement {
  // Clicking the active lens clears it; clicking another activates it.
  const handleLensClick = useCallback(
    (id: TacticalLensId) => {
      onLensChange(activeLens === id ? null : id);
    },
    [activeLens, onLensChange],
  );

  const handleIntensityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onIntensityChange(parseFloat(e.target.value));
    },
    [onIntensityChange],
  );

  return (
    <div
      className={`flex flex-col gap-1 p-2 ${className}`}
      data-testid="tactical-lens-controls"
    >
      {/* Section label */}
      <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
        Map Lens
      </span>

      {/* Lens picker buttons — one per preset */}
      <div
        className="flex flex-wrap gap-1"
        role="group"
        aria-label="Tactical map lenses"
      >
        {LENS_PRESETS.map((preset) => {
          const isActive = activeLens === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleLensClick(preset.id)}
              className={[
                'rounded px-2 py-1 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
              ].join(' ')}
              aria-pressed={isActive}
              data-testid={`lens-btn-${preset.id}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Intensity slider — only shown when a lens is active */}
      {activeLens !== null && (
        <div className="mt-1 flex items-center gap-2">
          <label htmlFor="lens-intensity" className="text-xs text-gray-500">
            Intensity
          </label>
          <input
            id="lens-intensity"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={lensIntensity}
            onChange={handleIntensityChange}
            className="h-1 w-full cursor-pointer accent-blue-600"
            data-testid="lens-intensity-slider"
          />
          <span className="w-8 text-right text-xs text-gray-500 tabular-nums">
            {Math.round(lensIntensity * 100)}%
          </span>
        </div>
      )}
    </div>
  );
}

export default TacticalLensControls;
