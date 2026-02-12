/**
 * Combat Interfaces
 * Core type definitions for the combat resolution system.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

// Re-export from construction for backwards compatibility
import { MechLocation } from '../construction/CriticalSlotAllocation';
// Re-export from equipment for backwards compatibility
import { WeaponCategory } from '../equipment/weapons/interfaces';
import { IToHitModifier } from './GameSessionInterfaces';
import { FiringArc, RangeBracket, MovementType } from './HexGridInterfaces';

// Re-export for convenience
export { MechLocation, WeaponCategory };

// =============================================================================
// Combat Location Aliases
// =============================================================================

/**
 * Combat-specific location strings that map to MechLocation enum values.
 * Used for hit location tables and damage tracking.
 * The existing MechLocation enum uses 'Center Torso' etc, but combat
 * often needs rear-specific locations.
 */
export type CombatLocation =
  | 'head'
  | 'center_torso'
  | 'center_torso_rear'
  | 'left_torso'
  | 'left_torso_rear'
  | 'right_torso'
  | 'right_torso_rear'
  | 'left_arm'
  | 'right_arm'
  | 'left_leg'
  | 'right_leg';

/**
 * Map combat location strings to MechLocation enum values.
 */
export function combatLocationToMechLocation(
  loc: CombatLocation,
): MechLocation {
  const map: Record<CombatLocation, MechLocation> = {
    head: MechLocation.HEAD,
    center_torso: MechLocation.CENTER_TORSO,
    center_torso_rear: MechLocation.CENTER_TORSO, // Rear uses same base location
    left_torso: MechLocation.LEFT_TORSO,
    left_torso_rear: MechLocation.LEFT_TORSO,
    right_torso: MechLocation.RIGHT_TORSO,
    right_torso_rear: MechLocation.RIGHT_TORSO,
    left_arm: MechLocation.LEFT_ARM,
    right_arm: MechLocation.RIGHT_ARM,
    left_leg: MechLocation.LEFT_LEG,
    right_leg: MechLocation.RIGHT_LEG,
  };
  return map[loc];
}

// =============================================================================
// Enums
// =============================================================================

/**
 * Attack result types.
 */
export enum AttackResult {
  Hit = 'hit',
  Miss = 'miss',
  CriticalHit = 'critical_hit',
  AutomaticMiss = 'automatic_miss',
}

/**
 * Critical hit severity.
 */
export enum CriticalSeverity {
  /** Standard critical - 1 slot damaged */
  Standard = 'standard',
  /** Through armor critical (TAC) - 2 slots damaged */
  ThroughArmor = 'through_armor',
  /** Limb blown off */
  LimbBlownOff = 'limb_blown_off',
}

// =============================================================================
// Attack Declaration
// =============================================================================

/**
 * Weapon used in an attack.
 */
export interface IWeaponAttack {
  /** Weapon ID (slot reference) */
  readonly weaponId: string;
  /** Weapon name */
  readonly weaponName: string;
  /** Damage per hit */
  readonly damage: number;
  /** Heat generated */
  readonly heat: number;
  /** Weapon category */
  readonly category: WeaponCategory;
  /** Ammo type (if applicable) */
  readonly ammoType?: string;
  /** Minimum range (0 = no minimum) */
  readonly minRange: number;
  /** Short range (0-N: +0) */
  readonly shortRange: number;
  /** Medium range (short+1 to N: +2) */
  readonly mediumRange: number;
  /** Long range (medium+1 to N: +4) */
  readonly longRange: number;
  /** Is this a cluster weapon? */
  readonly isCluster: boolean;
  /** Cluster size (if cluster weapon) */
  readonly clusterSize?: number;
}

/**
 * Attack declaration before resolution.
 */
export interface IAttackDeclaration {
  /** Unique declaration ID */
  readonly id: string;
  /** Attacker unit ID */
  readonly attackerId: string;
  /** Target unit ID */
  readonly targetId: string;
  /** Weapon(s) being fired */
  readonly weapons: readonly IWeaponAttack[];
  /** Range to target (in hexes) */
  readonly range: number;
  /** Range bracket */
  readonly rangeBracket: RangeBracket;
  /** Firing arc to target */
  readonly firingArc: FiringArc;
  /** Total heat generated */
  readonly totalHeat: number;
  /** Ammo consumed per weapon */
  readonly ammoConsumed: Record<string, number>;
}

/**
 * Validation result for attack declaration.
 */
export interface IAttackValidation {
  /** Is the attack valid? */
  readonly valid: boolean;
  /** Error messages if invalid */
  readonly errors: readonly string[];
  /** Warnings (attack valid but suboptimal) */
  readonly warnings: readonly string[];
}

// =============================================================================
// To-Hit Calculation
// =============================================================================

/**
 * To-hit modifier source categories.
 */
export type ToHitModifierSource =
  | 'base'
  | 'range'
  | 'attacker_movement'
  | 'target_movement'
  | 'heat'
  | 'damage'
  | 'terrain'
  | 'equipment'
  | 'spa'
  | 'quirk'
  | 'other';

/**
 * Extended to-hit modifier with typed source.
 * Use this for detailed combat calculations.
 * The base IToHitModifier from GameSessionInterfaces is used in events.
 */
export interface IToHitModifierDetail {
  /** Modifier name for display */
  readonly name: string;
  /** Modifier value (positive = harder to hit) */
  readonly value: number;
  /** Source category */
  readonly source: ToHitModifierSource;
  /** Detailed description */
  readonly description?: string;
}

/**
 * Complete to-hit calculation breakdown.
 */
export interface IToHitCalculation {
  /** Base to-hit (gunnery skill) */
  readonly baseToHit: number;
  /** All modifiers applied */
  readonly modifiers: readonly IToHitModifierDetail[];
  /** Final to-hit number */
  readonly finalToHit: number;
  /** Is hit impossible (to-hit > 12)? */
  readonly impossible: boolean;
  /** Probability of success (2d6 >= finalToHit) */
  readonly probability: number;
}

// =============================================================================
// Attack Resolution
// =============================================================================

/**
 * Dice roll result.
 */
export interface IDiceRoll {
  /** Individual dice values */
  readonly dice: readonly number[];
  /** Total roll value */
  readonly total: number;
  /** Is this a natural 2 (snake eyes)? */
  readonly isSnakeEyes: boolean;
  /** Is this a natural 12 (boxcars)? */
  readonly isBoxcars: boolean;
}

/**
 * Single weapon attack resolution.
 */
export interface IWeaponResolution {
  /** Weapon that was fired */
  readonly weapon: IWeaponAttack;
  /** To-hit calculation */
  readonly toHit: IToHitCalculation;
  /** Attack roll */
  readonly roll: IDiceRoll;
  /** Attack result */
  readonly result: AttackResult;
  /** Hit location (if hit) */
  readonly hitLocation?: CombatLocation;
  /** Damage dealt (if hit) */
  readonly damage?: number;
  /** Cluster hits (for cluster weapons) */
  readonly clusterHits?: number;
}

/**
 * Complete attack resolution.
 */
export interface IAttackResolution {
  /** Original declaration */
  readonly declaration: IAttackDeclaration;
  /** Resolution for each weapon */
  readonly weaponResolutions: readonly IWeaponResolution[];
  /** Total damage dealt */
  readonly totalDamage: number;
  /** Locations hit */
  readonly locationsHit: readonly CombatLocation[];
}

// =============================================================================
// Hit Location
// =============================================================================

/**
 * Hit location table row.
 */
export interface IHitLocationRow {
  /** 2d6 roll value */
  readonly roll: number;
  /** Location hit (uses CombatLocation to distinguish rear) */
  readonly location: CombatLocation;
  /** Is this a critical location (head, CT)? */
  readonly isCritical: boolean;
}

/**
 * Hit location table for an attack arc.
 */
export interface IHitLocationTable {
  /** Attack arc */
  readonly arc: FiringArc;
  /** Table rows */
  readonly rows: readonly IHitLocationRow[];
}

/**
 * Hit location result.
 */
export interface IHitLocationResult {
  /** Roll used */
  readonly roll: IDiceRoll;
  /** Arc attacked */
  readonly arc: FiringArc;
  /** Location hit (uses CombatLocation to distinguish rear) */
  readonly location: CombatLocation;
  /** Was this a critical location? */
  readonly isCritical: boolean;
}

// =============================================================================
// Damage Application
// =============================================================================

/**
 * Damage to a single location.
 */
export interface ILocationDamage {
  /** Location taking damage */
  readonly location: CombatLocation;
  /** Damage amount */
  readonly damage: number;
  /** Armor damage dealt */
  readonly armorDamage: number;
  /** Structure damage dealt */
  readonly structureDamage: number;
  /** Armor remaining after damage */
  readonly armorRemaining: number;
  /** Structure remaining after damage */
  readonly structureRemaining: number;
  /** Was location destroyed? */
  readonly destroyed: boolean;
  /** Damage transferred to next location */
  readonly transferredDamage: number;
  /** Location damage transferred to */
  readonly transferLocation?: CombatLocation;
}

/**
 * Complete damage application result.
 */
export interface IDamageResult {
  /** All location damages in order */
  readonly locationDamages: readonly ILocationDamage[];
  /** Critical hits triggered */
  readonly criticalHits: readonly ICriticalHitResult[];
  /** Pilot damage triggered */
  readonly pilotDamage?: IPilotDamageResult;
  /** Was unit destroyed? */
  readonly unitDestroyed: boolean;
  /** Destruction cause */
  readonly destructionCause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed';
}

// =============================================================================
// Critical Hits
// =============================================================================

/**
 * Critical hit roll.
 */
export interface ICriticalHitRoll {
  /** Roll to determine if critical happens */
  readonly triggerRoll: IDiceRoll;
  /** Did critical hit trigger? (8+) */
  readonly triggered: boolean;
  /** Number of critical hits (if triggered) */
  readonly numberOfHits: number;
}

/**
 * Critical slot in a location for combat tracking.
 */
export interface ICombatCriticalSlot {
  /** Slot index (0-11 for most locations) */
  readonly slotIndex: number;
  /** Equipment in slot */
  readonly equipment: string;
  /** Is slot already destroyed? */
  readonly destroyed: boolean;
}

/**
 * Critical hit result.
 */
export interface ICriticalHitResult {
  /** Location hit */
  readonly location: CombatLocation;
  /** Severity */
  readonly severity: CriticalSeverity;
  /** Roll to select slot */
  readonly slotRoll: IDiceRoll;
  /** Slot hit */
  readonly slot: ICombatCriticalSlot;
  /** Effect of the critical */
  readonly effect: ICriticalEffect;
}

/**
 * Effect of a critical hit.
 */
export interface ICriticalEffect {
  /** Effect type */
  readonly type: CriticalEffectType;
  /** Equipment destroyed */
  readonly equipmentDestroyed?: string;
  /** Additional damage caused */
  readonly additionalDamage?: number;
  /** Heat added */
  readonly heatAdded?: number;
  /** Movement penalty */
  readonly movementPenalty?: number;
  /** Weapon disabled */
  readonly weaponDisabled?: string;
  /** Was ammo hit? */
  readonly ammoExplosion?: IAmmoExplosion;
}

/**
 * Types of critical effects.
 */
export enum CriticalEffectType {
  WeaponDestroyed = 'weapon_destroyed',
  AmmoExplosion = 'ammo_explosion',
  EngineHit = 'engine_hit',
  GyroHit = 'gyro_hit',
  SensorHit = 'sensor_hit',
  LifeSupportHit = 'life_support_hit',
  CockpitHit = 'cockpit_hit',
  ActuatorHit = 'actuator_hit',
  HeatSinkDestroyed = 'heat_sink_destroyed',
  JumpJetDestroyed = 'jump_jet_destroyed',
  EquipmentDestroyed = 'equipment_destroyed',
}

/**
 * Ammo explosion result.
 */
export interface IAmmoExplosion {
  /** Ammo type that exploded */
  readonly ammoType: string;
  /** Rounds remaining that exploded */
  readonly roundsRemaining: number;
  /** Damage per round */
  readonly damagePerRound: number;
  /** Total explosion damage */
  readonly totalDamage: number;
  /** Location where explosion started */
  readonly location: CombatLocation;
}

// =============================================================================
// Pilot Damage
// =============================================================================

/**
 * Source of pilot damage.
 */
export type PilotDamageSource =
  | 'head_hit'
  | 'ammo_explosion'
  | 'mech_destruction'
  | 'fall'
  | 'physical_attack'
  | 'heat';

/**
 * Pilot damage result.
 */
export interface IPilotDamageResult {
  /** Source of damage */
  readonly source: PilotDamageSource;
  /** Wounds inflicted */
  readonly woundsInflicted: number;
  /** Total wounds after damage */
  readonly totalWounds: number;
  /** Consciousness check required? */
  readonly consciousnessCheckRequired: boolean;
  /** Consciousness check roll (if required) */
  readonly consciousnessRoll?: IDiceRoll;
  /** Target number for consciousness */
  readonly consciousnessTarget?: number;
  /** Did pilot remain conscious? */
  readonly conscious?: boolean;
  /** Is pilot dead? (6+ wounds) */
  readonly dead: boolean;
}

// =============================================================================
// Cluster Weapons
// =============================================================================

/**
 * Cluster hit table row.
 */
export interface IClusterHitRow {
  /** 2d6 roll value */
  readonly roll: number;
  /** Hits by cluster size (2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20) */
  readonly hits: Record<number, number>;
}

/**
 * Cluster attack result.
 */
export interface IClusterResult {
  /** Weapon fired */
  readonly weapon: IWeaponAttack;
  /** Roll on cluster table */
  readonly clusterRoll: IDiceRoll;
  /** Number of missiles/projectiles that hit */
  readonly hitsScored: number;
  /** Damage per hit */
  readonly damagePerHit: number;
  /** Total damage */
  readonly totalDamage: number;
  /** Distribution of hits across locations */
  readonly hitDistribution: readonly IClusterHitLocation[];
}

/**
 * Single cluster hit location.
 */
export interface IClusterHitLocation {
  /** Location hit */
  readonly location: CombatLocation;
  /** Hit location roll */
  readonly roll: IDiceRoll;
  /** Damage at this location */
  readonly damage: number;
}

// =============================================================================
// Combat Context
// =============================================================================

/**
 * Actuator damage state for an arm.
 */
export interface IActuatorDamage {
  /** Shoulder actuator destroyed */
  readonly shoulderDestroyed: boolean;
  /** Upper arm actuator destroyed */
  readonly upperArmDestroyed: boolean;
  /** Lower arm actuator destroyed */
  readonly lowerArmDestroyed: boolean;
}

/**
 * Secondary target information.
 */
export interface ISecondaryTarget {
  /** Whether this is a secondary target */
  readonly isSecondary: boolean;
  /** Whether the secondary target is in the front arc */
  readonly inFrontArc: boolean;
}

/**
 * Indirect fire information.
 */
export interface IIndirectFire {
  /** Whether this is an indirect fire attack */
  readonly isIndirect: boolean;
  /** Whether the spotter walked this turn */
  readonly spotterWalked: boolean;
}

/**
 * Attacker combat state for to-hit calculation.
 */
export interface IAttackerState {
  readonly gunnery: number;
  readonly movementType: MovementType;
  readonly heat: number;
  readonly damageModifiers: readonly IToHitModifierDetail[];
  readonly pilotWounds?: number;
  readonly sensorHits?: number;
  readonly actuatorDamage?: IActuatorDamage;
  readonly targetingComputer?: boolean;
  readonly prone?: boolean;
  readonly secondaryTarget?: ISecondaryTarget;
  readonly indirectFire?: IIndirectFire;
  readonly calledShot?: boolean;
  readonly abilities?: readonly string[];
  readonly weaponType?: string;
  readonly designatedWeaponType?: string;
  readonly weaponCategory?: string;
  readonly designatedWeaponCategory?: string;
  readonly targetId?: string;
  readonly designatedTargetId?: string;
  readonly designatedRangeBracket?: RangeBracket;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
}

/**
 * Target combat state for to-hit calculation.
 */
export interface ITargetState {
  readonly movementType: MovementType;
  readonly hexesMoved: number;
  readonly prone: boolean;
  readonly immobile: boolean;
  readonly partialCover: boolean;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  readonly abilities?: readonly string[];
  readonly isDodging?: boolean;
}

/**
 * Full combat context for attack resolution.
 */
export interface ICombatContext {
  /** Attacker state */
  readonly attacker: IAttackerState;
  /** Target state */
  readonly target: ITargetState;
  /** Range to target */
  readonly range: number;
  /** Firing arc */
  readonly arc: FiringArc;
  /** Environmental modifiers */
  readonly environmental: readonly IToHitModifierDetail[];
}

// Re-export IToHitModifier for convenience
export type { IToHitModifier };

// =============================================================================
// Type Guards and Location Helpers
// =============================================================================

/**
 * Check if a combat location is a rear location.
 */
export function isRearCombatLocation(location: CombatLocation): boolean {
  return (
    location === 'center_torso_rear' ||
    location === 'left_torso_rear' ||
    location === 'right_torso_rear'
  );
}

/**
 * Check if a location is a limb.
 */
export function isLimbLocation(location: MechLocation): boolean {
  return (
    location === MechLocation.LEFT_ARM ||
    location === MechLocation.RIGHT_ARM ||
    location === MechLocation.LEFT_LEG ||
    location === MechLocation.RIGHT_LEG
  );
}

/**
 * Check if a location is a torso.
 */
export function isTorsoLocation(location: MechLocation): boolean {
  return (
    location === MechLocation.CENTER_TORSO ||
    location === MechLocation.LEFT_TORSO ||
    location === MechLocation.RIGHT_TORSO
  );
}

/**
 * Get the front version of a rear combat location.
 */
export function getFrontCombatLocation(
  location: CombatLocation,
): CombatLocation {
  switch (location) {
    case 'center_torso_rear':
      return 'center_torso';
    case 'left_torso_rear':
      return 'left_torso';
    case 'right_torso_rear':
      return 'right_torso';
    default:
      return location;
  }
}

/**
 * Get the damage transfer location for a destroyed limb.
 */
export function getTransferLocation(
  location: MechLocation,
): MechLocation | null {
  switch (location) {
    case MechLocation.LEFT_ARM:
      return MechLocation.LEFT_TORSO;
    case MechLocation.RIGHT_ARM:
      return MechLocation.RIGHT_TORSO;
    case MechLocation.LEFT_LEG:
      return MechLocation.LEFT_TORSO;
    case MechLocation.RIGHT_LEG:
      return MechLocation.RIGHT_TORSO;
    case MechLocation.LEFT_TORSO:
      return MechLocation.CENTER_TORSO;
    case MechLocation.RIGHT_TORSO:
      return MechLocation.CENTER_TORSO;
    default:
      return null; // Head and CT don't transfer
  }
}

/**
 * Get the transfer combat location for a destroyed limb.
 */
export function getTransferCombatLocation(
  location: CombatLocation,
): CombatLocation | null {
  switch (location) {
    case 'left_arm':
      return 'left_torso';
    case 'right_arm':
      return 'right_torso';
    case 'left_leg':
      return 'left_torso';
    case 'right_leg':
      return 'right_torso';
    case 'left_torso':
    case 'left_torso_rear':
      return 'center_torso';
    case 'right_torso':
    case 'right_torso_rear':
      return 'center_torso';
    default:
      return null; // Head and CT don't transfer
  }
}
