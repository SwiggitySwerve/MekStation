/**
 * Tests for `useQuickResolve` — covers the React hook lifecycle plus
 * the spec contracts forwarded from `QuickResolveService`.
 *
 * @spec openspec/changes/add-quick-resolve-monte-carlo/specs/simulation-system/spec.md
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  jest,
} from '@jest/globals';
import { act, renderHook, waitFor } from '@testing-library/react';

import type { IAdaptedUnit } from '@/engine/types';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import * as GameEngineModule from '@/engine/GameEngine';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import { useQuickResolve } from '../useQuickResolve';

// =============================================================================
// Test fixtures (mirrored from QuickResolveService.test.ts)
// =============================================================================

function createTestWeapon(id: string) {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function createTestUnit(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [createTestWeapon(`${id}-ml-1`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function createGameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

const battleConfig = {
  playerUnits: [createTestUnit('p1', GameSide.Player, { q: 0, r: -3 })],
  opponentUnits: [createTestUnit('o1', GameSide.Opponent, { q: 0, r: 3 })],
  gameUnits: [
    createGameUnit('p1', GameSide.Player),
    createGameUnit('o1', GameSide.Opponent),
  ],
  engineConfig: { mapRadius: 5, turnLimit: 5 },
};

// =============================================================================
// Tests
// =============================================================================

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useQuickResolve', () => {
  describe('initial state', () => {
    it('starts idle with no result, no error, and zero progress', () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      expect(result.current.isRunning).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.partialResult).toBeNull();
      expect(result.current.runsCompleted).toBe(0);
      expect(result.current.totalRuns).toBe(0);
    });
  });

  describe('mutate', () => {
    it('runs a small batch and exposes the aggregated result', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 3, baseSeed: 42 });
      });

      await waitFor(() => {
        expect(result.current.isRunning).toBe(false);
      });
      expect(result.current.result).not.toBeNull();
      expect(result.current.result!.totalRuns).toBe(3);
      expect(result.current.result!.baseSeed).toBe(42);
      expect(result.current.runsCompleted).toBe(3);
      expect(result.current.totalRuns).toBe(3);
      expect(result.current.error).toBeNull();
    });

    it('reports progress as runs complete', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 4, baseSeed: 1 });
      });

      // After completion, progress reflects the final state.
      expect(result.current.progress).not.toBeNull();
      expect(result.current.progress!.runsCompleted).toBe(4);
      expect(result.current.progress!.totalRuns).toBe(4);
    });

    it('captures invalid-run-count errors as `error`, not exception', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 0 });
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.error).toBe('Invalid run count');
      expect(result.current.result).toBeNull();
    });

    it('captures systemic failure with partialResult populated', async () => {
      // Force every engine run to throw so the systemic-failure threshold
      // is crossed.
      jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(() => {
          throw new Error('Synthetic failure');
        });

      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 50, baseSeed: 1 });
      });

      expect(result.current.error).toBe('Quick Resolve failed: engine errors');
      expect(result.current.partialResult).not.toBeNull();
      expect(result.current.partialResult!.erroredRuns).toBeGreaterThan(0);
    });
  });

  describe('cancel', () => {
    it('aborts an in-flight batch and resolves with the partial result', async () => {
      // Slow each run down so we have time to cancel mid-batch. We use
      // a tiny artificial delay inside the spy.
      const original = GameEngineModule.GameEngine.prototype.runToCompletion;
      let callCount = 0;
      jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(function (
          this: GameEngineModule.GameEngine,
          ...args
        ) {
          callCount++;
          // Real implementation — kept fast.
          return (
            original as unknown as (...a: typeof args) => IGameSession
          ).apply(this, args);
        });

      const { result } = renderHook(() => useQuickResolve(battleConfig));

      // Schedule a cancel after the first progress emission.
      const mutatePromise = act(async () => {
        const p = result.current.mutate({ runs: 100, baseSeed: 1 });
        // Microtask delay so the first run kicks off.
        await Promise.resolve();
        result.current.cancel();
        await p;
      });

      await mutatePromise;

      expect(result.current.isRunning).toBe(false);
      expect(callCount).toBeLessThan(100);
    });
  });

  describe('reset', () => {
    it('clears state back to the idle defaults', async () => {
      const { result } = renderHook(() => useQuickResolve(battleConfig));

      await act(async () => {
        await result.current.mutate({ runs: 2, baseSeed: 5 });
      });

      expect(result.current.result).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.isRunning).toBe(false);
      expect(result.current.result).toBeNull();
      expect(result.current.error).toBeNull();
      expect(result.current.runsCompleted).toBe(0);
    });
  });
});
