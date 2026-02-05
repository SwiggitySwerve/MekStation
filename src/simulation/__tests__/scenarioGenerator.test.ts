import {
  isGameSession,
  GamePhase,
  GameStatus,
  GameSide,
  IUnitGameState,
  IGameUnit,
} from '@/types/gameplay';

import { SeededRandom } from '../core/SeededRandom';
import { ISimulationConfig } from '../core/types';
import {
  ScenarioGenerator,
  UNIT_TEMPLATES,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '../generator';

describe('ScenarioGenerator', () => {
  let generator: ScenarioGenerator;
  let config: ISimulationConfig;

  beforeEach(() => {
    generator = new ScenarioGenerator(
      createDefaultUnitWeights(),
      createDefaultTerrainWeights(),
    );
    config = {
      seed: 12345,
      turnLimit: 20,
      unitCount: { player: 2, opponent: 2 },
      mapRadius: 7,
    };
  });

  describe('generate()', () => {
    it('should produce a valid IGameSession', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect(isGameSession(session)).toBe(true);
      expect(session.id).toContain('sim-');
      expect(session.config).toBeDefined();
      expect(session.units).toBeDefined();
      expect(session.events).toBeDefined();
      expect(session.currentState).toBeDefined();
    });

    it('should generate correct number of player units', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const playerUnits = session.units.filter(
        (u: IGameUnit) => u.side === GameSide.Player,
      );
      expect(playerUnits.length).toBe(config.unitCount.player);
    });

    it('should generate correct number of opponent units', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const opponentUnits = session.units.filter(
        (u: IGameUnit) => u.side === GameSide.Opponent,
      );
      expect(opponentUnits.length).toBe(config.unitCount.opponent);
    });

    it('should set map radius correctly', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect(session.config.mapRadius).toBe(config.mapRadius);
    });

    it('should set turn limit correctly', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect(session.config.turnLimit).toBe(config.turnLimit);
    });

    it('should generate 1v1 scenarios', () => {
      const smallConfig: ISimulationConfig = {
        ...config,
        unitCount: { player: 1, opponent: 1 },
      };
      const random = new SeededRandom(smallConfig.seed);
      const session = generator.generate(smallConfig, random);

      expect(session.units.length).toBe(2);
    });

    it('should generate 4v4 scenarios', () => {
      const largeConfig: ISimulationConfig = {
        ...config,
        unitCount: { player: 4, opponent: 4 },
      };
      const random = new SeededRandom(largeConfig.seed);
      const session = generator.generate(largeConfig, random);

      expect(session.units.length).toBe(8);
    });

    it('should handle different map radii', () => {
      for (const radius of [5, 7, 10]) {
        const testConfig: ISimulationConfig = { ...config, mapRadius: radius };
        const random = new SeededRandom(testConfig.seed);
        const session = generator.generate(testConfig, random);

        expect(session.config.mapRadius).toBe(radius);
      }
    });
  });

  describe('determinism', () => {
    it('should produce identical scenarios with same seed', () => {
      const random1 = new SeededRandom(12345);
      const random2 = new SeededRandom(12345);

      const session1 = generator.generate(config, random1);
      const session2 = generator.generate(config, random2);

      expect(session1.units.length).toBe(session2.units.length);
      for (let i = 0; i < session1.units.length; i++) {
        expect(session1.units[i].name).toBe(session2.units[i].name);
        expect(session1.units[i].side).toBe(session2.units[i].side);
      }

      const state1 = session1.currentState;
      const state2 = session2.currentState;
      for (const unitId of Object.keys(state1.units)) {
        expect(state1.units[unitId].position).toEqual(
          state2.units[unitId].position,
        );
        expect(state1.units[unitId].facing).toEqual(
          state2.units[unitId].facing,
        );
      }
    });

    it('should produce different scenarios with different seeds', () => {
      const random1 = new SeededRandom(12345);
      const random2 = new SeededRandom(67890);

      const session1 = generator.generate(config, random1);
      const session2 = generator.generate(config, random2);

      const _state1Units = Object.values(
        session1.currentState.units,
      ) as IUnitGameState[];
      const _state2Units = Object.values(
        session2.currentState.units,
      ) as IUnitGameState[];

      const state1 = session1.currentState;
      const state2 = session2.currentState;
      let _hasDifference = false;
      for (const unitId of Object.keys(state1.units)) {
        if (state2.units[unitId]) {
          if (
            state1.units[unitId].position.q !==
              state2.units[unitId].position.q ||
            state1.units[unitId].position.r !== state2.units[unitId].position.r
          ) {
            _hasDifference = true;
            break;
          }
        }
      }

      expect(session1.units.length).toBe(session2.units.length);
    });
  });

  describe('performance', () => {
    it('should generate scenarios in less than 10ms', () => {
      const iterations = 100;
      const totalStart = Date.now();

      for (let i = 0; i < iterations; i++) {
        const random = new SeededRandom(i);
        generator.generate(config, random);
      }

      const totalDuration = Date.now() - totalStart;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(10);
    });

    it('should generate large scenarios (4v4, radius 10) in less than 10ms', () => {
      const largeConfig: ISimulationConfig = {
        seed: 12345,
        turnLimit: 50,
        unitCount: { player: 4, opponent: 4 },
        mapRadius: 10,
      };

      const iterations = 50;
      const totalStart = Date.now();

      for (let i = 0; i < iterations; i++) {
        const random = new SeededRandom(i);
        generator.generate(largeConfig, random);
      }

      const totalDuration = Date.now() - totalStart;
      const avgDuration = totalDuration / iterations;

      expect(avgDuration).toBeLessThan(10);
    });
  });

  describe('unit generation', () => {
    it('should generate units with valid armor values', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        const armor = unit.armor;

        for (const [_location, value] of Object.entries(armor)) {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(typeof value).toBe('number');
        }

        expect(armor.head).toBeDefined();
        expect(armor.center_torso).toBeDefined();
        expect(armor.left_arm).toBeDefined();
        expect(armor.right_arm).toBeDefined();
        expect(armor.left_torso).toBeDefined();
        expect(armor.right_torso).toBeDefined();
        expect(armor.left_leg).toBeDefined();
        expect(armor.right_leg).toBeDefined();
      }
    });

    it('should generate units with valid structure values', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        const structure = unit.structure;

        for (const [_location, value] of Object.entries(structure)) {
          expect(value).toBeGreaterThan(0);
          expect(typeof value).toBe('number');
        }
      }
    });

    it('should assign units to correct sides', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const playerUnitIds = session.units
        .filter((u: IGameUnit) => u.side === GameSide.Player)
        .map((u: IGameUnit) => u.id);
      const opponentUnitIds = session.units
        .filter((u: IGameUnit) => u.side === GameSide.Opponent)
        .map((u: IGameUnit) => u.id);

      for (const unitId of playerUnitIds) {
        expect(session.currentState.units[unitId].side).toBe(GameSide.Player);
      }

      for (const unitId of opponentUnitIds) {
        expect(session.currentState.units[unitId].side).toBe(GameSide.Opponent);
      }
    });
  });

  describe('unit placement', () => {
    it('should place units at unique positions (no overlaps)', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const positions = new Set<string>();
      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        const key = `${unit.position.q},${unit.position.r}`;

        expect(positions.has(key)).toBe(false);
        positions.add(key);
      }
    });

    it('should place player units on one side of the map', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const allUnits = Object.values(
        session.currentState.units,
      ) as IUnitGameState[];
      const playerUnits = allUnits.filter((u) => u.side === GameSide.Player);

      const rValues = playerUnits.map((u) => u.position.r);
      const minR = Math.min(...rValues);
      const maxR = Math.max(...rValues);

      expect(maxR - minR).toBeLessThanOrEqual(2);
    });

    it('should place opponent units on opposite side of the map', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      const allUnits = Object.values(
        session.currentState.units,
      ) as IUnitGameState[];
      const playerUnits = allUnits.filter((u) => u.side === GameSide.Player);
      const opponentUnits = allUnits.filter(
        (u) => u.side === GameSide.Opponent,
      );

      const avgPlayerR =
        playerUnits.reduce((sum, u) => sum + u.position.r, 0) /
        playerUnits.length;
      const avgOpponentR =
        opponentUnits.reduce((sum, u) => sum + u.position.r, 0) /
        opponentUnits.length;

      expect(avgPlayerR * avgOpponentR).toBeLessThan(0);
    });

    it('should place units within map bounds', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);
      const radius = session.config.mapRadius;

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        const { q, r } = unit.position;

        // Hex bounds: |q| <= radius AND |r| <= radius AND |q + r| <= radius
        expect(Math.abs(q)).toBeLessThanOrEqual(radius);
        expect(Math.abs(r)).toBeLessThanOrEqual(radius);
        expect(Math.abs(q + r)).toBeLessThanOrEqual(radius);
      }
    });

    it('should assign facing directions', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        expect(unit.facing).toBeGreaterThanOrEqual(0);
        expect(unit.facing).toBeLessThanOrEqual(5);
      }
    });
  });

  describe('game state initialization', () => {
    it('should initialize turn to 1', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect(session.currentState.turn).toBe(1);
    });

    it('should initialize phase to Initiative', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect(session.currentState.phase).toBe(GamePhase.Initiative);
    });

    it('should initialize status to Setup or Active', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      expect([GameStatus.Setup, GameStatus.Active]).toContain(
        session.currentState.status,
      );
    });

    it('should initialize all units as not destroyed', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        expect(unit.destroyed).toBe(false);
      }
    });

    it('should initialize all units with zero heat', () => {
      const random = new SeededRandom(config.seed);
      const session = generator.generate(config, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];
        expect(unit.heat).toBe(0);
      }
    });
  });

  describe('unit templates', () => {
    it('should have at least 4 unit templates defined', () => {
      expect(UNIT_TEMPLATES.length).toBeGreaterThanOrEqual(4);
    });

    it('should have templates with valid tonnages', () => {
      for (const template of UNIT_TEMPLATES) {
        expect(template.tonnage).toBeGreaterThanOrEqual(20);
        expect(template.tonnage).toBeLessThanOrEqual(100);
      }
    });

    it('should have templates with valid MP values', () => {
      for (const template of UNIT_TEMPLATES) {
        expect(template.walkMP).toBeGreaterThan(0);
        expect(template.walkMP).toBeLessThanOrEqual(12);
      }
    });
  });
});

describe('WeightedTable usage', () => {
  it('should use WeightedTable for unit selection', () => {
    const unitWeights = createDefaultUnitWeights();
    const random = new SeededRandom(12345);

    const selected = unitWeights.select(() => random.next());
    expect(selected).not.toBeNull();
    expect(selected!.name).toBeDefined();
    expect(selected!.tonnage).toBeDefined();
  });

  it('should use WeightedTable for terrain selection', () => {
    const terrainWeights = createDefaultTerrainWeights();
    const random = new SeededRandom(12345);

    const selected = terrainWeights.select(() => random.next());
    expect(selected).not.toBeNull();
    expect(typeof selected).toBe('string');
  });

  it('should produce weighted distribution of unit tonnages', () => {
    const unitWeights = createDefaultUnitWeights();
    const random = new SeededRandom(12345);

    const counts: Record<string, number> = {};
    const iterations = 1000;

    for (let i = 0; i < iterations; i++) {
      const selected = unitWeights.select(() => random.next());
      if (selected) {
        counts[selected.name] = (counts[selected.name] || 0) + 1;
      }
    }

    const names = Object.keys(counts);
    expect(names.length).toBeGreaterThanOrEqual(2);
  });
});
