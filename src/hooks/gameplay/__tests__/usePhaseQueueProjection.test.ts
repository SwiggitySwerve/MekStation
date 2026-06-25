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

import { usePhaseQueueProjection } from '../usePhaseQueueProjection';

// =============================================================================
// Test Helpers
// =============================================================================

function buildSession({
  phase,
  unitLockStates,
}: {
  phase: GamePhase;
  unitLockStates: Record<string, LockState>;
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
      firstMover: GameSide.Player,
      activationIndex: 0,
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
