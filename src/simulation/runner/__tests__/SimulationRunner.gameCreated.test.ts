/**
 * SimulationRunner — GameCreated seed-event tests
 *
 * Per `emit-game-created-from-runner` (`simulation-system` delta — "Runner
 * Emits GameCreated as Seed Event"). Covers all 3 spec scenarios plus
 * the runner-vs-hydration path distinctions surfaced during the OMO
 * Council audit on PR A1's replay viewer.
 */

import type { IGameCreatedPayload } from '@/types/gameplay';

import { GameEventType, GameSide } from '@/types/gameplay';

import { ISimulationConfig } from '../../core/types';
import { SimulationRunner } from '../SimulationRunner';

function makeConfig(
  overrides: Partial<ISimulationConfig> = {},
): ISimulationConfig {
  return {
    seed: 42,
    turnLimit: 5,
    unitCount: { player: 2, opponent: 2 },
    mapRadius: 9,
    ...overrides,
  };
}

describe('SimulationRunner GameCreated seed event', () => {
  describe('spec scenario: First event in a swarm run is GameCreated', () => {
    it('emits GameCreated as events[0] with sequence 0', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 2, opponent: 2 } }),
      );

      expect(result.events.length).toBeGreaterThan(0);
      expect(result.events[0].type).toBe(GameEventType.GameCreated);
      expect(result.events[0].sequence).toBe(0);
    });

    it('subsequent events have sequence > 0', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(makeConfig());

      for (let i = 1; i < result.events.length; i += 1) {
        expect(result.events[i].sequence).toBeGreaterThan(0);
      }
    });

    it('payload.units contains one entry per slot', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 2, opponent: 2 } }),
      );

      const seedEvent = result.events[0];
      const payload = seedEvent.payload as IGameCreatedPayload;
      expect(payload.units).toHaveLength(4);
    });
  });

  describe('spec scenario: GameCreated payload reflects roster from initial state', () => {
    it('contains entries with correct side-keyed ids', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 1, opponent: 3 } }),
      );

      const payload = result.events[0].payload as IGameCreatedPayload;
      const ids = payload.units.map((u) => u.id).sort();
      expect(ids).toEqual(
        ['opponent-1', 'opponent-2', 'opponent-3', 'player-1'].sort(),
      );
    });

    it('player-N entries have side === GameSide.Player', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 2, opponent: 1 } }),
      );

      const payload = result.events[0].payload as IGameCreatedPayload;
      const playerUnits = payload.units.filter((u) =>
        u.id.startsWith('player-'),
      );
      expect(playerUnits).toHaveLength(2);
      for (const unit of playerUnits) {
        expect(unit.side).toBe(GameSide.Player);
      }
    });

    it('opponent-N entries have side === GameSide.Opponent', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 1, opponent: 2 } }),
      );

      const payload = result.events[0].payload as IGameCreatedPayload;
      const opponentUnits = payload.units.filter((u) =>
        u.id.startsWith('opponent-'),
      );
      expect(opponentUnits).toHaveLength(2);
      for (const unit of opponentUnits) {
        expect(unit.side).toBe(GameSide.Opponent);
      }
    });

    it('payload.config reflects input config map / turn settings', () => {
      const runner = new SimulationRunner(42);
      const config = makeConfig({ mapRadius: 11, turnLimit: 7 });
      const result = runner.run(config);

      const payload = result.events[0].payload as IGameCreatedPayload;
      expect(payload.config.mapRadius).toBe(11);
      expect(payload.config.turnLimit).toBe(7);
    });
  });

  describe('synthetic-fallback path (no hydration map)', () => {
    it('uses slot id as the unit name when no hydration is provided', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 1, opponent: 1 } }),
      );

      const payload = result.events[0].payload as IGameCreatedPayload;
      const playerUnit = payload.units.find((u) => u.id === 'player-1');
      expect(playerUnit?.name).toBe('player-1');
    });

    it('falls back to default skills when no hydration is provided', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(
        makeConfig({ unitCount: { player: 1, opponent: 1 } }),
      );

      const payload = result.events[0].payload as IGameCreatedPayload;
      // DEFAULT_GUNNERY === 4, DEFAULT_PILOTING === 5 per
      // SimulationRunnerConstants.ts
      expect(payload.units[0].gunnery).toBe(4);
      expect(payload.units[0].piloting).toBe(5);
    });
  });

  describe('idempotence + monotonicity invariants', () => {
    it('emits GameCreated exactly once per run', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(makeConfig());

      const seedEvents = result.events.filter(
        (e) => e.type === GameEventType.GameCreated,
      );
      expect(seedEvents).toHaveLength(1);
    });

    it('event sequences are monotonically increasing', () => {
      const runner = new SimulationRunner(42);
      const result = runner.run(makeConfig());

      for (let i = 1; i < result.events.length; i += 1) {
        expect(result.events[i].sequence).toBe(
          result.events[i - 1].sequence + 1,
        );
      }
    });
  });
});
