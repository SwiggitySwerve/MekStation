/**
 * BudgetResolver (change `tactical-movement-intent-composer`, phase 4,
 * tactical-movement-intent capability, task 4.4).
 *
 * Presents every Movement Budget that affords the composed intent, each with
 * its consequence lines (heat generated per `movement-system`, attacker to-hit
 * modifier). The resolver NEVER auto-selects a mode — not even the cheapest —
 * because heat can be a strategic resource (TSM); mode choice is an explicit
 * player click that sets the pending mode, and an explicit Lock-In button
 * commits the whole composed sequence atomically. When exactly one budget
 * affords the intent it renders as Forced Mode (a single option that STILL
 * requires the explicit Lock-In). All heat / to-hit values originate from the
 * phase-1 `selectBudgetOptions` selector — no UI-local math.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import React from 'react';

import type { IBudgetOption } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

const MODE_LABEL: Readonly<Record<MovementType, string>> = {
  [MovementType.Stationary]: 'Stationary',
  [MovementType.Walk]: 'Walk',
  [MovementType.Run]: 'Run',
  [MovementType.Sprint]: 'Sprint',
  [MovementType.Evade]: 'Evade',
  [MovementType.Jump]: 'Jump',
};

export interface BudgetResolverProps {
  /** The affordable budgets (Live Intersection's affordable set). */
  readonly affordableBudgets: readonly IBudgetOption[];
  /** The player's currently-highlighted mode (null until they pick one). */
  readonly pendingMode: MovementType | null;
  /**
   * `true` when Lock-In must be blocked despite an affordable budget existing —
   * the world-change recompose state (ledger over every budget).
   */
  readonly lockBlocked: boolean;
  /** Pick (highlight) a mode — never auto-called; explicit player choice. */
  readonly onPickMode: (mode: MovementType) => void;
  /** Commit the composed sequence at `pendingMode` atomically. */
  readonly onLockIn: (mode: MovementType) => void;
}

function formatToHit(modifier: number): string {
  if (modifier === 0) return 'to-hit +0';
  return `attacker to-hit ${modifier > 0 ? '+' : ''}${modifier}`;
}

function BudgetOptionRow({
  budget,
  selected,
  forced,
  onPickMode,
}: {
  readonly budget: IBudgetOption;
  readonly selected: boolean;
  readonly forced: boolean;
  readonly onPickMode: (mode: MovementType) => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onPickMode(budget.mode)}
      data-testid={`budget-option-${budget.mode}`}
      data-budget-mode={budget.mode}
      data-budget-selected={selected ? 'true' : undefined}
      data-budget-forced={forced ? 'true' : undefined}
      data-budget-heat={budget.heatGenerated}
      data-budget-to-hit={budget.attackerToHitModifier}
      aria-pressed={selected}
      aria-label={`${MODE_LABEL[budget.mode]} budget ${budget.budgetMp} MP; heat +${budget.heatGenerated}; ${formatToHit(budget.attackerToHitModifier)}`}
      className={`flex flex-col items-start gap-0.5 rounded border px-3 py-2 text-left text-sm transition-colors focus:ring-2 focus:outline-none ${
        selected
          ? 'text-text-theme-primary border-blue-500 bg-blue-950/40'
          : 'border-border-theme bg-surface-raised hover:bg-surface-deep text-text-theme-primary'
      }`}
    >
      <span className="flex items-center gap-2 font-medium">
        {MODE_LABEL[budget.mode]}
        <span className="text-text-theme-secondary text-xs">
          {budget.budgetMp} MP
        </span>
        {forced && (
          <span
            className="rounded bg-amber-950/60 px-1 text-xs text-amber-100"
            data-testid={`budget-forced-badge-${budget.mode}`}
          >
            Forced
          </span>
        )}
      </span>
      <span
        className="text-text-theme-secondary text-xs"
        data-testid={`budget-consequences-${budget.mode}`}
      >
        {`Heat +${budget.heatGenerated} · ${formatToHit(budget.attackerToHitModifier)}`}
      </span>
    </button>
  );
}

export function BudgetResolver({
  affordableBudgets,
  pendingMode,
  lockBlocked,
  onPickMode,
  onLockIn,
}: BudgetResolverProps): React.ReactElement {
  const forced = affordableBudgets.length === 1;
  const lockInDisabled = lockBlocked || pendingMode === null;

  return (
    <div
      className="flex flex-col gap-1"
      data-testid="movement-budget-resolver"
      data-resolver-forced={forced ? 'true' : undefined}
      data-resolver-affordable-count={affordableBudgets.length}
      role="group"
      aria-label="Movement budget resolver"
    >
      <span className="text-text-theme-secondary text-xs font-semibold uppercase">
        Budget
      </span>
      <div className="flex flex-wrap items-stretch gap-2">
        {affordableBudgets.length === 0 && (
          <span
            className="text-text-theme-secondary text-xs"
            data-testid="movement-budget-resolver-none"
          >
            No budget affords this composition.
          </span>
        )}
        {affordableBudgets.map((budget) => (
          <BudgetOptionRow
            key={`budget-${budget.mode}`}
            budget={budget}
            selected={pendingMode === budget.mode}
            forced={forced}
            onPickMode={onPickMode}
          />
        ))}
      </div>
      <button
        type="button"
        disabled={lockInDisabled}
        onClick={() => {
          if (pendingMode !== null && !lockBlocked) onLockIn(pendingMode);
        }}
        data-testid="movement-lock-in-btn"
        aria-disabled={lockInDisabled}
        aria-label={
          lockBlocked
            ? 'Lock in movement (blocked: composition exceeds every budget)'
            : pendingMode === null
              ? 'Lock in movement (select a budget first)'
              : `Lock in movement at ${MODE_LABEL[pendingMode]}`
        }
        className={`mt-1 min-h-[40px] rounded px-4 py-2 text-sm font-semibold transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none ${
          lockInDisabled
            ? 'bg-surface-base text-text-theme-secondary cursor-not-allowed opacity-50'
            : 'cursor-pointer bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-400'
        }`}
      >
        Lock In
      </button>
    </div>
  );
}

export default BudgetResolver;
