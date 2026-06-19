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
