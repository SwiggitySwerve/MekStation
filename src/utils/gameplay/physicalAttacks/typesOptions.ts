import type { IUnitGameState } from '@/types/gameplay';

import type { GrappleAttackSide } from './grappleEligibility';
import type { JumpJetAttackSelectedLeg } from './jumpJetAttackEligibility';
import type { ThrashAttackBlockingTerrain } from './thrashEligibility';
import type {
  IPhysicalDamageResult,
  IPhysicalToHitResult,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
  PhysicalTargetObjectType,
} from './types';

export interface IChooseBestPhysicalAttackOptions {
  attackerId?: string;
  targetId?: string;
  canReachForCharge?: boolean;
  hexesMoved?: number;
  attackerMovedBackwardThisTurn?: boolean;
  attackerUsedMechanicalJumpBooster?: boolean;
  isJumping?: boolean;
  hasMeleeWeapon?: PhysicalAttackType;
  weaponsFiredFromLeftArm?: readonly string[];
  weaponsFiredFromRightArm?: readonly string[];
  attackerProne?: boolean;
  attackerStuck?: boolean;
  attackerUnitType?: string;
  targetUnitType?: string;
  targetDistance?: number;
  targetIsSwarming?: boolean;
  targetIsSwarmingInfantryOnAttacker?: boolean;
  targetIsINarcPod?: boolean;
  targetObjectType?: PhysicalTargetObjectType;
  targetIsFriendly?: boolean;
  weaponsFiredThisTurn?: readonly string[];
  thrashBlockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  hasWorkingThrashArmOrLeg?: boolean;
  heat?: number;
  hasTSM?: boolean;
  pilotAbilities?: readonly string[];
  unitQuirks?: readonly string[];
  attackerIsQuad?: boolean;
  leftLegHasTalons?: boolean;
  rightLegHasTalons?: boolean;
  leftArmHasTalons?: boolean;
  rightArmHasTalons?: boolean;
  leftFootActuatorPresent?: boolean;
  rightFootActuatorPresent?: boolean;
  leftArmFootActuatorPresent?: boolean;
  rightArmFootActuatorPresent?: boolean;
  leftArmHasClaw?: boolean;
  rightArmHasClaw?: boolean;
  attackerEvading?: boolean;
  attackerLoadingOrUnloadingCargo?: boolean;
  leftArmCarryingCargo?: boolean;
  rightArmCarryingCargo?: boolean;
  attackerTargetedByDisplacementAttackerId?: string;
  attackerBoardId?: string;
  targetBoardId?: string;
  elevationDifference?: number;
  targetIsAirborne?: boolean;
  targetIsAirborneVTOLorWIGE?: boolean;
  attackerJumpMP?: number;
  targetIsMakingDisplacementAttack?: boolean;
  targetIsPushing?: boolean;
  targetDisplacementAttackTargetId?: string;
  targetedByDisplacementAttackerId?: string;
  optionalRules?: readonly string[];
  tacOpsGrapplingEnabled?: boolean;
  grappleSide?: GrappleAttackSide;
  attackerGrappledTargetId?: string;
  targetGrappledTargetId?: string;
  attackerIsGrappleAttacker?: boolean;
  targetIsGrappleAttacker?: boolean;
  attackerChainWhipGrappled?: boolean;
  leftArmAesFunctional?: boolean;
  rightArmAesFunctional?: boolean;
  attackerWeightClass?: number;
  targetWeightClass?: number;
  tacOpsJumpJetAttackEnabled?: boolean;
  jumpJetAttackSelectedLeg?: JumpJetAttackSelectedLeg;
  leftReadyJumpJetCount?: number;
  rightReadyJumpJetCount?: number;
  leftLegWeaponFiredThisTurn?: boolean;
  rightLegWeaponFiredThisTurn?: boolean;
  standingAttackerHeightAboveTargetHeight?: number;
  proneTargetElevationInRange?: boolean;
  targetDirectlyAheadOfFeet?: boolean;
  targetDirectlyBehindFeet?: boolean;
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
