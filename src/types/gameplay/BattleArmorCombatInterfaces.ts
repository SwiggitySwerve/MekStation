/**
 * Battle Armor Combat Interfaces
 *
 * Per-unit combat state, damage results, and event payloads for the BA
 * combat pipeline (squad damage distribution, anti-mech leg / swarm attacks,
 * vibro-claw melee, mimetic / stealth to-hit penalties).
 *
 * Kept separate from the construction `IBattleArmorUnit` so the unit itself
 * remains immutable and the combat engine can manage per-trooper state here.
 *
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/battle-armor-unit-system/spec.md
 * @spec openspec/changes/add-battlearmor-combat-behavior/specs/combat-resolution/spec.md
 */

// =============================================================================
// Per-trooper state
// =============================================================================

/**
 * Per-trooper combat state inside a BA squad.
 * Each trooper carries its own armor pool and equipment-destruction flags so
 * squad damage can be distributed one trooper at a time.
 */
export interface IBattleArmorTrooperState {
  /** True while the trooper is still part of the fighting squad. */
  readonly alive: boolean;
  /** Armor points remaining on this trooper (drops to 0 or below = killed). */
  readonly armorRemaining: number;
  /**
   * Equipment slots destroyed on this trooper, referenced by equipment id.
   * Currently populated only by anti-mech failure / vibroclaw-return paths —
   * most BA damage simply kills the trooper outright.
   */
  readonly equipmentDestroyed: readonly string[];
}

// =============================================================================
// Squad-wide combat state
// =============================================================================

/**
 * Stealth armor variant active on the squad (affects to-hit modifiers).
 */
export type BattleArmorStealthKind =
  | 'none'
  | 'mimetic'
  | 'stealth_basic'
  | 'stealth_improved'
  | 'stealth_prototype';

/**
 * Combat state for a BA squad across a battle.
 *
 * Spec requires (per battle-armor-unit-system delta, "BA Squad Combat State"):
 *   `troopers`, `swarmingUnitId`, `legAttackCommitted`, `mimeticActiveThisTurn`.
 */
export interface IBattleArmorCombatState {
  readonly unitId: string;
  /** Squad size at construction; troopers.length === squadSize at start. */
  readonly squadSize: number;
  /** Per-trooper state array; dead troopers are retained with alive=false. */
  readonly troopers: readonly IBattleArmorTrooperState[];

  // --- Anti-mech state ---
  /** If non-undefined, the squad is currently swarming this unit id. */
  readonly swarmingUnitId?: string;
  /** True while a leg attack has been declared this turn (committed). */
  readonly legAttackCommitted: boolean;

  // --- Per-turn flags ---
  /** True when the squad did NOT move this turn (drives mimetic bonus). */
  readonly mimeticActiveThisTurn: boolean;

  // --- Construction-time metadata carried for quick lookup ---
  /** Stealth / mimetic armor kind (affects to-hit). */
  readonly stealthKind: BattleArmorStealthKind;
  /** True when the squad carries Magnetic Clamps (swarm eligibility). */
  readonly hasMagneticClamp: boolean;
  /** True when the squad carries Vibro-Claws on any trooper (melee bonus). */
  readonly hasVibroClaws: boolean;
  /** Number of vibro-claws per trooper (0, 1, or 2). */
  readonly vibroClawCount: number;

  // --- Destruction ---
  /** True once every trooper is dead. */
  readonly destroyed: boolean;
}

// =============================================================================
// Squad damage distribution
// =============================================================================

/**
 * Single atomic hit landed on a surviving trooper.
 */
export interface IBattleArmorHit {
  /** Index into `troopers` array (0-based). */
  readonly trooperIndex: number;
  /** Damage dealt to this trooper. */
  readonly damage: number;
  /** Armor remaining on this trooper after the hit. */
  readonly armorRemaining: number;
  /** True when this hit killed the trooper. */
  readonly killed: boolean;
}

/**
 * Aggregate result of resolving one damage event against a BA squad.
 *
 * Callers invoke this from the damage-dispatch pipeline when the target is a
 * BA unit. The cluster-hits table (if applicable) has already reduced the
 * shots to a per-hit list before this is called.
 */
export interface IBattleArmorResolveDamageResult {
  readonly state: IBattleArmorCombatState;
  /** Each atomic hit that landed, in order. */
  readonly hits: readonly IBattleArmorHit[];
  /** Trooper indices killed by this resolution. */
  readonly trooperKills: readonly number[];
  /** True if the whole squad was eliminated by this damage. */
  readonly squadEliminated: boolean;
}

// =============================================================================
// Anti-mech: leg attack
// =============================================================================

/**
 * Result of a BA anti-mech leg attack.
 */
export interface IBattleArmorLegAttackResult {
  /** 2d6 attacker roll. */
  readonly attackerDice: readonly [number, number];
  readonly attackerRoll: number;
  /** TN: mech piloting + 4 (TW). */
  readonly targetNumber: number;
  readonly success: boolean;
  /** Damage dealt to the target mech leg on success (0 on failure). */
  readonly damageToLeg: number;
  /** 1d6 self-damage applied on failure (0 on success). */
  readonly selfDamage: number;
  /** Survivors at moment of attack (scales damage on success). */
  readonly survivingTroopers: number;
}

// =============================================================================
// Anti-mech: swarm attack
// =============================================================================

/**
 * Result of an attach-swarm roll.
 */
export interface IBattleArmorSwarmAttachResult {
  readonly attackerDice: readonly [number, number];
  readonly attackerRoll: number;
  readonly targetNumber: number;
  readonly success: boolean;
  /** Required to attach — if false the attempt is rejected before rolling. */
  readonly eligible: boolean;
  /** Why the attach was not eligible (mag clamps missing, out of range, etc.). */
  readonly reason?:
    | 'no_magnetic_clamp'
    | 'target_not_mech'
    | 'target_not_adjacent';
}

/**
 * Result of a per-turn swarm damage tick (while attached).
 */
export interface IBattleArmorSwarmDamageResult {
  readonly rollD6: number;
  readonly survivingTroopers: number;
  readonly damage: number;
  /** Random mech location hit this tick (caller-supplied location label). */
  readonly locationLabel: string;
}

/**
 * Result of a dismount attempt by the attached mech.
 */
export interface IBattleArmorSwarmDismountResult {
  readonly pilotingDice: readonly [number, number];
  readonly pilotingRoll: number;
  readonly targetNumber: number;
  readonly success: boolean;
  /** 2d6 dismount damage applied to the squad on success (0 on failure). */
  readonly dismountDamage: number;
}

// =============================================================================
// Vibro-claw physical attack
// =============================================================================

/**
 * Result of a BA vibro-claw melee attack.
 */
export interface IBattleArmorVibroClawResult {
  /** Damage per claw (rounded up). */
  readonly damagePerClaw: number;
  /** Number of claws applied (1 or 2). */
  readonly claws: number;
  /** Total damage dealt = damagePerClaw × claws. */
  readonly totalDamage: number;
  readonly survivingTroopers: number;
}

// =============================================================================
// Squad fire aggregation
// =============================================================================

/**
 * Aggregated squad-fire result: number of shots / damage scaled by survivors.
 */
export interface IBattleArmorSquadFireResult {
  readonly survivingTroopers: number;
  /** Number of effective weapon-shots this attack (one per survivor). */
  readonly effectiveShots: number;
  /** Raw total damage before to-hit resolution (sum of shots × perShot). */
  readonly totalDamage: number;
  /** Heat generated (always 0 — BA has no heat). */
  readonly heatGenerated: 0;
}

// =============================================================================
// Stealth / mimetic to-hit bonus
// =============================================================================

/**
 * Range bracket used for stealth bonuses. Matches the existing `RangeBracket`
 * semantics but declared locally so this module stays self-contained.
 */
export type BattleArmorRangeBracket = 'short' | 'medium' | 'long';

/**
 * Result of a to-hit stealth/mimetic modifier lookup.
 */
export interface IBattleArmorStealthBonus {
  /** +N to the attacker's to-hit target number. */
  readonly toHitBonus: number;
  /** Which effect produced the bonus (for audit / events). */
  readonly source:
    | 'none'
    | 'mimetic'
    | 'stealth_basic'
    | 'stealth_improved'
    | 'stealth_prototype';
}

// =============================================================================
// Event payloads
// =============================================================================

/**
 * Per `add-battlearmor-combat-behavior`: a single trooper was killed by an
 * incoming hit. `trooperIndex` references the troopers array.
 */
export interface ITrooperKilledPayload {
  readonly unitId: string;
  readonly trooperIndex: number;
  readonly survivingTroopers: number;
}

/**
 * Per `add-battlearmor-combat-behavior`: the final trooper fell and the
 * squad is removed from active play.
 */
export interface ISquadEliminatedPayload {
  readonly unitId: string;
}

/**
 * Per `add-battlearmor-combat-behavior`: BA squad successfully attached to a
 * mech via a swarm attack.
 */
export interface ISwarmAttachedPayload {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly rollTotal: number;
  readonly targetNumber: number;
}

/**
 * Per `add-battlearmor-combat-behavior`: tick damage from an active swarm.
 */
export interface ISwarmDamagePayload {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly damage: number;
  readonly locationLabel: string;
}

/**
 * Per `add-battlearmor-combat-behavior`: swarming BA detached from its host
 * (via successful dismount roll or destruction).
 */
export interface ISwarmDismountedPayload {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly cause: 'dismount_roll' | 'squad_destroyed' | 'target_destroyed';
  readonly dismountDamage: number;
}

/**
 * Per `add-battlearmor-combat-behavior`: leg-attack result (success or fail).
 */
export interface ILegAttackPayload {
  readonly unitId: string;
  readonly targetUnitId: string;
  readonly success: boolean;
  readonly damageToLeg: number;
  readonly selfDamage: number;
  readonly survivingTroopers: number;
}

/**
 * Per `add-battlearmor-combat-behavior`: mimetic to-hit bonus applied to an
 * attacker targeting this squad.
 */
export interface IMimeticBonusPayload {
  readonly unitId: string;
  readonly attackerId: string;
  readonly toHitBonus: number;
}

/**
 * Per `add-battlearmor-combat-behavior`: stealth to-hit bonus applied to an
 * attacker targeting this squad.
 */
export interface IStealthBonusPayload {
  readonly unitId: string;
  readonly attackerId: string;
  readonly toHitBonus: number;
  readonly source: 'stealth_basic' | 'stealth_improved' | 'stealth_prototype';
}
