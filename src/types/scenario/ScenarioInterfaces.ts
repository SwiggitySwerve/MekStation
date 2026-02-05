/**
 * Scenario Generation Interfaces
 * Type definitions for scenario templates, OpFor generation, and battle modifiers.
 *
 * @spec openspec/changes/add-scenario-generators/spec.md
 */

// =============================================================================
// Scenario Template Enums
// =============================================================================

/**
 * Objective types for scenarios.
 * Determines win conditions and tactical goals.
 */
export enum ScenarioObjectiveType {
  /** Destroy all enemy units or force withdrawal */
  Destroy = 'destroy',
  /** Capture and hold a specific location */
  Capture = 'capture',
  /** Defend a position for a set number of turns */
  Defend = 'defend',
  /** Escort units from one edge to another */
  Escort = 'escort',
  /** Scan objectives and exit the map */
  Recon = 'recon',
  /** Exit units from the enemy map edge */
  Breakthrough = 'breakthrough',
  /** Custom objective defined by scenario */
  Custom = 'custom',
}

/**
 * Deployment zone types.
 */
export enum DeploymentZone {
  /** Northern map edge */
  North = 'north',
  /** Southern map edge */
  South = 'south',
  /** Eastern map edge */
  East = 'east',
  /** Western map edge */
  West = 'west',
  /** Center of the map */
  Center = 'center',
  /** Random deployment within specified radius */
  Random = 'random',
  /** Scattered deployment (orbital drop) */
  Scattered = 'scattered',
}

/**
 * Biome types for terrain generation.
 */
export enum BiomeType {
  /** Open grasslands, minimal terrain */
  Plains = 'plains',
  /** Scattered to dense forest */
  Forest = 'forest',
  /** Urban environment with buildings */
  Urban = 'urban',
  /** Rocky, uneven terrain */
  Badlands = 'badlands',
  /** Arid desert environment */
  Desert = 'desert',
  /** Frozen tundra */
  Arctic = 'arctic',
  /** Swamps and wetlands */
  Swamp = 'swamp',
  /** Volcanic/lava terrain */
  Volcanic = 'volcanic',
  /** Tropical jungle */
  Jungle = 'jungle',
  /** Mountainous terrain */
  Mountains = 'mountains',
}

/**
 * Modifier effect types.
 */
export enum ModifierEffect {
  /** Positive for the player */
  Positive = 'positive',
  /** Negative for the player */
  Negative = 'negative',
  /** Neutral - affects both sides equally */
  Neutral = 'neutral',
}

/**
 * Skill level templates for OpFor pilots.
 */
export enum OpForSkillLevel {
  /** Green: Gunnery 5, Piloting 6 */
  Green = 'green',
  /** Regular: Gunnery 4, Piloting 5 */
  Regular = 'regular',
  /** Veteran: Gunnery 3, Piloting 4 */
  Veteran = 'veteran',
  /** Elite: Gunnery 2, Piloting 3 */
  Elite = 'elite',
  /** Legendary: Gunnery 1, Piloting 2 */
  Legendary = 'legendary',
  /** Mixed skills within the force */
  Mixed = 'mixed',
}

/**
 * Unit type categories for OpFor generation.
 */
export enum UnitTypeCategory {
  BattleMech = 'battlemech',
  Vehicle = 'vehicle',
  Infantry = 'infantry',
  BattleArmor = 'battle_armor',
  Aerospace = 'aerospace',
  ProtoMech = 'protomech',
  ConventionalFighter = 'conventional_fighter',
}

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

// =============================================================================
// OpFor Configuration Interface
// =============================================================================

/**
 * Unit type mix configuration.
 * Values are percentages that should sum to 100.
 */
export interface IUnitTypeMix {
  /** Percentage of BattleMechs */
  readonly [UnitTypeCategory.BattleMech]?: number;
  /** Percentage of Vehicles */
  readonly [UnitTypeCategory.Vehicle]?: number;
  /** Percentage of Infantry */
  readonly [UnitTypeCategory.Infantry]?: number;
  /** Percentage of Battle Armor */
  readonly [UnitTypeCategory.BattleArmor]?: number;
  /** Percentage of Aerospace */
  readonly [UnitTypeCategory.Aerospace]?: number;
  /** Percentage of ProtoMechs */
  readonly [UnitTypeCategory.ProtoMech]?: number;
  /** Percentage of Conventional Fighters */
  readonly [UnitTypeCategory.ConventionalFighter]?: number;
}

/**
 * Skill variance configuration.
 */
export interface ISkillVariance {
  /** Gunnery skill variance (+/- from base) */
  readonly gunneryVariance: number;
  /** Piloting skill variance (+/- from base) */
  readonly pilotingVariance: number;
  /** Chance for skill to be better than base (0-1) */
  readonly eliteChance: number;
  /** Chance for skill to be worse than base (0-1) */
  readonly greenChance: number;
}

/**
 * OpFor generation configuration.
 */
export interface IOpForGeneratorConfig {
  /** Player force total BV */
  readonly playerBV: number;
  /** Difficulty multiplier (0.5 = easy, 1.0 = normal, 1.5 = hard) */
  readonly difficultyMultiplier: number;
  /** Enemy faction for unit selection */
  readonly faction: string;
  /** Era for era-appropriate units */
  readonly era: string;
  /**
   * Year for temporal filtering of units.
   * When specified, only units available in this year will be selected.
   * Uses introductionYear and extinctionYear from unit data.
   * @see filterByYear in availabilityUtils
   */
  readonly year?: number;
  /** Unit type mix ratios */
  readonly unitTypeMix: IUnitTypeMix;
  /** Base skill level */
  readonly skillLevel: OpForSkillLevel;
  /** Skill variance settings */
  readonly skillVariance: ISkillVariance;
  /** Minimum lance size */
  readonly minLanceSize: number;
  /** Maximum lance size */
  readonly maxLanceSize: number;
  /** BV floor (stop if below this) */
  readonly bvFloor: number;
  /** BV ceiling (stop if above this) */
  readonly bvCeiling: number;
  /** Allow combined arms? */
  readonly allowCombinedArms: boolean;
  /** Weight class restrictions */
  readonly weightClassRestrictions?: readonly string[];
  /** Excluded unit chassis */
  readonly excludedChassis?: readonly string[];
}

/**
 * Result of OpFor generation.
 */
export interface IOpForGeneratorResult {
  /** Generated units */
  readonly units: readonly IGeneratedUnit[];
  /** Total BV of generated force */
  readonly totalBV: number;
  /** Target BV (for comparison) */
  readonly targetBV: number;
  /** BV deviation percentage */
  readonly bvDeviation: number;
  /** Generation metadata */
  readonly metadata: {
    readonly faction: string;
    readonly era: string;
    readonly difficultyMultiplier: number;
    readonly lanceCount: number;
  };
}

/**
 * Generated unit from OpFor generator.
 */
export interface IGeneratedUnit {
  /** Unit chassis name */
  readonly chassis: string;
  /** Unit variant name */
  readonly variant: string;
  /** Full unit designation */
  readonly designation: string;
  /** Unit BV */
  readonly bv: number;
  /** Unit tonnage */
  readonly tonnage: number;
  /** Unit type category */
  readonly unitType: UnitTypeCategory;
  /** Assigned pilot */
  readonly pilot: IGeneratedPilot;
  /** Lance assignment */
  readonly lanceId: string;
}

/**
 * Generated pilot for OpFor unit.
 */
export interface IGeneratedPilot {
  /** Pilot name */
  readonly name: string;
  /** Gunnery skill */
  readonly gunnery: number;
  /** Piloting skill */
  readonly piloting: number;
  /** Special abilities */
  readonly abilities?: readonly string[];
}

// =============================================================================
// Battle Modifier Interface
// =============================================================================

/**
 * When a modifier can apply.
 */
export interface IModifierApplicability {
  /** Minimum turn for modifier to apply (0 = start) */
  readonly minTurn?: number;
  /** Maximum turn for modifier (0 = entire game) */
  readonly maxTurn?: number;
  /** Required biomes for modifier */
  readonly biomes?: readonly BiomeType[];
  /** Required scenario types */
  readonly scenarioTypes?: readonly ScenarioObjectiveType[];
  /** Probability weight (higher = more likely) */
  readonly weight: number;
  /** Is this modifier exclusive with others? */
  readonly exclusiveWith?: readonly string[];
}

/**
 * Implementation details for a modifier.
 */
export interface IModifierImplementation {
  /** Type of implementation */
  readonly type:
    | 'reinforcement'
    | 'terrain_effect'
    | 'equipment_effect'
    | 'force_modifier'
    | 'objective_modifier';
  /** Implementation-specific parameters */
  readonly parameters: Readonly<Record<string, unknown>>;
}

/**
 * Battle modifier definition.
 */
export interface IBattleModifier {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Effect type (positive/negative/neutral for player) */
  readonly effect: ModifierEffect;
  /** When this modifier can apply */
  readonly applicability: IModifierApplicability;
  /** How this modifier is implemented */
  readonly implementation: IModifierImplementation;
  /** Tags for categorization */
  readonly tags: readonly string[];
}

// =============================================================================
// Terrain/Map Generation Interface
// =============================================================================

/**
 * Terrain feature configuration.
 */
export interface ITerrainFeature {
  /** Feature type */
  readonly type:
    | 'woods'
    | 'water'
    | 'rough'
    | 'building'
    | 'elevation'
    | 'road';
  /** Density (0-1, how much of the map) */
  readonly density: number;
  /** Clustering factor (0-1, how clumped) */
  readonly clustering: number;
}

/**
 * Map preset configuration.
 */
export interface IMapPreset {
  /** Unique identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Biome type */
  readonly biome: BiomeType;
  /** Map size (hex radius) */
  readonly radius: number;
  /** Terrain features */
  readonly features: readonly ITerrainFeature[];
  /** Elevation variance (0 = flat, 1 = mountainous) */
  readonly elevationVariance: number;
  /** Temperature range */
  readonly temperatureRange: {
    readonly min: number;
    readonly max: number;
  };
}

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
  /** Maximum modifiers to apply */
  readonly maxModifiers: number;
  /** Allow negative modifiers? */
  readonly allowNegativeModifiers: boolean;
  /** Random seed for reproducibility */
  readonly seed?: number;
}

// =============================================================================
// Type Guards
// =============================================================================

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

/**
 * Type guard for IBattleModifier.
 */
export function isBattleModifier(obj: unknown): obj is IBattleModifier {
  if (typeof obj !== 'object' || obj === null) return false;
  const modifier = obj as IBattleModifier;
  return (
    typeof modifier.id === 'string' &&
    typeof modifier.name === 'string' &&
    typeof modifier.effect === 'string' &&
    typeof modifier.applicability === 'object' &&
    typeof modifier.implementation === 'object'
  );
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
