/**
 * Damage System Types
 *
 * Defines damage types, hit locations, and damage resolution.
 *
 * @spec openspec/specs/damage-system/spec.md
 */

import { MechLocation } from '../construction/CriticalSlotAllocation';

/**
 * Damage type enumeration
 */
export enum DamageType {
  STANDARD = 'Standard',
  CLUSTER = 'Cluster',
  PULSE = 'Pulse',
  STREAK = 'Streak',
  EXPLOSIVE = 'Explosive',
  HEAT = 'Heat',
  SPECIAL = 'Special',
}

/**
 * Hit location tables
 */
export enum HitLocationTable {
  MECH_FRONT = 'Mech Front',
  MECH_REAR = 'Mech Rear',
  MECH_LEFT = 'Mech Left Side',
  MECH_RIGHT = 'Mech Right Side',
  MECH_PUNCH = 'Punch',
  MECH_KICK = 'Kick',
}

/**
 * Hit location roll result
 */
export interface HitLocationResult {
  readonly roll: number;
  readonly location: MechLocation;
  readonly isRear: boolean;
  readonly isCriticalCandidate: boolean;
}

/**
 * Front hit location table (attacking from front arc)
 * 2d6 roll -> location
 * Per TechManual p.109
 */
export const FRONT_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.CENTER_TORSO, // CT (Through Armor Critical)
  3: MechLocation.RIGHT_ARM,
  4: MechLocation.RIGHT_ARM,
  5: MechLocation.RIGHT_LEG,
  6: MechLocation.RIGHT_TORSO,
  7: MechLocation.CENTER_TORSO,
  8: MechLocation.LEFT_TORSO,
  9: MechLocation.LEFT_LEG,
  10: MechLocation.LEFT_ARM,
  11: MechLocation.LEFT_ARM,
  12: MechLocation.HEAD,
};

/**
 * Rear hit location table (attacking from rear arc)
 * Same distribution as front, but hits rear armor
 * Per TechManual p.109
 */
export const REAR_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.CENTER_TORSO, // CT (Through Armor Critical)
  3: MechLocation.RIGHT_ARM,
  4: MechLocation.RIGHT_ARM,
  5: MechLocation.RIGHT_LEG,
  6: MechLocation.RIGHT_TORSO,
  7: MechLocation.CENTER_TORSO,
  8: MechLocation.LEFT_TORSO,
  9: MechLocation.LEFT_LEG,
  10: MechLocation.LEFT_ARM,
  11: MechLocation.LEFT_ARM,
  12: MechLocation.HEAD,
};

/**
 * Left side hit location table (attacking from left arc)
 * Favors left-side locations
 * Per TechManual p.109
 */
export const LEFT_SIDE_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.LEFT_TORSO, // LT (Through Armor Critical)
  3: MechLocation.LEFT_LEG,
  4: MechLocation.LEFT_ARM,
  5: MechLocation.LEFT_ARM,
  6: MechLocation.LEFT_LEG,
  7: MechLocation.LEFT_TORSO,
  8: MechLocation.CENTER_TORSO,
  9: MechLocation.RIGHT_TORSO,
  10: MechLocation.RIGHT_ARM,
  11: MechLocation.RIGHT_LEG,
  12: MechLocation.HEAD,
};

/**
 * Right side hit location table (attacking from right arc)
 * Favors right-side locations
 * Per TechManual p.109
 */
export const RIGHT_SIDE_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.RIGHT_TORSO, // RT (Through Armor Critical)
  3: MechLocation.RIGHT_LEG,
  4: MechLocation.RIGHT_ARM,
  5: MechLocation.RIGHT_ARM,
  6: MechLocation.RIGHT_LEG,
  7: MechLocation.RIGHT_TORSO,
  8: MechLocation.CENTER_TORSO,
  9: MechLocation.LEFT_TORSO,
  10: MechLocation.LEFT_ARM,
  11: MechLocation.LEFT_LEG,
  12: MechLocation.HEAD,
};

/**
 * Punch hit location table (1d6)
 * Per TechManual p.109
 */
export const PUNCH_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  1: MechLocation.LEFT_ARM,
  2: MechLocation.LEFT_TORSO,
  3: MechLocation.CENTER_TORSO,
  4: MechLocation.RIGHT_TORSO,
  5: MechLocation.RIGHT_ARM,
  6: MechLocation.HEAD,
};

/**
 * Kick hit location table (1d6)
 * Per TechManual p.109
 */
export const KICK_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  1: MechLocation.RIGHT_LEG,
  2: MechLocation.RIGHT_LEG,
  3: MechLocation.RIGHT_LEG,
  4: MechLocation.LEFT_LEG,
  5: MechLocation.LEFT_LEG,
  6: MechLocation.LEFT_LEG,
};

/**
 * Through Armor Critical (TAC) locations by attack direction
 * Roll of 2 on location determines which location gets TAC
 */
export const TAC_LOCATIONS: Record<HitLocationTable, MechLocation> = {
  [HitLocationTable.MECH_FRONT]: MechLocation.CENTER_TORSO,
  [HitLocationTable.MECH_REAR]: MechLocation.CENTER_TORSO,
  [HitLocationTable.MECH_LEFT]: MechLocation.LEFT_TORSO,
  [HitLocationTable.MECH_RIGHT]: MechLocation.RIGHT_TORSO,
  [HitLocationTable.MECH_PUNCH]: MechLocation.LEFT_ARM, // N/A for punch
  [HitLocationTable.MECH_KICK]: MechLocation.RIGHT_LEG, // N/A for kick
};

/**
 * Cluster hit table
 * Maps dice roll to number of missiles that hit for different launcher sizes
 */
export const CLUSTER_HIT_TABLE: Record<number, Record<number, number>> = {
  // Roll -> { missiles -> hits }
  2: { 2: 1, 4: 1, 5: 1, 6: 2, 10: 3, 15: 5, 20: 6 },
  3: { 2: 1, 4: 2, 5: 2, 6: 2, 10: 4, 15: 5, 20: 6 },
  4: { 2: 1, 4: 2, 5: 2, 6: 3, 10: 4, 15: 6, 20: 8 },
  5: { 2: 1, 4: 2, 5: 3, 6: 3, 10: 6, 15: 8, 20: 10 },
  6: { 2: 1, 4: 2, 5: 3, 6: 4, 10: 6, 15: 9, 20: 12 },
  7: { 2: 1, 4: 3, 5: 3, 6: 4, 10: 6, 15: 9, 20: 12 },
  8: { 2: 2, 4: 3, 5: 3, 6: 4, 10: 8, 15: 10, 20: 14 },
  9: { 2: 2, 4: 3, 5: 4, 6: 5, 10: 8, 15: 12, 20: 16 },
  10: { 2: 2, 4: 3, 5: 4, 6: 5, 10: 10, 15: 12, 20: 16 },
  11: { 2: 2, 4: 4, 5: 5, 6: 6, 10: 10, 15: 15, 20: 18 },
  12: { 2: 2, 4: 4, 5: 5, 6: 6, 10: 10, 15: 15, 20: 20 },
};

/**
 * Damage record for tracking
 */
export interface DamageRecord {
  readonly turn: number;
  readonly phase: string;
  readonly attacker: string;
  readonly weapon: string;
  readonly damageType: DamageType;
  readonly totalDamage: number;
  readonly hits: readonly DamageHit[];
}

/**
 * Individual damage hit
 */
export interface DamageHit {
  readonly location: MechLocation;
  readonly isRear: boolean;
  readonly armorDamage: number;
  readonly structureDamage: number;
  readonly criticalHits: number;
  readonly wasTransferred: boolean;
}

/**
 * Get the appropriate hit location table for an attack direction
 */
export function getHitLocationTable(
  table: HitLocationTable,
): Record<number, MechLocation> {
  switch (table) {
    case HitLocationTable.MECH_FRONT:
      return FRONT_HIT_LOCATION_TABLE;
    case HitLocationTable.MECH_REAR:
      return REAR_HIT_LOCATION_TABLE;
    case HitLocationTable.MECH_LEFT:
      return LEFT_SIDE_HIT_LOCATION_TABLE;
    case HitLocationTable.MECH_RIGHT:
      return RIGHT_SIDE_HIT_LOCATION_TABLE;
    case HitLocationTable.MECH_PUNCH:
      return PUNCH_HIT_LOCATION_TABLE;
    case HitLocationTable.MECH_KICK:
      return KICK_HIT_LOCATION_TABLE;
    default:
      return FRONT_HIT_LOCATION_TABLE;
  }
}

/**
 * Get hit location from roll
 *
 * @param roll - 2d6 roll for standard tables, 1d6 for punch/kick
 * @param table - Which hit location table to use based on attack direction
 */
export function getHitLocation(
  roll: number,
  table: HitLocationTable,
): HitLocationResult {
  const locationTable = getHitLocationTable(table);
  const location = locationTable[roll] ?? MechLocation.CENTER_TORSO;

  // Determine if this is a rear hit
  const isRear = table === HitLocationTable.MECH_REAR;

  // Through Armor Critical (TAC) on roll of 2 for 2d6 tables
  // Punch/Kick use 1d6 so roll of 2 is not special
  const isPunchOrKick =
    table === HitLocationTable.MECH_PUNCH ||
    table === HitLocationTable.MECH_KICK;
  const isTACCandidate = !isPunchOrKick && roll === 2;

  // Head hit on 12 is always critical candidate
  const isHeadHit = roll === 12 && !isPunchOrKick;

  return {
    roll,
    location,
    isRear,
    isCriticalCandidate: isTACCandidate || isHeadHit,
  };
}

/**
 * Determine attack direction based on attacker and target facing
 *
 * @param attackerHex - Attacker's hex position
 * @param targetHex - Target's hex position
 * @param targetFacing - Target's facing direction (0-5)
 * @returns The appropriate hit location table
 */
export function determineAttackDirection(
  attackerHex: { x: number; y: number },
  targetHex: { x: number; y: number },
  targetFacing: number,
): HitLocationTable {
  // Calculate relative direction from target to attacker
  const dx = attackerHex.x - targetHex.x;
  const dy = attackerHex.y - targetHex.y;

  // Convert to hex direction (0-5, where 0 is "north")
  // This is simplified - full hex geometry is more complex
  const attackDirection =
    Math.round((Math.atan2(dy, dx) * 3) / Math.PI + 3) % 6;

  // Calculate relative direction from target's perspective
  const relativeDirection = (attackDirection - targetFacing + 6) % 6;

  // Map relative direction to attack arc
  // 0 = directly ahead, 3 = directly behind
  // 1,5 = front-side, 2,4 = rear-side
  switch (relativeDirection) {
    case 0:
    case 1:
    case 5:
      return HitLocationTable.MECH_FRONT;
    case 3:
      return HitLocationTable.MECH_REAR;
    case 2:
      return HitLocationTable.MECH_RIGHT;
    case 4:
      return HitLocationTable.MECH_LEFT;
    default:
      return HitLocationTable.MECH_FRONT;
  }
}

/**
 * Get cluster hits from roll
 */
export function getClusterHits(roll: number, missileCount: number): number {
  const row = CLUSTER_HIT_TABLE[roll];
  if (!row) return 0;

  // Find closest missile count in table
  const validCounts = Object.keys(row)
    .map(Number)
    .sort((a, b) => a - b);
  let count = validCounts[0];

  for (const c of validCounts) {
    if (c <= missileCount) count = c;
    else break;
  }

  return row[count] ?? 0;
}
