/**
 * Full-flow integration test for the intent-first movement composer
 * (change `tactical-movement-intent-composer`, task 5.2).
 *
 * Exercises the canonical spec scenario end-to-end through the REAL store
 * reducers, the REAL `movement-system`-backed budget selectors, and the REAL
 * commit path:
 *
 *   prone, engine-crit unit (Walk 2 / Run 3)
 *     → compose Careful Stand (2 MP, from movement-system posture cost)
 *     → place a Locomotion waypoint (routed leg, terrain-adjusted MP)
 *     → Live Intersection collapses the affordable set to a single budget
 *     → Budget Resolver presents that budget as Forced Mode
 *     → explicit Lock-In commits the whole composed sequence atomically
 *     → composition resets for the next activation
 *
 * The scenario numbers follow the `tactical-movement-intent` spec's Cost Ledger
 * + Forced Mode requirements: with Walk 2 / Run 3, a composed total of 3 MP
 * leaves Walk unaffordable and Run the ONLY affordable budget (Forced Mode Run).
 * The spec's ledger scenario (Careful Stand alone = 2 MP → Walk exhausted / Run
 * 1-spare) plus a 1 MP locomotion leg reaches that exactly-3-MP Forced-Run state
 * — the intent-first flow's Forced Mode outcome, driven only by composer edits.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  addPostureActionReducer,
  appendWaypointReducer,
  INITIAL_MOVEMENT_INTENT_STATE,
  selectAffordableBudgets,
  selectBudgetOptions,
  selectLedgerTotalMp,
} from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameStatus,
  MovementType,
  type IGameSession,
  type ILocomotionLeg,
  type IMovementCapability,
} from '@/types/gameplay';

interface RecordedMovement {
  unitId: string;
  to: { q: number; r: number };
  facing: Facing;
  type: MovementType;
  path?: readonly { q: number; r: number }[];
}

/**
 * Fake interactive session with a single prone unit at {0,0} facing North that
 * records `applyMovement` calls and emits a MovementDeclared event so the
 * store's commit path runs to completion (mirrors the commit-test harness).
 */
function buildFakeSessionWithProneUnit(): {
  session: InteractiveSession;
  movements: RecordedMovement[];
} {
  const movements: RecordedMovement[] = [];
  let snapshot: IGameSession = {
    id: 'full-flow-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [],
    events: [],
    currentState: {
      gameId: 'full-flow-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          position: { q: 0, r: 0 },
          facing: Facing.North,
          isProne: true,
        },
      } as unknown as IGameSession['currentState']['units'],
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      type: MovementType,
      path?: readonly { q: number; r: number }[],
    ) => {
      movements.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
      });
      snapshot = {
        ...snapshot,
        events: [
          ...snapshot.events,
          {
            id: `movement-event-${snapshot.events.length}`,
            gameId: snapshot.id,
            sequence: snapshot.events.length,
            timestamp: '2026-07-01T00:00:00.000Z',
            type: GameEventType.MovementDeclared,
            turn: 1,
            phase: GamePhase.Movement,
            actorId: unitId,
            payload: {
              unitId,
              from: { q: 0, r: 0 },
              to,
              facing,
              movementType: type,
              path,
              mpUsed: path?.length ?? 0,
              heatGenerated: 0,
            },
          },
        ],
      };
    },
    getSession: () => snapshot,
    getState: () => snapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
  };

  return { session: fake as unknown as InteractiveSession, movements };
}

/** One routed locomotion leg (from → to) with its rules-derived MP cost. */
function routedLeg(
  fromHex: { q: number; r: number },
  toHex: { q: number; r: number },
  path: readonly { q: number; r: number }[],
  mpCost: number,
): ILocomotionLeg {
  return {
    from: { hex: fromHex, facingChange: 0 },
    to: { hex: toHex, facingChange: 0 },
    path,
    mpCost,
  };
}

describe('intent-first movement full flow (task 5.2)', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  it('composes Careful Stand + move, resolves Forced Mode Run, and Lock-In commits the sequence', () => {
    // Engine-crit-reduced runtime capability: Walk 2, Run 3, no jump — the exact
    // spec ledger scenario. currentHeat 0 so budgets read straight from the
    // capability (Walk 2 / Run 3) via movement-system getMaxMP.
    const capability: IMovementCapability = {
      walkMP: 2,
      runMP: 3,
      jumpMP: 0,
    };
    const budgetContext = { capability, currentHeat: 0 };
    const { session, movements } = buildFakeSessionWithProneUnit();

    useGameplayStore.setState({
      interactiveSession: session,
      ui: { ...useGameplayStore.getState().ui, selectedUnitId: 'unit-a' },
    });

    // --- Compose: Careful Stand (2 MP) --------------------------------------
    // Posture cost 2 MP comes from movement-system (Careful Stand entry cost).
    let composed = addPostureActionReducer(
      INITIAL_MOVEMENT_INTENT_STATE,
      'CAREFUL_STAND',
      2,
    );

    // Ledger scenario: total 2 → Walk exactly exhausted, Run 1 to spare.
    expect(selectLedgerTotalMp(composed)).toBe(2);
    let budgets = selectBudgetOptions(composed, budgetContext);
    expect(budgets.find((b) => b.mode === MovementType.Walk)).toMatchObject({
      budgetMp: 2,
      affordable: true,
    });
    expect(budgets.find((b) => b.mode === MovementType.Run)).toMatchObject({
      budgetMp: 3,
      affordable: true,
    });
    // Both Walk and Run still afford Careful Stand alone.
    expect(selectAffordableBudgets(composed, budgetContext)).toHaveLength(2);

    // --- Compose: a routed 1 MP move leg (unit → {1,0}) ---------------------
    // Placing this waypoint pushes the composed total to 3 MP. The leg cost is
    // rules-derived (phase-2 routing / movement-system terrain cost), not local.
    composed = appendWaypointReducer(
      composed,
      routedLeg({ q: 0, r: 0 }, { q: 1, r: 0 }, [{ q: 1, r: 0 }], 1),
      Facing.North,
    );

    expect(selectLedgerTotalMp(composed)).toBe(3);

    // --- Live Intersection → Forced Mode Run --------------------------------
    // Total 3: Walk (2) can no longer afford; Run (3) is the ONLY affordable
    // budget → the Budget Resolver presents Forced Mode Run (single option).
    budgets = selectBudgetOptions(composed, budgetContext);
    expect(budgets.find((b) => b.mode === MovementType.Walk)).toMatchObject({
      budgetMp: 2,
      affordable: false,
    });
    const affordable = selectAffordableBudgets(composed, budgetContext);
    expect(affordable.map((b) => b.mode)).toEqual([MovementType.Run]);
    // Forced Mode = exactly one affordable budget.
    expect(affordable).toHaveLength(1);
    // Run consequence lines come from movement-system: heat 2, +2 attacker to-hit.
    expect(affordable[0]).toMatchObject({
      heatGenerated: 2,
      attackerToHitModifier: 2,
    });

    // --- Explicit Lock-In commits the whole sequence atomically -------------
    // The resolver never auto-picks; the player explicitly locks Run, then
    // commits. commitComposedMovement stages the equivalent planned movement and
    // delegates to the legacy commit path (byte-identical animation / events).
    useGameplayStore.getState().lockIn(MovementType.Run);
    expect(useGameplayStore.getState().movementIntent.lockedMode).toBe(
      MovementType.Run,
    );

    useGameplayStore
      .getState()
      .commitComposedMovement(composed, MovementType.Run);

    // One movement declaration entered the existing declaration path: the whole
    // sequence (Careful Stand posture + the routed move) commits as a single
    // Run move from {0,0} → {1,0}, path prefixed with the start hex.
    expect(movements).toHaveLength(1);
    expect(movements[0]).toEqual({
      unitId: 'unit-a',
      to: { q: 1, r: 0 },
      facing: Facing.North,
      type: MovementType.Run,
      path: [
        { q: 0, r: 0 },
        { q: 1, r: 0 },
      ],
    });

    // A MovementDeclared event was emitted through the real commit path.
    expect(
      session
        .getSession()
        .events.filter(
          (event) => event.type === GameEventType.MovementDeclared,
        ),
    ).toHaveLength(1);

    // --- Composition resets for the next activation -------------------------
    expect(useGameplayStore.getState().movementIntent).toEqual({
      items: [],
      lockedMode: null,
    });
  });
});
