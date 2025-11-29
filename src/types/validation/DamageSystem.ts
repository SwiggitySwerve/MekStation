/**
 * Damage System Types
 * 
 * Defines damage types, hit locations, and damage resolution.
 * 
 * @spec openspec/changes/implement-phase4-validation/specs/damage-system/spec.md
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
 * Front/Rear hit location table
 * 2d6 roll -> location
 */
export const FRONT_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.CENTER_TORSO, // CT (Critical)
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

export const REAR_HIT_LOCATION_TABLE: Record<number, MechLocation> = {
  2: MechLocation.CENTER_TORSO, // CT (Critical)
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
 * Get hit location from roll
 */
export function getHitLocation(
  roll: number,
  table: HitLocationTable
): HitLocationResult {
  let location: MechLocation;
  let isRear = false;
  
  switch (table) {
    case HitLocationTable.MECH_REAR:
      isRear = true;
      location = REAR_HIT_LOCATION_TABLE[roll] ?? MechLocation.CENTER_TORSO;
      break;
    case HitLocationTable.MECH_FRONT:
    default:
      location = FRONT_HIT_LOCATION_TABLE[roll] ?? MechLocation.CENTER_TORSO;
      break;
  }
  
  return {
    roll,
    location,
    isRear,
    isCriticalCandidate: roll === 2 || roll === 12,
  };
}

/**
 * Get cluster hits from roll
 */
export function getClusterHits(roll: number, missileCount: number): number {
  const row = CLUSTER_HIT_TABLE[roll];
  if (!row) return 0;
  
  // Find closest missile count in table
  const validCounts = Object.keys(row).map(Number).sort((a, b) => a - b);
  let count = validCounts[0];
  
  for (const c of validCounts) {
    if (c <= missileCount) count = c;
    else break;
  }
  
  return row[count] ?? 0;
}

