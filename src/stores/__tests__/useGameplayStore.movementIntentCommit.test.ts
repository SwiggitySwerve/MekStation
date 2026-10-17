/**
 * Store-level test for `commitComposedMovement` (task 1.4): proves the
 * intent-first commit dispatches the SAME `applyMovement` declaration the
 * legacy `commitPlannedMovement` produces for an equivalent simple move, and
 * resets the composition afterwards.
 *
 * @spec openspec/changes/tactical-movement-intent-composer/specs/tactical-movement-intent/spec.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { applyInteractiveSessionMovement } from '@/engine/InteractiveSession.actions';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  appendWaypointReducer,
  intentToMovementDeclaration,
} from '@/stores/useGameplayStore.movementIntent';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type ILocomotionLeg,
  type IMovementIntentState,
} from '@/types/gameplay';
import {
  advancePhase,
  createGameSession,
  startGame,
} from '@/utils/gameplay/gameSession';
import { createHexGrid } from '@/utils/gameplay/hexGrid';

interface RecordedMovement {
  unitId: string;
  to: { q: number; r: number };
  facing: Facing;
  type: MovementType;
  path?: readonly { q: number; r: number }[];
}

/**
 * Fake interactive session with a single unit at {0,0} facing North that
 * records `applyMovement` calls and emits a MovementDeclared event so the
 * store's commit path runs to completion.
 */
function buildFakeSessionWithUnit(): {
  session: InteractiveSession;
  movements: RecordedMovement[];
} {
  const movements: RecordedMovement[] = [];
  let snapshot: IGameSession = {
    id: 'commit-session',
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
      gameId: 'commit-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          position: { q: 0, r: 0 },
          facing: Facing.North,
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

function singleLeg(
  toHex: { q: number; r: number },
  path: readonly { q: number; r: number }[],
  mpCost: number,
): ILocomotionLeg {
  return {
    from: { hex: { q: 0, r: 0 }, facingChange: 0 },
    to: { hex: toHex, facingChange: 0 },
    path,
    mpCost,
  };
}

describe('commitComposedMovement (task 1.4)', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  it('dispatches the same applyMovement declaration as an equivalent legacy simple move', () => {
    const composed: IMovementIntentState = appendWaypointReducer(
      { items: [], lockedMode: null },
      singleLeg({ q: 3, r: -1 }, [{ q: 3, r: -1 }], 3),
      Facing.Southeast,
    );

    // Reference: what the legacy commitPlannedMovement would send for this move.
    const legacy = buildFakeSessionWithUnit();
    useGameplayStore.setState({
      interactiveSession: legacy.session,
      plannedMovement: {
        unitId: 'unit-a',
        destination: { q: 3, r: -1 },
        facing: Facing.Southeast,
        movementType: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      },
      ui: { ...useGameplayStore.getState().ui, selectedUnitId: 'unit-a' },
    });
    useGameplayStore.getState().commitPlannedMovement();

    // Intent-first: compose the equivalent move and commit via the new path.
    useGameplayStore.getState().reset();
    const composedRun = buildFakeSessionWithUnit();
    useGameplayStore.setState({
      interactiveSession: composedRun.session,
      movementIntent: composed,
      ui: { ...useGameplayStore.getState().ui, selectedUnitId: 'unit-a' },
    });
    useGameplayStore
      .getState()
      .commitComposedMovement(composed, MovementType.Run);

    expect(composedRun.movements).toHaveLength(1);
    expect(composedRun.movements[0]).toEqual(legacy.movements[0]);
    // Composition resets after commit.
    expect(useGameplayStore.getState().movementIntent).toEqual({
      items: [],
      lockedMode: null,
    });
  });

  it('the engine accepts the empty-composition Stationary declaration for a heat-20, 0 MP mech (L0-04)', () => {
    // Walk 4 at heat 20 leaves 0 MP; standing still must still declare + lock
    // so End Phase unblocks (movement-system: Heat Reduces Effective Movement).
    const mech = (id: string, side: GameSide) => ({
      ...{ id, name: id, side, unitRef: id, pilotRef: id },
      ...{ gunnery: 4, piloting: 5 },
    });
    const config = { mapRadius: 4, turnLimit: 0, optionalRules: [] };
    const session = advancePhase(
      startGame(
        createGameSession({ ...config, victoryConditions: ['elimination'] }, [
          mech('hbk', GameSide.Player),
          mech('shd', GameSide.Opponent),
        ]),
        GameSide.Player,
      ),
    );
    const units = session.currentState.units;
    units.hbk = { ...units.hbk, position: { q: 0, r: 0 }, heat: 20 };
    units.shd = { ...units.shd, position: { q: 3, r: 0 } };
    const declaration = intentToMovementDeclaration(
      { items: [], lockedMode: null },
      MovementType.Walk,
      { q: 0, r: 0 },
      units.hbk.facing,
    );
    if (!declaration) throw new Error('expected a Stationary declaration');

    const result = applyInteractiveSessionMovement({
      session,
      grid: createHexGrid({ radius: 4 }),
      movementByUnit: new Map([['hbk', { walkMP: 4, runMP: 6, jumpMP: 0 }]]),
      unitId: 'hbk',
      to: declaration.destination,
      facing: declaration.facing,
      movementType: declaration.movementType,
      path: declaration.path,
    });

    const declared = result.events
      .slice(session.events.length)
      .find((event) => event.type === GameEventType.MovementDeclared);
    expect(declared?.payload).toMatchObject({
      movementType: MovementType.Stationary,
      heatGenerated: 0,
    });
    expect(result.currentState.units.hbk.lockState).toBe(LockState.Locked);
  });

  it('is a no-op (no applyMovement) with no session or selected unit', () => {
    const { movements } = buildFakeSessionWithUnit();
    useGameplayStore
      .getState()
      .commitComposedMovement(
        { items: [], lockedMode: null },
        MovementType.Walk,
      );
    expect(movements).toHaveLength(0);
  });
});
