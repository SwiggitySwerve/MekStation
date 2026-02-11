/**
 * Pilot Interfaces
 * Core type definitions for the pilot system.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

import type { IPilotAward, IPilotStats } from '../award/AwardInterfaces';

import { IEntity } from '../core/IEntity';

// =============================================================================
// Enums
// =============================================================================

/**
 * Pilot type determines persistence and tracking behavior.
 */
export enum PilotType {
  /** Full database storage with career tracking */
  Persistent = 'persistent',
  /** Inline definition, no storage - for quick NPCs */
  Statblock = 'statblock',
}

/**
 * Pilot status for campaign tracking.
 */
export enum PilotStatus {
  Active = 'active',
  Injured = 'injured',
  MIA = 'mia',
  KIA = 'kia',
  Retired = 'retired',
}

/**
 * Experience level templates for quick pilot generation.
 *
 * Pilot experience level for skills and salary calculations.
 * @see SkillExperienceLevel for character progression in campaign skills
 * @see MarketExperienceLevel for personnel market hiring
 */
export enum PilotExperienceLevel {
  Green = 'green',
  Regular = 'regular',
  Veteran = 'veteran',
  Elite = 'elite',
}

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Pilot combat skills.
 * Lower values are better (BattleTech convention).
 */
export interface IPilotSkills {
  /** Gunnery skill (1-8, lower is better). Default: 4 */
  readonly gunnery: number;
  /** Piloting skill (1-8, lower is better). Default: 5 */
  readonly piloting: number;
}

/**
 * Kill record for tracking pilot achievements.
 */
export interface IKillRecord {
  /** ID of the killed unit */
  readonly targetId: string;
  /** Name of the killed unit */
  readonly targetName: string;
  /** Weapon used for the kill */
  readonly weaponUsed: string;
  /** Date of the kill */
  readonly date: string;
  /** Game session ID where kill occurred */
  readonly gameId: string;
}

/**
 * Mission record for tracking pilot history.
 */
export interface IMissionRecord {
  /** Mission/game session ID */
  readonly gameId: string;
  /** Mission name or description */
  readonly missionName: string;
  /** Date of the mission */
  readonly date: string;
  /** Outcome of the mission */
  readonly outcome: 'victory' | 'defeat' | 'draw';
  /** XP earned in this mission */
  readonly xpEarned: number;
  /** Kills in this mission */
  readonly kills: number;
}

/**
 * Pilot career statistics and progression.
 */
export interface IPilotCareer {
  /** Total missions completed */
  readonly missionsCompleted: number;
  /** Total victories */
  readonly victories: number;
  /** Total defeats */
  readonly defeats: number;
  /** Total draws */
  readonly draws: number;
  /** Total kills across all missions */
  readonly totalKills: number;
  /** Detailed kill records */
  readonly killRecords: readonly IKillRecord[];
  /** Mission history */
  readonly missionHistory: readonly IMissionRecord[];
  /** Current XP pool (available for spending) */
  readonly xp: number;
  /** Total XP ever earned */
  readonly totalXpEarned: number;
  /** Pilot rank/title */
  readonly rank: string;
}

// =============================================================================
// Effect Parameter Types (Discriminated Union)
// =============================================================================

/**
 * Effect parameters for to-hit modifier abilities.
 * Used with AbilityEffectType.ToHitModifier
 */
export interface IToHitModifierParams {
  /** To-hit roll modifier (negative = better) */
  readonly modifier: number;
  /** Optional condition when this modifier applies */
  readonly condition?: 'aimed_shot' | 'medium_range' | 'multi_target' | string;
  /** Optional weapon type filter */
  readonly weaponType?: 'selected' | string;
  /** Optional weapon category filter */
  readonly weaponCategory?: 'direct_fire' | 'missile' | string;
  /** Optional range restriction */
  readonly range?: 'short' | 'medium' | 'long';
}

/**
 * Effect parameters for damage modifier abilities.
 * Used with AbilityEffectType.DamageModifier
 */
export interface IDamageModifierParams {
  /** Damage multiplier (e.g., 1.5 for +50% damage) */
  readonly multiplier?: number;
  /** Cluster hit table column shift for missiles */
  readonly clusterColumnShift?: number;
  /** Optional weapon category filter */
  readonly weaponCategory?: 'missile' | 'ballistic' | 'energy' | string;
  /** Optional weapon type filter */
  readonly weaponType?: string;
}

/**
 * Effect parameters for piloting modifier abilities.
 * Used with AbilityEffectType.PilotingModifier
 */
export interface IPilotingModifierParams {
  /** Piloting skill roll modifier (negative = better) */
  readonly modifier: number;
  /** Condition when this modifier applies */
  readonly condition?:
    | 'jump_landing'
    | 'dfa_attack'
    | 'difficult_terrain'
    | string;
}

/**
 * Effect parameters for target movement modifier abilities.
 * Used with AbilityEffectType.TMMModifier
 */
export interface ITMMModifierParams {
  /** TMM modifier (positive = harder to hit) */
  readonly modifier: number;
  /** Condition when this modifier applies */
  readonly condition?: 'running_or_jumping' | string;
}

/**
 * Effect parameters for consciousness check modifier abilities.
 * Used with AbilityEffectType.ConsciousnessModifier
 */
export interface IConsciousnessModifierParams {
  /** Consciousness check modifier (negative = better) */
  readonly modifier: number;
}

/**
 * Effect parameters for heat management abilities.
 * Used with AbilityEffectType.HeatModifier
 */
export interface IHeatModifierParams {
  /** Heat reduction per turn */
  readonly heatReduction?: number;
  /** Shutdown threshold increase */
  readonly shutdownThresholdIncrease?: number;
}

/**
 * Effect parameters for initiative modifier abilities.
 * Used with AbilityEffectType.InitiativeModifier
 */
export interface IInitiativeModifierParams {
  /** Initiative roll modifier */
  readonly modifier: number;
}

/**
 * Effect parameters for special abilities with unique mechanics.
 * Used with AbilityEffectType.Special
 */
export interface ISpecialAbilityParams {
  /** Ignore first wound penalty */
  readonly ignoreFirstWoundPenalty?: boolean;
  /** Number of rerolls per game */
  readonly rerollsPerGame?: number;
  /** Extra movement hexes */
  readonly extraMovement?: number;
  /** Heat cost for extra movement */
  readonly heatCost?: number;
  /** Condition when special ability applies */
  readonly condition?: string;
  /** Other special parameters */
  readonly [key: string]: unknown;
}

/**
 * Discriminated union of all effect parameter types.
 * The type is determined by the effectType field in ISpecialAbility.
 */
export type AbilityEffectParams =
  | IToHitModifierParams
  | IDamageModifierParams
  | IPilotingModifierParams
  | ITMMModifierParams
  | IConsciousnessModifierParams
  | IHeatModifierParams
  | IInitiativeModifierParams
  | ISpecialAbilityParams;

/**
 * Special ability that modifies pilot performance.
 *
 * The effectParams type is determined by the effectType field:
 * - ToHitModifier → IToHitModifierParams
 * - DamageModifier → IDamageModifierParams
 * - PilotingModifier → IPilotingModifierParams
 * - TMMModifier → ITMMModifierParams
 * - ConsciousnessModifier → IConsciousnessModifierParams
 * - HeatModifier → IHeatModifierParams
 * - InitiativeModifier → IInitiativeModifierParams
 * - Special → ISpecialAbilityParams
 */
export interface ISpecialAbility {
  /** Unique ability identifier */
  readonly id: string;
  /** Display name */
  readonly name: string;
  /** Description of the ability */
  readonly description: string;
  /** XP cost to acquire */
  readonly xpCost: number;
  /** Prerequisites (ability IDs that must be owned first) */
  readonly prerequisites: readonly string[];
  /** Minimum gunnery skill required (optional) */
  readonly minGunnery?: number;
  /** Minimum piloting skill required (optional) */
  readonly minPiloting?: number;
  /** Effect type for game mechanics */
  readonly effectType: AbilityEffectType;
  /** Effect parameters (type varies by effectType) */
  readonly effectParams: AbilityEffectParams;
}

/**
 * Types of ability effects for game mechanics.
 */
export enum AbilityEffectType {
  /** Modifies to-hit roll */
  ToHitModifier = 'to_hit_modifier',
  /** Modifies damage */
  DamageModifier = 'damage_modifier',
  /** Modifies piloting checks */
  PilotingModifier = 'piloting_modifier',
  /** Modifies target movement modifier */
  TMMModifier = 'tmm_modifier',
  /** Modifies consciousness checks */
  ConsciousnessModifier = 'consciousness_modifier',
  /** Modifies heat management */
  HeatModifier = 'heat_modifier',
  /** Modifies initiative */
  InitiativeModifier = 'initiative_modifier',
  /** Special/custom effect */
  Special = 'special',
}

/**
 * Reference to an ability owned by a pilot.
 */
export interface IPilotAbilityRef {
  /** Ability ID */
  readonly abilityId: string;
  /** Date acquired */
  readonly acquiredDate: string;
  /** Game session where acquired (if applicable) */
  readonly acquiredGameId?: string;
}

/**
 * Pilot identity information.
 */
export interface IPilotIdentity {
  /** Display name */
  readonly name: string;
  /** Callsign/nickname (optional) */
  readonly callsign?: string;
  /** Faction/house affiliation (optional) */
  readonly affiliation?: string;
  /** Portrait image URL or identifier (optional) */
  readonly portrait?: string;
  /** Background notes/biography (optional) */
  readonly background?: string;
}

/**
 * Complete pilot entity.
 */
export interface IPilot extends IEntity, IPilotIdentity {
  /** Pilot type (persistent or statblock) */
  readonly type: PilotType;
  /** Current status */
  readonly status: PilotStatus;
  /** Combat skills */
  readonly skills: IPilotSkills;
  /** Current wounds (0-6, 6 = death) */
  readonly wounds: number;
  /** Career statistics (only for persistent pilots) */
  readonly career?: IPilotCareer;
  /** Special abilities owned */
  readonly abilities: readonly IPilotAbilityRef[];
  /** Awards earned by this pilot */
  readonly awards?: readonly IPilotAward[];
  /** Detailed combat and career statistics for award tracking */
  readonly stats?: IPilotStats;
  /** Creation timestamp */
  readonly createdAt: string;
  /** Last update timestamp */
  readonly updatedAt: string;
}

// =============================================================================
// Creation Types
// =============================================================================

/**
 * Options for creating a new pilot.
 */
export interface ICreatePilotOptions {
  /** Pilot identity */
  readonly identity: IPilotIdentity;
  /** Pilot type */
  readonly type: PilotType;
  /** Initial skills */
  readonly skills: IPilotSkills;
  /** Initial abilities (by ID) */
  readonly abilityIds?: readonly string[];
  /** Starting XP (for persistent pilots) */
  readonly startingXp?: number;
  /** Initial rank */
  readonly rank?: string;
}

/**
 * Template for quick pilot generation.
 */
export interface IPilotTemplate {
  /** Template level */
  readonly level: PilotExperienceLevel;
  /** Display name */
  readonly name: string;
  /** Default skills for this level */
  readonly skills: IPilotSkills;
  /** Starting XP budget */
  readonly startingXp: number;
  /** Description */
  readonly description: string;
}

// =============================================================================
// Statblock Type (Inline Pilot Definition)
// =============================================================================

/**
 * Minimal pilot definition for quick NPC creation.
 * Not persisted to database.
 */
export interface IPilotStatblock {
  /** Display name */
  readonly name: string;
  /** Gunnery skill */
  readonly gunnery: number;
  /** Piloting skill */
  readonly piloting: number;
  /** Optional abilities (by ID) */
  readonly abilityIds?: readonly string[];
}

// =============================================================================
// Type Guards
// =============================================================================

/**
 * Type guard to check if an object is an IPilot.
 */
export function isPilot(obj: unknown): obj is IPilot {
  if (typeof obj !== 'object' || obj === null) return false;
  const pilot = obj as IPilot;
  return (
    typeof pilot.id === 'string' &&
    typeof pilot.name === 'string' &&
    typeof pilot.type === 'string' &&
    typeof pilot.status === 'string' &&
    typeof pilot.skills === 'object' &&
    typeof pilot.skills.gunnery === 'number' &&
    typeof pilot.skills.piloting === 'number' &&
    typeof pilot.wounds === 'number' &&
    Array.isArray(pilot.abilities)
  );
}

/**
 * Type guard to check if an object is an IPilotStatblock.
 */
export function isPilotStatblock(obj: unknown): obj is IPilotStatblock {
  if (typeof obj !== 'object' || obj === null) return false;
  const statblock = obj as IPilotStatblock;
  return (
    typeof statblock.name === 'string' &&
    typeof statblock.gunnery === 'number' &&
    typeof statblock.piloting === 'number'
  );
}

// =============================================================================
// Effect Parameter Type Guards
// =============================================================================

/**
 * Type guard for to-hit modifier parameters.
 */
export function isToHitModifierParams(
  params: AbilityEffectParams,
): params is IToHitModifierParams {
  return 'modifier' in params && typeof params.modifier === 'number';
}

/**
 * Type guard for damage modifier parameters.
 */
export function isDamageModifierParams(
  params: AbilityEffectParams,
): params is IDamageModifierParams {
  return 'multiplier' in params || 'clusterColumnShift' in params;
}

/**
 * Type guard for piloting modifier parameters.
 */
export function isPilotingModifierParams(
  params: AbilityEffectParams,
): params is IPilotingModifierParams {
  return 'modifier' in params && typeof params.modifier === 'number';
}

/**
 * Type guard for TMM modifier parameters.
 */
export function isTMMModifierParams(
  params: AbilityEffectParams,
): params is ITMMModifierParams {
  return 'modifier' in params && typeof params.modifier === 'number';
}

/**
 * Type guard for consciousness modifier parameters.
 */
export function isConsciousnessModifierParams(
  params: AbilityEffectParams,
): params is IConsciousnessModifierParams {
  return 'modifier' in params && typeof params.modifier === 'number';
}

/**
 * Type guard for heat modifier parameters.
 */
export function isHeatModifierParams(
  params: AbilityEffectParams,
): params is IHeatModifierParams {
  return 'heatReduction' in params || 'shutdownThresholdIncrease' in params;
}

/**
 * Type guard for initiative modifier parameters.
 */
export function isInitiativeModifierParams(
  params: AbilityEffectParams,
): params is IInitiativeModifierParams {
  return 'modifier' in params && typeof params.modifier === 'number';
}

/**
 * Type guard for special ability parameters.
 */
export function isSpecialAbilityParams(
  params: AbilityEffectParams,
): params is ISpecialAbilityParams {
  return (
    'ignoreFirstWoundPenalty' in params ||
    'rerollsPerGame' in params ||
    'extraMovement' in params
  );
}

/**
 * Get typed effect parameters based on effect type.
 * Provides runtime type narrowing for effect parameters.
 *
 * @example
 * ```typescript
 * const ability = getAbility('marksman');
 * const params = getTypedEffectParams(ability.effectType, ability.effectParams);
 * if (params.type === 'ToHitModifier') {
 *   logger.debug(params.params.modifier); // Type-safe access
 * }
 * ```
 */
export function getTypedEffectParams(
  effectType: AbilityEffectType,
  params: AbilityEffectParams,
):
  | { type: 'ToHitModifier'; params: IToHitModifierParams }
  | { type: 'DamageModifier'; params: IDamageModifierParams }
  | { type: 'PilotingModifier'; params: IPilotingModifierParams }
  | { type: 'TMMModifier'; params: ITMMModifierParams }
  | { type: 'ConsciousnessModifier'; params: IConsciousnessModifierParams }
  | { type: 'HeatModifier'; params: IHeatModifierParams }
  | { type: 'InitiativeModifier'; params: IInitiativeModifierParams }
  | { type: 'Special'; params: ISpecialAbilityParams } {
  switch (effectType) {
    case AbilityEffectType.ToHitModifier:
      return { type: 'ToHitModifier', params: params as IToHitModifierParams };
    case AbilityEffectType.DamageModifier:
      return {
        type: 'DamageModifier',
        params: params as IDamageModifierParams,
      };
    case AbilityEffectType.PilotingModifier:
      return {
        type: 'PilotingModifier',
        params: params as IPilotingModifierParams,
      };
    case AbilityEffectType.TMMModifier:
      return { type: 'TMMModifier', params: params as ITMMModifierParams };
    case AbilityEffectType.ConsciousnessModifier:
      return {
        type: 'ConsciousnessModifier',
        params: params as IConsciousnessModifierParams,
      };
    case AbilityEffectType.HeatModifier:
      return { type: 'HeatModifier', params: params as IHeatModifierParams };
    case AbilityEffectType.InitiativeModifier:
      return {
        type: 'InitiativeModifier',
        params: params as IInitiativeModifierParams,
      };
    case AbilityEffectType.Special:
      return { type: 'Special', params: params as ISpecialAbilityParams };
    default:
      return { type: 'Special', params: params as ISpecialAbilityParams };
  }
}
