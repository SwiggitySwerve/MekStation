/**
 * TwistControl (change `attack-phase-intent-composer`, phase 2/3,
 * ADR 0002 D7).
 *
 * Torso twist as a composer intent item: three explicit states (Twist
 * Left / Straight / Twist Right) whose facings come from the canonical
 * `getTwistedFacing` via `buildTwistOptions`, so the composed value is
 * EXACTLY what `torsoTwist` declares at Fire. Selecting a state calls
 * `onSetTwist(facing | null)` — arc recomputation is a derived concern
 * (the palette and map read `composedTwist` live), and clearing restores
 * prior gating by construction.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import React from 'react';

import type { Facing } from '@/types/gameplay';

import type { ITwistOption } from './AttackIntentComposer.model';

export interface TwistControlProps {
  readonly options: readonly ITwistOption[];
  readonly onSetTwist: (twist: Facing | null) => void;
}

export function TwistControl({
  options,
  onSetTwist,
}: TwistControlProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="attack-twist-control"
      role="radiogroup"
      aria-label="Torso twist"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Torso Twist
      </span>
      <div className="flex items-center gap-1">
        {options.map((option) => (
          <button
            key={option.key}
            type="button"
            role="radio"
            aria-checked={option.active}
            onClick={() => onSetTwist(option.facing)}
            data-testid={`twist-option-${option.key}`}
            data-twist-active={option.active ? 'true' : undefined}
            className={`focus:ring-border-theme min-h-[36px] rounded px-3 py-1 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
              option.active
                ? 'bg-surface-deep text-text-theme-primary ring-border-theme ring-1'
                : 'bg-surface-raised hover:bg-surface-deep text-text-theme-secondary cursor-pointer'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TwistControl;
