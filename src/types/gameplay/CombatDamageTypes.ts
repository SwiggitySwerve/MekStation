/**
 * Combat damage, critical-hit, and pilot-damage result types.
 */

import type { CriticalSeverity, IDiceRoll } from './CombatAttackTypes';
import type { CombatLocation } from './CombatLocationTypes';

import { FiringArc } from './HexGridInterfaces';

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
