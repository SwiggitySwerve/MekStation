/**
 * Encounter System Interfaces
 * Type definitions for encounter configuration and game setup.
 *
 * @spec openspec/changes/add-encounter-system/specs/encounter-system/spec.md
 */

// =============================================================================
// Enums
// =============================================================================

/**
 * Encounter lifecycle status.
 */
export enum EncounterStatus {
  /** Configuration incomplete */
  Draft = 'draft',
  /** All required fields set, ready to launch */
  Ready = 'ready',
  /** Game session created and active */
  Launched = 'launched',
  /** Game finished */
  Completed = 'completed',
}

/**
 * Victory condition types.
 */
export enum VictoryConditionType {
  /** Eliminate all enemy units */
  DestroyAll = 'destroy_all',
  /** Destroy 50%+ enemy units by BV */
  Cripple = 'cripple',
  /** Force enemy to flee the map */
  Retreat = 'retreat',
  /** Turn limit reached - compare remaining BV */
  TurnLimit = 'turn_limit',
  /** Custom objective-based condition */
  Custom = 'custom',
}

/**
 * Pilot skill templates for OpFor generation.
 */
export enum PilotSkillTemplate {
  /** Green pilots: 5/6 */
  Green = 'green',
  /** Regular pilots: 4/5 */
  Regular = 'regular',
  /** Veteran pilots: 3/4 */
  Veteran = 'veteran',
  /** Elite pilots: 2/3 */
  Elite = 'elite',
  /** Mixed skills */
  Mixed = 'mixed',
}

/**
 * Scenario template types.
 */
export enum ScenarioTemplateType {
  /** 1v1 mech duel */
  Duel = 'duel',
  /** Lance vs lance (4v4) */
  Skirmish = 'skirmish',
  /** Company battle (12v12) */
  Battle = 'battle',
  /** Blank configuration */
  Custom = 'custom',
}

/**
 * Terrain preset types (MVP: clear only).
 */
export enum TerrainPreset {
  /** No terrain features */
  Clear = 'clear',
  /** Light woods scattered */
  LightWoods = 'light_woods',
  /** Heavy forest */
  HeavyWoods = 'heavy_woods',
  /** Urban environment */
  Urban = 'urban',
  /** Rocky/mountainous */
  Rough = 'rough',
}

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Victory condition definition.
 */
export interface IVictoryCondition {
  /** Condition type */
  readonly type: VictoryConditionType;
  /** For custom conditions: description */
  readonly description?: string;
  /** For turn limit: max turns */
  readonly turnLimit?: number;
  /** For cripple: percentage threshold (default 50) */
  readonly threshold?: number;
}

/**
 * Map configuration for an encounter.
 */
export interface IMapConfiguration {
  /** Hex radius from center (e.g., 5 = 11x11 hex grid) */
  readonly radius: number;
  /** Terrain preset */
  readonly terrain: TerrainPreset;
  /** Player deployment zone (edge hexes) */
  readonly playerDeploymentZone: 'north' | 'south' | 'east' | 'west';
  /** Opponent deployment zone (opposite of player) */
  readonly opponentDeploymentZone: 'north' | 'south' | 'east' | 'west';
}

/**
 * Opposing force generation configuration.
 */
export interface IOpForConfig {
  /** Target Battle Value (absolute) */
  readonly targetBV?: number;
  /** Target BV as percentage of player force (e.g., 100 = equal) */
  readonly targetBVPercent?: number;
  /** Era filter (optional) */
  readonly era?: string;
  /** Faction filter (optional) */
  readonly faction?: string;
  /** Unit type filter (optional) */
  readonly unitTypes?: readonly string[];
  /** Pilot skill template */
  readonly pilotSkillTemplate: PilotSkillTemplate;
}

/**
 * Reference to a force.
 */
export interface IForceReference {
  /** Force ID */
  readonly forceId: string;
  /** Force name (for display) */
  readonly forceName: string;
  /** Total BV of force */
  readonly totalBV: number;
  /** Unit count */
  readonly unitCount: number;
}

/**
 * Encounter entity.
 */
export interface IEncounter {
  /** Unique identifier */
  readonly id: string;
  /** Encounter name */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
  /** Current status */
  readonly status: EncounterStatus;
  /** Scenario template used (if any) */
  readonly template?: ScenarioTemplateType;
  /** Player force reference */
  readonly playerForce?: IForceReference;
  /** Opponent force (explicit) */
  readonly opponentForce?: IForceReference;
  /** Opponent force config (for generation) */
  readonly opForConfig?: IOpForConfig;
  /** Map configuration */
  readonly mapConfig: IMapConfiguration;
  /** Victory conditions */
  readonly victoryConditions: readonly IVictoryCondition[];
  /** Optional rules enabled */
  readonly optionalRules: readonly string[];
  /** Created timestamp */
  readonly createdAt: string;
  /** Updated timestamp */
  readonly updatedAt: string;
  /** Launched game session ID (if launched) */
  readonly gameSessionId?: string;
}

/**
 * Encounter creation input.
 */
export interface ICreateEncounterInput {
  /** Encounter name */
  readonly name: string;
  /** Optional description */
  readonly description?: string;
  /** Scenario template to apply */
  readonly template?: ScenarioTemplateType;
}

/**
 * Encounter update input.
 */
export interface IUpdateEncounterInput {
  /** Updated name */
  readonly name?: string;
  /** Updated description */
  readonly description?: string;
  /** Updated player force */
  readonly playerForceId?: string;
  /** Updated opponent force (explicit) */
  readonly opponentForceId?: string;
  /** Updated OpFor config */
  readonly opForConfig?: IOpForConfig;
  /** Updated map config */
  readonly mapConfig?: Partial<IMapConfiguration>;
  /** Updated victory conditions */
  readonly victoryConditions?: readonly IVictoryCondition[];
  /** Updated optional rules */
  readonly optionalRules?: readonly string[];
}

// =============================================================================
// Scenario Templates
// =============================================================================

/**
 * Scenario template definition.
 */
export interface IScenarioTemplate {
  /** Template type */
  readonly type: ScenarioTemplateType;
  /** Display name */
  readonly name: string;
  /** Description */
  readonly description: string;
  /** Default map configuration */
  readonly defaultMapConfig: IMapConfiguration;
  /** Default victory conditions */
  readonly defaultVictoryConditions: readonly IVictoryCondition[];
  /** Suggested unit count per side */
  readonly suggestedUnitCount: number;
  /** Suggested BV range */
  readonly suggestedBVRange: { min: number; max: number };
}

/**
 * Built-in scenario templates.
 */
export const SCENARIO_TEMPLATES: readonly IScenarioTemplate[] = [
  {
    type: ScenarioTemplateType.Duel,
    name: 'Duel',
    description: 'One-on-one mech combat',
    defaultMapConfig: {
      radius: 5,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    defaultVictoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    suggestedUnitCount: 1,
    suggestedBVRange: { min: 500, max: 3000 },
  },
  {
    type: ScenarioTemplateType.Skirmish,
    name: 'Skirmish',
    description: 'Lance vs Lance engagement',
    defaultMapConfig: {
      radius: 8,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    defaultVictoryConditions: [
      { type: VictoryConditionType.Cripple, threshold: 50 },
      { type: VictoryConditionType.TurnLimit, turnLimit: 15 },
    ],
    suggestedUnitCount: 4,
    suggestedBVRange: { min: 4000, max: 8000 },
  },
  {
    type: ScenarioTemplateType.Battle,
    name: 'Battle',
    description: 'Company-scale engagement',
    defaultMapConfig: {
      radius: 12,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    defaultVictoryConditions: [
      { type: VictoryConditionType.Cripple, threshold: 60 },
      { type: VictoryConditionType.TurnLimit, turnLimit: 20 },
    ],
    suggestedUnitCount: 12,
    suggestedBVRange: { min: 12000, max: 24000 },
  },
  {
    type: ScenarioTemplateType.Custom,
    name: 'Custom',
    description: 'Build your own scenario',
    defaultMapConfig: {
      radius: 6,
      terrain: TerrainPreset.Clear,
      playerDeploymentZone: 'south',
      opponentDeploymentZone: 'north',
    },
    defaultVictoryConditions: [{ type: VictoryConditionType.DestroyAll }],
    suggestedUnitCount: 1,
    suggestedBVRange: { min: 0, max: 100000 },
  },
];

// =============================================================================
// Validation
// =============================================================================

/**
 * Encounter validation result.
 */
export interface IEncounterValidationResult {
  /** Is encounter valid? */
  readonly valid: boolean;
  /** Validation errors */
  readonly errors: readonly string[];
  /** Validation warnings */
  readonly warnings: readonly string[];
}

/**
 * Validate an encounter is ready to launch.
 */
export function validateEncounter(encounter: IEncounter): IEncounterValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required: name
  if (!encounter.name || encounter.name.trim().length === 0) {
    errors.push('Encounter name is required');
  }

  // Required: player force
  if (!encounter.playerForce) {
    errors.push('Player force must be selected');
  }

  // Required: opponent force OR opFor config
  if (!encounter.opponentForce && !encounter.opForConfig) {
    errors.push('Opponent force or OpFor configuration is required');
  }

  // Required: at least one victory condition
  if (!encounter.victoryConditions || encounter.victoryConditions.length === 0) {
    errors.push('At least one victory condition is required');
  }

  // Validate victory conditions
  for (const vc of encounter.victoryConditions) {
    if (vc.type === VictoryConditionType.TurnLimit && (!vc.turnLimit || vc.turnLimit <= 0)) {
      errors.push('Turn limit victory condition requires a positive turn limit');
    }
  }

  // Warnings
  if (encounter.playerForce && encounter.opponentForce) {
    const bvDiff = Math.abs(encounter.playerForce.totalBV - encounter.opponentForce.totalBV);
    const avgBV = (encounter.playerForce.totalBV + encounter.opponentForce.totalBV) / 2;
    if (bvDiff / avgBV > 0.3) {
      warnings.push('Force BV difference is greater than 30% - battle may be unbalanced');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for IEncounter.
 */
export function isEncounter(obj: unknown): obj is IEncounter {
  if (typeof obj !== 'object' || obj === null) return false;
  const enc = obj as IEncounter;
  return (
    typeof enc.id === 'string' &&
    typeof enc.name === 'string' &&
    typeof enc.status === 'string' &&
    typeof enc.mapConfig === 'object' &&
    Array.isArray(enc.victoryConditions)
  );
}

/**
 * Type guard for IVictoryCondition.
 */
export function isVictoryCondition(obj: unknown): obj is IVictoryCondition {
  if (typeof obj !== 'object' || obj === null) return false;
  const vc = obj as IVictoryCondition;
  return typeof vc.type === 'string';
}
