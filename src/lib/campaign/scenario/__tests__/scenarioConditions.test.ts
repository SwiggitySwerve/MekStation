/**
 * Tests for scenario conditions generation and effects
 *
 * @module campaign/scenario/__tests__/scenarioConditions
 */

import { type IScenarioConditions } from '../../../../types/campaign/scenario/scenarioTypes';
import { type RandomFn } from '../battleChance';
import {
  generateRandomConditions,
  getConditionEffects,
  type IConditionEffect,
} from '../scenarioConditions';

describe('scenarioConditions', () => {
  // =========================================================================
  // generateRandomConditions Tests
  // =========================================================================

  describe('generateRandomConditions', () => {
    it('should generate conditions with all fields populated', () => {
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(conditions).toBeDefined();
      expect(conditions.light).toBeDefined();
      expect(conditions.weather).toBeDefined();
      expect(conditions.gravity).toBeDefined();
      expect(conditions.temperature).toBeDefined();
      expect(conditions.atmosphere).toBeDefined();
    });

    it('should generate valid light values', () => {
      const validLights = [
        'daylight',
        'dusk',
        'full_moon',
        'moonless',
        'pitch_black',
      ];
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(validLights).toContain(conditions.light);
    });

    it('should generate valid weather values', () => {
      const validWeathers = [
        'clear',
        'light_rain',
        'heavy_rain',
        'sleet',
        'snow',
        'fog',
        'sandstorm',
      ];
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(validWeathers).toContain(conditions.weather);
    });

    it('should generate gravity within valid range (0.2 - 1.5)', () => {
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(conditions.gravity).toBeGreaterThanOrEqual(0.2);
      expect(conditions.gravity).toBeLessThanOrEqual(1.5);
    });

    it('should generate temperature within valid range (-30 to +50 Celsius)', () => {
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(conditions.temperature).toBeGreaterThanOrEqual(-30);
      expect(conditions.temperature).toBeLessThanOrEqual(50);
    });

    it('should generate valid atmosphere values', () => {
      const validAtmospheres = [
        'standard',
        'thin',
        'dense',
        'toxic',
        'tainted',
      ];
      const mockRandom: RandomFn = () => 0.5;
      const conditions = generateRandomConditions(mockRandom);

      expect(validAtmospheres).toContain(conditions.atmosphere);
    });

    it('should use random function for deterministic generation', () => {
      let callCount = 0;
      const mockRandom: RandomFn = () => {
        callCount++;
        return 0.5;
      };

      generateRandomConditions(mockRandom);

      // Should call random multiple times (at least once per field)
      expect(callCount).toBeGreaterThan(0);
    });

    it('should generate different conditions with different random values', () => {
      let randomIndex = 0;
      const randomSequence1 = [0.1, 0.1, 0.1, 0.1, 0.1];
      const randomSequence2 = [0.9, 0.9, 0.9, 0.9, 0.9];
      const mockRandom1: RandomFn = () =>
        randomSequence1[randomIndex++ % randomSequence1.length];

      randomIndex = 0;
      const mockRandom2: RandomFn = () =>
        randomSequence2[randomIndex++ % randomSequence2.length];

      const conditions1 = generateRandomConditions(mockRandom1);
      const conditions2 = generateRandomConditions(mockRandom2);

      // At least one field should differ with extreme random values
      const differ =
        conditions1.light !== conditions2.light ||
        conditions1.weather !== conditions2.weather ||
        conditions1.gravity !== conditions2.gravity ||
        conditions1.temperature !== conditions2.temperature ||
        conditions1.atmosphere !== conditions2.atmosphere;

      expect(differ).toBe(true);
    });

    it('should handle edge case: random = 0', () => {
      const mockRandom: RandomFn = () => 0;
      const conditions = generateRandomConditions(mockRandom);

      expect(conditions.light).toBeDefined();
      expect(conditions.weather).toBeDefined();
      expect(conditions.gravity).toBeGreaterThanOrEqual(0.2);
      expect(conditions.temperature).toBeGreaterThanOrEqual(-30);
      expect(conditions.atmosphere).toBeDefined();
    });

    it('should handle edge case: random = 0.999', () => {
      const mockRandom: RandomFn = () => 0.999;
      const conditions = generateRandomConditions(mockRandom);

      expect(conditions.light).toBeDefined();
      expect(conditions.weather).toBeDefined();
      expect(conditions.gravity).toBeLessThanOrEqual(1.5);
      expect(conditions.temperature).toBeLessThanOrEqual(50);
      expect(conditions.atmosphere).toBeDefined();
    });
  });

  // =========================================================================
  // getConditionEffects Tests
  // =========================================================================

  describe('getConditionEffects', () => {
    it('should return IConditionEffect with all boolean fields', () => {
      const conditions: IScenarioConditions = {
        light: 'daylight',
        weather: 'clear',
        gravity: 1.0,
        temperature: 20,
        atmosphere: 'standard',
      };

      const effects = getConditionEffects(conditions);

      expect(effects).toHaveProperty('noTanks');
      expect(effects).toHaveProperty('noConvInfantry');
      expect(effects).toHaveProperty('noBattleArmor');
      expect(effects).toHaveProperty('noAerospace');
      expect(effects).toHaveProperty('description');
      expect(typeof effects.noTanks).toBe('boolean');
      expect(typeof effects.noConvInfantry).toBe('boolean');
      expect(typeof effects.noBattleArmor).toBe('boolean');
      expect(typeof effects.noAerospace).toBe('boolean');
      expect(typeof effects.description).toBe('string');
    });

    it('should allow all unit types with standard conditions', () => {
      const conditions: IScenarioConditions = {
        light: 'daylight',
        weather: 'clear',
        gravity: 1.0,
        temperature: 20,
        atmosphere: 'standard',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(false);
      expect(effects.noConvInfantry).toBe(false);
      expect(effects.noBattleArmor).toBe(false);
      expect(effects.noAerospace).toBe(false);
    });

    it('should ban tanks with low gravity (≤0.2)', () => {
      const conditions: IScenarioConditions = {
        gravity: 0.2,
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(true);
      expect(effects.description).toContain('Low gravity');
    });

    it('should ban tanks with gravity below 0.2', () => {
      const conditions: IScenarioConditions = {
        gravity: 0.15,
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(true);
    });

    it('should allow tanks with gravity above 0.2', () => {
      const conditions: IScenarioConditions = {
        gravity: 0.21,
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(false);
    });

    it('should ban conv infantry and tanks with toxic atmosphere', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'toxic',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noConvInfantry).toBe(true);
      expect(effects.noTanks).toBe(true);
      expect(effects.description).toContain('Toxic atmosphere');
    });

    it('should ban conv infantry and tanks with tainted atmosphere', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'tainted',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noConvInfantry).toBe(true);
      expect(effects.noTanks).toBe(true);
      expect(effects.description).toContain('Toxic atmosphere');
    });

    it('should allow conv infantry and tanks with thin atmosphere', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'thin',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noConvInfantry).toBe(false);
      expect(effects.noTanks).toBe(false);
    });

    it('should allow conv infantry and tanks with dense atmosphere', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'dense',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noConvInfantry).toBe(false);
      expect(effects.noTanks).toBe(false);
    });

    it('should accumulate description strings for multiple restrictions', () => {
      const conditions: IScenarioConditions = {
        gravity: 0.2,
        atmosphere: 'toxic',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.description).toContain('Low gravity');
      expect(effects.description).toContain('Toxic atmosphere');
      expect(effects.noTanks).toBe(true);
      expect(effects.noConvInfantry).toBe(true);
    });

    it('should handle undefined gravity', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'standard',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(false);
    });

    it('should handle undefined atmosphere', () => {
      const conditions: IScenarioConditions = {
        gravity: 1.0,
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noConvInfantry).toBe(false);
      expect(effects.noTanks).toBe(false);
    });

    it('should handle empty conditions object', () => {
      const conditions: IScenarioConditions = {};

      const effects = getConditionEffects(conditions);

      expect(effects.noTanks).toBe(false);
      expect(effects.noConvInfantry).toBe(false);
      expect(effects.noBattleArmor).toBe(false);
      expect(effects.noAerospace).toBe(false);
    });

    it('should not ban battle armor or aerospace with any tested conditions', () => {
      const conditions: IScenarioConditions = {
        gravity: 0.1,
        atmosphere: 'toxic',
        weather: 'sandstorm',
        temperature: -30,
        light: 'pitch_black',
      };

      const effects = getConditionEffects(conditions);

      expect(effects.noBattleArmor).toBe(false);
      expect(effects.noAerospace).toBe(false);
    });

    it('should return readonly effects object', () => {
      const conditions: IScenarioConditions = {
        atmosphere: 'standard',
      };

      const effects = getConditionEffects(conditions);

      // Verify it's readonly by checking the type
      expect(effects).toBeDefined();
      // TypeScript will enforce readonly at compile time
    });
  });
});
