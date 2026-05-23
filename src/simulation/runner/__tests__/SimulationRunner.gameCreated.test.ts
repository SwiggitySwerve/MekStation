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

import type { IHydratedUnitData } from '../UnitHydration';

import { ISimulationConfig } from '../../core/types';
import { SimulationRunner } from '../SimulationRunner';
import {
  createInitialState,
  synthesizeGameUnits,
} from '../SimulationRunnerState';

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

    it('synthesizes hydrated heat sink count and type into GameCreated units', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'double-sink-test',
          chassis: 'Nightstar',
          variant: 'NSR-9J',
          model: 'NSR-9J',
          tonnage: 95,
          techBase: 'Inner Sphere',
          era: '3050',
          unitType: 'BattleMech',
          unitRef: 'nightstar-nsr-9j',
          heatSinks: { type: 'DOUBLE', count: 14 },
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };

      const units = synthesizeGameUnits(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        new Map([['player-1', hydrated]]),
      );

      expect(units[0]).toMatchObject({
        id: 'player-1',
        name: 'Nightstar NSR-9J',
        heatSinks: 14,
        heatSinkType: 'double',
      });
    });

    it('seeds runner electronic-warfare state from hydrated ECM equipment', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'guardian-ecm-test',
          chassis: 'Raven',
          variant: 'RVN-4L',
          model: 'RVN-4L',
          tonnage: 35,
          techBase: 'Inner Sphere',
          era: '3050',
          unitType: 'BattleMech',
          equipment: [{ id: '1-isguardianecm', location: 'RIGHT_TORSO' }],
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };

      const state = createInitialState(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        new Map([['player-1', hydrated]]),
      );

      expect(state.electronicWarfare?.ecmSuites).toEqual([
        {
          type: 'guardian',
          mode: 'ecm',
          operational: true,
          entityId: 'player-1:1-isguardianecm:0',
          teamId: GameSide.Player,
          position: { q: -1, r: -8 },
        },
      ]);
      expect(state.electronicWarfare?.activeProbes).toEqual([]);
    });

    it('seeds active probes and combined CEWS into runner electronic-warfare state', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'cews-probe-test',
          chassis: 'Raven',
          variant: 'EW',
          model: 'EW',
          tonnage: 35,
          techBase: 'Mixed',
          era: '3050',
          unitType: 'BattleMech',
          equipment: [
            { id: '1-isbeagleactiveprobe', location: 'HEAD' },
            { id: '1-clwatchdogcews', location: 'RIGHT_TORSO' },
          ],
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };

      const state = createInitialState(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        new Map([['player-1', hydrated]]),
      );

      expect(state.electronicWarfare?.ecmSuites).toEqual([
        {
          type: 'clan',
          mode: 'ecm',
          operational: true,
          entityId: 'player-1:1-clwatchdogcews:0',
          teamId: GameSide.Player,
          position: { q: -1, r: -8 },
        },
      ]);
      expect(state.electronicWarfare?.activeProbes).toEqual([
        {
          type: 'beagle',
          operational: true,
          entityId: 'player-1',
          teamId: GameSide.Player,
          position: { q: -1, r: -8 },
        },
        {
          type: 'watchdog-cews',
          operational: true,
          entityId: 'player-1',
          teamId: GameSide.Player,
          position: { q: -1, r: -8 },
        },
      ]);
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
