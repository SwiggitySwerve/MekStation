/**
 * Scenario Generator Service
 * Orchestrates complete scenario generation including templates, OpFor, and modifiers.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BiomeType,
  type IBattleModifier,
  type IGeneratedScenario,
  type IMapPreset,
  type IScenarioGeneratorConfig,
  type IScenarioTemplate,
  ModifierEffect,
  OpForSkillLevel,
  UnitTypeCategory,
} from '../../types/scenario';
import {
  getScenarioTemplateById,
  SCENARIO_TEMPLATES,
} from '../../constants/scenario/templates';
import {
  BATTLE_MODIFIERS,
  getModifiersForBiome,
  getModifiersForScenarioType,
} from '../../constants/scenario/modifiers';
import {
  getMapPresetsByBiome,
  getRandomMapPresetForBiome,
} from '../../constants/scenario/mapPresets';
import { opForGenerator } from './OpForGeneratorService';

// =============================================================================
// Scenario Generator Class
// =============================================================================

/**
 * Scenario Generator Service
 * Creates complete battle scenarios with OpFor, modifiers, and map configuration.
 */
export class ScenarioGeneratorService {
  private seed: number | null = null;

  /**
   * Set a seed for reproducible random generation.
   */
  setSeed(seed: number): void {
    this.seed = seed;
  }

  /**
   * Clear the seed to use true random generation.
   */
  clearSeed(): void {
    this.seed = null;
  }

  /**
   * Generate a random number (seeded or true random).
   */
  private random(): number {
    if (this.seed !== null) {
      // Simple seeded PRNG (LCG)
      this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
      return this.seed / 4294967296;
    }
    return Math.random();
  }

  /**
   * Pick a random element from an array.
   */
  private pickRandom<T>(array: readonly T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  /**
   * Generate a complete scenario.
   */
  generate(config: IScenarioGeneratorConfig): IGeneratedScenario {
    // Set seed if provided
    if (config.seed !== undefined) {
      this.setSeed(config.seed);
    }

    // Select scenario template
    const template = this.selectTemplate(config);

    // Select biome and map preset
    const biome = config.biome || this.selectBiome(template);
    const mapPreset = this.selectMapPreset(biome);

    // Generate OpFor
    const opFor = this.generateOpFor(config, template);

    // Select modifiers
    const modifiers = this.selectModifiers(config, template, biome);

    // Calculate effective turn limit (may be modified)
    const turnLimit = this.calculateTurnLimit(template, modifiers);

    // Clear seed after generation
    this.clearSeed();

    return {
      id: uuidv4(),
      template,
      mapPreset,
      opFor,
      modifiers,
      turnLimit,
      generatedAt: new Date().toISOString(),
      seed: config.seed,
    };
  }

  /**
   * Select a scenario template based on config.
   */
  private selectTemplate(config: IScenarioGeneratorConfig): IScenarioTemplate {
    // If specific type requested, find matching template
    if (config.scenarioType) {
      const matching = SCENARIO_TEMPLATES.filter(
        (t) => t.objectiveType === config.scenarioType
      );
      if (matching.length > 0) {
        return this.pickRandom(matching);
      }
    }

    // Filter templates by unit count compatibility
    const compatible = SCENARIO_TEMPLATES.filter((t) => {
      if (t.minPlayerUnits > config.playerUnitCount) return false;
      if (t.maxPlayerUnits > 0 && t.maxPlayerUnits < config.playerUnitCount) return false;
      return true;
    });

    if (compatible.length > 0) {
      return this.pickRandom(compatible);
    }

    // Fallback to first template
    return SCENARIO_TEMPLATES[0];
  }

  /**
   * Select a biome based on template suggestions.
   */
  private selectBiome(template: IScenarioTemplate): BiomeType {
    if (template.suggestedBiomes.length > 0) {
      return this.pickRandom(template.suggestedBiomes);
    }
    // Default to plains
    return BiomeType.Plains;
  }

  /**
   * Select a map preset for the biome.
   */
  private selectMapPreset(biome: BiomeType): IMapPreset {
    const presets = getMapPresetsByBiome(biome);
    if (presets.length > 0) {
      return this.pickRandom(presets);
    }
    // Fallback
    return getRandomMapPresetForBiome(BiomeType.Plains);
  }

  /**
   * Generate OpFor based on config and template.
   */
  private generateOpFor(
    config: IScenarioGeneratorConfig,
    template: IScenarioTemplate
  ) {
    // Adjust difficulty based on template
    const effectiveDifficulty = config.difficulty * template.defaultOpForMultiplier;

    // Determine skill level from difficulty
    const skillLevel = this.difficultyToSkillLevel(config.difficulty);

    return opForGenerator.generate({
      playerBV: config.playerBV,
      difficultyMultiplier: effectiveDifficulty,
      faction: config.faction,
      era: config.era,
      unitTypeMix: {
        [UnitTypeCategory.BattleMech]: 100,
      },
      skillLevel,
      skillVariance: {
        gunneryVariance: 1,
        pilotingVariance: 1,
        eliteChance: skillLevel === OpForSkillLevel.Mixed ? 0.15 : 0.05,
        greenChance: skillLevel === OpForSkillLevel.Mixed ? 0.15 : 0.05,
      },
      minLanceSize: Math.max(1, Math.floor(config.playerUnitCount * 0.5)),
      maxLanceSize: Math.ceil(config.playerUnitCount * 1.5),
      bvFloor: config.playerBV * effectiveDifficulty * 0.85,
      bvCeiling: config.playerBV * effectiveDifficulty * 1.15,
      allowCombinedArms: false,
    });
  }

  /**
   * Convert difficulty number to skill level.
   */
  private difficultyToSkillLevel(difficulty: number): OpForSkillLevel {
    if (difficulty < 0.7) return OpForSkillLevel.Green;
    if (difficulty < 0.9) return OpForSkillLevel.Regular;
    if (difficulty < 1.1) return OpForSkillLevel.Mixed;
    if (difficulty < 1.3) return OpForSkillLevel.Veteran;
    if (difficulty < 1.6) return OpForSkillLevel.Elite;
    return OpForSkillLevel.Legendary;
  }

  /**
   * Select battle modifiers for the scenario.
   */
  private selectModifiers(
    config: IScenarioGeneratorConfig,
    template: IScenarioTemplate,
    biome: BiomeType
  ): readonly IBattleModifier[] {
    if (config.maxModifiers <= 0) {
      return [];
    }

    // Get applicable modifiers
    const scenarioModifiers = getModifiersForScenarioType(template.objectiveType);
    const biomeModifiers = getModifiersForBiome(biome);

    // Intersect the two lists (modifiers that work for both)
    const applicable = BATTLE_MODIFIERS.filter(
      (m) =>
        (scenarioModifiers.includes(m) || biomeModifiers.includes(m)) &&
        (config.allowNegativeModifiers || m.effect !== ModifierEffect.Negative)
    );

    if (applicable.length === 0) {
      return [];
    }

    // Select modifiers using weighted random
    const selected: IBattleModifier[] = [];
    const excluded = new Set<string>();

    for (let i = 0; i < config.maxModifiers && applicable.length > 0; i++) {
      // Filter out excluded modifiers
      const available = applicable.filter(
        (m) =>
          !selected.includes(m) &&
          !excluded.has(m.id) &&
          !(m.applicability.exclusiveWith?.some((ex) => selected.some((s) => s.id === ex)))
      );

      if (available.length === 0) break;

      // Weighted selection
      const totalWeight = available.reduce((sum, m) => sum + m.applicability.weight, 0);
      let roll = this.random() * totalWeight;

      for (const modifier of available) {
        roll -= modifier.applicability.weight;
        if (roll <= 0) {
          selected.push(modifier);
          // Add exclusives to excluded set
          modifier.applicability.exclusiveWith?.forEach((ex) => excluded.add(ex));
          break;
        }
      }
    }

    return selected;
  }

  /**
   * Calculate the effective turn limit after modifiers.
   */
  private calculateTurnLimit(
    template: IScenarioTemplate,
    modifiers: readonly IBattleModifier[]
  ): number {
    let turnLimit = template.turnLimit;

    for (const modifier of modifiers) {
      if (modifier.implementation.type === 'objective_modifier') {
        const change = modifier.implementation.parameters.turnLimitChange as number | undefined;
        if (change) {
          turnLimit += change;
        }
      }
    }

    // Ensure at least 5 turns if there's a limit
    if (turnLimit > 0 && turnLimit < 5) {
      turnLimit = 5;
    }

    return turnLimit;
  }

  /**
   * Get all available scenario templates.
   */
  getAvailableTemplates(): readonly IScenarioTemplate[] {
    return SCENARIO_TEMPLATES;
  }

  /**
   * Get a template by ID.
   */
  getTemplateById(id: string): IScenarioTemplate | undefined {
    return getScenarioTemplateById(id);
  }

  /**
   * Get all available biomes.
   */
  getAvailableBiomes(): readonly BiomeType[] {
    return Object.values(BiomeType);
  }

  /**
   * Get map presets for a biome.
   */
  getMapPresetsForBiome(biome: BiomeType): readonly IMapPreset[] {
    return getMapPresetsByBiome(biome);
  }

  /**
   * Get all available modifiers.
   */
  getAvailableModifiers(): readonly IBattleModifier[] {
    return BATTLE_MODIFIERS;
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

/**
 * Singleton scenario generator service.
 */
export const scenarioGenerator = new ScenarioGeneratorService();
