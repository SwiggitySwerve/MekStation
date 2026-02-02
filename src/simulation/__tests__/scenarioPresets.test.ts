import { SeededRandom } from '../core/SeededRandom';
import {
  ScenarioGenerator,
  LIGHT_SKIRMISH,
  STANDARD_LANCE,
  STRESS_TEST,
  createDefaultUnitWeights,
  createDefaultTerrainWeights,
} from '../generator';
import { isGameSession, GameSide, IGameUnit } from '@/types/gameplay';

describe('Scenario Presets', () => {
  let generator: ScenarioGenerator;

  beforeEach(() => {
    generator = new ScenarioGenerator(
      createDefaultUnitWeights(),
      createDefaultTerrainWeights()
    );
  });

  describe('LIGHT_SKIRMISH', () => {
    it('should be a valid ISimulationConfig', () => {
      expect(LIGHT_SKIRMISH).toBeDefined();
      expect(LIGHT_SKIRMISH.seed).toBeDefined();
      expect(LIGHT_SKIRMISH.turnLimit).toBeDefined();
      expect(LIGHT_SKIRMISH.unitCount).toBeDefined();
      expect(LIGHT_SKIRMISH.mapRadius).toBeDefined();
    });

    it('should create 2v2 scenario', () => {
      const configWithSeed = { ...LIGHT_SKIRMISH, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      const playerUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Player);
      const opponentUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Opponent);

      expect(playerUnits.length).toBe(2);
      expect(opponentUnits.length).toBe(2);
    });

    it('should use small map', () => {
      expect(LIGHT_SKIRMISH.mapRadius).toBe(5);
    });

    it('should produce valid IGameSession', () => {
      const configWithSeed = { ...LIGHT_SKIRMISH, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      expect(isGameSession(session)).toBe(true);
    });

    it('should have reasonable turn limit', () => {
      expect(LIGHT_SKIRMISH.turnLimit).toBeGreaterThan(0);
      expect(LIGHT_SKIRMISH.turnLimit).toBeLessThanOrEqual(20);
    });
  });

  describe('STANDARD_LANCE', () => {
    it('should be a valid ISimulationConfig', () => {
      expect(STANDARD_LANCE).toBeDefined();
      expect(STANDARD_LANCE.seed).toBeDefined();
      expect(STANDARD_LANCE.turnLimit).toBeDefined();
      expect(STANDARD_LANCE.unitCount).toBeDefined();
      expect(STANDARD_LANCE.mapRadius).toBeDefined();
    });

    it('should create 4v4 scenario', () => {
      const configWithSeed = { ...STANDARD_LANCE, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      const playerUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Player);
      const opponentUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Opponent);

      expect(playerUnits.length).toBe(4);
      expect(opponentUnits.length).toBe(4);
    });

    it('should use medium map', () => {
      expect(STANDARD_LANCE.mapRadius).toBe(7);
    });

    it('should produce valid IGameSession', () => {
      const configWithSeed = { ...STANDARD_LANCE, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      expect(isGameSession(session)).toBe(true);
    });

    it('should have adequate turn limit for lance combat', () => {
      expect(STANDARD_LANCE.turnLimit).toBeGreaterThanOrEqual(20);
    });
  });

  describe('STRESS_TEST', () => {
    it('should be a valid ISimulationConfig', () => {
      expect(STRESS_TEST).toBeDefined();
      expect(STRESS_TEST.seed).toBeDefined();
      expect(STRESS_TEST.turnLimit).toBeDefined();
      expect(STRESS_TEST.unitCount).toBeDefined();
      expect(STRESS_TEST.mapRadius).toBeDefined();
    });

    it('should create 4v4 scenario', () => {
      const configWithSeed = { ...STRESS_TEST, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      const playerUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Player);
      const opponentUnits = session.units.filter((u: IGameUnit) => u.side === GameSide.Opponent);

      expect(playerUnits.length).toBe(4);
      expect(opponentUnits.length).toBe(4);
    });

    it('should use large map', () => {
      expect(STRESS_TEST.mapRadius).toBe(10);
    });

    it('should produce valid IGameSession', () => {
      const configWithSeed = { ...STRESS_TEST, seed: 12345 };
      const random = new SeededRandom(configWithSeed.seed);
      const session = generator.generate(configWithSeed, random);

      expect(isGameSession(session)).toBe(true);
    });

    it('should have high turn limit for stress testing', () => {
      expect(STRESS_TEST.turnLimit).toBeGreaterThanOrEqual(50);
    });
  });

  describe('all presets produce valid scenarios', () => {
    const presets = [
      { name: 'LIGHT_SKIRMISH', config: LIGHT_SKIRMISH },
      { name: 'STANDARD_LANCE', config: STANDARD_LANCE },
      { name: 'STRESS_TEST', config: STRESS_TEST },
    ];

    it.each(presets)('$name should produce valid session with multiple seeds', ({ config }) => {
      for (const seed of [1, 100, 9999, 123456789]) {
        const configWithSeed = { ...config, seed };
        const random = new SeededRandom(seed);
        const session = generator.generate(configWithSeed, random);

        expect(isGameSession(session)).toBe(true);
        expect(session.units.length).toBeGreaterThan(0);
      }
    });

    it.each(presets)('$name should have all units with valid stats', ({ config }) => {
      const configWithSeed = { ...config, seed: 42 };
      const random = new SeededRandom(42);
      const session = generator.generate(configWithSeed, random);

      for (const unitId of Object.keys(session.currentState.units)) {
        const unit = session.currentState.units[unitId];

        expect(Object.keys(unit.armor).length).toBeGreaterThanOrEqual(8);
        expect(Object.keys(unit.structure).length).toBeGreaterThanOrEqual(8);

        for (const value of Object.values(unit.armor)) {
          expect(value).toBeGreaterThanOrEqual(0);
        }
        for (const value of Object.values(unit.structure)) {
          expect(value).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('preset unit counts', () => {
    it('LIGHT_SKIRMISH should have 2 units per side', () => {
      expect(LIGHT_SKIRMISH.unitCount.player).toBe(2);
      expect(LIGHT_SKIRMISH.unitCount.opponent).toBe(2);
    });

    it('STANDARD_LANCE should have 4 units per side', () => {
      expect(STANDARD_LANCE.unitCount.player).toBe(4);
      expect(STANDARD_LANCE.unitCount.opponent).toBe(4);
    });

    it('STRESS_TEST should have 4 units per side', () => {
      expect(STRESS_TEST.unitCount.player).toBe(4);
      expect(STRESS_TEST.unitCount.opponent).toBe(4);
    });
  });

  describe('preset map sizes', () => {
    it('should have valid radius values (5-10)', () => {
      expect(LIGHT_SKIRMISH.mapRadius).toBeGreaterThanOrEqual(5);
      expect(LIGHT_SKIRMISH.mapRadius).toBeLessThanOrEqual(10);

      expect(STANDARD_LANCE.mapRadius).toBeGreaterThanOrEqual(5);
      expect(STANDARD_LANCE.mapRadius).toBeLessThanOrEqual(10);

      expect(STRESS_TEST.mapRadius).toBeGreaterThanOrEqual(5);
      expect(STRESS_TEST.mapRadius).toBeLessThanOrEqual(10);
    });
  });
});
