import type { IComponentDamageState } from '@/types/gameplay';
import type { LightCondition } from '@/types/gameplay/EnvironmentalConditions';

import type { GrappleAttackSide } from './grappleEligibility';
import type { JumpJetAttackSelectedLeg } from './jumpJetAttackEligibility';
import type { ThrashAttackBlockingTerrain } from './thrashEligibility';
import type {
  IPhysicalAttackElevationContext,
  IPhysicalAttackTerrainContext,
  PhysicalAttackLimb,
  PhysicalAttackType,
  PhysicalHitTable,
  PhysicalTargetObjectType,
} from './types';

export interface IPhysicalAttackInput {
  readonly attackerId?: string;
  readonly targetId?: string;
  readonly attackerTonnage: number;
  readonly pilotingSkill: number;
  readonly componentDamage: IComponentDamageState;
  readonly attackType: PhysicalAttackType;
  readonly arm?: 'left' | 'right';
  /**
   * Explicit two-handed Zweihander attack state. This does not imply the
   * pilot has the canonical `zweihander` SPA; callers must also supply that
   * ability in `pilotAbilities`.
   */
  readonly twoHandedZweihander?: boolean;
  readonly hexesMoved?: number;
  readonly heat?: number;
  readonly hasTSM?: boolean;
  readonly isUnderwater?: boolean;
  /**
   * Source-backed Terrain Master: Frogman physical to-hit gate. MegaMek
   * applies Frogman only when the attacker occupies water deeper than level 1.
   */
  readonly attackerWaterDepth?: number;
  readonly weaponsFiredFromArm?: readonly string[];
  /**
   * Source-backed push legality: a BattleMech needs both arm locations
   * present to push.
   */
  readonly attackerDestroyedLocations?: readonly string[];
  /**
   * Construction-side unit-type discriminators. Undefined preserves legacy
   * synthetic BattleMech fixtures; explicit non-Mek values let push reject
   * targets/attackers that MegaMek would not treat as `Mek` instances.
   */
  readonly attackerUnitType?: string;
  readonly attackerMovementMode?: string;
  readonly attackerConversionMode?: string | number;
  readonly attackerIsAirborneVTOLOrWiGE?: boolean;
  readonly attackerVehicleCrewStunned?: boolean;
  /**
   * Source-backed push legality: quad BattleMechs cannot push.
   */
  readonly attackerIsQuad?: boolean;
  /**
   * Source-backed push legality: airborne AirMek/VTOL/WIGE attackers cannot
   * push.
   */
  readonly attackerIsAirborne?: boolean;
  /**
   * Source-backed push legality: rear-flipped arms cannot push.
   */
  readonly attackerArmsFlipped?: boolean;
  readonly targetUnitType?: string;
  /**
   * Source-backed DFA to-hit: MegaMek applies attacker piloting minus target
   * piloting as a piloting-skill differential modifier.
   */
  readonly targetPilotingSkill?: number;
  /**
   * Source-backed shared physical legality: an attacker that is evading
   * cannot make normal physical attacks.
   */
  readonly attackerEvading?: boolean;
  /**
   * Source-backed spotting penalty: a unit that declared SpotAction-style
   * target spotting applies +1 to its own weapon and physical attacks.
   */
  readonly attackerSpotting?: boolean;
  /**
   * Source-backed shared physical legality: an attacker that is loading or
   * unloading cargo cannot make physical attacks.
   */
  readonly attackerLoadingOrUnloadingCargo?: boolean;
  /**
   * Source-backed represented carry-object state: an arm carrying cargo cannot
   * be used for arm-dependent physical attacks. This is intentionally narrower
   * than pickup/carry/throw action lifecycle support.
   */
  readonly leftArmCarryingCargo?: boolean;
  readonly rightArmCarryingCargo?: boolean;
  /**
   * Source-backed bog-down legality: stuck Meks cannot charge or execute DFA.
   */
  readonly attackerStuck?: boolean;
  /**
   * Source-backed retractable blade legality: MegaMek rejects the attack
   * when the blade is not extended. Undefined preserves legacy runtime
   * contexts that do not yet hydrate physical weapon mode state.
   */
  readonly retractableBladeExtended?: boolean;
  /**
   * Source-backed push legality: a unit that is already the target of a
   * displacement attack can only counter-push the unit that owns that attack.
   */
  readonly attackerTargetedByDisplacementAttackerId?: string;
  readonly attackerProne?: boolean;
  readonly attackerHullDown?: boolean;
  readonly targetTonnage?: number;
  /**
   * Source-backed physical legality gates can depend on the target's
   * posture; push cannot target prone BattleMechs.
   */
  readonly targetProne?: boolean;
  /**
   * Source-backed charge legality: charge targets must have completed
   * movement unless they are immobile.
   */
  readonly targetMovementComplete?: boolean;
  readonly targetImmobile?: boolean;
  /**
   * Source-backed shared physical legality: a physical attack must have an
   * existing target unit.
   */
  readonly targetExists?: boolean;
  /**
   * Source-backed non-unit target discriminator. Undefined preserves the
   * runtime's current unit-id-only declarations; explicit values let helper
   * tests model MegaMek physical target types such as woods clearing,
   * building ignition, and fuel tanks without conflating them with unitType.
   */
  readonly targetObjectType?: PhysicalTargetObjectType;
  /**
   * MekStation lifecycle targetability: destroyed units are no longer valid
   * physical targets.
   */
  readonly targetDestroyed?: boolean;
  /**
   * MekStation lifecycle targetability: retreated or withdrawn units have
   * left active combat and cannot be selected as physical targets.
   */
  readonly targetRetreated?: boolean;
  /**
   * MekStation lifecycle targetability: ejected units have left active combat
   * and cannot be selected as physical targets.
   */
  readonly targetEjected?: boolean;
  /**
   * Source-backed shared physical legality: attacker and target must be on
   * the same board. Undefined values preserve legacy single-board fixtures.
   */
  readonly attackerBoardId?: string;
  readonly targetBoardId?: string;
  /**
   * Source-backed shared physical legality: transported passenger units cannot
   * be targeted by normal physical attacks.
   */
  readonly targetIsPassenger?: boolean;
  /**
   * Source-backed shared physical legality: units conducting a swarm attack
   * cannot be targeted by normal physical attacks.
   */
  readonly targetIsSwarming?: boolean;
  /**
   * Source-backed shared physical legality: units making a DFA attack cannot
   * be targeted by normal physical attacks.
   */
  readonly targetIsMakingDFA?: boolean;
  /**
   * Source-backed charge/DFA legality: targets already making a displacement
   * attack cannot be declared as charge/DFA targets.
   */
  readonly targetIsMakingDisplacementAttack?: boolean;
  /**
   * Source-backed push legality: targets currently pushing another unit can
   * only be counter-pushed by that unit.
   */
  readonly targetIsPushing?: boolean;
  readonly targetDisplacementAttackTargetId?: string;
  /**
   * Source-backed charge/DFA legality: a target already owned by another
   * displacement attacker cannot be selected.
   */
  readonly targetedByDisplacementAttackerId?: string;
  /**
   * Source-backed shared physical legality: airborne units cannot be targeted
   * by normal physical attacks.
   */
  readonly targetIsAirborne?: boolean;
  /**
   * Source-backed DFA exception: MegaMek separately checks low-altitude
   * VTOL/WIGE reach against attacker jump MP instead of treating those target
   * types as generic airborne units.
   */
  readonly targetIsAirborneVTOLorWIGE?: boolean;
  readonly attackerJumpMP?: number;
  /**
   * Source-backed shared physical legality: targets inside a building can only
   * be attacked physically by an attacker inside the same building.
   */
  readonly attackerOccupiedBuildingId?: string;
  readonly targetOccupiedBuildingId?: string;
  /**
   * Source-backed shared physical legality: a unit cannot declare a normal
   * BattleMech physical attack against itself.
   */
  readonly targetIsSelf?: boolean;
  /**
   * Source-backed shared physical legality: normal physical attacks cannot
   * target same-side units.
   */
  readonly targetIsFriendly?: boolean;
  /**
   * Source-backed shared physical legality: BattleMech physical attacks in
   * the current runtime target adjacent units. Undefined preserves callers
   * without board-position context; explicit non-1 distances reject.
   */
  readonly targetDistance?: number;
  /**
   * Per `implement-physical-attack-phase` task 4.3 / 5.3: target movement
   * modifier applied to punch / kick / melee to-hit. Callers compute TMM
   * from the target's `movementThisTurn` + `hexesMovedThisTurn`.
   */
  readonly targetMovementModifier?: number;
  /**
   * Source-backed target evasion to-hit modifier. MegaMek's
   * `Entity.getEvasionBonus` suppresses the bonus for prone targets, so
   * callers should also hydrate `targetProne` when this is true.
   */
  readonly targetEvading?: boolean;
  /**
   * Optional source-backed target evasion to-hit bonus. Undefined preserves
   * the normal +1 target evasion modifier; explicit 0 models source-backed
   * Skilled Evasion state that is evading but grants no target modifier.
   */
  readonly targetEvasionBonus?: number;
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
   * Source-backed DFA legality: MegaMek rejects DFA movement paths that use a
   * mechanical jump booster instead of normal jump movement.
   */
  readonly attackerUsedMechanicalJumpBooster?: boolean;
  /**
   * Per task 3.7: charge requires the attacker ran this turn.
   */
  readonly attackerRanThisTurn?: boolean;
  /**
   * Source-backed charge legality: MegaMek rejects charge movement paths that
   * include BACKWARDS or backward-lateral movement steps.
   */
  readonly attackerMovedBackwardThisTurn?: boolean;
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
  /**
   * Source-backed Talons modifier state. MegaMek applies the +50% damage
   * modifier only when the attacking leg (or either DFA leg) has working
   * talons and a working foot actuator. For quad/non-biped BattleMechs,
   * MegaMek maps front-leg talon checks through arm locations. Undefined
   * preserves callers outside UnitHydration that do not carry mounted talon
   * equipment.
   */
  readonly leftLegHasTalons?: boolean;
  readonly rightLegHasTalons?: boolean;
  readonly leftArmHasTalons?: boolean;
  readonly rightArmHasTalons?: boolean;
  readonly leftFootActuatorPresent?: boolean;
  readonly rightFootActuatorPresent?: boolean;
  readonly leftArmFootActuatorPresent?: boolean;
  readonly rightArmFootActuatorPresent?: boolean;
  /**
   * Source-backed Claw modifier state. MegaMek treats claws as working hand
   * weapons that modify punch damage/to-hit for the matching arm, not as a
   * standalone selectable physical attack type.
   */
  readonly leftArmHasClaw?: boolean;
  readonly rightArmHasClaw?: boolean;
  /**
   * Optional combat rules that affect physical attack math. Current coverage
   * uses PLAYTEST_3 for MegaMek's claw punch to-hit branch.
   */
  readonly optionalRules?: readonly string[];
  /**
   * Source-backed optional TacOps trip attacks can be enabled by a caller
   * boolean or by the matching optional-rule token.
   */
  readonly tacOpsTripAttackEnabled?: boolean;
  readonly tacOpsGrapplingEnabled?: boolean;
  readonly grappleSide?: GrappleAttackSide;
  readonly commonPhysicalImpossibleReasonCode?: 'LockedInGrapple' | 'Other';
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
  readonly targetInFrontArc?: boolean;
  readonly leftTripLimbUsable?: boolean;
  readonly rightTripLimbUsable?: boolean;
  readonly legAesFunctional?: boolean;
  readonly thrashBlockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  readonly hasWorkingThrashArmOrLeg?: boolean;
  readonly tacOpsJumpJetAttackEnabled?: boolean;
  readonly attackerIsLandAirMek?: boolean;
  readonly attackerIsMekMode?: boolean;
  readonly jumpJetAttackSelectedLeg?: JumpJetAttackSelectedLeg;
  readonly leftReadyJumpJetCount?: number;
  readonly rightReadyJumpJetCount?: number;
  readonly leftLegWet?: boolean;
  readonly rightLegWet?: boolean;
  readonly leftLegWeaponFiredThisTurn?: boolean;
  readonly rightLegWeaponFiredThisTurn?: boolean;
  readonly standingAttackerHeightAboveTargetHeight?: number;
  readonly proneTargetElevationInRange?: boolean;
  readonly targetDirectlyAheadOfFeet?: boolean;
  readonly targetDirectlyBehindFeet?: boolean;
  readonly targetIsSwarmingInfantryOnAttacker?: boolean;
  readonly targetIsINarcPod?: boolean;
  readonly armAesFunctional?: boolean;
  readonly torsoMountedCockpit?: boolean;
  readonly headSensorHits?: number;
  readonly centerTorsoSensorHits?: number;
  readonly defenderHasMagneticClaws?: boolean;
  /**
   * Per task 8.5: a push is only legal when the displacement destination
   * is on-map and unoccupied. Undefined preserves legacy callers that have
   * not computed the push hex yet.
   */
  readonly pushDestinationValid?: boolean;
  /**
   * MegaMek push legality requires the target to be directly ahead of the
   * attacker's feet facing. Undefined preserves callers that do not have
   * board position/facing context.
   */
  readonly pushTargetDirectlyAhead?: boolean;
  /**
   * Pilot abilities and unit quirks that modify physical attacks. Kept on
   * the shared input so helper, runner, and interactive paths consume the
   * same Melee Specialist damage and to-hit, Battle Fists, and arm
   * restriction behavior.
   */
  readonly pilotAbilities?: readonly string[];
  readonly unitQuirks?: readonly string[];
  /**
   * Source-backed Environmental Specialist physical to-hit gate. MegaMek's
   * physical attack advantage branch uses the Light designation, dark
   * planetary light, and target illumination state.
   */
  readonly designatedEnvironment?: string;
  readonly environmentalLight?: LightCondition;
  readonly targetIlluminated?: boolean;
  /**
   * Target elevation minus attacker elevation. Positive values mean the
   * target is above the attacker. Charge uses this to verify the attacker
   * and target vertical bands overlap. Undefined preserves callers without
   * board elevation context.
   *
   * Low Arms is intentionally not applied here until a source-backed combat
   * resolver exists in the pinned rule authority.
   */
  readonly elevationDifference?: number;
  /**
   * Unit height above its current elevation, following MegaMek's `height()`
   * convention where a normal standing Mek is 1. Undefined defaults to a
   * normal standing BattleMech.
   */
  readonly attackerHeight?: number;
  readonly targetHeight?: number;
  readonly elevationContext?: IPhysicalAttackElevationContext;
  readonly terrainContext?: IPhysicalAttackTerrainContext;
  readonly hitTableOverride?: PhysicalHitTable;
}
