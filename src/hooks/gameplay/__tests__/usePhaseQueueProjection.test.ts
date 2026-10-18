/**
 * Tests for usePhaseQueueProjection
 *
 * Covers the 2 spec scenarios from
 * openspec/changes/add-tactical-turn-order-and-phase-rail/specs/
 *   game-session-management/spec.md "Tactical Phase Queue Projection":
 *   1. "Movement phase projection lists unresolved units"
 *   2. "Phase blocker names unresolved work"
 *
 * The hook is a pure projection of `useGameplayStore.session`. Tests
 * use `useGameplayStore.setState` to seed minimal session fixtures
 * and assert the returned IPhaseQueueProjection shape.
 */

import { act, renderHook } from '@testing-library/react';

import type { IGameSession } from '@/types/gameplay/GameSessionStateTypes';
import type { IGameUnit } from '@/types/gameplay/GameSessionUnitTypes';

import { createMinimalUnitState } from '@/simulation/runner/SimulationRunnerSupport';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  LockState,
} from '@/types/gameplay/GameSessionCoreTypes';
import { canActInPhysicalAttack } from '@/utils/gameplay/gameSessionCore';
import { applyUnitEjected } from '@/utils/gameplay/gameState/unitExitState';

import { usePhaseQueueProjection } from '../usePhaseQueueProjection';

// =============================================================================
// Test Helpers
// =============================================================================

function buildSession({
  phase,
  unitLockStates,
  firstMover = GameSide.Player,
  activationIndex = 0,
}: {
  phase: GamePhase;
  unitLockStates: Record<string, LockState>;
  firstMover?: GameSide;
  activationIndex?: number;
}): IGameSession {
  const playerUnit: IGameUnit = {
    id: 'p1',
    side: GameSide.Player,
    name: 'Player Mech',
    unitRef: 'P-1',
  } as IGameUnit;
  const opponentUnit: IGameUnit = {
    id: 'o1',
    side: GameSide.Opponent,
    name: 'Opponent Mech',
    unitRef: 'O-1',
  } as IGameUnit;

  const buildUnitState = (id: string, side: GameSide) => ({
    ...createMinimalUnitState(id, side, { q: 0, r: 0 }),
    lockState: unitLockStates[id] ?? LockState.Pending,
  });

  return {
    id: 'test-session',
    units: [playerUnit, opponentUnit],
    currentState: {
      phase,
      turn: 3,
      firstMover,
      activationIndex,
      units: {
        p1: buildUnitState('p1', GameSide.Player),
        o1: buildUnitState('o1', GameSide.Opponent),
      },
    },
  } as unknown as IGameSession;
}

// =============================================================================
// Tests
// =============================================================================

describe('usePhaseQueueProjection', () => {
  afterEach(() => {
    act(() => {
      useGameplayStore.setState({ session: null });
    });
  });

  it.each([
    [GameSide.Player, 0, 'p2'],
    [GameSide.Player, 1, 'o1'],
    [GameSide.Player, 2, null],
    [GameSide.Opponent, 0, 'o1'],
    [GameSide.Opponent, 1, 'p2'],
    [GameSide.Opponent, 2, null],
  ] as const)(
    'agrees with the physical engine after multi-unit ejection: first %s, cursor %s',
    (firstMover, activationIndex, expectedActor) => {
      const base = buildSession({
        phase: GamePhase.PhysicalAttack,
        firstMover,
        activationIndex,
        unitLockStates: {},
      });
      const session: IGameSession = {
        ...base,
        units: [base.units[0], { ...base.units[0], id: 'p2' }, base.units[1]],
        currentState: applyUnitEjected(
          {
            ...base.currentState,
            units: {
              ...base.currentState.units,
              p2: { ...base.currentState.units.p1, id: 'p2' },
            },
          },
          {
            unitId: 'p1',
            turn: base.currentState.turn,
            reason: 'player_declared',
          },
        ),
      };
      act(() => useGameplayStore.setState({ session }));
      const { result } = renderHook(() => usePhaseQueueProjection());

      expect(
        session.units
          .filter((unit) => canActInPhysicalAttack(session, unit.id))
          .map((unit) => unit.id),
      ).toEqual(expectedActor ? [expectedActor] : []);
      expect(result.current.activeUnitId).toBe(expectedActor);
      expect(result.current.initiativeOrder).toContain('p1');
      expect(result.current.unresolvedUnits).not.toContain('p1');
      expect(
        result.current.blockers.map((blocker) => blocker.unitId),
      ).not.toContain('p1');
    },
  );

  it('returns an empty projection when no session is loaded', () => {
    act(() => {
      useGameplayStore.setState({ session: null });
    });
    const { result } = renderHook(() => usePhaseQueueProjection());
    expect(result.current.initiativeOrder).toEqual([]);
    expect(result.current.unresolvedUnits).toEqual([]);
    expect(result.current.blockers).toEqual([]);
    expect(result.current.activeUnitId).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Spec: "Movement phase projection lists unresolved units"
  // -------------------------------------------------------------------------
  it('lists unresolved units during Movement phase', () => {
    act(() => {
      useGameplayStore.setState({
        session: buildSession({
          phase: GamePhase.Movement,
          // Both units pending (haven't moved yet).
          unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
        }),
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.phase).toBe(GamePhase.Movement);
    expect(result.current.round).toBe(3);
    expect(result.current.activeSide).toBe(GameSide.Player);
    expect(result.current.activeUnitId).toBe('p1');
    // Interleaved order: Player first (firstMover), then Opponent.
    expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
    expect(result.current.unresolvedUnits).toEqual(['p1', 'o1']);
  });

  it('drops resolved units from unresolvedUnits', () => {
    act(() => {
      useGameplayStore.setState({
        session: buildSession({
          phase: GamePhase.Movement,
          // Player has moved; opponent still pending.
          unitLockStates: { p1: LockState.Resolved, o1: LockState.Pending },
        }),
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.unresolvedUnits).toEqual(['o1']);
    // initiativeOrder is full (display surface) — only unresolved trims.
    expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
  });

  it('retains terminal units in display order but excludes them from action debt', () => {
    const session = buildSession({
      phase: GamePhase.Movement,
      unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
    });
    act(() => {
      useGameplayStore.setState({
        session: {
          ...session,
          currentState: {
            ...session.currentState,
            units: {
              p1: { ...session.currentState.units.p1, destroyed: true },
              o1: { ...session.currentState.units.o1, hasRetreated: true },
            },
          },
        },
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
    expect(result.current.unresolvedUnits).toEqual([]);
    expect(result.current.blockers).toEqual([]);
  });

  it('keeps side-less units visible but excludes them from action ownership', () => {
    const session = buildSession({
      phase: GamePhase.Movement,
      unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
    });
    Reflect.deleteProperty(session.units[1], 'side');
    Reflect.deleteProperty(session.currentState.units.o1, 'side');

    act(() => {
      useGameplayStore.setState({ session });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
    expect(result.current.activeUnitId).toBe('p1');
    expect(result.current.unresolvedUnits).toEqual(['p1']);
    expect(result.current.blockers.map((blocker) => blocker.unitId)).toEqual([
      'p1',
    ]);
  });

  it.each([
    GamePhase.Movement,
    GamePhase.WeaponAttack,
    GamePhase.PhysicalAttack,
  ])(
    'removes ejected units from turn ownership and blockers in %s',
    (phase) => {
      const session = buildSession({
        phase,
        unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
      });
      act(() => {
        useGameplayStore.setState({ session });
      });
      const { result } = renderHook(() => usePhaseQueueProjection());
      expect(result.current.activeUnitId).toBe('p1');

      const afterEjection: IGameSession = {
        ...session,
        currentState: {
          ...session.currentState,
          units: {
            ...session.currentState.units,
            p1: { ...session.currentState.units.p1, hasEjected: true },
          },
        },
      };
      act(() => {
        useGameplayStore.setState({ session: afterEjection });
      });

      expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
      expect(result.current.activeUnitId).toBe('o1');
      expect(result.current.activeSide).toBe(GameSide.Opponent);
      expect(result.current.unresolvedUnits).toEqual(['o1']);
      expect(result.current.blockers.map((blocker) => blocker.unitId)).toEqual([
        'o1',
      ]);

      act(() => {
        useGameplayStore.setState({
          session: {
            ...afterEjection,
            currentState: {
              ...afterEjection.currentState,
              units: {
                ...afterEjection.currentState.units,
                o1: {
                  ...afterEjection.currentState.units.o1,
                  hasEjected: true,
                },
              },
            },
          },
        });
      });
      expect(result.current.activeUnitId).toBeNull();
      expect(result.current.unresolvedUnits).toEqual([]);
      expect(result.current.blockers).toEqual([]);
    },
  );

  it('uses authoritative unit state when game-unit side metadata is missing', () => {
    const session = buildSession({
      phase: GamePhase.Movement,
      unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
    });
    Reflect.deleteProperty(session.units[1], 'side');

    act(() => {
      useGameplayStore.setState({ session });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.initiativeOrder).toEqual(['p1', 'o1']);
    expect(result.current.unresolvedUnits).toEqual(['p1', 'o1']);
    expect(result.current.blockers.map((blocker) => blocker.unitId)).toEqual([
      'p1',
      'o1',
    ]);
  });

  it('uses game-unit side metadata for active ownership when state side is missing', () => {
    const session = buildSession({
      phase: GamePhase.Movement,
      activationIndex: 1,
      unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
    });
    Reflect.deleteProperty(session.currentState.units.o1, 'side');

    act(() => {
      useGameplayStore.setState({ session });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.activeUnitId).toBe('o1');
    expect(result.current.activeSide).toBe(GameSide.Opponent);
    expect(result.current.blockers).toContainEqual(
      expect.objectContaining({
        unitId: 'o1',
        side: GameSide.Opponent,
      }),
    );
  });

  it('hands control to the player after the active opponent locks movement', () => {
    act(() => {
      useGameplayStore.setState({
        session: buildSession({
          phase: GamePhase.Movement,
          firstMover: GameSide.Opponent,
          activationIndex: 1,
          unitLockStates: { o1: LockState.Locked, p1: LockState.Pending },
        }),
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.initiativeOrder).toEqual(['o1', 'p1']);
    expect(result.current.activeUnitId).toBe('p1');
    expect(result.current.activeSide).toBe(GameSide.Player);
    expect(result.current.unresolvedUnits).toEqual(['p1']);
    expect(result.current.blockers.map((blocker) => blocker.unitId)).toEqual([
      'p1',
    ]);
  });

  // -------------------------------------------------------------------------
  // Spec: "Phase blocker names unresolved work"
  // -------------------------------------------------------------------------
  it('emits blocker entries naming unit id, side, phase, and missing action', () => {
    act(() => {
      useGameplayStore.setState({
        session: buildSession({
          phase: GamePhase.WeaponAttack,
          unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
        }),
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    expect(result.current.blockers).toHaveLength(2);
    const playerBlocker = result.current.blockers.find(
      (b) => b.unitId === 'p1',
    );
    expect(playerBlocker).toEqual({
      unitId: 'p1',
      side: GameSide.Player,
      phase: GamePhase.WeaponAttack,
      missingAction: 'weapon fire',
    });
    const opponentBlocker = result.current.blockers.find(
      (b) => b.unitId === 'o1',
    );
    expect(opponentBlocker).toEqual({
      unitId: 'o1',
      side: GameSide.Opponent,
      phase: GamePhase.WeaponAttack,
      missingAction: 'weapon fire',
    });
  });

  it('does not emit blockers for non-alternating phases (Heat/End/Initiative)', () => {
    act(() => {
      useGameplayStore.setState({
        session: buildSession({
          phase: GamePhase.Heat,
          unitLockStates: { p1: LockState.Pending, o1: LockState.Pending },
        }),
      });
    });

    const { result } = renderHook(() => usePhaseQueueProjection());

    // Initiative order still computed for display, but no blockers
    // because Heat is automatic.
    expect(result.current.initiativeOrder.length).toBeGreaterThan(0);
    expect(result.current.blockers).toEqual([]);
    expect(result.current.unresolvedUnits).toEqual([]);
  });
});
