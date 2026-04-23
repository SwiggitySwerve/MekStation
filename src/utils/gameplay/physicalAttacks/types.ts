import { IComponentDamageState, IUnitGameState } from '@/types/gameplay';
import { CombatLocation } from '@/types/gameplay';

export type PhysicalAttackType =
  | 'punch'
  | 'kick'
  | 'charge'
  | 'dfa'
  | 'push'
  | 'hatchet'
  | 'sword'
  | 'mace'
  | 'lance';

/**
 * Per `implement-physical-attack-phase` task 2.1: canonical declaration
 * shape emitted by players (human UI + bot). `limb` is required for
 * `punch` and `kick` (which arm / leg) and may be supplied for club
 * attacks. Other attack types ignore `limb`.
 *
 * @spec openspec/changes/implement-physical-attack-phase/tasks.md § 2
 */
export interface IPhysicalAttackDeclaration {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly limb?: PhysicalAttackLimb;
}

/**
 * Per `implement-physical-attack-phase` task 2.3: `limb` is required
 * for `punch` and `kick`. We model it as arm-only / leg-only /
 * either to keep the restriction validator narrow.
 */
export type PhysicalAttackLimb =
  | 'leftArm'
  | 'rightArm'
  | 'leftLeg'
  | 'rightLeg';

/**
 * Per `implement-physical-attack-phase` task 3.8: enumerated rejection
 * reasons returned by the restriction validator. Upstream consumers
 * (UI, replay) can switch on these without parsing free-form strings.
 */
export type PhysicalAttackInvalidReason =
  | 'WeaponFiredThisTurn'
  | 'MissingActuator'
  | 'HipDestroyed'
  | 'ShoulderDestroyed'
  | 'SameLimbUsedThisTurn'
  | 'NoJumpThisTurn'
  | 'NoRunThisTurn'
  | 'LimbMissing'
  | 'AttackerProne'
  | 'UnsupportedAttackType'
  | 'DestinationBlocked';

export interface IPhysicalAttackInput {
  readonly attackerTonnage: number;
  readonly pilotingSkill: number;
  readonly componentDamage: IComponentDamageState;
  readonly attackType: PhysicalAttackType;
  readonly arm?: 'left' | 'right';
  readonly hexesMoved?: number;
  readonly heat?: number;
  readonly hasTSM?: boolean;
  readonly isUnderwater?: boolean;
  readonly weaponsFiredFromArm?: readonly string[];
  readonly attackerProne?: boolean;
  readonly targetTonnage?: number;
  /**
   * Per `implement-physical-attack-phase` task 4.3 / 5.3: target movement
   * modifier applied to punch / kick / melee to-hit. Callers compute TMM
   * from the target's `movementThisTurn` + `hexesMovedThisTurn`.
   */
  readonly targetMovementModifier?: number;
  /**
   * Per task 6.1: charge to-hit uses piloting + attacker-movement
   * modifier. Callers derive this from the attacker's movementType.
   */
  readonly attackerMovementModifier?: number;
  /**
   * Per task 3.6: DFA requires the attacker jumped this turn.
   */
  readonly attackerJumpedThisTurn?: boolean;
  /**
   * Per task 3.7: charge requires the attacker ran this turn.
   */
  readonly attackerRanThisTurn?: boolean;
  /**
   * Per task 3.5: the same limb (arm OR leg) cannot both kick + punch
   * in a single turn. Callers track which limbs have already been used
   * for a physical attack this turn.
   */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /**
   * Per task 2.3: the limb this declaration targets. Required for
   * `punch` and `kick`. Drives the same-limb restriction + the actuator
   * lookup (future — actuator state per limb will be wired through
   * `componentDamage` once that interface supports left/right split).
   */
  readonly limb?: PhysicalAttackLimb;
  /**
   * Per tasks 3.3 / 3.4: whether the punching arm's lower-arm / hand
   * actuators are still present (intact OR damaged but installed).
   * Destruction flags live in `componentDamage.actuators`; these two
   * booleans capture the separate "is this actuator present at all?"
   * question (mech may have been built without a lower-arm actuator).
   */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  /**
   * Per task 3.4: similar absence tracking for the kicking leg's upper
   * leg + foot actuators.
   */
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
}

export interface IPhysicalToHitResult {
  readonly baseToHit: number;
  readonly finalToHit: number;
  readonly modifiers: readonly IPhysicalModifier[];
  readonly allowed: boolean;
  readonly restrictionReason?: string;
  /**
   * Per `implement-physical-attack-phase` task 3.8: typed rejection
   * reason matching the `IPhysicalAttackRestriction.reasonCode`.
   */
  readonly restrictionReasonCode?: PhysicalAttackInvalidReason;
}

export interface IPhysicalModifier {
  readonly name: string;
  readonly value: number;
  readonly source: string;
}

export interface IPhysicalDamageResult {
  readonly targetDamage: number;
  readonly attackerDamage: number;
  readonly attackerLegDamagePerLeg: number;
  readonly targetPSR: boolean;
  readonly attackerPSR: boolean;
  readonly attackerPSRModifier: number;
  readonly hitTable: 'punch' | 'kick';
  readonly targetDisplaced: boolean;
}

export interface IPhysicalAttackResult {
  readonly attackType: PhysicalAttackType;
  readonly toHitNumber: number;
  readonly roll: number;
  readonly hit: boolean;
  readonly targetDamage: number;
  readonly attackerDamage: number;
  readonly attackerLegDamagePerLeg: number;
  readonly targetPSR: boolean;
  readonly attackerPSR: boolean;
  readonly attackerPSRModifier: number;
  readonly hitLocation?: CombatLocation;
  readonly targetDisplaced: boolean;
}

export interface IPhysicalAttackRestriction {
  allowed: boolean;
  reason?: string;
  /**
   * Per `implement-physical-attack-phase` task 3.8: typed rejection
   * reason. Optional for backward-compat — existing callers read the
   * free-form `reason`; new code should branch on `reasonCode`.
   */
  reasonCode?: PhysicalAttackInvalidReason;
}

export interface IChooseBestPhysicalAttackOptions {
  canReachForCharge?: boolean;
  hexesMoved?: number;
  isJumping?: boolean;
  hasMeleeWeapon?: PhysicalAttackType;
  weaponsFiredFromLeftArm?: readonly string[];
  weaponsFiredFromRightArm?: readonly string[];
  attackerProne?: boolean;
  heat?: number;
  hasTSM?: boolean;
}

export interface IPhysicalAttackCandidate {
  type: PhysicalAttackType;
  expectedDamage: number;
}

export interface IPhysicalAttackUnitStatePair {
  attacker: IUnitGameState;
  target: IUnitGameState;
}

/**
 * Per `add-physical-attack-phase-ui` task 3.2 + `physical-attack-system`
 * delta "Self-Risk Summary in Options": attacker-side consequences
 * surfaced in the forecast modal. Kept deliberately thin so the UI can
 * render it without importing rule engine internals.
 */
export interface IPhysicalAttackSelfRisk {
  /**
   * Collision / DFA-to-self / etc. damage applied to the attacker's
   * own hit-location table on resolution. `0` for attacks that don't
   * self-damage.
   */
  readonly damageToAttacker: number;
  /**
   * Per-leg damage for attacks that split damage between legs (DFA).
   * `0` when the attack type doesn't inflict leg damage.
   */
  readonly legDamagePerLeg: number;
  /**
   * Piloting-skill-roll trigger surfaced to the UI. `null` when the
   * attack imposes no PSR on the attacker.
   */
  readonly pilotingSkillRoll: {
    readonly trigger: string;
    readonly required: boolean;
  } | null;
  /**
   * Consequence when the attack misses (typed enum so the forecast
   * modal can render discoverable copy: "On miss: attacker falls").
   * `null` when a miss has no attacker-side consequence.
   */
  readonly onMiss: 'AttackerFalls' | 'None' | null;
}

/**
 * Per `add-physical-attack-phase-ui` task 3.1-3.3 + `physical-attack-system`
 * delta ADDED requirement "UI-Facing Eligibility Projection": one row
 * per eligible physical attack surfaced to the sub-panel. The UI renders
 * both eligible options (empty `restrictionsFailed`) and ineligible
 * options (non-empty `restrictionsFailed`) so restriction copy lives on
 * the engine side, not the client.
 */
export interface IPhysicalAttackOption {
  /** Attack type (punch / kick / charge / dfa / push / hatchet / ...). */
  readonly attackType: PhysicalAttackType;
  /** Limb for punches / kicks; undefined for whole-body attacks. */
  readonly limb?: PhysicalAttackLimb;
  /**
   * Full to-hit breakdown. `allowed: false` when the attack type is
   * eligible only for restriction-adjacent reasons (the UI still shows
   * the TN it would have been as "what would-have-been" per spec
   * scenario "Arm that fired weapon returns failed restriction").
   */
  readonly toHit: IPhysicalToHitResult;
  /** Expected damage summary (target + attacker + PSR flags). */
  readonly damage: IPhysicalDamageResult;
  /** Attacker-side consequences. See IPhysicalAttackSelfRisk docstring. */
  readonly selfRisk: IPhysicalAttackSelfRisk;
  /**
   * Restriction reason codes blocking the attack. Empty list means the
   * attack is eligible. UI renders the list as a tooltip on disabled
   * rows.
   */
  readonly restrictionsFailed: readonly PhysicalAttackInvalidReason[];
}
