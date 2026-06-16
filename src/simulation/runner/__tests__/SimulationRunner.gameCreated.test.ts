/**
 * SimulationRunner — GameCreated seed-event tests
 *
 * Per `emit-game-created-from-runner` (`simulation-system` delta — "Runner
 * Emits GameCreated as Seed Event"). Covers all 3 spec scenarios plus
 * the runner-vs-hydration path distinctions surfaced during the OMO
 * Council audit on PR A1's replay viewer.
 */

import type { IGameCreatedPayload } from '@/types/gameplay';

import { StandStillAIPlayer } from '@/simulation/ai/StandStillAIPlayer';
import { GameEventType, GamePhase, GameSide } from '@/types/gameplay';

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

function hydratedC3Unit(
  id: string,
  chassis: string,
  equipment: IHydratedUnitData['fullUnit']['equipment'],
  abilities?: readonly string[],
): IHydratedUnitData {
  return {
    runnerUnitId: id,
    side: id.startsWith('opponent') ? GameSide.Opponent : GameSide.Player,
    position: { q: 0, r: 0 },
    fullUnit: {
      id: `${id}-catalog-unit`,
      chassis,
      variant: 'C3',
      model: 'C3',
      tonnage: 50,
      techBase: 'Inner Sphere',
      era: '3050',
      unitType: 'BattleMech',
      equipment,
      ...(abilities !== undefined ? { abilities } : {}),
    },
    aiWeapons: [],
    gunnery: 3,
    piloting: 4,
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
          equipment: [
            {
              id: '1-isguardianecm',
              location: 'RIGHT_TORSO',
              currentMode: 'Off',
            },
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
          type: 'guardian',
          mode: 'off',
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

    it('seeds Eagle Eyes active-probe range bonus from hydrated pilot ability state', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'eagle-eyes-probe-test',
          chassis: 'Raven',
          variant: 'EW',
          model: 'EW',
          tonnage: 35,
          techBase: 'Inner Sphere',
          era: '3050',
          unitType: 'BattleMech',
          abilities: ['eagle_eyes'],
          equipment: [{ id: '1-isbeagleactiveprobe', location: 'HEAD' }],
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };

      const state = createInitialState(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        new Map([['player-1', hydrated]]),
      );

      expect(state.electronicWarfare?.activeProbes).toEqual([
        {
          type: 'beagle',
          operational: true,
          entityId: 'player-1',
          teamId: GameSide.Player,
          position: { q: -1, r: -8 },
          eagleEyesRangeBonus: true,
        },
      ]);
    });

    it('seeds hydrated pilot abilities and generic Edge points into state and GameCreated units', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'edge-game-created-test',
          chassis: 'Grasshopper',
          variant: 'GHR-5H',
          model: 'GHR-5H',
          tonnage: 70,
          techBase: 'Inner Sphere',
          era: '3025',
          unitType: 'BattleMech',
          unitRef: 'grasshopper-ghr-5h',
          abilities: ['edge', 'edge_when_headhit'],
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };
      const hydration = new Map([['player-1', hydrated]]);

      const state = createInitialState(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        hydration,
      );
      const units = synthesizeGameUnits(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        hydration,
      );

      expect(state.units['player-1'].abilities).toEqual([
        'edge',
        'edge_when_headhit',
      ]);
      expect(state.units['player-1'].edgePointsRemaining).toBe(1);
      expect(units[0]).toMatchObject({
        id: 'player-1',
        abilities: ['edge', 'edge_when_headhit'],
        edgePointsRemaining: 1,
      });
    });

    it('seeds hydrated Targeting Computer equipment into state and GameCreated units', () => {
      const hydrated: IHydratedUnitData = {
        runnerUnitId: 'player-1',
        side: GameSide.Player,
        position: { q: 0, r: 0 },
        fullUnit: {
          id: 'targeting-computer-game-created-test',
          chassis: 'Warhammer',
          variant: 'TC',
          model: 'TC',
          tonnage: 70,
          techBase: 'Inner Sphere',
          era: '3060',
          unitType: 'BattleMech',
          equipment: [{ id: 'targeting-computer', location: 'RIGHT_TORSO' }],
        },
        aiWeapons: [],
        gunnery: 3,
        piloting: 4,
      };
      const hydration = new Map([['player-1', hydrated]]);

      const state = createInitialState(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        hydration,
      );
      const units = synthesizeGameUnits(
        makeConfig({ unitCount: { player: 1, opponent: 0 } }),
        hydration,
      );

      expect(state.units['player-1'].targetingComputerEquipment).toBe(true);
      expect(units[0]).toMatchObject({
        id: 'player-1',
        targetingComputerEquipment: true,
      });
    });

    it('seeds unambiguous C3 and C3i networks from hydrated BattleMech equipment', () => {
      const config = makeConfig({ unitCount: { player: 2, opponent: 2 } });
      const hydration = new Map([
        [
          'player-1',
          hydratedC3Unit('player-1', 'Master', [
            { id: 'c3-master', location: 'HEAD' },
          ]),
        ],
        [
          'player-2',
          hydratedC3Unit('player-2', 'Slave', [
            { id: '1-c3-slave', location: 'RIGHT_TORSO' },
          ]),
        ],
        [
          'opponent-1',
          hydratedC3Unit('opponent-1', 'C3i A', [
            { id: 'Improved C3 Computer (C3I)', location: 'HEAD' },
          ]),
        ],
        [
          'opponent-2',
          hydratedC3Unit('opponent-2', 'C3i B', [
            { id: 'IS C3i Computer', location: 'CENTER_TORSO' },
          ]),
        ],
      ]);
      const state = createInitialState(config, hydration);
      const seedUnits = synthesizeGameUnits(config, hydration);

      expect(state.c3Network?.networks).toEqual([
        {
          networkId: 'player-c3-master-slave-1',
          type: 'master-slave',
          teamId: GameSide.Player,
          members: [
            {
              entityId: 'player-1',
              teamId: GameSide.Player,
              role: 'master',
              position: { q: -1, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
            {
              entityId: 'player-2',
              teamId: GameSide.Player,
              role: 'slave',
              position: { q: 0, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
          ],
        },
        {
          networkId: 'opponent-c3i-1',
          type: 'improved',
          teamId: GameSide.Opponent,
          members: [
            {
              entityId: 'opponent-1',
              teamId: GameSide.Opponent,
              role: 'c3i',
              position: { q: -1, r: 8 },
              operational: true,
              ecmDisrupted: false,
            },
            {
              entityId: 'opponent-2',
              teamId: GameSide.Opponent,
              role: 'c3i',
              position: { q: 0, r: 8 },
              operational: true,
              ecmDisrupted: false,
            },
          ],
        },
      ]);
      expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
        c3Equipment: [{ role: 'master' }],
      });
      expect(seedUnits.find((unit) => unit.id === 'player-2')).toMatchObject({
        c3Equipment: [{ role: 'slave' }],
      });
      expect(seedUnits.find((unit) => unit.id === 'opponent-1')).toMatchObject({
        c3Equipment: [{ role: 'c3i' }],
      });
    });

    it('seeds unambiguous C3i networks from Boosted Comm Implant pilot ability state', () => {
      const config = makeConfig({ unitCount: { player: 2, opponent: 0 } });
      const hydration = new Map([
        [
          'player-1',
          hydratedC3Unit(
            'player-1',
            'Boosted Comm A',
            [],
            ['boost_comm_implant'],
          ),
        ],
        [
          'player-2',
          hydratedC3Unit(
            'player-2',
            'Boosted Comm B',
            [],
            ['boost_comm_implant'],
          ),
        ],
      ]);
      const state = createInitialState(config, hydration);
      const seedUnits = synthesizeGameUnits(config, hydration);

      expect(state.c3Network?.networks).toEqual([
        {
          networkId: 'player-c3i-1',
          type: 'improved',
          teamId: GameSide.Player,
          members: [
            {
              entityId: 'player-1',
              teamId: GameSide.Player,
              role: 'c3i',
              position: { q: -1, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
            {
              entityId: 'player-2',
              teamId: GameSide.Player,
              role: 'c3i',
              position: { q: 0, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
          ],
        },
      ]);
      expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
        abilities: ['boost_comm_implant'],
        c3Equipment: [
          {
            role: 'c3i',
            sourceEquipmentId: 'boost_comm_implant',
          },
        ],
      });
    });

    it('seeds unambiguous Nova CEWS networks from hydrated BattleMech equipment', () => {
      const config = makeConfig({ unitCount: { player: 2, opponent: 0 } });
      const hydration = new Map([
        [
          'player-1',
          hydratedC3Unit('player-1', 'Nova A', [
            { id: 'CL Nova CEWS', location: 'RIGHT_TORSO' },
          ]),
        ],
        [
          'player-2',
          hydratedC3Unit('player-2', 'Nova B', [
            { id: 'CL Nova CEWS', location: 'LEFT_TORSO' },
          ]),
        ],
      ]);
      const state = createInitialState(config, hydration);
      const seedUnits = synthesizeGameUnits(config, hydration);

      expect(state.c3Network?.networks).toEqual([
        {
          networkId: 'player-nova-cews-1',
          type: 'nova',
          teamId: GameSide.Player,
          members: [
            {
              entityId: 'player-1',
              teamId: GameSide.Player,
              role: 'nova',
              position: { q: -1, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
            {
              entityId: 'player-2',
              teamId: GameSide.Player,
              role: 'nova',
              position: { q: 0, r: -8 },
              operational: true,
              ecmDisrupted: false,
            },
          ],
        },
      ]);
      expect(seedUnits.find((unit) => unit.id === 'player-1')).toMatchObject({
        c3Equipment: [{ role: 'nova' }],
      });
    });

    it('stamps runner C3 network state onto GameCreated payloads', () => {
      const hydration = new Map([
        [
          'player-1',
          hydratedC3Unit('player-1', 'Master', [
            { id: 'c3-master', location: 'HEAD' },
          ]),
        ],
        [
          'player-2',
          hydratedC3Unit('player-2', 'Slave', [
            { id: '1-c3-slave', location: 'RIGHT_TORSO' },
          ]),
        ],
      ]);
      const runner = new SimulationRunner(
        42,
        undefined,
        undefined,
        () => new StandStillAIPlayer(),
        undefined,
        hydration,
      );
      const result = runner.run(
        makeConfig({
          turnLimit: 1,
          unitCount: { player: 2, opponent: 0 },
        }),
      );
      const payload = result.events[0].payload as IGameCreatedPayload;

      expect(payload.c3Network?.networks).toEqual([
        expect.objectContaining({
          networkId: 'player-c3-master-slave-1',
          type: 'master-slave',
          teamId: GameSide.Player,
          members: [
            expect.objectContaining({
              entityId: 'player-1',
              role: 'master',
              position: { q: -1, r: -8 },
            }),
            expect.objectContaining({
              entityId: 'player-2',
              role: 'slave',
              position: { q: 0, r: -8 },
            }),
          ],
        }),
      ]);
      expect(
        payload.units.find((unit) => unit.id === 'player-1'),
      ).toMatchObject({
        c3Equipment: [{ role: 'master' }],
      });
    });

    it('leaves ambiguous C3 equipment unassembled instead of guessing networks', () => {
      const state = createInitialState(
        makeConfig({ unitCount: { player: 3, opponent: 0 } }),
        new Map([
          [
            'player-1',
            hydratedC3Unit('player-1', 'Master A', [
              { id: 'c3-master', location: 'HEAD' },
            ]),
          ],
          [
            'player-2',
            hydratedC3Unit('player-2', 'Master B', [
              { id: 'C3 Boosted System (Master)', location: 'CENTER_TORSO' },
            ]),
          ],
          [
            'player-3',
            hydratedC3Unit('player-3', 'Slave', [
              { id: '1-c3-slave', location: 'RIGHT_TORSO' },
            ]),
          ],
        ]),
      );

      expect(state.c3Network).toBeUndefined();
    });

    it('leaves oversized hydrated master/slave C3 equipment unassembled instead of splitting networks', () => {
      const state = createInitialState(
        makeConfig({ unitCount: { player: 5, opponent: 0 } }),
        new Map([
          [
            'player-1',
            hydratedC3Unit('player-1', 'Master', [
              { id: 'c3-master', location: 'HEAD' },
            ]),
          ],
          ...Array.from({ length: 4 }, (_, index) => {
            const unitNumber = index + 2;
            return [
              `player-${unitNumber}`,
              hydratedC3Unit(`player-${unitNumber}`, `Slave ${index + 1}`, [
                { id: '1-c3-slave', location: 'RIGHT_TORSO' },
              ]),
            ] as const;
          }),
        ]),
      );

      expect(state.c3Network).toBeUndefined();
    });

    it('leaves oversized hydrated C3i equipment unassembled instead of splitting networks', () => {
      const state = createInitialState(
        makeConfig({ unitCount: { player: 0, opponent: 7 } }),
        new Map([
          ...Array.from({ length: 7 }, (_, index) => {
            const unitNumber = index + 1;
            return [
              `opponent-${unitNumber}`,
              hydratedC3Unit(`opponent-${unitNumber}`, `C3i ${unitNumber}`, [
                { id: 'Improved C3 Computer (C3I)', location: 'HEAD' },
              ]),
            ] as const;
          }),
        ]),
      );

      expect(state.c3Network).toBeUndefined();
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

    it('emits production TurnStarted once per runner turn before phase events', () => {
      const runner = new SimulationRunner(
        42,
        undefined,
        undefined,
        () => new StandStillAIPlayer(),
      );
      const result = runner.run(
        makeConfig({
          turnLimit: 2,
          unitCount: { player: 1, opponent: 1 },
        }),
      );

      const turnStartedEvents = result.events.filter(
        (event) => event.type === GameEventType.TurnStarted,
      );
      const turnEndedEvents = result.events.filter(
        (event) => event.type === GameEventType.TurnEnded,
      );

      expect(turnStartedEvents).toHaveLength(2);
      expect(turnStartedEvents.map((event) => event.turn)).toEqual([1, 2]);
      expect(turnStartedEvents.map((event) => event.phase)).toEqual([
        GamePhase.Initiative,
        GamePhase.Initiative,
      ]);
      expect(turnStartedEvents.map((event) => event.payload)).toEqual([
        { _type: 'turn_started' },
        { _type: 'turn_started' },
      ]);

      for (const started of turnStartedEvents) {
        const ended = turnEndedEvents.find(
          (event) => event.turn === started.turn,
        );
        expect(ended).toBeDefined();
        expect(started.sequence).toBeLessThan(ended?.sequence ?? Infinity);
      }
    });
  });
});
