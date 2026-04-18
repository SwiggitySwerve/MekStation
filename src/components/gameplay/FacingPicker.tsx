/**
 * FacingPicker
 *
 * Per `add-combat-phase-ui-flows`: six-way facing chooser shown after
 * the player picks a destination hex. Each button selects one of the
 * six hex facings (N, NE, SE, S, SW, NW). Clicking a button calls
 * `onSelect(facing)` so the parent can stash it on the in-progress
 * `plannedMovement` plan.
 *
 * Layout: arranged in a 3-column rosette so the spatial relation to a
 * hex is visually obvious (top row = N facings; bottom row = S
 * facings).
 */

import React from 'react';

import { Facing } from '@/types/gameplay';

export interface FacingPickerProps {
  /** Currently selected facing (highlighted) */
  selected: Facing | null;
  /** Callback fired when a facing is picked */
  onSelect: (facing: Facing) => void;
  /** Optional className */
  className?: string;
}

interface FacingButtonProps {
  facing: Facing;
  label: string;
  arrow: string;
  selected: boolean;
  onClick: () => void;
}

function FacingButton({
  facing,
  label,
  arrow,
  selected,
  onClick,
}: FacingButtonProps): React.ReactElement {
  const baseClasses =
    'flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const stateClasses = selected
    ? 'bg-blue-600 text-white focus:ring-blue-500'
    : 'bg-surface-raised text-text-theme-primary hover:bg-surface-deep focus:ring-border-theme cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={selected}
      data-testid={`facing-${facing}`}
      className={`${baseClasses} ${stateClasses}`}
    >
      <span className="text-lg leading-none">{arrow}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
}

export function FacingPicker({
  selected,
  onSelect,
  className = '',
}: FacingPickerProps): React.ReactElement {
  // Layout reasoning: 3-column grid lets us anchor N at top-center,
  // S at bottom-center, with NE/SE/NW/SW on the diagonal corners. This
  // mirrors a hex's actual six-edge geometry (flat-top hexes used by
  // the engine — see HexGridInterfaces).
  return (
    <div
      className={`grid w-fit grid-cols-3 gap-1 ${className}`}
      role="group"
      aria-label="Facing direction"
      data-testid="facing-picker"
    >
      <div />
      <FacingButton
        facing={Facing.North}
        label="N"
        arrow="↑"
        selected={selected === Facing.North}
        onClick={() => onSelect(Facing.North)}
      />
      <div />
      <FacingButton
        facing={Facing.Northwest}
        label="NW"
        arrow="↖"
        selected={selected === Facing.Northwest}
        onClick={() => onSelect(Facing.Northwest)}
      />
      <div />
      <FacingButton
        facing={Facing.Northeast}
        label="NE"
        arrow="↗"
        selected={selected === Facing.Northeast}
        onClick={() => onSelect(Facing.Northeast)}
      />
      <FacingButton
        facing={Facing.Southwest}
        label="SW"
        arrow="↙"
        selected={selected === Facing.Southwest}
        onClick={() => onSelect(Facing.Southwest)}
      />
      <div />
      <FacingButton
        facing={Facing.Southeast}
        label="SE"
        arrow="↘"
        selected={selected === Facing.Southeast}
        onClick={() => onSelect(Facing.Southeast)}
      />
      <div />
      <FacingButton
        facing={Facing.South}
        label="S"
        arrow="↓"
        selected={selected === Facing.South}
        onClick={() => onSelect(Facing.South)}
      />
      <div />
    </div>
  );
}

export default FacingPicker;
