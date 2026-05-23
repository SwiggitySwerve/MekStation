/**
 * MovementHeatPreview
 *
 * Per `add-movement-phase-ui` task 9: a small preview chip the action
 * panel shows below the MP-type buttons during the Movement phase. It
 * surfaces the heat the unit will accumulate this turn for the chosen
 * movement type so the player can plan around heat limits before committing
 * the move.
 *
 * Heat math is delegated to `calculateMovementHeat` from
 * `utils/gameplay/movement` so this component can never drift from the
 * canonical rules.
 *
 * @spec openspec/changes/add-movement-phase-ui/tasks.md § 9
 */

import React from 'react';

import type { MovementHeatProfile } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';
import { calculateMovementHeat } from '@/utils/gameplay/movement';

export interface MovementHeatPreviewProps {
  /** The movement type the player is currently planning. */
  movementType: MovementType;
  /**
   * Exact rules-backed heat from the movement projection. When present, it
   * wins over local derivation so the action panel mirrors the map preview.
   */
  heatGenerated?: number;
  /**
   * Number of hexes the unit will jump (only used when
   * `movementType === MovementType.Jump`). Walk and Run heat are
   * fixed at 1/2 regardless of distance per canonical rules.
   */
  jumpHexes?: number;
  /** Rules-level movement heat source for fallback previews. */
  movementHeatProfile?: MovementHeatProfile;
  /** Optional className for layout overrides. */
  className?: string;
}

const MOVEMENT_TYPE_LABEL: Record<MovementType, string> = {
  [MovementType.Stationary]: 'Stationary',
  [MovementType.Walk]: 'Walk',
  [MovementType.Run]: 'Run',
  [MovementType.Jump]: 'Jump',
};

export function MovementHeatPreview({
  movementType,
  heatGenerated,
  jumpHexes = 0,
  movementHeatProfile,
  className = '',
}: MovementHeatPreviewProps): React.ReactElement {
  const heat =
    heatGenerated ??
    calculateMovementHeat(
      movementType,
      jumpHexes,
      undefined,
      movementHeatProfile,
    );
  const label = MOVEMENT_TYPE_LABEL[movementType] ?? 'Move';

  return (
    <div
      className={`flex items-center gap-2 text-sm ${className}`}
      data-testid="movement-heat-preview"
      data-heat={heat}
      data-movement-type={movementType}
    >
      <span className="text-text-theme-muted">Heat this turn:</span>
      <span
        className={
          heat >= 8
            ? 'font-semibold text-amber-500'
            : heat > 0
              ? 'text-text-theme-primary font-semibold'
              : 'text-text-theme-muted'
        }
      >
        {heat > 0 ? `+${heat}` : '0'}
      </span>
      <span className="text-text-theme-muted text-xs">({label})</span>
    </div>
  );
}
