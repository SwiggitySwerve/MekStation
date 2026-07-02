/**
 * Unit tests for the movement-intent slice reducers + derived selectors
 * (change `tactical-movement-intent-composer`, tasks 1.2–1.4).
 *
 * Reducers are tested as pure functions; the derived budget selectors are
 * tested against the engine-crit scenario (Walk 2 / Run 3) the spec calls out;
 * the intent→declaration translation is tested to prove it produces the same
 * `applyMovement` arguments the legacy planner does for an equivalent simple
 * move.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import {
  addPostureActionReducer,
  appendWaypointReducer,
  INITIAL_MOVEMENT_INTENT_STATE,
  intentToMovementDeclaration,
  lockInReducer,
  popWaypointReducer,
  removeIntentItemReducer,
  resetCompositionReducer,
  selectAffordableBudgets,
  selectBudgetOptions,
  selectLedgerTotalMp,
  setFinalFacingReducer,
} from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  MovementType,
  type IIntentItem,
  type ILocomotionLeg,
  type IMovementCapability,
  type IMovementIntentState,
} from '@/types/gameplay';

function leg(
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number },
  path: readonly { q: number; r: number }[],
  mpCost: number,
  facingChange = 0,
): ILocomotionLeg {
  return {
    from: { hex: fromHex, facingChange: 0 },
    to: { hex: toHex, facingChange },
    path,
    mpCost,
  };
}

describe('movementIntent reducers', () => {
  it('starts empty with no locked mode', () => {
    expect(INITIAL_MOVEMENT_INTENT_STATE).toEqual({
      items: [],
      lockedMode: null,
    });
  });

  it('addPostureActionReducer appends a posture item with its supplied cost', () => {
    const next = addPostureActionReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      'CAREFUL_STAND',
      2,
    );
    expect(next.items).toEqual([
      { kind: 'posture', action: 'CAREFUL_STAND', mpCost: 2 },
    ]);
  });

  it('removeIntentItemReducer drops the item at the index and clears lockedMode', () => {
    const composed: IMovementIntentState = {
      items: [
        { kind: 'posture', action: 'STAND_UP', mpCost: 2 },
        { kind: 'posture', action: 'HULL_DOWN', mpCost: 1 },
      ],
      lockedMode: MovementType.Run,
    };
    const next = removeIntentItemReducer(composed, 0);
    expect(next.items).toEqual([
      { kind: 'posture', action: 'HULL_DOWN', mpCost: 1 },
    ]);
    expect(next.lockedMode).toBeNull();
  });

  it('removeIntentItemReducer is a no-op for out-of-range indices', () => {
    const composed: IMovementIntentState = {
      items: [{ kind: 'posture', action: 'STAND_UP', mpCost: 2 }],
      lockedMode: null,
    };
    expect(removeIntentItemReducer(composed, 5)).toBe(composed);
    expect(removeIntentItemReducer(composed, -1)).toBe(composed);
  });

  it('appendWaypointReducer creates then extends a single locomotion item', () => {
    const first = appendWaypointReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
      Facing.North,
    );
    expect(first.items).toHaveLength(1);
    expect(first.items[0].kind).toBe('locomotion');

    const second = appendWaypointReducer(
      first,
      leg({ q: 1, r: 0 }, { q: 2, r: 0 }, [{ q: 2, r: 0 }], 1),
      Facing.Southeast,
    );
    const locomotion = second.items[0] as Extract<
      IIntentItem,
      { kind: 'locomotion' }
    >;
    expect(second.items).toHaveLength(1);
    expect(locomotion.legs).toHaveLength(2);
    expect(locomotion.finalFacing).toBe(Facing.Southeast);
  });

  it('popWaypointReducer removes the last leg exactly, restoring prior state', () => {
    const composed = appendWaypointReducer(
      appendWaypointReducer(
        INITIAL_MOVEMENT_INTENT_STATE,
        leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
        Facing.North,
      ),
      leg({ q: 1, r: 0 }, { q: 2, r: 0 }, [{ q: 2, r: 0 }], 1),
      Facing.Southeast,
    );

    const popped = popWaypointReducer(composed, Facing.North);
    const locomotion = popped.items[0] as Extract<
      IIntentItem,
      { kind: 'locomotion' }
    >;
    expect(locomotion.legs).toHaveLength(1);
    expect(locomotion.finalFacing).toBe(Facing.North);
    expect(selectLedgerTotalMp(popped)).toBe(1);
  });

  it('popWaypointReducer removes the whole locomotion item on the last leg', () => {
    const composed = appendWaypointReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
      Facing.North,
    );
    const popped = popWaypointReducer(composed, Facing.North);
    expect(popped.items).toHaveLength(0);
  });

  it('setFinalFacingReducer updates the locomotion final facing only', () => {
    const composed = appendWaypointReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
      Facing.North,
    );
    const next = setFinalFacingReducer(composed, Facing.South);
    const locomotion = next.items[0] as Extract<
      IIntentItem,
      { kind: 'locomotion' }
    >;
    expect(locomotion.finalFacing).toBe(Facing.South);
  });

  it('lockInReducer records the explicit mode; resetCompositionReducer clears', () => {
    const locked = lockInReducer(
      addPostureActionReducer(INITIAL_MOVEMENT_INTENT_STATE, 'STAND_UP', 2),
      MovementType.Run,
    );
    expect(locked.lockedMode).toBe(MovementType.Run);
    expect(resetCompositionReducer()).toEqual(INITIAL_MOVEMENT_INTENT_STATE);
  });
});

describe('movementIntent derived selectors', () => {
  it('selectLedgerTotalMp sums posture + all leg costs', () => {
    const composed: IMovementIntentState = {
      items: [
        { kind: 'posture', action: 'CAREFUL_STAND', mpCost: 2 },
        {
          kind: 'locomotion',
          finalFacing: Facing.North,
          legs: [
            leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
            leg(
              { q: 1, r: 0 },
              { q: 3, r: 0 },
              [
                { q: 2, r: 0 },
                { q: 3, r: 0 },
              ],
              4,
            ),
          ],
        },
      ],
      lockedMode: null,
    };
    expect(selectLedgerTotalMp(composed)).toBe(7);
  });

  it('projects Walk 2 / Run 3 for a 2-engine-crit unit (spec ledger scenario)', () => {
    // Engine-crit-reduced runtime capability: Walk 2, Run 3, no jump.
    const capability: IMovementCapability = {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
    };
    // Compose Careful Stand for 2 MP (ledger total 2).
    const composed = addPostureActionReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      'CAREFUL_STAND',
      2,
    );

    const budgets = selectBudgetOptions(composed, {
      capability,
      currentHeat: 0,
    });

    const walk = budgets.find((b) => b.mode === MovementType.Walk);
    const run = budgets.find((b) => b.mode === MovementType.Run);
    const jump = budgets.find((b) => b.mode === MovementType.Jump);

    // Walk budget is exactly exhausted (2 <= 2), Run has 1 MP to spare (2 <= 3).
    expect(walk).toMatchObject({ budgetMp: 2, affordable: true });
    expect(run).toMatchObject({ budgetMp: 3, affordable: true });
    // No jump MP → jump budget omitted entirely.
    expect(jump).toBeUndefined();

    // Consequence lines come from movement-system: walk heat 1 / +1 to-hit,
    // run heat 2 / +2 to-hit.
    expect(walk?.heatGenerated).toBe(1);
    expect(walk?.attackerToHitModifier).toBe(1);
    expect(run?.heatGenerated).toBe(2);
    expect(run?.attackerToHitModifier).toBe(2);

    expect(
      selectAffordableBudgets(composed, { capability, currentHeat: 0 }),
    ).toHaveLength(2);
  });

  it('marks budgets unaffordable once the ledger exceeds them', () => {
    const capability: IMovementCapability = { walkMP: 2, runMP: 3, jumpMP: 0 };
    // Ledger total 3: a 3 MP move. Walk (2) can no longer afford; Run (3) can.
    const composed: IMovementIntentState = {
      items: [
        {
          kind: 'locomotion',
          finalFacing: Facing.North,
          legs: [
            leg(
              { q: 0, r: 0 },
              { q: 3, r: 0 },
              [
                { q: 1, r: 0 },
                { q: 2, r: 0 },
                { q: 3, r: 0 },
              ],
              3,
            ),
          ],
        },
      ],
      lockedMode: null,
    };
    const affordable = selectAffordableBudgets(composed, {
      capability,
      currentHeat: 0,
    });
    expect(affordable.map((b) => b.mode)).toEqual([MovementType.Run]);
  });
});

describe('intentToMovementDeclaration (task 1.4)', () => {
  it('produces the same applyMovement args a legacy simple move would', () => {
    // Legacy simple move: unit at {0,0} facing North runs to {3,-1} along a
    // two-hex path. The legacy IPlannedMovement.path is [start, ...legPath].
    const composed = appendWaypointReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      leg({ q: 0, r: 0 }, { q: 3, r: -1 }, [{ q: 3, r: -1 }], 3),
      Facing.Southeast,
    );

    const declaration = intentToMovementDeclaration(
      composed,
      MovementType.Run,
      { q: 0, r: 0 },
      Facing.North,
    );

    expect(declaration).toEqual({
      destination: { q: 3, r: -1 },
      facing: Facing.Southeast,
      movementType: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 3, r: -1 },
      ],
    });
  });

  it('concatenates multi-leg paths under the start anchor', () => {
    const composed = appendWaypointReducer(
      appendWaypointReducer(
        INITIAL_MOVEMENT_INTENT_STATE,
        leg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
        Facing.North,
      ),
      leg({ q: 1, r: 0 }, { q: 2, r: 0 }, [{ q: 2, r: 0 }], 1),
      Facing.North,
    );
    const declaration = intentToMovementDeclaration(
      composed,
      MovementType.Walk,
      { q: 0, r: 0 },
      Facing.North,
    );
    expect(declaration?.path).toEqual([
      { q: 0, r: 0 },
      { q: 1, r: 0 },
      { q: 2, r: 0 },
    ]);
    expect(declaration?.destination).toEqual({ q: 2, r: 0 });
  });

  it('declares a zero-hex move for a posture-only composition', () => {
    const composed = addPostureActionReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      'STAND_UP',
      2,
    );
    const declaration = intentToMovementDeclaration(
      composed,
      MovementType.Walk,
      { q: 4, r: 4 },
      Facing.South,
    );
    expect(declaration).toEqual({
      destination: { q: 4, r: 4 },
      facing: Facing.South,
      movementType: MovementType.Walk,
      path: [{ q: 4, r: 4 }],
    });
  });

  it('returns null for a fully empty composition', () => {
    expect(
      intentToMovementDeclaration(
        INITIAL_MOVEMENT_INTENT_STATE,
        MovementType.Walk,
        { q: 0, r: 0 },
        Facing.North,
      ),
    ).toBeNull();
  });
});
