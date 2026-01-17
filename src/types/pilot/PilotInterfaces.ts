/**
 * Pilot Interfaces
 * Core type definitions for the pilot system.
 *
 * @spec openspec/changes/add-pilot-system/specs/pilot-system/spec.md
 */

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

/**
 * Special ability that modifies pilot performance.
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
  /** Effect parameters (varies by effect type) */
  readonly effectParams: Record<string, unknown>;
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
