/**
 * Quick Game Interfaces Tests
 * Tests for quick game type definitions and factory functions.
 */

import {
  IQuickGameScenarioConfig,
  createQuickGameInstance,
} from '../QuickGameInterfaces';

describe('IQuickGameScenarioConfig', () => {
  describe('year field', () => {
    it('should accept year as optional number', () => {
      const config: IQuickGameScenarioConfig = {
        difficulty: 1.0,
        modifierCount: 2,
        allowNegativeModifiers: true,
        year: 3025,
      };

      expect(config.year).toBe(3025);
    });

    it('should allow year to be undefined', () => {
      const config: IQuickGameScenarioConfig = {
        difficulty: 1.0,
        modifierCount: 2,
        allowNegativeModifiers: true,
      };

      expect(config.year).toBeUndefined();
    });

    it('should accept different year values', () => {
      const config1: IQuickGameScenarioConfig = {
        difficulty: 1.0,
        modifierCount: 2,
        allowNegativeModifiers: true,
        year: 3000,
      };

      const config2: IQuickGameScenarioConfig = {
        difficulty: 1.0,
        modifierCount: 2,
        allowNegativeModifiers: true,
        year: 3050,
      };

      expect(config1.year).toBe(3000);
      expect(config2.year).toBe(3050);
    });
  });
});

describe('createQuickGameInstance', () => {
  describe('scenario config year field', () => {
    it('should set default year to 3025 (Late Succession Wars)', () => {
      const instance = createQuickGameInstance();

      expect(instance.scenarioConfig.year).toBe(3025);
    });

    it('should create instance with all required scenario config fields', () => {
      const instance = createQuickGameInstance();

      expect(instance.scenarioConfig).toHaveProperty('difficulty');
      expect(instance.scenarioConfig).toHaveProperty('modifierCount');
      expect(instance.scenarioConfig).toHaveProperty('allowNegativeModifiers');
      expect(instance.scenarioConfig).toHaveProperty('year');
    });

    it('should have year field with correct default value', () => {
      const instance = createQuickGameInstance();

      expect(typeof instance.scenarioConfig.year).toBe('number');
      expect(instance.scenarioConfig.year).toEqual(3025);
    });
  });
});
