/**
 * MovementIntentComposer (change `tactical-movement-intent-composer`, phase 4,
 * tactical-movement-intent capability, tasks 4.1–4.5).
 *
 * The SOLE movement-composition surface on the tactical HUD (Single Movement
 * Authority). Hosted inside the `TacticalActionDock` (PRIMARY-ACTION zone), it
 * composes:
 *
 *  - a PosturePalette (legal posture actions with MP costs, Live-Intersection
 *    disabling with a non-color-only encoding),
 *  - a CostLedger (per-item rows + running total + per-budget affordability;
 *    world-change flags block Lock-In),
 *  - a BudgetResolver (affordable modes with heat + to-hit consequence lines,
 *    Forced Mode, explicit Lock-In that never auto-picks).
 *
 * It reads the `movementIntent` store slice + the phase-1 derived selectors
 * (`selectLedgerTotalMp`, `selectBudgetOptions`, `selectAffordableBudgets`) and
 * the phase-2 remaining-MP helper — EVERY MP / heat / to-hit value comes from
 * `movement-system` code paths. Lock-In records the explicit mode via `lockIn`
 * then commits the whole composed sequence atomically via `commitComposedMovement`
 * (which resets the composition). Posture hotkeys + Backspace pop live here
 * (task 4.5); waypoint placement + Backspace on the MAP is owned by phase 3.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import type { PostureActionType } from '@/types/gameplay';

import { useGameplaySelector } from '@/stores/useGameplayStore';
import {
  selectBudgetOptions,
  selectLedgerTotalMp,
} from '@/stores/useGameplayStore.movementIntent';
import { MovementType } from '@/types/gameplay';

import type { IMovementComposerContext } from './composer.types';

import { BudgetResolver } from './BudgetResolver';
import { buildCostLedgerRows, CostLedger } from './CostLedger';
import { PosturePalette } from './PosturePalette';
import { buildPosturePaletteEntries } from './posturePaletteSource';

export interface MovementIntentComposerProps {
  readonly context: IMovementComposerContext;
}

/** Posture hotkeys — must not collide with facing (D = Rotate Right) etc. */
const POSTURE_HOTKEYS: Readonly<Record<string, PostureActionType>> = {
  e: 'EVADE',
  s: 'STAND_UP',
  c: 'CAREFUL_STAND',
  p: 'GO_PRONE',
  h: 'HULL_DOWN',
};

export function MovementIntentComposer({
  context,
}: MovementIntentComposerProps): React.ReactElement | null {
  const movementIntent = useGameplaySelector((state) => state.movementIntent);
  const addPostureAction = useGameplaySelector(
    (state) => state.addPostureAction,
  );
  const removeIntentItem = useGameplaySelector(
    (state) => state.removeIntentItem,
  );
  const lockIn = useGameplaySelector((state) => state.lockIn);
  const commitComposedMovement = useGameplaySelector(
    (state) => state.commitComposedMovement,
  );

  const [pendingMode, setPendingMode] = useState<MovementType | null>(null);

  const { active, capability, unit, movementHeatProfile } = context;

  const budgetContext = useMemo(() => {
    if (!capability || !unit) return null;
    return {
      capability,
      currentHeat: unit.heat,
      movementHeatProfile,
    };
  }, [capability, unit, movementHeatProfile]);

  const ledgerTotalMp = selectLedgerTotalMp(movementIntent);

  const budgetOptions = useMemo(
    () =>
      budgetContext ? selectBudgetOptions(movementIntent, budgetContext) : [],
    [movementIntent, budgetContext],
  );

  const affordableBudgets = useMemo(
    () => budgetOptions.filter((budget) => budget.affordable),
    [budgetOptions],
  );

  // Live Intersection: the highest remaining MP across still-affordable budgets
  // gates the posture palette (an action costing more than this fits nowhere).
  const bestRemainingMp = useMemo(
    () =>
      affordableBudgets.reduce(
        (best, budget) => Math.max(best, budget.budgetMp - ledgerTotalMp),
        0,
      ),
    [affordableBudgets, ledgerTotalMp],
  );

  const postureEntries = useMemo(
    () =>
      buildPosturePaletteEntries({
        capability,
        commandContext: context.commandContext,
        bestRemainingMp,
      }),
    [capability, context.commandContext, bestRemainingMp],
  );

  const ledgerRows = useMemo(
    () => buildCostLedgerRows(movementIntent),
    [movementIntent],
  );

  // World-change recompose state: the composed total exceeds every budget. The
  // ledger flags it and Lock-In is blocked until the player removes items.
  const overEveryBudget =
    movementIntent.items.length > 0 && affordableBudgets.length === 0;

  // Keep the pending mode valid: if a world change makes it unaffordable, clear
  // it so Lock-In cannot fire against a stale choice (never re-pick for them).
  useEffect(() => {
    if (
      pendingMode !== null &&
      !affordableBudgets.some((budget) => budget.mode === pendingMode)
    ) {
      setPendingMode(null);
    }
  }, [pendingMode, affordableBudgets]);

  const handleAddPosture = useCallback(
    (action: PostureActionType, mpCost: number) => {
      addPostureAction(action, mpCost);
    },
    [addPostureAction],
  );

  const handleLockIn = useCallback(
    (mode: MovementType) => {
      if (overEveryBudget) return;
      lockIn(mode);
      commitComposedMovement(movementIntent, mode);
      setPendingMode(null);
    },
    [overEveryBudget, lockIn, commitComposedMovement, movementIntent],
  );

  // Posture hotkeys (task 4.5). Ignored while typing in a field; only the LEGAL,
  // ENABLED posture bound to the key fires — a disabled/absent posture is a
  // no-op so a hotkey can never smuggle in an unaffordable action.
  useEffect(() => {
    if (!active) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        target?.isContentEditable === true
      ) {
        return;
      }
      const action = POSTURE_HOTKEYS[event.key.toLowerCase()];
      if (!action) return;
      const entry = postureEntries.find(
        (candidate) => candidate.action === action,
      );
      if (!entry || entry.disabled) return;
      event.preventDefault();
      handleAddPosture(entry.action, entry.mpCost);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [active, postureEntries, handleAddPosture]);

  if (!active) return null;

  return (
    <div
      className="flex min-w-0 flex-col gap-3"
      data-testid="movement-intent-composer"
      role="group"
      aria-label="Movement intent composer"
    >
      <PosturePalette
        entries={postureEntries}
        onAddPosture={handleAddPosture}
      />
      <CostLedger
        rows={ledgerRows}
        ledgerTotalMp={ledgerTotalMp}
        budgetOptions={budgetOptions}
        overEveryBudget={overEveryBudget}
        onRemoveRow={removeIntentItem}
      />
      <BudgetResolver
        affordableBudgets={affordableBudgets}
        pendingMode={pendingMode}
        lockBlocked={overEveryBudget}
        onPickMode={setPendingMode}
        onLockIn={handleLockIn}
      />
    </div>
  );
}

export default MovementIntentComposer;
