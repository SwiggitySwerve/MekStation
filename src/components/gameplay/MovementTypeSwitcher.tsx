/**
 * MovementTypeSwitcher
 *
 * Per `add-combat-phase-ui-flows`: three-button toggle the player uses
 * during the Movement phase to choose Walk / Run / Jump before picking
 * a destination hex. Highlights the active type and disables Jump if
 * the unit has no jump MP.
 *
 * Switching types clears any in-progress destination/facing pick (the
 * planning state is delegated to `useGameplayStore.clearPlannedMovement`)
 * so the reachable-hex overlay can recolor for the new type via
 * `colorForMovementType` in `HexCell`.
 */

import React from 'react';

import { MovementType } from '@/types/gameplay';

export interface MovementTypeSwitcherProps {
  /** Current movement type the player is planning */
  active: MovementType;
  /** Walk MP available (>0 enables Walk button) */
  walkMP: number;
  /** Jump MP available (0 disables Jump button) */
  jumpMP: number;
  /** Callback fired when player picks a new type */
  onChange: (type: MovementType) => void;
  /** Optional className */
  className?: string;
}

interface TypeButtonProps {
  type: MovementType;
  label: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}

/**
 * Single toggle button. Stays unstyled when disabled so the user can
 * see why the option is unavailable (e.g., "Jump (0 MP)").
 */
function TypeButton({
  type,
  label,
  active,
  disabled,
  onClick,
}: TypeButtonProps): React.ReactElement {
  const baseClasses =
    'min-h-[44px] rounded px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';
  const stateClasses = active
    ? 'bg-blue-600 text-white focus:ring-blue-500'
    : disabled
      ? 'cursor-not-allowed bg-gray-200 text-gray-400'
      : 'bg-surface-raised text-text-theme-primary hover:bg-surface-deep focus:ring-border-theme cursor-pointer';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      data-testid={`movement-type-${type}`}
      className={`${baseClasses} ${stateClasses}`}
    >
      {label}
    </button>
  );
}

export function MovementTypeSwitcher({
  active,
  walkMP,
  jumpMP,
  onChange,
  className = '',
}: MovementTypeSwitcherProps): React.ReactElement {
  // Reasoning: we expose three options always; disabling rather than
  // hiding keeps button positions stable across units (less visual
  // jitter when the player switches between mechs).
  return (
    <div
      className={`flex items-center gap-2 ${className}`}
      role="group"
      aria-label="Movement type"
      data-testid="movement-type-switcher"
    >
      <TypeButton
        type={MovementType.Walk}
        label={`Walk (${walkMP} MP)`}
        active={active === MovementType.Walk}
        disabled={walkMP <= 0}
        onClick={() => onChange(MovementType.Walk)}
      />
      <TypeButton
        type={MovementType.Run}
        label={`Run (${Math.ceil(walkMP * 1.5)} MP)`}
        active={active === MovementType.Run}
        disabled={walkMP <= 0}
        onClick={() => onChange(MovementType.Run)}
      />
      <TypeButton
        type={MovementType.Jump}
        label={`Jump (${jumpMP} MP)`}
        active={active === MovementType.Jump}
        disabled={jumpMP <= 0}
        onClick={() => onChange(MovementType.Jump)}
      />
    </div>
  );
}

export default MovementTypeSwitcher;
