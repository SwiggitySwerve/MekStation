/**
 * CostLedger (change `tactical-movement-intent-composer`, phase 4,
 * tactical-movement-intent capability, task 4.3).
 *
 * Lists every composed Intent Item with its MP cost and a running total,
 * evaluated against each candidate Movement Budget (Walk / Run / Jump MP as
 * modified by damage + heat, supplied by the phase-1 `selectBudgetOptions`
 * selector). Per-budget affordability columns show affordable / affordable-
 * exhausted (0 MP remaining) / over-budget. A world change that makes the
 * running total exceed a previously-affordable budget flags the ledger and, via
 * `overBudgetUnderEveryBudget`, blocks Lock-In (the resolver reads the same
 * signal). All MP values originate from `movement-system` — the ledger performs
 * no cost math beyond summing the rules-derived per-item costs into a total.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import React from 'react';

import type { IBudgetOption, IMovementIntentState } from '@/types/gameplay';

import { MovementType } from '@/types/gameplay';

export interface ICostLedgerRow {
  /** Stable key + composition index (for removal). */
  readonly index: number;
  readonly label: string;
  readonly mpCost: number;
  /** `true` when this row can be individually removed (posture rows). */
  readonly removable: boolean;
}

export interface CostLedgerProps {
  readonly rows: readonly ICostLedgerRow[];
  readonly ledgerTotalMp: number;
  readonly budgetOptions: readonly IBudgetOption[];
  /**
   * `true` when the running total exceeds every budget — a world-change
   * recompose state. Flags the ledger and blocks Lock-In.
   */
  readonly overEveryBudget: boolean;
  readonly onRemoveRow: (index: number) => void;
}

const MODE_LABEL: Readonly<Record<MovementType, string>> = {
  [MovementType.Stationary]: 'Stationary',
  [MovementType.Walk]: 'Walk',
  [MovementType.Run]: 'Run',
  [MovementType.Sprint]: 'Sprint',
  [MovementType.Evade]: 'Evade',
  [MovementType.Jump]: 'Jump',
};

/** The per-budget affordability state for the total against one budget. */
function affordabilityFor(
  ledgerTotalMp: number,
  budget: IBudgetOption,
): { readonly state: string; readonly label: string } {
  const remaining = budget.budgetMp - ledgerTotalMp;
  if (remaining < 0) return { state: 'over', label: `over by ${-remaining}` };
  if (remaining === 0) return { state: 'exhausted', label: '0 left' };
  return { state: 'affordable', label: `${remaining} left` };
}

/**
 * Derive the ledger rows from the composed intent items. Posture rows are
 * individually removable; the single locomotion item renders one summary row
 * (the map's Waypoint Layer + pop affordance owns per-leg editing).
 */
export function buildCostLedgerRows(
  intent: IMovementIntentState,
): readonly ICostLedgerRow[] {
  const rows: ICostLedgerRow[] = [];
  intent.items.forEach((item, index) => {
    if (item.kind === 'posture') {
      rows.push({
        index,
        label: postureLabel(item.action),
        mpCost: item.mpCost,
        removable: true,
      });
      return;
    }
    const legMp = item.legs.reduce((total, leg) => total + leg.mpCost, 0);
    rows.push({
      index,
      label: `Move (${item.legs.length} leg${item.legs.length === 1 ? '' : 's'})`,
      mpCost: legMp,
      removable: false,
    });
  });
  return rows;
}

function postureLabel(action: string): string {
  switch (action) {
    case 'STAND_UP':
      return 'Stand Up';
    case 'CAREFUL_STAND':
      return 'Careful Stand';
    case 'GO_PRONE':
      return 'Go Prone';
    case 'HULL_DOWN':
      return 'Hull Down';
    case 'EVADE':
      return 'Evade';
    default:
      return action;
  }
}

export function CostLedger({
  rows,
  ledgerTotalMp,
  budgetOptions,
  overEveryBudget,
  onRemoveRow,
}: CostLedgerProps): React.ReactElement {
  return (
    <div
      className="flex flex-col gap-1"
      data-testid="movement-cost-ledger"
      data-ledger-total={ledgerTotalMp}
      data-ledger-over-budget={overEveryBudget ? 'true' : undefined}
      role="table"
      aria-label="Movement cost ledger"
    >
      <div className="flex items-center justify-between">
        <span className="text-text-theme-secondary text-xs font-semibold uppercase">
          Ledger
        </span>
        {overEveryBudget && (
          <span
            className="rounded bg-red-950/70 px-1.5 py-0.5 text-xs font-semibold text-red-100"
            data-testid="movement-cost-ledger-recompute-flag"
          >
            {'⚠ Over budget — remove items to fit'}
          </span>
        )}
      </div>

      <div role="rowgroup" className="flex flex-col gap-0.5">
        {rows.length === 0 && (
          <span
            className="text-text-theme-secondary text-xs"
            data-testid="movement-cost-ledger-empty"
          >
            Compose posture actions and a path to build a turn.
          </span>
        )}
        {rows.map((row) => (
          <div
            key={`ledger-row-${row.index}`}
            role="row"
            data-testid={`ledger-row-${row.index}`}
            data-ledger-row-mp={row.mpCost}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span className="text-text-theme-primary">{row.label}</span>
            <span className="flex items-center gap-2">
              <span className="text-text-theme-secondary text-xs">
                {row.mpCost} MP
              </span>
              {row.removable && (
                <button
                  type="button"
                  onClick={() => onRemoveRow(row.index)}
                  data-testid={`ledger-row-remove-${row.index}`}
                  aria-label={`Remove ${row.label}`}
                  className="text-text-theme-secondary hover:text-text-theme-primary rounded px-1 text-xs focus:ring-1 focus:outline-none"
                >
                  {'×'}
                </button>
              )}
            </span>
          </div>
        ))}
      </div>

      <div
        role="row"
        data-testid="movement-cost-ledger-total"
        className="border-border-theme mt-1 flex items-center justify-between border-t pt-1 text-sm font-semibold"
      >
        <span className="text-text-theme-primary">Total</span>
        <span className="text-text-theme-primary">{ledgerTotalMp} MP</span>
      </div>

      <div
        className="mt-1 flex flex-wrap gap-2"
        data-testid="movement-cost-ledger-budgets"
      >
        {budgetOptions.map((budget) => {
          const affordability = affordabilityFor(ledgerTotalMp, budget);
          return (
            <span
              key={`ledger-budget-${budget.mode}`}
              data-testid={`ledger-budget-${budget.mode}`}
              data-budget-mp={budget.budgetMp}
              data-budget-affordability={affordability.state}
              className={`rounded px-1.5 py-0.5 text-xs ${
                affordability.state === 'over'
                  ? 'bg-red-950/50 text-red-100'
                  : affordability.state === 'exhausted'
                    ? 'bg-amber-950/50 text-amber-100'
                    : 'bg-surface-raised text-text-theme-secondary'
              }`}
            >
              {`${MODE_LABEL[budget.mode]} ${budget.budgetMp} (${affordability.label})`}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default CostLedger;
