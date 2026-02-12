/**
 * Critical Hit System Types
 *
 * Defines critical hit tables, effects, and resolution.
 *
 * @spec openspec/specs/critical-hit-system/spec.md
 */

import { MechLocation } from '../construction/CriticalSlotAllocation';

/**
 * Critical hit determination roll
 */
export enum CriticalHitDetermination {
  NO_CRITICAL = 'No Critical',
  ONE_CRITICAL = '1 Critical',
  TWO_CRITICALS = '2 Criticals',
  THREE_CRITICALS = '3 Criticals',
  HEAD_BLOWN_OFF = 'Head/Limb Blown Off',
}

/**
 * Critical determination table (2d6)
 */
export const CRITICAL_HIT_TABLE: Record<number, CriticalHitDetermination> = {
  2: CriticalHitDetermination.NO_CRITICAL,
  3: CriticalHitDetermination.NO_CRITICAL,
  4: CriticalHitDetermination.NO_CRITICAL,
  5: CriticalHitDetermination.NO_CRITICAL,
  6: CriticalHitDetermination.NO_CRITICAL,
  7: CriticalHitDetermination.NO_CRITICAL,
  8: CriticalHitDetermination.ONE_CRITICAL,
  9: CriticalHitDetermination.ONE_CRITICAL,
  10: CriticalHitDetermination.TWO_CRITICALS,
  11: CriticalHitDetermination.TWO_CRITICALS,
  12: CriticalHitDetermination.HEAD_BLOWN_OFF,
};

/**
 * Component type for critical hit effects
 */
export enum CriticalComponentType {
  WEAPON = 'Weapon',
  AMMO = 'Ammunition',
  ENGINE = 'Engine',
  GYRO = 'Gyro',
  COCKPIT = 'Cockpit',
  ACTUATOR = 'Actuator',
  HEAT_SINK = 'Heat Sink',
  MASC = 'MASC',
  SUPERCHARGER = 'Supercharger',
  TARGETING_COMPUTER = 'Targeting Computer',
  CASE = 'CASE',
  STRUCTURAL = 'Structural (Endo Steel/Ferro-Fibrous)',
  SENSOR = 'Sensors',
  LIFE_SUPPORT = 'Life Support',
}

/**
 * Critical hit effect
 */
export interface CriticalHitEffect {
  readonly componentType: CriticalComponentType;
  readonly hitsToDestroy: number;
  readonly effectPerHit: string;
  readonly explosionDamage?: number;
  readonly explosionRadius?: number;
}

/**
 * Standard critical hit effects
 */
export const CRITICAL_HIT_EFFECTS: readonly CriticalHitEffect[] = [
  {
    componentType: CriticalComponentType.WEAPON,
    hitsToDestroy: 1,
    effectPerHit: 'Weapon destroyed, cannot fire',
  },
  {
    componentType: CriticalComponentType.AMMO,
    hitsToDestroy: 1,
    effectPerHit: 'Ammunition explodes',
    explosionDamage: 0, // Variable based on ammo
  },
  {
    componentType: CriticalComponentType.ENGINE,
    hitsToDestroy: 3,
    effectPerHit: '+5 heat per hit; 3 hits = destruction',
  },
  {
    componentType: CriticalComponentType.GYRO,
    hitsToDestroy: 2,
    effectPerHit: '1 hit = +3 piloting; 2 hits = destruction',
  },
  {
    componentType: CriticalComponentType.COCKPIT,
    hitsToDestroy: 1,
    effectPerHit: 'Pilot killed, mech incapacitated',
  },
  {
    componentType: CriticalComponentType.ACTUATOR,
    hitsToDestroy: 1,
    effectPerHit: 'Reduced function in affected limb',
  },
  {
    componentType: CriticalComponentType.HEAT_SINK,
    hitsToDestroy: 1,
    effectPerHit: 'Heat sink destroyed, -1 dissipation',
  },
  {
    componentType: CriticalComponentType.MASC,
    hitsToDestroy: 1,
    effectPerHit: 'MASC disabled, cannot use',
  },
  {
    componentType: CriticalComponentType.SENSOR,
    hitsToDestroy: 2,
    effectPerHit: '1 hit = +1 to-hit; 2 hits = +2 to-hit, limited targeting',
  },
  {
    componentType: CriticalComponentType.LIFE_SUPPORT,
    hitsToDestroy: 2,
    effectPerHit: 'Pilot takes 1 damage at end of turn',
  },
] as const;

/**
 * Get critical hit effect for component
 */
export function getCriticalHitEffect(
  type: CriticalComponentType,
): CriticalHitEffect | undefined {
  return CRITICAL_HIT_EFFECTS.find((e) => e.componentType === type);
}

/**
 * Determine number of criticals from roll
 */
export function determineCriticals(roll: number): CriticalHitDetermination {
  return CRITICAL_HIT_TABLE[roll] ?? CriticalHitDetermination.NO_CRITICAL;
}

/**
 * Get number of critical slots to check
 */
export function getCriticalSlotCount(
  determination: CriticalHitDetermination,
): number {
  switch (determination) {
    case CriticalHitDetermination.ONE_CRITICAL:
      return 1;
    case CriticalHitDetermination.TWO_CRITICALS:
      return 2;
    case CriticalHitDetermination.THREE_CRITICALS:
      return 3;
    case CriticalHitDetermination.HEAD_BLOWN_OFF:
      return 999; // All slots
    default:
      return 0;
  }
}

/**
 * Damage transfer rules
 */
export interface TransferPath {
  readonly from: MechLocation;
  readonly to: MechLocation;
}

/**
 * Standard damage transfer paths
 */
export const DAMAGE_TRANSFER_PATHS: readonly TransferPath[] = [
  { from: MechLocation.LEFT_ARM, to: MechLocation.LEFT_TORSO },
  { from: MechLocation.RIGHT_ARM, to: MechLocation.RIGHT_TORSO },
  { from: MechLocation.LEFT_LEG, to: MechLocation.LEFT_TORSO },
  { from: MechLocation.RIGHT_LEG, to: MechLocation.RIGHT_TORSO },
  { from: MechLocation.LEFT_TORSO, to: MechLocation.CENTER_TORSO },
  { from: MechLocation.RIGHT_TORSO, to: MechLocation.CENTER_TORSO },
  // Head and CT don't transfer - destruction
] as const;

/**
 * Get transfer destination for location
 */
export function getTransferDestination(
  from: MechLocation,
): MechLocation | null {
  const path = DAMAGE_TRANSFER_PATHS.find((p) => p.from === from);
  return path?.to ?? null;
}

/**
 * Check if location transfers damage (vs destroys mech)
 */
export function doesLocationTransferDamage(location: MechLocation): boolean {
  return (
    location !== MechLocation.HEAD && location !== MechLocation.CENTER_TORSO
  );
}

/**
 * Calculate ammo explosion damage
 */
export function calculateAmmoExplosionDamage(
  ammoType: string,
  remainingShots: number,
  damagePerShot: number,
): number {
  // Missiles do damage per missile remaining
  // ACs do damage equal to damage × shots remaining
  return remainingShots * damagePerShot;
}
