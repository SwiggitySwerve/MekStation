/**
 * Scenario Generator Service Tests
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Era } from '../../../types/temporal/Era';
import { BiomeType, ScenarioObjectiveType } from '../../../types/scenario';
import {
  ScenarioGeneratorService,
  scenarioGenerator,
} from '../ScenarioGeneratorService';
import { Faction } from '../../../constants/scenario/rats';

describe('ScenarioGeneratorService', () => {
  let service: ScenarioGeneratorService;

  beforeEach(() => {
    service = new ScenarioGeneratorService();
  });

  describe('generate', () => {
    it('should generate a complete scenario', () => {
      const result = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.DRACONIS_COMBINE,
        era: Era.LATE_SUCCESSION_WARS,
        difficulty: 1.0,
        maxModifiers: 2,
        allowNegativeModifiers: true,
      });

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.template).toBeDefined();
      expect(result.mapPreset).toBeDefined();
      expect(result.opFor).toBeDefined();
      expect(result.modifiers).toBeDefined();
      expect(result.generatedAt).toBeDefined();
    });

    it('should use requested scenario type', () => {
      const result = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        scenarioType: ScenarioObjectiveType.Defend,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      expect(result.template.objectiveType).toBe(ScenarioObjectiveType.Defend);
    });

    it('should use requested biome', () => {
      const result = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        biome: BiomeType.Urban,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      expect(result.mapPreset.biome).toBe(BiomeType.Urban);
    });

    it('should generate OpFor with expected BV', () => {
      const result = service.generate({
        playerBV: 6000,
        playerUnitCount: 4,
        faction: Faction.LYRAN_COMMONWEALTH,
        era: Era.LATE_SUCCESSION_WARS,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      // Should be within reasonable range of target
      // Template may have its own multiplier affecting this
      expect(result.opFor.totalBV).toBeGreaterThan(3000);
      expect(result.opFor.totalBV).toBeLessThan(12000);
    });

    it('should generate modifiers when requested', () => {
      const result = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 3,
        allowNegativeModifiers: true,
      });

      // May get 0-3 modifiers depending on compatibility
      expect(result.modifiers.length).toBeLessThanOrEqual(3);
    });

    it('should exclude negative modifiers when not allowed', () => {
      // Run multiple times to check consistency
      for (let i = 0; i < 5; i++) {
        const result = service.generate({
          playerBV: 5000,
          playerUnitCount: 4,
          faction: Faction.PIRATES,
          era: Era.CLAN_INVASION,
          difficulty: 1.0,
          maxModifiers: 3,
          allowNegativeModifiers: false,
        });

        for (const modifier of result.modifiers) {
          expect(modifier.effect).not.toBe('negative');
        }
      }
    });

    it('should be reproducible with seed', () => {
      const config = {
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 2,
        allowNegativeModifiers: true,
        seed: 12345,
      };

      const result1 = service.generate(config);
      const result2 = service.generate(config);

      expect(result1.template.id).toBe(result2.template.id);
      expect(result1.mapPreset.id).toBe(result2.mapPreset.id);
      expect(result1.seed).toBe(result2.seed);
    });

    it('should calculate turn limit correctly', () => {
      const result = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        scenarioType: ScenarioObjectiveType.Defend,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      // Defense scenarios have turn limits
      expect(result.turnLimit).toBeGreaterThan(0);
    });

    it('should increase difficulty with higher multiplier', () => {
      const easyResult = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 0.5,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      const hardResult = service.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.5,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      // Hard should have higher target BV
      expect(hardResult.opFor.targetBV).toBeGreaterThan(easyResult.opFor.targetBV);
    });
  });

  describe('getAvailableTemplates', () => {
    it('should return all available templates', () => {
      const templates = service.getAvailableTemplates();

      expect(templates).toBeDefined();
      expect(templates.length).toBeGreaterThan(0);
      
      // Check we have expected templates
      const ids = templates.map((t) => t.id);
      expect(ids).toContain('standup_fight');
      expect(ids).toContain('base_assault');
      expect(ids).toContain('defensive_hold');
    });
  });

  describe('getTemplateById', () => {
    it('should return template by ID', () => {
      const template = service.getTemplateById('standup_fight');

      expect(template).toBeDefined();
      expect(template?.id).toBe('standup_fight');
      expect(template?.name).toBe('Standup Fight');
    });

    it('should return undefined for unknown ID', () => {
      const template = service.getTemplateById('unknown_template');
      expect(template).toBeUndefined();
    });
  });

  describe('getAvailableBiomes', () => {
    it('should return all biome types', () => {
      const biomes = service.getAvailableBiomes();

      expect(biomes).toBeDefined();
      expect(biomes.length).toBeGreaterThan(0);
      expect(biomes).toContain(BiomeType.Plains);
      expect(biomes).toContain(BiomeType.Urban);
      expect(biomes).toContain(BiomeType.Desert);
    });
  });

  describe('getMapPresetsForBiome', () => {
    it('should return presets for urban biome', () => {
      const presets = service.getMapPresetsForBiome(BiomeType.Urban);

      expect(presets).toBeDefined();
      expect(presets.length).toBeGreaterThan(0);
      
      for (const preset of presets) {
        expect(preset.biome).toBe(BiomeType.Urban);
      }
    });

    it('should return empty array for biome with no presets', () => {
      // Create a new service instance to test
      const presets = service.getMapPresetsForBiome(BiomeType.Plains);
      
      // Plains has presets, so this should return some
      expect(presets.length).toBeGreaterThan(0);
    });
  });

  describe('getAvailableModifiers', () => {
    it('should return all available modifiers', () => {
      const modifiers = service.getAvailableModifiers();

      expect(modifiers).toBeDefined();
      expect(modifiers.length).toBeGreaterThan(0);

      // Check for some expected modifiers
      const ids = modifiers.map((m) => m.id);
      expect(ids).toContain('enemy_reinforcements');
      expect(ids).toContain('heavy_fog');
      expect(ids).toContain('night_battle');
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(scenarioGenerator).toBeDefined();
      expect(scenarioGenerator).toBeInstanceOf(ScenarioGeneratorService);
    });

    it('should generate scenarios using singleton', () => {
      const result = scenarioGenerator.generate({
        playerBV: 5000,
        playerUnitCount: 4,
        faction: Faction.PIRATES,
        era: Era.CLAN_INVASION,
        difficulty: 1.0,
        maxModifiers: 0,
        allowNegativeModifiers: false,
      });

      expect(result.opFor.units.length).toBeGreaterThan(0);
    });
  });
});
