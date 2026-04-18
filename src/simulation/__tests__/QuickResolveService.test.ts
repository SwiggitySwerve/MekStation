/**
 * QuickResolveService tests — covers the spec deltas in
 * `simulation-system` and `combat-resolution`.
 *
 * Critical regression: the determinism guard test runs `runBatch` twice
 * with the same seed list and asserts deep equality on `IBatchResult`.
 * This is the same trap that bit Phase 1's `selectTarget`; if a future
 * change introduces non-deterministic engine consumption, this test
 * MUST fail.
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

import type { IAdaptedUnit } from '@/engine/types';
import type {
  IGameSession,
  IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';

import * as GameEngineModule from '@/engine/GameEngine';
import { GameSide, LockState } from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import {
  DEFAULT_RUN_COUNT,
  ERR_INVALID_RUN_COUNT,
  ERR_SYSTEMIC_FAILURE,
  QuickResolveService,
  QuickResolveSystemicFailure,
  runBatch,
} from '../QuickResolveService';

// =============================================================================
// Test fixtures — the same minimal mech setup the GameEngine tests use.
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

const battleConfig = (() => {
  const player = createTestUnit('player-1', GameSide.Player, { q: 0, r: -3 });
  const opponent = createTestUnit('opponent-1', GameSide.Opponent, {
    q: 0,
    r: 3,
  });
  return {
    playerUnits: [player],
    opponentUnits: [opponent],
    gameUnits: [
      createGameUnit('player-1', GameSide.Player),
      createGameUnit('opponent-1', GameSide.Opponent),
    ],
    engineConfig: { mapRadius: 5, turnLimit: 8 },
  };
})();

// =============================================================================
// Tests
// =============================================================================

describe('QuickResolveService', () => {
  describe('input validation', () => {
    it('throws on runs = 0', async () => {
      await expect(runBatch(battleConfig, { runs: 0 })).rejects.toThrow(
        ERR_INVALID_RUN_COUNT,
      );
    });

    it('throws on runs > 5000', async () => {
      await expect(runBatch(battleConfig, { runs: 10000 })).rejects.toThrow(
        ERR_INVALID_RUN_COUNT,
      );
    });

    it('throws on non-integer runs', async () => {
      await expect(runBatch(battleConfig, { runs: 3.5 })).rejects.toThrow(
        ERR_INVALID_RUN_COUNT,
      );
    });
  });

  describe('default run count', () => {
    it('exposes DEFAULT_RUN_COUNT = 100', () => {
      expect(DEFAULT_RUN_COUNT).toBe(100);
      expect(QuickResolveService.DEFAULT_RUN_COUNT).toBe(100);
    });
  });

  describe('cancellation', () => {
    it('returns an empty IBatchResult when the signal is already aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      // We can't spyOn the named class export (jest jsdom can't redefine
      // the module binding), so verify the no-op contract by ensuring
      // `runToCompletion` was never invoked.
      const runSpy = jest.spyOn(
        GameEngineModule.GameEngine.prototype,
        'runToCompletion',
      );

      const result = await runBatch(battleConfig, {
        runs: 100,
        baseSeed: 42,
        signal: controller.signal,
      });

      expect(result.totalRuns).toBe(0);
      expect(result.erroredRuns).toBe(0);
      expect(result.baseSeed).toBe(42);
      // Spec: no engine session resolved.
      expect(runSpy).not.toHaveBeenCalled();

      runSpy.mockRestore();
    });

    it('returns the partial aggregate when signal aborts mid-batch', async () => {
      const controller = new AbortController();
      let callCount = 0;
      const result = await runBatch(battleConfig, {
        runs: 5,
        baseSeed: 7,
        signal: controller.signal,
        onProgress: ({ runsCompleted }) => {
          callCount = runsCompleted;
          // Abort after run 2 so runs 3-4 never start.
          if (runsCompleted === 2) controller.abort();
        },
      });

      expect(callCount).toBe(2);
      expect(result.totalRuns).toBe(2);
    });
  });

  describe('determinism contract — CRITICAL', () => {
    /**
     * If this test ever fails, do NOT change the test — investigate the
     * engine code. The Quick Resolve UI relies on identical seeds
     * producing identical aggregates so users can replay outcomes for
     * debugging and reporting.
     */
    it('runBatch with the same seed list produces deeply equal results across two invocations', async () => {
      const a = await runBatch(battleConfig, { runs: 5, baseSeed: 12345 });
      const b = await runBatch(battleConfig, { runs: 5, baseSeed: 12345 });
      expect(a).toEqual(b);
      expect(a.baseSeed).toBe(12345);
    });

    it('different baseSeed values produce different baseSeed on the result', async () => {
      const a = await runBatch(battleConfig, { runs: 3, baseSeed: 100 });
      const b = await runBatch(battleConfig, { runs: 3, baseSeed: 200 });
      expect(a.baseSeed).toBe(100);
      expect(b.baseSeed).toBe(200);
    });

    it('round-trips an auto-generated baseSeed deterministically', async () => {
      const first = await runBatch(battleConfig, { runs: 3 });
      // Re-run with the previously generated baseSeed.
      const second = await runBatch(battleConfig, {
        runs: 3,
        baseSeed: first.baseSeed,
      });
      expect(second).toEqual(first);
    });
  });

  describe('progress reporting', () => {
    it('invokes onProgress after each run with monotonically increasing runsCompleted', async () => {
      const events: { runsCompleted: number; totalRuns: number }[] = [];
      await runBatch(battleConfig, {
        runs: 4,
        baseSeed: 1,
        onProgress: (p) => events.push(p),
      });
      expect(events.map((e) => e.runsCompleted)).toEqual([1, 2, 3, 4]);
      expect(events.every((e) => e.totalRuns === 4)).toBe(true);
    });
  });

  describe('successful integration with the real engine', () => {
    it('runs a 10-run batch on the Phase 1 default-style encounter without throwing', async () => {
      const result = await runBatch(battleConfig, { runs: 10, baseSeed: 999 });
      expect(result.totalRuns).toBe(10);
      // Every probability should be in [0, 1].
      expect(result.winProbability.player).toBeGreaterThanOrEqual(0);
      expect(result.winProbability.player).toBeLessThanOrEqual(1);
      expect(result.winProbability.opponent).toBeGreaterThanOrEqual(0);
      expect(result.winProbability.opponent).toBeLessThanOrEqual(1);
      expect(result.winProbability.draw).toBeGreaterThanOrEqual(0);
      expect(result.winProbability.draw).toBeLessThanOrEqual(1);
      // Min/max turn count should respect the engine's bounds.
      expect(result.turnCount.min).toBeGreaterThanOrEqual(0);
      expect(result.turnCount.max).toBeLessThanOrEqual(8);
    });
  });

  describe('per-run error isolation', () => {
    /**
     * Force one specific seed to throw, then prove the batch keeps
     * running and surfaces the error in the corresponding outcome.
     */
    it('captures per-run errors without aborting the batch', async () => {
      // Patch GameEngine.runToCompletion via the prototype so the third
      // run throws but the rest succeed.
      const original = GameEngineModule.GameEngine.prototype.runToCompletion;
      let invocations = 0;
      const spy = jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(function (
          this: GameEngineModule.GameEngine,
          ...args
        ) {
          invocations++;
          if (invocations === 3) {
            throw new Error('Synthetic engine failure');
          }
          // Cast: the original is bound to `this` already.
          return (
            original as unknown as (...a: typeof args) => IGameSession
          ).apply(this, args);
        });

      try {
        // 10-run batch — 1 error well below the 20% threshold.
        const result = await runBatch(battleConfig, {
          runs: 10,
          baseSeed: 50,
        });
        expect(result.totalRuns).toBe(10);
        expect(result.erroredRuns).toBe(1);
      } finally {
        spy.mockRestore();
      }
    });

    it('throws QuickResolveSystemicFailure when >20% of runs error', async () => {
      // Force every call to throw — guarantees crossing the threshold
      // once we've collected at least 10 outcomes.
      const spy = jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(() => {
          throw new Error('Boom');
        });

      try {
        await expect(
          runBatch(battleConfig, { runs: 100, baseSeed: 1 }),
        ).rejects.toThrow(ERR_SYSTEMIC_FAILURE);
      } finally {
        spy.mockRestore();
      }
    });

    it('exposes partial outcomes on QuickResolveSystemicFailure for UI rendering', async () => {
      const spy = jest
        .spyOn(GameEngineModule.GameEngine.prototype, 'runToCompletion')
        .mockImplementation(() => {
          throw new Error('Boom');
        });

      try {
        let captured: QuickResolveSystemicFailure | undefined;
        try {
          await runBatch(battleConfig, { runs: 50, baseSeed: 1 });
        } catch (err) {
          if (err instanceof QuickResolveSystemicFailure) captured = err;
        }
        expect(captured).toBeDefined();
        expect(captured!.partialOutcomes.length).toBeGreaterThan(0);
        expect(captured!.partialResult).toBeDefined();
        expect(captured!.partialResult.erroredRuns).toBe(
          captured!.partialOutcomes.length,
        );
      } finally {
        spy.mockRestore();
      }
    });
  });
});

// =============================================================================
// Mock cleanup
// =============================================================================

beforeEach(() => {
  jest.restoreAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});
