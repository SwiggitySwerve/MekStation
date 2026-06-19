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
});
