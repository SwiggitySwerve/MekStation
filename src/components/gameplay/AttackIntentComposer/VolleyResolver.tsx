/**
 * VolleyResolver (change `attack-phase-intent-composer`, phase 2,
 * task 2.4).
 *
 * The composed-volley summary + the two EXPLICIT commit controls:
 *  - Fire — commits the whole volley atomically (composed twist first,
 *    then one declaration group per target, primary first, locked once).
 *    Disabled with a player-facing hint until at least one LEGAL
 *    assignment exists. The composer never auto-fires.
 *  - Hold Fire — the explicit decline-to-attack action (never a silent
 *    timeout): locks the activation with zero declarations.
 *
 * @spec openspec/changes/attack-phase-intent-composer/specs/tactical-attack-intent/spec.md
 */

import React from 'react';

import type { IResolverGroupLine } from './composer.types';

export interface VolleyResolverProps {
  readonly groups: readonly IResolverGroupLine[];
  readonly fireEnabled: boolean;
  /** Player-facing enablement hint shown NEXT TO Fire while disabled. */
  readonly fireHint: string | null;
  readonly onFire: () => void;
  readonly onHoldFire: () => void;
}

export function VolleyResolver({
  groups,
  fireEnabled,
  fireHint,
  onFire,
  onHoldFire,
}: VolleyResolverProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="attack-volley-resolver"
      role="group"
      aria-label="Volley resolver"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Volley
      </span>
      <div className="flex flex-col gap-0.5">
        {groups.length === 0 && (
          <span
            className="text-text-theme-secondary text-xs"
            data-testid="volley-resolver-empty"
          >
            No weapons assigned.
          </span>
        )}
        {groups.map((group) => (
          <span
            key={group.targetId}
            className="text-text-theme-primary text-sm"
            data-testid={`volley-group-${group.targetId}`}
            data-volley-primary={group.isPrimary ? 'true' : undefined}
          >
            {group.weaponCount} weapon{group.weaponCount === 1 ? '' : 's'}
            {' → '}
            {group.targetName}
            {group.isPrimary ? (
              <span className="text-text-theme-secondary ml-1 text-xs uppercase">
                primary
              </span>
            ) : (
              <span className="ml-1 text-xs text-amber-300 uppercase">
                secondary
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-1 flex items-center gap-2">
        <button
          type="button"
          disabled={!fireEnabled}
          onClick={() => {
            if (fireEnabled) onFire();
          }}
          data-testid="volley-fire-button"
          aria-disabled={!fireEnabled}
          aria-describedby={!fireEnabled ? 'volley-fire-hint' : undefined}
          className={`focus:ring-border-theme min-h-[40px] rounded px-4 py-2 text-sm font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
            fireEnabled
              ? 'cursor-pointer border border-red-500 bg-red-950/80 text-red-50 hover:bg-red-900'
              : 'bg-surface-base text-text-theme-secondary cursor-not-allowed opacity-50'
          }`}
        >
          Fire
        </button>
        <button
          type="button"
          onClick={onHoldFire}
          data-testid="volley-hold-fire-button"
          className="bg-surface-raised hover:bg-surface-deep text-text-theme-primary focus:ring-border-theme min-h-[40px] cursor-pointer rounded px-3 py-2 text-sm font-medium transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
        >
          Hold Fire
        </button>
        {!fireEnabled && fireHint && (
          <span
            id="volley-fire-hint"
            className="text-text-theme-secondary text-xs"
            data-testid="volley-fire-hint"
          >
            {fireHint}
          </span>
        )}
      </div>
    </div>
  );
}

export default VolleyResolver;
