/**
 * Against the Bot (AtB) Scenario Generation Types
 *
 * Defines combat roles, morale levels, scenario types, and conditions
 * for dynamic scenario generation based on MekHQ's AtB system.
 *
 * @module campaign/scenario/scenarioTypes
 */

// =============================================================================
// Combat Role Enum
// =============================================================================

/**
 * Combat roles for force organization in AtB scenarios.
 *
 * Each role has different battle chances and scenario type tables.
 * Roles are force-level (per combat team), not person-level.
 *
 * @example
 * const role: CombatRole = CombatRole.MANEUVER;
 */
export enum CombatRole {
  /** Maneuver forces - high mobility, 40% battle chance */
  MANEUVER = 'maneuver',

  /** Frontline forces - direct combat, 20% battle chance */
  FRONTLINE = 'frontline',

  /** Patrol forces - reconnaissance, 60% battle chance */
  PATROL = 'patrol',

  /** Training forces - green units, 10% battle chance */
  TRAINING = 'training',

  /** Cadre forces - experienced trainers, 10% battle chance */
  CADRE = 'cadre',

  /** Auxiliary forces - support units, 0% battle chance */
  AUXILIARY = 'auxiliary',

  /** Reserve forces - held in reserve, 0% battle chance */
  RESERVE = 'reserve',
}

// =============================================================================
// Morale Level Enum
// =============================================================================

/**
 * AtB morale levels for contracts.
 *
 * Morale affects battle type modifier and scenario selection.
 * Ranges from ROUTED (-3) to OVERWHELMING (+3), with STALEMATE (0) as default.
 *
 * @example
 * const morale: AtBMoraleLevel = AtBMoraleLevel.STALEMATE;
 * const value = MORALE_VALUES[morale]; // 0
 */
export enum AtBMoraleLevel {
  /** Routed - unit is broken and fleeing (-3) */
  ROUTED = 'routed',

  /** Critical - unit is in crisis (-2) */
  CRITICAL = 'critical',

  /** Weakened - unit is damaged and demoralized (-1) */
  WEAKENED = 'weakened',

  /** Stalemate - unit is holding steady (0, default) */
  STALEMATE = 'stalemate',

  /** Advancing - unit is gaining ground (+1) */
  ADVANCING = 'advancing',

  /** Dominating - unit is in control (+2) */
  DOMINATING = 'dominating',

  /** Overwhelming - unit is crushing the enemy (+3) */
  OVERWHELMING = 'overwhelming',
}

/**
 * Numeric values for morale levels.
 *
 * Used for calculations like battle type modifier:
 * `battleTypeMod = 1 + (STALEMATE.value - current.value) × 5`
 *
 * @example
 * const value = MORALE_VALUES[AtBMoraleLevel.ROUTED]; // -3
 */
export const MORALE_VALUES: Record<AtBMoraleLevel, number> = {
  [AtBMoraleLevel.ROUTED]: -3,
  [AtBMoraleLevel.CRITICAL]: -2,
  [AtBMoraleLevel.WEAKENED]: -1,
  [AtBMoraleLevel.STALEMATE]: 0,
  [AtBMoraleLevel.ADVANCING]: 1,
  [AtBMoraleLevel.DOMINATING]: 2,
  [AtBMoraleLevel.OVERWHELMING]: 3,
};

// =============================================================================
// Scenario Type Enum
// =============================================================================

/**
 * AtB scenario types for dynamic scenario generation.
 *
 * Each scenario type has different objectives and force composition rules.
 * Scenario type is selected based on combat role and morale level.
 *
 * @example
 * const type: AtBScenarioType = AtBScenarioType.STANDUP;
 */
export enum AtBScenarioType {
  /** Base Attack - defend or attack a base */
  BASE_ATTACK = 'base_attack',

  /** Breakthrough - break through enemy lines */
  BREAKTHROUGH = 'breakthrough',

  /** Standup - direct engagement battle */
  STANDUP = 'standup',

  /** Chase - pursue or evade enemy forces */
  CHASE = 'chase',

  /** Hold the Line - defend a position */
  HOLD_THE_LINE = 'hold_the_line',

  /** Hide and Seek - find and eliminate hidden forces */
  HIDE_AND_SEEK = 'hide_and_seek',

  /** Probe - reconnaissance in force */
  PROBE = 'probe',

  /** Extraction - rescue or retrieve objective */
  EXTRACTION = 'extraction',

  /** Recon Raid - raid and gather intelligence */
  RECON_RAID = 'recon_raid',
}

// =============================================================================
// Combat Team Interface
// =============================================================================

/**
 * Combat team for AtB scenario generation.
 *
 * A combat team is a force assigned to a specific role with a battle chance.
 * Teams are checked weekly for battle generation.
 *
 * @example
 * const team: ICombatTeam = {
 *   forceId: 'force-001',
 *   role: CombatRole.MANEUVER,
 *   battleChance: 40,
 * };
 */
export interface ICombatTeam {
  /** ID of the force assigned to this team */
  readonly forceId: string;

  /** Combat role for this team */
  readonly role: CombatRole;

  /** Battle chance percentage (0-100) */
  readonly battleChance: number;
}

// =============================================================================
// Scenario Conditions Interface
// =============================================================================

/**
 * Environmental conditions for a scenario.
 *
 * Conditions affect unit availability and force composition.
 * All fields are optional for backward compatibility.
 *
 * @example
 * const conditions: IScenarioConditions = {
 *   light: 'daylight',
 *   weather: 'clear',
 *   gravity: 1.0,
 *   temperature: 20,
 *   atmosphere: 'standard',
 * };
 */
export interface IScenarioConditions {
  /** Light level during scenario */
  readonly light?: 'daylight' | 'dusk' | 'full_moon' | 'moonless' | 'pitch_black';

  /** Weather conditions */
  readonly weather?:
    | 'clear'
    | 'light_rain'
    | 'heavy_rain'
    | 'sleet'
    | 'snow'
    | 'fog'
    | 'sandstorm';

  /** Planetary gravity (0.2 - 1.5 G) */
  readonly gravity?: number;

  /** Temperature in Celsius (-30 to +50) */
  readonly temperature?: number;

  /** Atmospheric composition */
  readonly atmosphere?: 'standard' | 'thin' | 'dense' | 'toxic' | 'tainted';
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard for CombatRole.
 *
 * @param value - Value to check
 * @returns true if value is a valid CombatRole
 *
 * @example
 * if (isCombatRole(value)) {
 *   // value is CombatRole
 * }
 */
export function isCombatRole(value: unknown): value is CombatRole {
  return Object.values(CombatRole).includes(value as CombatRole);
}

/**
 * Type guard for AtBMoraleLevel.
 *
 * @param value - Value to check
 * @returns true if value is a valid AtBMoraleLevel
 *
 * @example
 * if (isMoraleLevel(value)) {
 *   // value is AtBMoraleLevel
 * }
 */
export function isMoraleLevel(value: unknown): value is AtBMoraleLevel {
  return Object.values(AtBMoraleLevel).includes(value as AtBMoraleLevel);
}

/**
 * Type guard for AtBScenarioType.
 *
 * @param value - Value to check
 * @returns true if value is a valid AtBScenarioType
 *
 * @example
 * if (isScenarioType(value)) {
 *   // value is AtBScenarioType
 * }
 */
export function isScenarioType(value: unknown): value is AtBScenarioType {
  return Object.values(AtBScenarioType).includes(value as AtBScenarioType);
}
