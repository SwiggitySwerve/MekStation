/**
 * Per-change smoke test for add-interactive-combat-core-ui task 2.4.
 *
 * Asserts the `useSelectedUnit` derived selector projects the full
 * unit + state record for the currently selected id and returns null
 * for the no-selection / no-session / unknown-id cases.
 *
 * @spec openspec/changes/add-interactive-combat-core-ui/tasks.md § 2.4
 */

import { renderHook, act } from '@testing-library/react';

import { useGameplayStore, useSelectedUnit } from '@/stores/useGameplayStore';
import {
  Facing,
  GamePhase,
  GameSide,
  GameStatus,
  IGameSession,
  LockState,
  MovementType,
} from '@/types/gameplay';

function buildMockSession(): IGameSession {
  return {
    id: 'test-session',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    config: {
      mapRadius: 10,
      turnLimit: 0,
      victoryConditions: ['destruction'],
      optionalRules: [],
    },
    units: [
      {
        id: 'attacker',
        name: 'Hunchback',
        side: GameSide.Player,
        unitRef: 'hbk-4g',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'target',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    events: [],
    currentState: {
      gameId: 'test-session',
      status: GameStatus.Active,
      turn: 1,
      phase: GamePhase.Movement,
      activationIndex: 0,
      units: {
        attacker: {
          id: 'attacker',
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
          lockState: LockState.Pending,
        },
        target: {
          id: 'target',
          side: GameSide.Opponent,
          position: { q: 0, r: -3 },
          facing: Facing.South,
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
          lockState: LockState.Pending,
        },
      },
      turnEvents: [],
    },
  };
}

describe('useSelectedUnit — add-interactive-combat-core-ui smoke test', () => {
  beforeEach(() => {
    useGameplayStore.getState().reset();
  });

  it('returns null when no unit is selected', () => {
    const { result } = renderHook(() => useSelectedUnit());
    expect(result.current).toBeNull();
  });

  it('returns null when a unit is selected but no session is loaded', () => {
    act(() => {
      useGameplayStore.getState().selectUnit('attacker');
    });
    const { result } = renderHook(() => useSelectedUnit());
    expect(result.current).toBeNull();
  });

  it('returns the projected unit + state when both session and selection are set', () => {
    const session = buildMockSession();
    act(() => {
      useGameplayStore.setState({ session });
      useGameplayStore.getState().selectUnit('attacker');
    });
    const { result } = renderHook(() => useSelectedUnit());
    expect(result.current).not.toBeNull();
    expect(result.current?.id).toBe('attacker');
    expect(result.current?.unit.name).toBe('Hunchback');
    expect(result.current?.state.side).toBe(GameSide.Player);
    expect(result.current?.state.position).toEqual({ q: 0, r: 0 });
  });

  it('switches projection when selectedUnitId changes', () => {
    const session = buildMockSession();
    act(() => {
      useGameplayStore.setState({ session });
      useGameplayStore.getState().selectUnit('attacker');
    });
    const { result, rerender } = renderHook(() => useSelectedUnit());
    expect(result.current?.unit.name).toBe('Hunchback');

    act(() => {
      useGameplayStore.getState().selectUnit('target');
    });
    rerender();
    expect(result.current?.unit.name).toBe('Marauder');
    expect(result.current?.state.side).toBe(GameSide.Opponent);
  });

  it('returns null when selectedUnitId points to a unit that no longer exists', () => {
    const session = buildMockSession();
    act(() => {
      useGameplayStore.setState({ session });
      useGameplayStore.getState().selectUnit('ghost-unit');
    });
    const { result } = renderHook(() => useSelectedUnit());
    expect(result.current).toBeNull();
  });
});
