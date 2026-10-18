import type { IGeneratedMap } from '@/types/gameplay/TerrainTypes';

import type { IMapPreset, IBattleModifier } from './ScenarioEnvironment';
import type { IOpForGeneratorResult } from './ScenarioOpFor';
import type { IScenarioTemplate } from './ScenarioTemplates';

import {
  ScenarioObjectiveType,
  BiomeType,
  OpForSkillLevel,
} from './ScenarioEnums';
import { isScenarioTemplate } from './ScenarioTemplates';

// =============================================================================
// Complete Scenario Configuration
// =============================================================================

/**
 * Complete generated scenario configuration.
 */
export interface IGeneratedScenario {
  /** Unique identifier */
  readonly id: string;
  /** Scenario template used */
  readonly template: IScenarioTemplate;
  /** Map preset */
  readonly mapPreset: IMapPreset;
  /** Generated OpFor */
  readonly opFor: IOpForGeneratorResult;
  /** Applied modifiers */
  readonly modifiers: readonly IBattleModifier[];
  /** Effective turn limit (may be modified) */
  readonly turnLimit: number;
  /** Generation timestamp */
  readonly generatedAt: string;
  /** Generation seed (for reproducibility) */
  readonly seed?: number;
  /**
   * Procedurally generated battle-map terrain, overlaid with the selected
   * preset's feature directives. The originating `presetId` is recorded on
   * the map for replay and debugging.
   *
   * @spec openspec/changes/add-procedural-map-variety/specs/terrain-generation/spec.md
   */
  readonly generatedMap?: IGeneratedMap;
}

/**
 * Scenario generation configuration.
 */
export interface IScenarioGeneratorConfig {
  /** Player force BV */
  readonly playerBV: number;
  /** Player unit count */
  readonly playerUnitCount: number;
  /** Desired scenario type (optional, random if not specified) */
  readonly scenarioType?: ScenarioObjectiveType;
  /** Enemy faction */
  readonly faction: string;
  /** Era */
  readonly era: string;
  /** Biome preference (optional) */
  readonly biome?: BiomeType;
  /** Difficulty level (0.5-2.0) */
  readonly difficulty: number;
  /** Explicit opposing pilot level; omitted values derive from difficulty. */
  readonly skillLevel?: OpForSkillLevel;
  /** Maximum modifiers to apply */
  readonly maxModifiers: number;
  /** Allow negative modifiers? */
  readonly allowNegativeModifiers: boolean;
  /** Random seed for reproducibility */
  readonly seed?: number;
}

/**
 * Type guard for IGeneratedScenario.
 */
export function isGeneratedScenario(obj: unknown): obj is IGeneratedScenario {
  if (typeof obj !== 'object' || obj === null) return false;
  const scenario = obj as IGeneratedScenario;
  return (
    typeof scenario.id === 'string' &&
    isScenarioTemplate(scenario.template) &&
    typeof scenario.mapPreset === 'object' &&
    typeof scenario.opFor === 'object' &&
    Array.isArray(scenario.modifiers)
  );
}
