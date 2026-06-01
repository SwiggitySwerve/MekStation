/**
 * Tests for the `add-combat-phase-ui-flows` additions to
 * `useGameplayStore`: `plannedMovement` and `attackPlan` state plus the
 * setter / commit actions.
 *
 * Covers:
 *  - setPlannedMovement / clearPlannedMovement update state
 *  - commitPlannedMovement calls applyMovement on the interactive
 *    session and clears the plan
 *  - togglePlannedWeapon adds + removes ids from selectedWeapons
 *  - setAttackTarget syncs attackPlan + ui.targetUnitId
 *  - clearAttackPlan resets both fields
 *  - commitAttack calls applyAttack on the session and clears the plan
 *
 * @spec openspec/changes/add-combat-phase-ui-flows/tasks.md
 */

import type { InteractiveSession } from '@/engine/GameEngine';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { useAnimationQueue } from '@/stores/useAnimationQueue';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { usePhysicalAttackPlanStore } from '@/stores/useGameplayStore.combatFlows';
import { InteractivePhase } from '@/stores/useGameplayStore.helpers';
import {
  Facing,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  LockState,
  MovementType,
  type IGameSession,
  type IGameEvent,
  type IHexCoordinate,
  type IPhysicalAttackDeclaredPayload,
  type IPhysicalAttackResolvedPayload,
  type IWeaponStatus,
} from '@/types/gameplay';

interface FakeSessionCalls {
  movement: Array<{
    unitId: string;
    to: { q: number; r: number };
    facing: Facing;
    type: MovementType;
    path?: readonly { q: number; r: number }[];
    options?: {
      readonly hullDownEntryAttempt?: boolean;
      readonly goProneAttempt?: boolean;
    };
  }>;
  attacks: Array<{
    attackerId: string;
    targetId: string;
    weaponIds: readonly string[];
    weaponModesByWeaponId?: Readonly<Record<string, 'Direct' | 'Indirect'>>;
  }>;
}

/**
 * Build a minimal fake `InteractiveSession` that records the calls
 * made to `applyMovement` / `applyAttack` and returns a stable
 * snapshot from `getSession()` so the store's `set({ session: ... })`
 * has something to land on.
 */
function buildFakeSession(): {
  session: InteractiveSession;
  calls: FakeSessionCalls;
} {
  const calls: FakeSessionCalls = { movement: [], attacks: [] };

  const sessionSnapshot = {
    id: 'fake-session',
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
      gameId: 'fake-session',
      status: 'active',
      turn: 1,
      phase: 'movement',
      activationIndex: 0,
      units: {},
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
      calls.movement.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
      });
      (sessionSnapshot.events as IGameEvent[]).push({
        id: `movement-${sessionSnapshot.events.length}`,
        gameId: sessionSnapshot.id,
        sequence: sessionSnapshot.events.length,
        turn: 1,
        phase: GamePhase.Movement,
        type: GameEventType.MovementDeclared,
        actorId: unitId,
        timestamp: '',
        payload: {
          unitId,
          from: { q: 0, r: 0 },
          to,
          facing,
          movementType: type,
          mpUsed: path?.length ?? 0,
          heatGenerated: type === MovementType.Run ? 2 : 1,
          path,
        },
      } as IGameEvent);
    },
    applyAttack: (
      attackerId: string,
      targetId: string,
      weaponIds: readonly string[],
      weaponModesByWeaponId?: Readonly<Record<string, 'Direct' | 'Indirect'>>,
    ) => {
      calls.attacks.push({
        attackerId,
        targetId,
        weaponIds,
        ...(weaponModesByWeaponId ? { weaponModesByWeaponId } : {}),
      });
    },
    getSession: () => sessionSnapshot,
    getState: () => sessionSnapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
  };
}

function buildRejectedMovementSession(): {
  session: InteractiveSession;
  calls: FakeSessionCalls;
  snapshot: IGameSession;
} {
  const calls: FakeSessionCalls = { movement: [], attacks: [] };
  const snapshot: IGameSession = {
    id: 'rejected-movement-session',
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
      gameId: 'rejected-movement-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
      },
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
      calls.movement.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
      });
      (snapshot.events as IGameEvent[]).push({
        id: 'movement-invalid',
        gameId: snapshot.id,
        sequence: 0,
        turn: 1,
        phase: GamePhase.Movement,
        type: GameEventType.MovementInvalid,
        actorId: unitId,
        timestamp: '',
        payload: {
          unitId,
          from: { q: 0, r: 0 },
          to,
          facing,
          movementType: type,
          reason: 'DestinationOccupied',
          details: 'Destination hex is occupied',
          mpCost: 3,
          heatGenerated: 2,
        },
      } as IGameEvent);
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

  return {
    session: fake as unknown as InteractiveSession,
    calls,
    snapshot,
  };
}

function buildStandFakeSession(
  prone = true,
  hullDown = false,
): {
  session: InteractiveSession;
  calls: FakeSessionCalls;
  snapshot: IGameSession;
} {
  const calls: FakeSessionCalls = { movement: [], attacks: [] };
  const snapshot: IGameSession = {
    id: 'stand-session',
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
      gameId: 'stand-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
          prone,
          hullDown,
        },
      },
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
      _standUpMode?: 'normal' | 'careful',
      options?: {
        readonly hullDownEntryAttempt?: boolean;
        readonly goProneAttempt?: boolean;
      },
    ) => {
      calls.movement.push({
        unitId,
        to,
        facing,
        type,
        ...(path !== undefined ? { path } : {}),
        ...(options !== undefined ? { options } : {}),
      });
      (snapshot.events as IGameEvent[]).push({
        id: 'stand-move',
        gameId: snapshot.id,
        sequence: 0,
        turn: 1,
        phase: GamePhase.Movement,
        type: GameEventType.MovementDeclared,
        actorId: unitId,
        timestamp: '',
        payload: {
          unitId,
          from: { q: 0, r: 0 },
          to,
          facing,
          movementType: type,
          mpUsed: 2,
          heatGenerated: 1,
          path,
          ...(options?.hullDownEntryAttempt
            ? { hullDownEntryAttempt: true }
            : {}),
          ...(options?.goProneAttempt ? { goProneAttempt: true } : {}),
        },
      } as IGameEvent);
      const hullDownEntryAttempt = options?.hullDownEntryAttempt === true;
      const goProneAttempt = options?.goProneAttempt === true;
      snapshot.currentState.units['unit-a'] = {
        ...snapshot.currentState.units['unit-a'],
        prone: goProneAttempt ? true : false,
        hullDown: hullDownEntryAttempt
          ? true
          : goProneAttempt
            ? false
            : hullDown,
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

  return {
    session: fake as unknown as InteractiveSession,
    calls,
    snapshot,
  };
}

function buildRuntimeMovementStateSession(): {
  session: InteractiveSession;
  calls: Array<{
    readonly unitId: string;
    readonly patch: Readonly<Record<string, unknown>>;
  }>;
  snapshot: IGameSession;
} {
  const calls: Array<{
    readonly unitId: string;
    readonly patch: Readonly<Record<string, unknown>>;
  }> = [];
  const snapshot: IGameSession = {
    id: 'runtime-movement-state-session',
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
      gameId: 'runtime-movement-state-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
          conversionMode: 'mek',
          unitHeight: 1,
        },
      },
      turnEvents: [],
    },
  };

  const fake = {
    applyRuntimeMovementState: (
      unitId: string,
      patch: Readonly<Record<string, unknown>>,
    ) => {
      calls.push({ unitId, patch });
      snapshot.currentState.units[unitId] = {
        ...snapshot.currentState.units[unitId],
        conversionMode: patch.conversionMode as 'fighter',
      };
      delete (snapshot.currentState.units[unitId] as { unitHeight?: number })
        .unitHeight;
      (snapshot.events as IGameEvent[]).push({
        id: 'runtime-state-0',
        gameId: snapshot.id,
        sequence: 0,
        turn: 1,
        phase: GamePhase.Movement,
        type: GameEventType.RuntimeMovementStateChanged,
        actorId: unitId,
        timestamp: '',
        payload: { unitId, ...patch },
      } as IGameEvent);
    },
    getAvailableActions: () => ({
      validMoves: [{ q: 2, r: 0 }],
      validTargets: [],
    }),
    getSession: () => snapshot,
    getState: () => snapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
    snapshot,
  };
}

function buildWeaponTargetSelectionSession(targetQ: number): {
  session: IGameSession;
  interactiveSession: InteractiveSession;
} {
  const session: IGameSession = {
    id: 'weapon-target-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'attacker',
        name: 'Attacker',
        side: GameSide.Player,
        unitRef: 'attacker-ref',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'target',
        name: 'Target',
        side: GameSide.Opponent,
        unitRef: 'target-ref',
        pilotRef: 'pilot-t',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'weapon-target-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.WeaponAttack,
      activationIndex: 0,
      units: {
        attacker: {
          id: 'attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.Southeast,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
        target: {
          id: 'target',
          side: GameSide.Opponent,
          position: { q: targetQ, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
      },
      turnEvents: [],
    },
  };
  const grid = createMinimalGrid(session.config.mapRadius);

  const interactiveSession = {
    getSession: () => session,
    getState: () => session.currentState,
    getGrid: () => grid,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    isGameOver: () => false,
  } as unknown as InteractiveSession;

  return { session, interactiveSession };
}

function buildSmallLaser(): IWeaponStatus {
  return {
    id: 'small-laser',
    name: 'Small Laser',
    location: 'right_arm',
    destroyed: false,
    firedThisTurn: false,
    heat: 1,
    damage: 3,
    ranges: { short: 1, medium: 2, long: 3 },
  };
}

describe('useGameplayStore — combat-phase planning actions', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
    useAnimationQueue.getState().reset();
  });

  afterEach(() => {
    useAnimationQueue.getState().reset();
  });

  describe('plannedMovement', () => {
    it('starts as null', () => {
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('setPlannedMovement stores the plan verbatim', () => {
      const plan = {
        destination: { q: 1, r: 2 },
        facing: Facing.Northeast,
        movementType: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 1 },
          { q: 1, r: 2 },
        ],
      };
      useGameplayStore.getState().setPlannedMovement(plan);
      expect(useGameplayStore.getState().plannedMovement).toEqual(plan);
    });

    it('clearPlannedMovement resets to null', () => {
      useGameplayStore.getState().setPlannedMovement({
        destination: { q: 1, r: 1 },
        facing: Facing.North,
        movementType: MovementType.Run,
        path: [],
      });
      useGameplayStore.getState().clearPlannedMovement();
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
    });

    it('commitPlannedMovement is a no-op without session/plan/selectedUnit', () => {
      const fake = buildFakeSession();
      // No session set — should not throw, no calls made.
      useGameplayStore.getState().commitPlannedMovement();
      expect(fake.calls.movement).toHaveLength(0);
    });

    it('commitPlannedMovement clears stale plans owned by another unit', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        plannedMovement: {
          unitId: 'unit-b',
          destination: { q: 3, r: -1 },
          facing: Facing.Southeast,
          movementType: MovementType.Run,
          path: [
            { q: 0, r: 0 },
            { q: 3, r: -1 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().commitPlannedMovement();

      expect(fake.calls.movement).toHaveLength(0);
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
    });

    it('commitPlannedMovement calls applyMovement and clears the plan', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
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
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });
      useGameplayStore.getState().commitPlannedMovement();

      expect(fake.calls.movement).toHaveLength(1);
      expect(fake.calls.movement[0]).toEqual({
        unitId: 'unit-a',
        to: { q: 3, r: -1 },
        facing: Facing.Southeast,
        type: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      });
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
    });

    it('commitPlannedMovement preserves plan and selection when the engine rejects the move', () => {
      const { session, calls, snapshot } = buildRejectedMovementSession();
      const plan = {
        unitId: 'unit-a',
        destination: { q: 3, r: -1 },
        facing: Facing.Southeast,
        movementType: MovementType.Run,
        path: [
          { q: 0, r: 0 },
          { q: 3, r: -1 },
        ],
      };
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        plannedMovement: plan,
        interactivePhase: InteractivePhase.SelectMovement,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().commitPlannedMovement();

      expect(calls.movement).toHaveLength(1);
      expect(snapshot.events.at(-1)?.type).toBe(GameEventType.MovementInvalid);
      expect(useGameplayStore.getState().session).toBe(snapshot);
      expect(useGameplayStore.getState().plannedMovement).toBe(plan);
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
      expect(useGameplayStore.getState().interactivePhase).toBe(
        InteractivePhase.SelectMovement,
      );
      expect(useAnimationQueue.getState().active).toHaveLength(0);
    });

    it('commitPlannedMovement enqueues a 4-hex walk animation that holds phase advancement', () => {
      const { session, calls } = buildMovementAnimationSession();
      useGameplayStore.setState({
        interactiveSession: session,
        plannedMovement: {
          destination: { q: 4, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          path: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
            { q: 3, r: 0 },
            { q: 4, r: 0 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().commitPlannedMovement();

      expect(useAnimationQueue.getState().active).toHaveLength(1);
      expect(useAnimationQueue.getState().active[0]).toMatchObject({
        mapId: 'movement-session',
        unitId: 'unit-a',
        kind: 'movement',
        mode: MovementType.Walk,
        eventSequence: 0,
        initialFacing: Facing.North,
        finalFacing: Facing.South,
      });
      expect(useAnimationQueue.getState().active[0].path).toHaveLength(5);

      useGameplayStore.getState().advanceInteractivePhase();

      expect(calls.advancePhase).toBe(0);

      useAnimationQueue
        .getState()
        .complete(useAnimationQueue.getState().active[0].id);

      expect(calls.advancePhase).toBe(1);
    });

    it('standActiveUnit commits a zero-hex walk for a selected prone unit', () => {
      const { session, calls, snapshot } = buildStandFakeSession(true);
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        plannedMovement: {
          destination: { q: 2, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          path: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().standActiveUnit();

      expect(calls.movement).toEqual([
        {
          unitId: 'unit-a',
          to: { q: 0, r: 0 },
          facing: Facing.North,
          type: MovementType.Walk,
          path: [{ q: 0, r: 0 }],
        },
      ]);
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
      expect(useGameplayStore.getState().session).toBe(snapshot);
      expect(snapshot.currentState.units['unit-a'].prone).toBe(false);
    });

    it('standActiveUnit is a no-op when the selected unit is already standing', () => {
      const { session, calls, snapshot } = buildStandFakeSession(false);
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().standActiveUnit();

      expect(calls.movement).toHaveLength(0);
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
    });

    it('enterHullDownActiveUnit commits a same-hex walk hull-down action', () => {
      const { session, calls, snapshot } = buildStandFakeSession(false);
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        plannedMovement: {
          destination: { q: 2, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          path: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().enterHullDownActiveUnit();

      expect(calls.movement).toEqual([
        {
          unitId: 'unit-a',
          to: { q: 0, r: 0 },
          facing: Facing.North,
          type: MovementType.Walk,
          path: [{ q: 0, r: 0 }],
          options: { hullDownEntryAttempt: true },
        },
      ]);
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
      expect(snapshot.currentState.units['unit-a']).toMatchObject({
        prone: false,
        hullDown: true,
      });
    });

    it('enterHullDownActiveUnit is a no-op when the selected unit is prone', () => {
      const { session, calls } = buildStandFakeSession(true);
      useGameplayStore.setState({
        interactiveSession: session,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().enterHullDownActiveUnit();

      expect(calls.movement).toHaveLength(0);
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
    });

    it('goProneActiveUnit commits a zero-hex stationary go-prone action', () => {
      const { session, calls, snapshot } = buildStandFakeSession(false, true);
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        plannedMovement: {
          destination: { q: 2, r: 0 },
          facing: Facing.South,
          movementType: MovementType.Walk,
          path: [
            { q: 0, r: 0 },
            { q: 1, r: 0 },
            { q: 2, r: 0 },
          ],
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().goProneActiveUnit();

      expect(calls.movement).toEqual([
        {
          unitId: 'unit-a',
          to: { q: 0, r: 0 },
          facing: Facing.North,
          type: MovementType.Stationary,
          path: [{ q: 0, r: 0 }],
          options: { goProneAttempt: true },
        },
      ]);
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBeNull();
      expect(snapshot.currentState.units['unit-a']).toMatchObject({
        prone: true,
        hullDown: false,
      });
    });

    it('goProneActiveUnit is a no-op when the selected unit is not hull-down', () => {
      const { session, calls } = buildStandFakeSession(false, false);
      useGameplayStore.setState({
        interactiveSession: session,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().goProneActiveUnit();

      expect(calls.movement).toHaveLength(0);
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
    });

    it('applyRuntimeMovementState emits a replayable state event and keeps map planning active', () => {
      const { session, calls, snapshot } = buildRuntimeMovementStateSession();
      const plan = {
        unitId: 'unit-a',
        destination: { q: 1, r: 0 },
        facing: Facing.North,
        movementType: MovementType.Walk,
        path: [
          { q: 0, r: 0 },
          { q: 1, r: 0 },
        ],
      };
      useGameplayStore.setState({
        interactiveSession: session,
        session: snapshot,
        plannedMovement: plan,
        interactivePhase: InteractivePhase.SelectMovement,
        validMovementHexes: [],
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'unit-a',
        },
      });

      useGameplayStore.getState().applyRuntimeMovementState({
        source: 'conversion_action',
        conversionMode: 'fighter',
        unitHeight: null,
      });

      expect(calls).toEqual([
        {
          unitId: 'unit-a',
          patch: {
            source: 'conversion_action',
            conversionMode: 'fighter',
            unitHeight: null,
          },
        },
      ]);
      expect(snapshot.events.at(-1)?.type).toBe(
        GameEventType.RuntimeMovementStateChanged,
      );
      expect(snapshot.currentState.units['unit-a']).toMatchObject({
        conversionMode: 'fighter',
      });
      expect(snapshot.currentState.units['unit-a']).not.toHaveProperty(
        'unitHeight',
      );
      expect(useGameplayStore.getState().session).toBe(snapshot);
      expect(useGameplayStore.getState().plannedMovement).toBeNull();
      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('unit-a');
      expect(useGameplayStore.getState().interactivePhase).toBe(
        InteractivePhase.SelectMovement,
      );
      expect(useGameplayStore.getState().validMovementHexes).toEqual([
        { q: 2, r: 0 },
      ]);
    });
  });

  describe('attackPlan', () => {
    it('starts with null target and empty weapons', () => {
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
    });

    it('derives selectable weapon targets from shared combat projection', () => {
      const { session, interactiveSession } =
        buildWeaponTargetSelectionSession(2);
      useGameplayStore.setState({
        session,
        interactiveSession,
        interactivePhase: InteractivePhase.SelectUnit,
        unitWeapons: { attacker: [buildSmallLaser()] },
      });

      useGameplayStore.getState().handleInteractiveTokenClick('attacker');

      expect(useGameplayStore.getState().ui.selectedUnitId).toBe('attacker');
      expect(useGameplayStore.getState().interactivePhase).toBe(
        InteractivePhase.SelectTarget,
      );
      expect(useGameplayStore.getState().validTargetIds).toEqual(['target']);
    });

    it('ignores weapon target clicks rejected by shared combat projection', () => {
      const { session, interactiveSession } =
        buildWeaponTargetSelectionSession(5);
      useGameplayStore.setState({
        session,
        interactiveSession,
        interactivePhase: InteractivePhase.SelectUnit,
        unitWeapons: { attacker: [buildSmallLaser()] },
      });

      useGameplayStore.getState().handleInteractiveTokenClick('attacker');
      useGameplayStore.getState().handleInteractiveTokenClick('target');

      expect(useGameplayStore.getState().validTargetIds).toEqual([]);
      expect(useGameplayStore.getState().attackPlan.targetUnitId).toBeNull();
      expect(useGameplayStore.getState().interactivePhase).toBe(
        InteractivePhase.SelectTarget,
      );
    });

    it('accepts weapon target clicks when shared combat projection allows them', () => {
      const { session, interactiveSession } =
        buildWeaponTargetSelectionSession(2);
      useGameplayStore.setState({
        session,
        interactiveSession,
        interactivePhase: InteractivePhase.SelectUnit,
        unitWeapons: { attacker: [buildSmallLaser()] },
      });

      useGameplayStore.getState().handleInteractiveTokenClick('attacker');
      useGameplayStore.getState().handleInteractiveTokenClick('target');

      expect(useGameplayStore.getState().attackPlan.targetUnitId).toBe(
        'target',
      );
      expect(useGameplayStore.getState().interactivePhase).toBe(
        InteractivePhase.SelectWeapons,
      );
    });

    it('setAttackTarget sets both attackPlan.targetUnitId and ui.targetUnitId', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      expect(useGameplayStore.getState().attackPlan.targetUnitId).toBe(
        'enemy-1',
      );
      expect(useGameplayStore.getState().ui.targetUnitId).toBe('enemy-1');
    });

    it('togglePlannedWeapon adds an id, then removes it on second toggle', () => {
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('ac20');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'med-laser',
        'ac20',
      ]);
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      expect(useGameplayStore.getState().attackPlan.selectedWeapons).toEqual([
        'ac20',
      ]);
    });

    it('clearAttackPlan resets target and weapons', () => {
      useGameplayStore.getState().setAttackTarget('enemy-1');
      useGameplayStore.getState().togglePlannedWeapon('med-laser');
      useGameplayStore.getState().clearAttackPlan();
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
      expect(useGameplayStore.getState().ui.targetUnitId).toBeNull();
    });

    it('setPlannedWeaponMode stores eligible indirect mode by selected unit', () => {
      useGameplayStore.setState({
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
        unitWeapons: {
          attacker: [
            {
              ...buildSmallLaser(),
              id: 'lrm-15-1',
              name: 'LRM-15',
            },
          ],
        },
      });

      useGameplayStore.getState().setPlannedWeaponMode('lrm-15-1', 'Indirect');

      expect(useGameplayStore.getState().weaponModesByUnitId).toEqual({
        attacker: { 'lrm-15-1': 'Indirect' },
      });
      expect(useGameplayStore.getState().attackPlan.weaponModeError).toBeNull();
    });

    it('setPlannedWeaponMode rejects non-eligible indirect mode with a validation message', () => {
      useGameplayStore.setState({
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
        unitWeapons: {
          attacker: [
            {
              ...buildSmallLaser(),
              id: 'ac20-1',
              name: 'AC/20',
            },
          ],
        },
      });

      useGameplayStore.getState().setPlannedWeaponMode('ac20-1', 'Indirect');

      expect(useGameplayStore.getState().weaponModesByUnitId).toEqual({
        attacker: { 'ac20-1': 'Direct' },
      });
      expect(useGameplayStore.getState().attackPlan.weaponModeError).toBe(
        'AC/20 cannot fire indirectly',
      );
    });

    it('commitAttack is a no-op without session/target/weapons', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();
      expect(fake.calls.attacks).toHaveLength(0);
    });

    it('commitAttack calls applyAttack with attacker/target/weapons and clears the plan', () => {
      const fake = buildFakeSession();
      useGameplayStore.setState({
        interactiveSession: fake.session,
        attackPlan: {
          targetUnitId: 'enemy-1',
          selectedWeapons: ['med-laser', 'ac20'],
          weaponModeError: null,
        },
        weaponModesByUnitId: {
          attacker: { 'med-laser': 'Direct', ac20: 'Indirect' },
        },
        ui: {
          ...useGameplayStore.getState().ui,
          selectedUnitId: 'attacker',
        },
      });
      useGameplayStore.getState().commitAttack();

      expect(fake.calls.attacks).toHaveLength(1);
      expect(fake.calls.attacks[0]).toEqual({
        attackerId: 'attacker',
        targetId: 'enemy-1',
        weaponIds: ['med-laser', 'ac20'],
        weaponModesByWeaponId: { 'med-laser': 'Direct', ac20: 'Indirect' },
      });
      expect(useGameplayStore.getState().attackPlan).toEqual({
        targetUnitId: null,
        selectedWeapons: [],
        weaponModeError: null,
      });
    });
  });
});

function buildMovementAnimationSession(): {
  session: InteractiveSession;
  calls: { advancePhase: number };
} {
  const calls = { advancePhase: 0 };
  let sessionSnapshot: IGameSession = {
    id: 'movement-session',
    createdAt: '',
    updatedAt: '',
    config: {
      mapRadius: 5,
      turnLimit: 0,
      victoryConditions: [],
      optionalRules: [],
    },
    units: [
      {
        id: 'unit-a',
        name: 'Unit A',
        side: GameSide.Player,
        unitRef: 'unit-a',
        pilotRef: 'pilot-a',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'movement-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        'unit-a': {
          id: 'unit-a',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: Facing.North,
          heat: 0,
          movementThisTurn: MovementType.Stationary,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: LockState.Planning,
        },
      },
      turnEvents: [],
    },
  };

  const fake = {
    applyMovement: (
      unitId: string,
      to: { q: number; r: number },
      facing: Facing,
      movementType: MovementType,
      path?: readonly { q: number; r: number }[],
    ) => {
      const event = {
        id: 'movement-event-1',
        gameId: sessionSnapshot.id,
        sequence: sessionSnapshot.events.length,
        timestamp: '2026-04-29T00:00:00.000Z',
        type: GameEventType.MovementDeclared,
        turn: 1,
        phase: GamePhase.Movement,
        actorId: unitId,
        payload: {
          unitId,
          from: { q: 0, r: 0 },
          to,
          facing,
          movementType,
          ...(movementType !== MovementType.Stationary
            ? { mode: movementType }
            : {}),
          path,
          mpUsed: 4,
          heatGenerated: 0,
        },
      };
      sessionSnapshot = {
        ...sessionSnapshot,
        events: [...sessionSnapshot.events, event],
        currentState: {
          ...sessionSnapshot.currentState,
          units: {
            ...sessionSnapshot.currentState.units,
            [unitId]: {
              ...sessionSnapshot.currentState.units[unitId],
              position: to,
              facing,
              movementThisTurn: movementType,
              hexesMovedThisTurn: (path?.length ?? 1) - 1,
              lockState: LockState.Locked,
            },
          },
        },
      };
    },
    getSession: () => sessionSnapshot,
    getState: () => sessionSnapshot.currentState,
    isGameOver: () => false,
    advancePhase: () => {
      calls.advancePhase += 1;
    },
  };

  return {
    session: fake as unknown as InteractiveSession,
    calls,
  };
}

// ---------------------------------------------------------------------------
// usePhysicalAttackPlanStore — per add-physical-attack-phase-ui
// ---------------------------------------------------------------------------

/**
 * Build a minimal `IGameSession` snapshot the fake `InteractiveSession`
 * returns from `getSession()`. The standalone
 * `gameSessionPhysical.declarePhysicalAttack` only needs to read
 * `currentState.units[attackerId]` (heat / prone / componentDamage)
 * and the events list — everything else is filler typed via
 * `unknown` to avoid duplicating every field of `IUnitGameState`.
 */
function buildPhysicalSession(
  overrides: {
    readonly attackerMovementThisTurn?: MovementType;
    readonly defenderPosition?: IHexCoordinate;
  } = {},
): IGameSession {
  return {
    id: 'fake-physical-session',
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
      gameId: 'fake-physical-session',
      status: 'active',
      turn: 1,
      phase: GamePhase.PhysicalAttack,
      activationIndex: 0,
      units: {
        'phys-attacker': {
          id: 'phys-attacker',
          side: GameSide.Player,
          position: { q: 0, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn:
            overrides.attackerMovementThisTurn ?? MovementType.Walk,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
        },
        'phys-defender': {
          id: 'phys-defender',
          side: GameSide.Opponent,
          position: overrides.defenderPosition ?? { q: 1, r: 0 },
          facing: 0,
          heat: 0,
          movementThisTurn: MovementType.Walk,
          hexesMovedThisTurn: 0,
          armor: {},
          structure: {},
          destroyedLocations: [],
          destroyedEquipment: [],
          ammo: {},
          pilotWounds: 0,
          pilotConscious: true,
          destroyed: false,
          lockState: 'unlocked',
        },
      },
      turnEvents: [],
    },
  } as unknown as IGameSession;
}

function buildPhysicalFakeSession(
  snapshotOverride?: IGameSession,
): InteractiveSession {
  let snapshot = snapshotOverride ?? buildPhysicalSession();
  return {
    getSession: () => snapshot,
    getState: () => snapshot.currentState,
    isGameOver: () => false,
    getResult: () => null,
    advancePhase: () => undefined,
    runAITurn: () => undefined,
    getAvailableActions: () => ({ validMoves: [], validTargets: [] }),
    concede: () => undefined,
    applyMovement: () => undefined,
    applyAttack: () => undefined,
    __setSession: (s: IGameSession) => {
      snapshot = s;
    },
  } as unknown as InteractiveSession;
}

describe('usePhysicalAttackPlanStore', () => {
  beforeEach(() => {
    usePhysicalAttackPlanStore.getState().clearPhysicalAttackPlan();
  });

  it('starts with an empty plan', () => {
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
    });
  });

  it('setPhysicalAttackTarget sets the target id', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackTarget('phys-defender');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.targetUnitId,
    ).toBe('phys-defender');
  });

  it('setPhysicalAttackType sets the attack type', () => {
    usePhysicalAttackPlanStore.getState().setPhysicalAttackType('punch');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan.attackType,
    ).toBe('punch');
  });

  it('setPhysicalAttackType preserves the selected physical limb', () => {
    usePhysicalAttackPlanStore
      .getState()
      .setPhysicalAttackType('punch', 'rightArm');
    expect(
      usePhysicalAttackPlanStore.getState().physicalAttackPlan,
    ).toMatchObject({
      attackType: 'punch',
      limb: 'rightArm',
    });
  });

  it('clearPhysicalAttackPlan resets target + type', () => {
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('kick');
    store.clearPhysicalAttackPlan();
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
    });
  });

  it('commitPhysicalAttack returns null when target / type are missing', () => {
    const fake = buildPhysicalFakeSession();
    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
    });
    expect(next).toBeNull();
  });

  it('commitPhysicalAttack pushes a PhysicalAttackDeclared event onto the session', () => {
    const fake = buildPhysicalFakeSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('punch');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackerId).toBe('phys-attacker');
    expect(payload.targetId).toBe('phys-defender');
    expect(payload.attackType).toBe('punch');
  });

  it('commitPhysicalAttack rejects non-adjacent targets before declaration', () => {
    const fake = buildPhysicalFakeSession(
      buildPhysicalSession({ defenderPosition: { q: 2, r: 0 } }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('punch');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
    });

    expect(next).not.toBeNull();
    expect(
      next!.events.some(
        (event) => event.type === GameEventType.PhysicalAttackDeclared,
      ),
    ).toBe(false);
    const rejected = next!.events.find(
      (event) => event.type === GameEventType.PhysicalAttackResolved,
    );
    expect(rejected).toBeDefined();
    const payload = rejected!.payload as IPhysicalAttackResolvedPayload;
    expect(payload).toMatchObject({
      attackerId: 'phys-attacker',
      targetId: 'phys-defender',
      attackType: 'punch',
      roll: 0,
      toHitNumber: Infinity,
      hit: false,
      location: 'TargetNotInPhysicalRange',
    });
  });

  it('commitPhysicalAttack infers run-gated charge legality from the attacker state', () => {
    const fake = buildPhysicalFakeSession(
      buildPhysicalSession({ attackerMovementThisTurn: MovementType.Run }),
    );
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('charge');

    const next = usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
      attackerTonnage: 50,
      targetTonnage: 50,
      hexesMoved: 3,
    });

    expect(next).not.toBeNull();
    const declared = next!.events.find(
      (e) => e.type === GameEventType.PhysicalAttackDeclared,
    );
    expect(declared).toBeDefined();
    const payload = declared!.payload as IPhysicalAttackDeclaredPayload;
    expect(payload.attackType).toBe('charge');
  });

  it('commitPhysicalAttack clears the plan after a successful commit', () => {
    const fake = buildPhysicalFakeSession();
    const store = usePhysicalAttackPlanStore.getState();
    store.setPhysicalAttackTarget('phys-defender');
    store.setPhysicalAttackType('kick');
    usePhysicalAttackPlanStore.getState().commitPhysicalAttack({
      interactiveSession: fake,
      attackerId: 'phys-attacker',
      attackerPiloting: 4,
    });
    expect(usePhysicalAttackPlanStore.getState().physicalAttackPlan).toEqual({
      targetUnitId: null,
      attackType: null,
      limb: null,
    });
  });
});
