import {
  DeploymentZone,
  ScenarioObjectiveType,
  BiomeType,
} from './ScenarioEnums';

// =============================================================================
// Victory Condition Interfaces
// =============================================================================

/**
 * Base victory condition definition.
 */
export interface IVictoryConditionDef {
  /** Unique identifier for this condition type */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description of how to achieve victory */
  readonly description: string;
  /** Is this the primary objective? */
  readonly primary: boolean;
  /** Victory points awarded for completion */
  readonly victoryPoints?: number;
}

/**
 * Destroy-based victory condition.
 */
export interface IDestroyVictoryCondition extends IVictoryConditionDef {
  readonly id: 'destroy_all' | 'destroy_percent' | 'destroy_target';
  /** Percentage of enemy BV to destroy (for destroy_percent) */
  readonly percentage?: number;
  /** Specific target unit designation (for destroy_target) */
  readonly targetDesignation?: string;
}

/**
 * Capture-based victory condition.
 */
export interface ICaptureVictoryCondition extends IVictoryConditionDef {
  readonly id: 'capture_objective' | 'capture_and_hold';
  /** Number of objectives to capture */
  readonly objectiveCount: number;
  /** Turns to hold objective (for capture_and_hold) */
  readonly holdTurns?: number;
}

/**
 * Defend-based victory condition.
 */
export interface IDefendVictoryCondition extends IVictoryConditionDef {
  readonly id: 'defend_objective' | 'survive_turns';
  /** Number of turns to defend */
  readonly turnCount: number;
  /** Minimum units that must survive */
  readonly minimumSurvivors?: number;
}

/**
 * Movement-based victory condition.
 */
export interface IMovementVictoryCondition extends IVictoryConditionDef {
  readonly id: 'escort_units' | 'breakthrough' | 'recon';
  /** Number of units that must exit/complete */
  readonly requiredUnits: number;
  /** Percentage of units (alternative to count) */
  readonly requiredPercent?: number;
  /** Objectives to scan (for recon) */
  readonly scanObjectives?: number;
}

/**
 * Union type for all victory conditions.
 */
export type VictoryCondition =
  | IDestroyVictoryCondition
  | ICaptureVictoryCondition
  | IDefendVictoryCondition
  | IMovementVictoryCondition;

// =============================================================================
// Scenario Template Interface
// =============================================================================

/**
 * Deployment zone configuration.
 */
export interface IDeploymentConfig {
  /** Zone type */
  readonly zone: DeploymentZone;
  /** Zone depth from map edge (in hexes) */
  readonly depth: number;
  /** Optional offset from zone center */
  readonly offset?: { x: number; y: number };
}

/**
 * Special rule that can be applied to a scenario.
 */
export interface ISpecialRule {
  /** Rule identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Full description */
  readonly description: string;
  /** Is this rule optional? */
  readonly optional: boolean;
  /** Game effects (key-value pairs) */
  readonly effects?: Readonly<Record<string, unknown>>;
}

/**
 * Scenario template definition.
 * Templates provide pre-configured battle setups.
 */
export interface IScenarioTemplate {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description of the scenario */
  readonly description: string;
  /** Objective type */
  readonly objectiveType: ScenarioObjectiveType;
  /** Victory conditions for the player */
  readonly victoryConditions: readonly VictoryCondition[];
  /** Defeat conditions (optional, default is losing all units) */
  readonly defeatConditions?: readonly VictoryCondition[];
  /** Player deployment zone */
  readonly playerDeployment: IDeploymentConfig;
  /** Enemy deployment zone */
  readonly enemyDeployment: IDeploymentConfig;
  /** Optional turn limit (0 = unlimited) */
  readonly turnLimit: number;
  /** Special rules for this scenario */
  readonly specialRules: readonly ISpecialRule[];
  /** Suggested biomes for this scenario type */
  readonly suggestedBiomes: readonly BiomeType[];
  /** Default BV multiplier for OpFor (1.0 = equal) */
  readonly defaultOpForMultiplier: number;
  /** Does this scenario support reinforcements? */
  readonly supportsReinforcements: boolean;
  /** Minimum player units recommended */
  readonly minPlayerUnits: number;
  /** Maximum player units recommended (0 = no limit) */
  readonly maxPlayerUnits: number;
  /** Tags for categorization */
  readonly tags: readonly string[];
}

/**
 * Type guard for IScenarioTemplate.
 */
export function isScenarioTemplate(obj: unknown): obj is IScenarioTemplate {
  if (typeof obj !== 'object' || obj === null) return false;
  const template = obj as IScenarioTemplate;
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.objectiveType === 'string' &&
    Array.isArray(template.victoryConditions) &&
    typeof template.playerDeployment === 'object' &&
    typeof template.enemyDeployment === 'object'
  );
}
