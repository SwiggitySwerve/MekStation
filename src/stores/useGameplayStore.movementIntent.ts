/**
 * Movement Intent slice (change `tactical-movement-intent-composer`, design D5).
 *
 * Pure reducers over the stored `IMovementIntentState` (`items` + `lockedMode`)
 * plus derived selectors that total the composed ledger and project the
 * still-affordable Movement Budgets. Every MP / heat / to-hit value is sourced
 * from existing `movement-system` code paths (`getMaxMP`,
 * `getHeatMovementPenalty`, `calculateMovementHeat`,
 * `calculateAttackerMovementModifier`) — there is NO UI-local movement math in
 * this module.
 *
 * The reducers are shaped to fold into the Zustand store body via `set`/`get`
 * (see `useGameplayStore.ts`), but are exported as standalone pure functions so
 * they are unit-testable without instantiating the store.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import { getHeatMovementPenalty } from '@/constants/heat';
import {
  MovementType,
  type Facing,
  type IBudgetOption,
  type IHexCoordinate,
  type IIntentItem,
  type IMovementCapability,
  type IMovementIntentState,
  type MovementHeatProfile,
  type PostureActionType,
} from '@/types/gameplay';
import {
  calculateAttackerMovementModifier,
  calculateMovementHeat,
} from '@/utils/gameplay/movement/modifiers';
import { getMaxMP } from '@/utils/gameplay/movement/movementCapability';

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

/** Empty composition: no intent items, no locked mode. */
export const INITIAL_MOVEMENT_INTENT_STATE: IMovementIntentState = {
  items: [],
  lockedMode: null,
};

// ---------------------------------------------------------------------------
// Reducers (pure)
// ---------------------------------------------------------------------------

/**
 * Append a Posture Action Intent Item with its rules-derived MP cost. The cost
 * MUST come from the caller (a `movement-system` posture-cost helper); this
 * reducer never derives cost itself.
 */
export function addPostureActionReducer(
  state: IMovementIntentState,
  action: PostureActionType,
  mpCost: number,
): IMovementIntentState {
  const item: IIntentItem = { kind: 'posture', action, mpCost };
  return { ...state, items: [...state.items, item] };
}

/**
 * Remove the Intent Item at `index`. Out-of-range indices are a no-op so the
 * caller never has to guard. Removing an item clears any locked mode because
 * the composition changed under it.
 */
export function removeIntentItemReducer(
  state: IMovementIntentState,
  index: number,
): IMovementIntentState {
  if (index < 0 || index >= state.items.length) return state;
  const items = state.items.filter((_, i) => i !== index);
  return { ...state, items, lockedMode: null };
}

/**
 * Append a Waypoint to the (single) Locomotion Path Intent Item. When no
 * locomotion item exists yet, one is created with the leg's routed path;
 * otherwise the leg is appended to the existing item's legs. The leg carries
 * its rules-derived `mpCost` from the caller (waypoint routing engine, phase 2).
 * `finalFacing` tracks the facing picked at the newest waypoint.
 */
export function appendWaypointReducer(
  state: IMovementIntentState,
  leg: Extract<IIntentItem, { kind: 'locomotion' }>['legs'][number],
  finalFacing: Extract<IIntentItem, { kind: 'locomotion' }>['finalFacing'],
): IMovementIntentState {
  const locomotionIndex = state.items.findIndex(
    (item) => item.kind === 'locomotion',
  );

  if (locomotionIndex === -1) {
    const item: IIntentItem = {
      kind: 'locomotion',
      legs: [leg],
      finalFacing,
    };
    return { ...state, items: [...state.items, item], lockedMode: null };
  }

  const existing = state.items[locomotionIndex] as Extract<
    IIntentItem,
    { kind: 'locomotion' }
  >;
  const updated: IIntentItem = {
    kind: 'locomotion',
    legs: [...existing.legs, leg],
    finalFacing,
  };
  const items = state.items.map((item, i) =>
    i === locomotionIndex ? updated : item,
  );
  return { ...state, items, lockedMode: null };
}

/**
 * Pop the most recent Waypoint (last leg) from the Locomotion Path. Popping the
 * only leg removes the whole locomotion Intent Item, restoring the prior
 * composition state exactly. `finalFacing` reverts to the leg now at the end of
 * the path (its `to` waypoint has no facing on its own, so callers pass the
 * facing to restore; when the item is emptied the facing is moot). No-op when
 * there is no locomotion item.
 */
export function popWaypointReducer(
  state: IMovementIntentState,
  restoredFinalFacing: Extract<
    IIntentItem,
    { kind: 'locomotion' }
  >['finalFacing'],
): IMovementIntentState {
  const locomotionIndex = state.items.findIndex(
    (item) => item.kind === 'locomotion',
  );
  if (locomotionIndex === -1) return state;

  const existing = state.items[locomotionIndex] as Extract<
    IIntentItem,
    { kind: 'locomotion' }
  >;
  if (existing.legs.length <= 1) {
    const items = state.items.filter((_, i) => i !== locomotionIndex);
    return { ...state, items, lockedMode: null };
  }

  const updated: IIntentItem = {
    kind: 'locomotion',
    legs: existing.legs.slice(0, -1),
    finalFacing: restoredFinalFacing,
  };
  const items = state.items.map((item, i) =>
    i === locomotionIndex ? updated : item,
  );
  return { ...state, items, lockedMode: null };
}

/**
 * Set the final facing on the (single) Locomotion Path Intent Item. No-op when
 * no locomotion item exists.
 */
export function setFinalFacingReducer(
  state: IMovementIntentState,
  finalFacing: Extract<IIntentItem, { kind: 'locomotion' }>['finalFacing'],
): IMovementIntentState {
  const locomotionIndex = state.items.findIndex(
    (item) => item.kind === 'locomotion',
  );
  if (locomotionIndex === -1) return state;

  const existing = state.items[locomotionIndex] as Extract<
    IIntentItem,
    { kind: 'locomotion' }
  >;
  const updated: IIntentItem = { ...existing, finalFacing };
  const items = state.items.map((item, i) =>
    i === locomotionIndex ? updated : item,
  );
  return { ...state, items, lockedMode: null };
}

/** Reset the composition to the empty state (used on activation change / commit). */
export function resetCompositionReducer(): IMovementIntentState {
  return INITIAL_MOVEMENT_INTENT_STATE;
}

/**
 * Set the locked-in mode. Lock-In is an explicit player choice among the
 * still-affordable budgets — the resolver never auto-picks — so this reducer
 * simply records the chosen mode. Commit-of-sequence is a separate action.
 */
export function lockInReducer(
  state: IMovementIntentState,
  mode: MovementType,
): IMovementIntentState {
  return { ...state, lockedMode: mode };
}

// ---------------------------------------------------------------------------
// Derived selectors (pure)
// ---------------------------------------------------------------------------

/**
 * Sum the MP cost of every composed Intent Item. Posture items contribute
 * their `mpCost`; a locomotion item contributes the sum of its legs' `mpCost`.
 * All leg / posture costs originate from `movement-system`.
 */
export function selectLedgerTotalMp(state: IMovementIntentState): number {
  return state.items.reduce((total, item) => {
    if (item.kind === 'posture') return total + item.mpCost;
    return total + item.legs.reduce((legs, leg) => legs + leg.mpCost, 0);
  }, 0);
}

/**
 * The candidate movement modes projected as Movement Budgets. Walk/Run/Jump
 * are the intent-first budgets; Jump is only offered when the unit has jump MP.
 */
const CANDIDATE_MODES: readonly MovementType[] = [
  MovementType.Walk,
  MovementType.Run,
  MovementType.Jump,
];

/**
 * Context needed to project the Movement Budgets from `movement-system`. The
 * `capability` is the runtime (damage-adjusted) `IMovementCapability` from
 * `interactiveSession.getMovementCapability(unitId)`; heat + TSM feed the
 * heat-penalty / TSM-bonus rules already encoded in `getMaxMP`.
 */
export interface IBudgetProjectionContext {
  readonly capability: IMovementCapability;
  readonly currentHeat: number;
  readonly movementHeatProfile?: MovementHeatProfile;
}

/**
 * Project the full Movement Budget set for the composed intent. Each budget's
 * `budgetMp` is the damage/heat-adjusted MP via `getMaxMP` +
 * `getHeatMovementPenalty`; `affordable` is `ledgerTotal <= budgetMp`;
 * consequences (`heatGenerated`, `attackerToHitModifier`) come from
 * `calculateMovementHeat` / `calculateAttackerMovementModifier`. Jump is
 * omitted when the unit has no jump MP.
 *
 * Heat is a fixed-per-type cost for Walk/Run (1/2); for Jump it scales with
 * hexes moved, so `heatGenerated` uses the composed locomotion hex distance.
 */
export function selectBudgetOptions(
  state: IMovementIntentState,
  context: IBudgetProjectionContext,
): readonly IBudgetOption[] {
  const ledgerTotal = selectLedgerTotalMp(state);
  const heatPenalty = getHeatMovementPenalty(context.currentHeat);
  const jumpHexes = composedJumpHexes(state);

  return CANDIDATE_MODES.filter((mode) => {
    if (mode !== MovementType.Jump) return true;
    return context.capability.jumpMP > 0;
  }).map((mode) => {
    const budgetMp = getMaxMP(context.capability, mode, heatPenalty);
    return {
      mode,
      budgetMp,
      affordable: ledgerTotal <= budgetMp,
      heatGenerated: calculateMovementHeat(
        mode,
        mode === MovementType.Jump ? jumpHexes : 0,
        { movementHeatProfile: context.movementHeatProfile },
      ),
      attackerToHitModifier: calculateAttackerMovementModifier(mode),
    };
  });
}

/**
 * The subset of `selectBudgetOptions` that affords the composed intent (Live
 * Intersection's affordable set). Drives the Budget Resolver and Forced-Mode
 * detection.
 */
export function selectAffordableBudgets(
  state: IMovementIntentState,
  context: IBudgetProjectionContext,
): readonly IBudgetOption[] {
  return selectBudgetOptions(state, context).filter(
    (budget) => budget.affordable,
  );
}

/**
 * Count the hexes the composed Locomotion Path traverses (leg paths minus the
 * shared anchor hex between consecutive legs). Used to compute jump heat, which
 * scales with distance per `movement-system`.
 */
function composedJumpHexes(state: IMovementIntentState): number {
  const locomotion = state.items.find((item) => item.kind === 'locomotion');
  if (!locomotion || locomotion.kind !== 'locomotion') return 0;
  // Each leg's `path` is inclusive of its `to` anchor; the `from` anchor is the
  // previous leg's `to` (or the unit's start hex for the first leg), so the hex
  // count is the sum of leg path lengths (each path excludes its own `from`).
  return locomotion.legs.reduce((hexes, leg) => hexes + leg.path.length, 0);
}

// ---------------------------------------------------------------------------
// Commit translation (task 1.4)
// ---------------------------------------------------------------------------

/**
 * The single movement declaration the composed intent commits into the
 * existing movement path. Shaped to match the arguments the legacy
 * `commitPlannedMovement` feeds to `interactiveSession.applyMovement`, so the
 * new path produces a byte-identical declaration for an equivalent simple move.
 */
export interface IComposedMovementDeclaration {
  readonly destination: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  /** Full hex path, prefixed with the unit's start hex (matches legacy path). */
  readonly path: readonly IHexCoordinate[];
}

/**
 * Translate a composed movement intent + the player's locked-in mode into the
 * single `applyMovement`-shaped declaration. The locomotion legs' routed paths
 * (built in phase 2 by the same pathfinder the legacy hover-preview uses) are
 * concatenated, de-duplicating the shared anchor hex between consecutive legs,
 * and prefixed with the unit's start hex — exactly the `path` array the legacy
 * `IPlannedMovement` carries. Posture-only intents (no locomotion) declare a
 * zero-hex move at the start hex, mirroring `standActiveUnit`.
 *
 * Returns `null` when there is nothing to commit (empty composition with no
 * posture actions), so the caller can no-op rather than emit an empty move.
 */
export function intentToMovementDeclaration(
  state: IMovementIntentState,
  lockedMode: MovementType,
  startHex: IHexCoordinate,
  startFacing: Facing,
): IComposedMovementDeclaration | null {
  const locomotion = state.items.find(
    (item): item is Extract<IIntentItem, { kind: 'locomotion' }> =>
      item.kind === 'locomotion',
  );
  const hasPosture = state.items.some((item) => item.kind === 'posture');

  if (!locomotion || locomotion.legs.length === 0) {
    // Posture-only (or empty) composition: nothing to commit unless a posture
    // action was composed, in which case declare a zero-hex move in place.
    if (!hasPosture) return null;
    return {
      destination: startHex,
      facing: startFacing,
      movementType: lockedMode,
      path: [startHex],
    };
  }

  // Concatenate leg paths. Each leg's `path` is inclusive of its `to` anchor
  // and excludes its `from`, so prefixing the unit's start hex yields the full
  // ordered path the legacy planner produces.
  const path: IHexCoordinate[] = [startHex];
  for (const leg of locomotion.legs) {
    path.push(...leg.path);
  }
  const destination = path[path.length - 1];

  return {
    destination,
    facing: locomotion.finalFacing,
    movementType: lockedMode,
    path,
  };
}
