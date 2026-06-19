import type { ThrashAttackBlockingTerrain } from './thrashEligibility';
import type {
  IPhysicalAttackInput,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from './types';

export interface IEligibilityContext {
  readonly attackerTonnage: number;
  readonly attackerPilotingSkill: number;
  readonly targetTonnage?: number;
  /** Weapons fired from the attacker's left arm this turn. */
  readonly weaponsFiredFromLeftArm?: readonly string[];
  /** Weapons fired from the attacker's right arm this turn. */
  readonly weaponsFiredFromRightArm?: readonly string[];
  /** All weapons fired by the attacker this turn. */
  readonly weaponsFiredThisTurn?: readonly string[];
  /** Limbs already used for a physical attack this turn. */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /** True when the attacker ran this turn — gates charge. */
  readonly attackerRanThisTurn?: boolean;
  /** True when the movement step chain included backward movement. */
  readonly attackerMovedBackwardThisTurn?: boolean;
  /** True when the attacker jumped this turn — gates DFA. */
  readonly attackerJumpedThisTurn?: boolean;
  /** True when this turn's jump used mechanical jump boosters instead of normal jump movement. */
  readonly attackerUsedMechanicalJumpBooster?: boolean;
  /** Attacker jump MP for DFA reach against airborne VTOL/WIGE targets. */
  readonly attackerJumpMP?: number;
  /** Target movement modifier (TMM). */
  readonly targetMovementModifier?: number;
  /** Attacker movement modifier (used by charge to-hit). */
  readonly attackerMovementModifier?: number;
  readonly attackerUnitType?: IPhysicalAttackInput['attackerUnitType'];
  readonly attackerMovementMode?: IPhysicalAttackInput['attackerMovementMode'];
  readonly attackerConversionMode?: IPhysicalAttackInput['attackerConversionMode'];
  readonly attackerIsAirborneVTOLOrWiGE?: IPhysicalAttackInput['attackerIsAirborneVTOLOrWiGE'];
  readonly targetUnitType?: IPhysicalAttackInput['targetUnitType'];
  /** Charge target movement-complete gate; false blocks unless target is immobile. */
  readonly targetMovementComplete?: boolean;
  /** Triple-strength myomer installed on the attacker. */
  readonly hasTSM?: boolean;
  /** Per-attacker presence flags for arm actuators (punches). */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
  /** Per-leg talon state used by kick/DFA damage projections. */
  readonly leftLegHasTalons?: boolean;
  readonly rightLegHasTalons?: boolean;
  /** Quad/non-biped front-leg talons are checked through arm locations. */
  readonly leftArmHasTalons?: boolean;
  readonly rightArmHasTalons?: boolean;
  readonly leftFootActuatorPresent?: boolean;
  readonly rightFootActuatorPresent?: boolean;
  readonly leftArmFootActuatorPresent?: boolean;
  readonly rightArmFootActuatorPresent?: boolean;
  /** Per-arm claw state used by punch damage/to-hit projections. */
  readonly leftArmHasClaw?: boolean;
  readonly rightArmHasClaw?: boolean;
  readonly leftArmCarryingCargo?: boolean;
  readonly rightArmCarryingCargo?: boolean;
  /** Optional physical-combat rule branches, such as PLAYTEST_3. */
  readonly optionalRules?: readonly string[];
  readonly tacOpsTripAttackEnabled?: boolean;
  readonly tacOpsGrapplingEnabled?: boolean;
  readonly grappleSide?: 'left' | 'right' | 'both';
  readonly attackerGrappledTargetId?: string;
  readonly targetGrappledTargetId?: string;
  readonly attackerIsGrappleAttacker?: boolean;
  readonly targetIsGrappleAttacker?: boolean;
  readonly attackerChainWhipGrappled?: boolean;
  readonly leftArmAesFunctional?: boolean;
  readonly rightArmAesFunctional?: boolean;
  readonly attackerWeightClass?: number;
  readonly targetWeightClass?: number;
  readonly attackerAlreadyGrappled?: boolean;
  readonly leftTripLimbUsable?: boolean;
  readonly rightTripLimbUsable?: boolean;
  readonly legAesFunctional?: boolean;
  readonly thrashBlockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  readonly hasWorkingThrashArmOrLeg?: boolean;
  readonly tacOpsJumpJetAttackEnabled?: boolean;
  readonly jumpJetAttackSelectedLeg?: 'left' | 'right' | 'both';
  readonly leftReadyJumpJetCount?: number;
  readonly rightReadyJumpJetCount?: number;
  readonly leftLegWet?: boolean;
  readonly rightLegWet?: boolean;
  readonly leftLegWeaponFiredThisTurn?: boolean;
  readonly rightLegWeaponFiredThisTurn?: boolean;
  readonly targetIsSwarmingInfantryOnAttacker?: boolean;
  readonly targetIsINarcPod?: boolean;
  readonly armAesFunctional?: boolean;
  readonly torsoMountedCockpit?: boolean;
  readonly headSensorHits?: number;
  readonly centerTorsoSensorHits?: number;
  readonly defenderHasMagneticClaws?: boolean;
  readonly standingAttackerHeightAboveTargetHeight?: number;
  readonly proneTargetElevationInRange?: boolean;
  readonly targetDirectlyAheadOfFeet?: boolean;
  readonly targetDirectlyBehindFeet?: boolean;
  /** Equipped melee weapon types (hatchet / sword / mace / lance). */
  readonly meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  /** False when the computed push destination is off-map or occupied. */
  readonly pushDestinationValid?: boolean;
  /** Pilot abilities and unit quirks that modify physical attacks. */
  readonly pilotAbilities?: readonly string[];
  readonly unitQuirks?: readonly string[];
  /** Target elevation minus attacker elevation. */
  readonly elevationDifference?: number;
  readonly elevationContext?: IPhysicalAttackInput['elevationContext'];
  readonly terrainContext?: IPhysicalAttackInput['terrainContext'];
  /** False when a retractable blade is present but not extended. */
  readonly retractableBladeExtended?: boolean;
}
