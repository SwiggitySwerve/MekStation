import { INDUSTRIAL_COMPLEX } from '@/constants/scenario/mapPresets';
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
});
