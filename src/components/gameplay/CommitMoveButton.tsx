/**
 * CommitMoveButton
 *
 * Per `add-combat-phase-ui-flows`: primary "lock in your move" button
 * for the Movement-phase action panel. Disabled until the player has
 * picked both a destination AND a facing on `plannedMovement`.
 *
 * Renders a `MovementHeatPreview` chip beside the button so the player
 * can sanity-check the heat impact before committing.
 */

import React from 'react';

import { MovementType } from '@/types/gameplay';

import { MovementHeatPreview } from './MovementHeatPreview';

export interface CommitMoveButtonProps {
  /** True when destination + facing are both set on the plan */
  ready: boolean;
  /** MP cost shown next to the button label */
  mpCost: number;
  /** Movement type for heat preview */
  movementType: MovementType;
  /** Hexes the unit will jump (only used when type === Jump) */
  jumpHexes?: number;
  /** Callback to fire when the player commits */
  onCommit: () => void;
  /** Optional className */
  className?: string;
}

export function CommitMoveButton({
  ready,
  mpCost,
  movementType,
  jumpHexes,
  onCommit,
  className = '',
}: CommitMoveButtonProps): React.ReactElement {
  const buttonClasses = ready
    ? 'cursor-pointer bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
    : 'cursor-not-allowed bg-gray-300 text-gray-500';

  return (
    <div
      className={`flex flex-col gap-2 ${className}`}
      data-testid="commit-move-button-wrapper"
    >
      <MovementHeatPreview movementType={movementType} jumpHexes={jumpHexes} />
      <button
        type="button"
        onClick={onCommit}
        disabled={!ready}
        className={`min-h-[44px] rounded px-4 py-2 font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${buttonClasses}`}
        data-testid="commit-move-button"
      >
        Commit Move ({mpCost} MP)
      </button>
    </div>
  );
}

export default CommitMoveButton;
