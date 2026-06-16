/**
 * Combat Interfaces
 * Core type definitions for the combat resolution system.
 *
 * @spec openspec/changes/add-combat-resolution/specs/combat-resolution/spec.md
 */

import type { CombatLocation } from './CombatLocationTypes';
import type { IToHitModifier } from './GameSessionAttackEvents';
import type { WeaponFireMode } from './IndirectFireInterfaces';
import type { ITerrainFeature } from './TerrainTypes';

// Re-export from construction for backwards compatibility
import { MechLocation } from '../construction/CriticalSlotAllocation';
import { VehicleLocation, VTOLLocation } from '../construction/UnitLocation';
// Re-export from equipment for backwards compatibility
import { WeaponCategory } from '../equipment/weapons/interfaces';
import { TurretType } from '../unit/VehicleInterfaces';
import { FiringArc, RangeBracket, MovementType } from './HexGridInterfaces';

// Re-export for convenience
export { MechLocation, WeaponCategory };
export type { CombatLocation } from './CombatLocationTypes';

// =============================================================================
// Combat Location Aliases
// =============================================================================

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
  /** Resolved per-weapon fire mode for this attack. Defaults to Direct. */
  readonly mode?: WeaponFireMode;
  /** Mounted firing arc, when known. Missing means legacy omnidirectional. */
  readonly mountingArc?: FiringArc;
  /**
   * Mounted firing arcs when the represented mount covers multiple chassis
   * arcs. Missing means legacy omnidirectional/unknown coverage.
   */
  readonly mountingArcs?: readonly FiringArc[];
  /** Mounted chassis location, when known. */
  readonly location?: string;
  /** Vehicle mount location, when this attack originates from a vehicle. */
  readonly vehicleMountLocation?: VehicleLocation | VTOLLocation;
  /** True when the attack weapon is mounted in the vehicle primary turret. */
  readonly vehicleIsTurretMounted?: boolean;
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
  /** Extreme range (long+1 to N: +6, optional for non-artillery weapons) */
  readonly extremeRange?: number;
  /** Is this a cluster weapon? */
  readonly isCluster: boolean;
  /** Cluster size (if cluster weapon) */
  readonly clusterSize?: number;
  /** True for represented torpedo weapons that must remain in water. */
  readonly isTorpedo?: boolean;
  /** Attack declares a TacOps-style called shot. */
  readonly calledShot?: boolean;
  /** Called-shot setup was provided by a teammate. */
  readonly teammateCalledShot?: boolean;
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
  | 'environmental'
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
  /** True when a legal Edge trigger replaced the original hit-location roll. */
  readonly edgeReroll?: boolean;
  /** True when the original hit-location roll was superseded by Edge. */
  readonly edgeSuperseded?: boolean;
  /** Trigger-specific Edge ability that was spent for the replacement roll. */
  readonly edgeTrigger?: string;
  /** Remaining Edge points after the hit-location reroll. */
  readonly edgePointsRemaining?: number;
  /** Original roll replaced by the Edge reroll. */
  readonly supersededRoll?: IDiceRoll;
  /** Original location replaced by the Edge reroll. */
  readonly supersededLocation?: CombatLocation;
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
  /**
   * Destruction cause.
   *
   * Closed snake_case enum kept symmetric with `IUnitDestroyedPayload.cause`
   * (in `GameSessionInterfaces.ts`) and the `cause` field on
   * `IDestructionCheckResult` / `destructionCause` field on
   * `IUnitDamageState` (in `utils/gameplay/damage/types.ts`). All three
   * MUST contain exactly the same 7 values per the
   * `add-combat-fidelity-suite` Phase 0.5 reconciliation.
   *
   * Heat shutdown is modeled as lifecycle state rather than a
   * destruction cause.
   */
  readonly destructionCause?:
    | 'damage'
    | 'ammo_explosion'
    | 'pilot_death'
    | 'engine_destroyed'
    | 'impossible_displacement'
    | 'ct_destroyed'
    | 'head_destroyed';
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
  /** Equipment hit without being destroyed or disabled */
  readonly equipmentHit?: string;
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
  /**
   * Set true once life-support has taken
   * `LIFE_SUPPORT_DESTRUCTION_THRESHOLD` hits (per `fix-combat-rule-accuracy`
   * and OpenSpec change `integrate-damage-pipeline` task 10.5). Downstream
   * heat-phase processing consults this flag to apply 1 pilot damage per
   * heat tick when the pilot crosses the 15-heat / 25-heat thresholds.
   */
  readonly lifeSupportDisabled?: boolean;
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
  EquipmentHit = 'equipment_hit',
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
  | 'heat'
  | 'neural_feedback';

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
  /**
   * Optional trigger-specific Edge metadata. `edgeSuperseded` marks an
   * original failed roll that was replaced by a legal Edge reroll, while
   * `edgeReroll` marks the final replacement roll.
   */
  readonly edgeReroll?: boolean;
  readonly edgeSuperseded?: boolean;
  readonly edgeTrigger?: string;
  readonly edgePointsRemaining?: number;
  readonly supersededConsciousnessRoll?: IDiceRoll;
  /** Is pilot dead? (6+ wounds) */
  readonly dead: boolean;
}

// =============================================================================
// Pilot Match Terminal State (per-match outcome)
// =============================================================================

/**
 * Per-match pilot terminal state. Distinct from the campaign-level
 * `PilotStatus` enum at `src/types/pilot/PilotInterfaces.ts:30`
 * (which derives from this plus campaign rules) and from the
 * `PilotFinalStatus` enum at `src/types/combat/CombatOutcome.ts:63`
 * (which is the campaign-consumable hand-off label).
 *
 * Closed snake_case set — exactly one value per pilot per match. See
 * `openspec/changes/add-combat-fidelity-suite/specs/pilot-system/spec.md`
 * for the canonical taxonomy and conservation invariants.
 *
 *  - `unhurt`       — zero wounds during the match
 *  - `wounded`      — 1-5 wounds, no failed consciousness, no ejection
 *  - `unconscious`  — failed consciousness AND no recovery before end
 *  - `kia`          — wounds reached 6 OR head-destruction event
 *  - `ejected`      — voluntarily ejected and survived ejection
 */
export type PilotMatchTerminalState =
  | 'unhurt'
  | 'wounded'
  | 'unconscious'
  | 'kia'
  | 'ejected';

/**
 * Per-match per-pilot summary record. One entry per pilot active in
 * the match, regardless of side. Conservation invariant from
 * `after-combat-report/spec.md`: the count of summaries grouped by
 * `matchTerminalState` MUST sum to the total pilot roster size, and
 * `count('kia')` MUST equal the count of `UnitDestroyed` events with
 * `cause: 'pilot_death'` OR `cause: 'head_destroyed'` (per side).
 */
export interface IPilotMatchSummary {
  /** Stable pilot identifier (synthetic or vault). */
  readonly pilotId: string;
  /** Unit the pilot was assigned to during the match. */
  readonly unitId: string;
  /** Side label — `'player'`, `'opfor'`, or any custom side identifier. */
  readonly sideId: string;
  /** Closed enum — see `PilotMatchTerminalState`. */
  readonly matchTerminalState: PilotMatchTerminalState;
  /** Cumulative wound count at match end (0-6, capped). */
  readonly finalWoundCount: number;
  /** True if the pilot was conscious at match end. */
  readonly wasConscious: boolean;
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
  /** Whether the spotter walked this turn. Legacy field for +1 walk-only callers. */
  readonly spotterWalked: boolean;
  /** Optional represented spotter movement penalty: walk=1, run=2, jump=3. */
  readonly spotterMovementPenalty?: number;
}

/**
 * Attacker combat state for to-hit calculation.
 */
export interface IAttackerState {
  readonly gunnery: number;
  readonly movementType: MovementType;
  readonly isAirborne?: boolean;
  readonly heat: number;
  readonly damageModifiers: readonly IToHitModifierDetail[];
  readonly pilotWounds?: number;
  readonly sensorHits?: number;
  readonly actuatorDamage?: IActuatorDamage;
  readonly targetingComputer?: boolean;
  readonly prone?: boolean;
  readonly isSpotting?: boolean;
  readonly secondaryTarget?: ISecondaryTarget;
  readonly indirectFire?: IIndirectFire;
  readonly calledShot?: boolean;
  readonly teammateCalledShot?: boolean;
  /** Set false for source-backed BattleMech combat paths that must not apply local called-shot SPA helper reductions. */
  readonly applyLocalCalledShotAbilityReduction?: boolean;
  readonly abilities?: readonly string[];
  /**
   * Explicit represented neural-interface state for VDNI/BVDNI/TCP effects.
   * Undefined preserves legacy implicit-active fixtures; false means installed
   * neural hardware is not connected for this attack state.
   */
  readonly neuralInterfaceActive?: boolean;
  readonly weaponType?: string;
  readonly designatedWeaponType?: string;
  readonly weaponCategory?: string;
  readonly designatedWeaponCategory?: string;
  readonly targetId?: string;
  readonly designatedTargetId?: string;
  readonly designatedRangeBracket?: RangeBracket;
  readonly designatedEnvironment?: string;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  /**
   * Vehicle-only context fields. Populated when the attacker is a ground or
   * VTOL combat vehicle so the to-hit pipeline can apply vehicle-scoped
   * modifiers (e.g. chin-turret pivot penalty). Mech / aerospace / battle
   * armor callers leave these undefined and incur no vehicle penalty paths.
   *
   * @see calculateChinTurretPivotModifier (utils/gameplay/toHit/vehicleModifiers.ts)
   */
  readonly vehicleTurretType?: TurretType;
  readonly vehicleTurretPivotedThisTurn?: boolean;
  readonly vehicleWeaponMountLocation?: VehicleLocation | VTOLLocation;
  readonly vehicleWeaponIsTurretMounted?: boolean;
}

/**
 * Target combat state for to-hit calculation.
 */
export interface ITargetState {
  readonly unitType?: string;
  readonly movementType: MovementType;
  readonly isAirborne?: boolean;
  readonly hexesMoved: number;
  readonly prone: boolean;
  readonly immobile: boolean;
  readonly partialCover: boolean;
  /** Whether the target is in hull-down position (shields legs from front arc). */
  readonly hullDown?: boolean;
  readonly unitQuirks?: readonly string[];
  readonly weaponQuirks?: Readonly<Record<string, readonly string[]>>;
  readonly abilities?: readonly string[];
  readonly isDodging?: boolean;
  readonly isEvading?: boolean;
  /**
   * Optional source-backed evasion to-hit bonus copied into combat state.
   * When absent, explicit `isEvading` keeps the normal +1; explicit 0 models
   * Skilled Evasion cases that create an evading state without a bonus.
   */
  readonly evasionBonus?: number;
  /**
   * Explicit target movement state for optional TacOps Sprint. Declared
   * sprint movement and replayed/prehydrated sprint state feed source-backed
   * to-hit resolution.
   */
  readonly sprintedThisTurn?: boolean;
  readonly terrainFeatures?: readonly ITerrainFeature[];
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

export {
  getFrontCombatLocation,
  getTransferCombatLocation,
  getTransferLocation,
  isLimbLocation,
  isRearCombatLocation,
  isTorsoLocation,
} from './CombatLocationHelpers';

// =============================================================================
// Battle Armor Combat State
// =============================================================================

/**
 * Per-trooper state tracked throughout a match. Dead troopers are retained
 * with `alive: false` so index positions remain stable for mounted-trooper
 * location lookups. Indices are 1-based (LOC_TROOPER_1..LOC_TROOPER_6) per
 * MegaMek convention.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */
export interface ITrooperState {
  /** 1-based trooper index (1..squadSize). */
  readonly index: number;
  /** False once armorRemaining reaches 0 (kills are permanent). */
  alive: boolean;
  /** Armor points left; reaching 0 kills the trooper. */
  armorRemaining: number;
  /** Equipment slot IDs destroyed by crit events on this trooper. */
  equipmentDestroyed: string[];
}

/**
 * Squad-level combat slice for a BA unit. Carried alongside the immutable
 * `IBattleArmorUnit` construction record so the engine can track per-battle
 * mutable state without mutating the unit definition.
 *
 * `swarmedByUnitIds` exists here so this interface can be embedded on ANY
 * unit (a host mech will have this field populated while a BA squad is
 * attached, even though the mech itself has no troopers).
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 */
export interface IBASquadCombatState {
  /** Per-trooper state array; dead troopers retained with alive=false. */
  readonly troopers: ITrooperState[];
  /** ID of the host mech this squad is currently attached to as a swarmer. */
  swarmingUnitId?: string;
  /** IDs of BA squads currently swarming THIS unit (on the host side). */
  swarmedByUnitIds: string[];
  /** ID of the friendly host this squad is mounted on as a passenger. */
  mountedOn?: string;
  /** True when mimetic armor was activated this turn (squad did not move). */
  mimeticActiveThisTurn: boolean;
  /** True when stealth armor was activated this turn. */
  stealthActiveThisTurn: boolean;
}

// =============================================================================
// Battle Armor Combat Events
// =============================================================================

/**
 * Discriminated union of all BA-specific combat events emitted by the
 * battle-armor combat pipeline.
 *
 * The `squadId` / `attackerId` / `hostId` fields are unit IDs that can be
 * correlated with `IGameUnit.id` in the session state.
 *
 * @spec openspec/changes/add-battle-armor-combat/specs/battle-armor-combat/spec.md
 * @spec openspec/changes/add-battle-armor-combat/specs/combat-resolution/spec.md
 */
export type BACombatEvent =
  /** Emitted when a BA squad successfully attaches to a host mech via swarm. */
  | { kind: 'BASwarmAttached'; attackerId: string; hostId: string }
  /** Emitted when a BA squad detaches from a host mech. */
  | {
      kind: 'BASwarmDetached';
      attackerId: string;
      hostId: string;
      reason: 'BrushedOff' | 'DroppedProne' | 'SquadDestroyed';
    }
  /** Emitted each turn the squad fires squad-mounted weapons while swarming. */
  | {
      kind: 'BASwarmDamageApplied';
      attackerId: string;
      hostId: string;
      totalDamage: number;
      perWeapon: { weaponId: string; damage: number }[];
    }
  /** Emitted when a BA squad resolves a leg attack. */
  | {
      kind: 'BALegAttackResolved';
      attackerId: string;
      targetId: string;
      hitLocation: MechLocation;
      damage: number;
      critModifier: number;
    }
  /** Emitted when a BA squad resolves a vibroclaw melee attack. */
  | {
      kind: 'BAVibroclawAttackResolved';
      attackerId: string;
      targetId: string;
      damage: number;
      missileHits: number;
      vibroClawCount: number;
    }
  /** Emitted when a trooper's armorRemaining reaches 0. */
  | {
      kind: 'BATrooperKilled';
      squadId: string;
      trooperIndex: number;
      hostId?: string;
    }
  /** Emitted when a mech attempts to brush off an attached swarmer. */
  | {
      kind: 'BABrushOffAttempted';
      hostId: string;
      targetSwarmerId: string;
      outcome: 'hit' | 'miss';
    };
