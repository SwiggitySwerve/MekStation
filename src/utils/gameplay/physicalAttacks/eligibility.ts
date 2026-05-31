/**
 * getEligiblePhysicalAttacks — UI-facing projection per
 * `add-physical-attack-phase-ui` task 3.1 + `physical-attack-system`
 * spec delta "UI-Facing Eligibility Projection".
 *
 * For a given attacker + target pair, returns one row per physical
 * attack type (punch × up to 2 arms, kick × up to 2 legs, charge, DFA,
 * push, and any equipped melee weapons). Eligible rows carry an empty
 * `restrictionsFailed`; ineligible rows include the blocking reason
 * codes so the UI can render a disabled row + tooltip without
 * duplicating rules-engine logic.
 *
 * Per spec scenario "Non-adjacent target returns empty list", callers
 * passing `null`/non-adjacent targets receive an empty array — the
 * sub-panel uses that to render the "No eligible physical attacks this
 * turn" empty state.
 *
 * Adjacency is computed via `hexDistance(attacker.position,
 * target.position) === 1`.
 *
 * @spec openspec/changes/add-physical-attack-phase-ui/specs/physical-attack-system/spec.md
 */

import { type IUnitGameState, MovementType } from '@/types/gameplay';

import type { ThrashAttackBlockingTerrain } from './thrashEligibility';

import { hexDistance } from '../hexMath';
import { calculatePhysicalDamage } from './damage';
import { isTargetDirectlyAhead, isTargetInFrontArc } from './displacement';
import {
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
} from './restrictions';
import { calculatePhysicalToHit } from './toHit';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  IPhysicalAttackInput,
  IPhysicalAttackOption,
  IPhysicalAttackRestriction,
  IPhysicalAttackSelfRisk,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
  isPhysicalAirborneVtolOrWigeTarget,
  physicalTargetObjectTypeForUnitType,
} from './types';

const SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPE_SET = new Set<string>(
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
);

/**
 * Per `add-physical-attack-phase-ui` task 3.2: caller-supplied context
 * the projection needs that is NOT carried on `IUnitGameState`. `IUnitGameState`
 * is a runtime combat snapshot (position, heat, component damage,
 * prone, movement) and lacks static fields like tonnage + piloting
 * skill. Callers (the sub-panel + tests) supply those here.
 */
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
  /** Optional physical-combat rule branches, such as PLAYTEST_3. */
  readonly optionalRules?: readonly string[];
  readonly tacOpsTripAttackEnabled?: boolean;
  readonly attackerAlreadyGrappled?: boolean;
  readonly leftTripLimbUsable?: boolean;
  readonly rightTripLimbUsable?: boolean;
  readonly legAesFunctional?: boolean;
  readonly thrashBlockingTerrains?: readonly ThrashAttackBlockingTerrain[];
  readonly hasWorkingThrashArmOrLeg?: boolean;
  /** Equipped melee weapon types (hatchet / sword / mace / lance). */
  readonly meleeWeaponsEquipped?: readonly PhysicalAttackType[];
  /** False when the computed push destination is off-map or occupied. */
  readonly pushDestinationValid?: boolean;
  /** Pilot abilities and unit quirks that modify physical attacks. */
  readonly pilotAbilities?: readonly string[];
  readonly unitQuirks?: readonly string[];
  /** Target elevation minus attacker elevation. */
  readonly elevationDifference?: number;
  /** False when a retractable blade is present but not extended. */
  readonly retractableBladeExtended?: boolean;
}

/**
 * Map a restriction validator result into the list of failed-reason
 * codes the UI renders. A single blocking reason is emitted because
 * the restriction helpers return the first failure — one entry is
 * sufficient for the tooltip copy.
 */
function restrictionFailedCodes(
  restriction: IPhysicalAttackRestriction,
): readonly PhysicalAttackInvalidReason[] {
  if (restriction.allowed) return [];
  if (restriction.reasonCode) return [restriction.reasonCode];
  return [];
}

/**
 * Per `physical-attack-system` delta "Self-Risk Summary in Options":
 * compute the UI-facing self-risk for each attack type. Driven by the
 * same damage helper used at resolution — no new rules here.
 */
function buildSelfRisk(
  attackType: PhysicalAttackType,
  input: IPhysicalAttackInput,
): IPhysicalAttackSelfRisk {
  const damage = calculatePhysicalDamage(input);

  switch (attackType) {
    case 'charge':
      return {
        damageToAttacker: damage.attackerDamage,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'ChargeCompleted',
          required: true,
        },
        onMiss: 'None',
      };
    case 'dfa':
      return {
        damageToAttacker: damage.attackerDamage,
        legDamagePerLeg: damage.attackerLegDamagePerLeg,
        pilotingSkillRoll: {
          trigger: 'DFACompleted',
          required: true,
        },
        onMiss: 'AttackerFalls',
      };
    case 'kick':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'KickMiss',
          required: false,
        },
        onMiss: 'AttackerFalls',
      };
    case 'push':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: null,
      };
    case 'thrash':
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: {
          trigger: 'ThrashCompleted',
          required: true,
        },
        onMiss: null,
      };
    default:
      return {
        damageToAttacker: 0,
        legDamagePerLeg: 0,
        pilotingSkillRoll: null,
        onMiss: null,
      };
  }
}

/**
 * Build a single option row. Keeps the shape uniform across eligible
 * and ineligible rows — the forecast modal + sub-panel both render
 * the same skeleton and switch on `restrictionsFailed.length` for
 * enabled/disabled styling.
 */
function buildOption(
  attackType: PhysicalAttackType,
  input: IPhysicalAttackInput,
  restriction: IPhysicalAttackRestriction,
  limb?: PhysicalAttackLimb,
): IPhysicalAttackOption {
  const toHit = calculatePhysicalToHit(input);
  const damage = calculatePhysicalDamage(input);
  const selfRisk = buildSelfRisk(attackType, input);

  return {
    attackType,
    limb,
    toHit,
    damage,
    selfRisk,
    restrictionsFailed: restrictionFailedCodes(restriction),
  };
}

function isRuntimeMeleeWeaponAttackType(
  weaponType: PhysicalAttackType,
): boolean {
  return SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPE_SET.has(weaponType);
}

/**
 * Per spec scenario "Fully-intact mech returns punch + kick options":
 * the canonical entry point. Returns `[]` when target is null or more
 * than 1 hex away. Otherwise emits up to 6 rows: punch × 2 arms,
 * kick × 2 legs, charge, DFA, push, plus one row per equipped melee
 * weapon.
 */
export function getEligiblePhysicalAttacks(
  attacker: IUnitGameState | null,
  target: IUnitGameState | null,
  context: IEligibilityContext,
): readonly IPhysicalAttackOption[] {
  if (!attacker || !target) return [];
  if (
    attacker.destroyed ||
    target.destroyed ||
    target.hasRetreated ||
    target.hasEjected
  ) {
    return [];
  }
  const targetDistance = hexDistance(attacker.position, target.position);
  // Per spec scenario "Non-adjacent target returns empty list"; same-hex is
  // retained for source-backed prone BattleMech thrash attacks.
  if (targetDistance > 1) return [];

  const componentDamage = attacker.componentDamage ?? {
    engineHits: 0,
    gyroHits: 0,
    sensorHits: 0,
    lifeSupport: 0,
    cockpitHit: false,
    actuators: {},
    weaponsDestroyed: [],
    heatSinksDestroyed: 0,
    jumpJetsDestroyed: 0,
  };

  const baseInput = {
    attackerId: attacker.id,
    targetId: target.id,
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.attackerPilotingSkill,
    componentDamage,
    heat: attacker.heat,
    attackerDestroyedLocations: attacker.destroyedLocations,
    attackerUnitType: attacker.unitType,
    attackerIsQuad: attacker.isQuad,
    attackerIsAirborne: attacker.isAirborne,
    attackerArmsFlipped: attacker.armsFlipped,
    targetUnitType: target.unitType,
    targetPilotingSkill: target.piloting,
    attackerEvading: attacker.isEvading,
    attackerSpotting: attacker.isSpotting,
    attackerLoadingOrUnloadingCargo: attacker.isLoadingOrUnloadingCargo,
    retractableBladeExtended: context.retractableBladeExtended,
    attackerTargetedByDisplacementAttackerId:
      attacker.targetedByDisplacementAttackerId,
    attackerProne: attacker.prone,
    targetProne: target.prone,
    targetMovementComplete: context.targetMovementComplete,
    targetImmobile: target.shutdown,
    targetExists: true,
    targetObjectType: physicalTargetObjectTypeForUnitType(target.unitType),
    targetDestroyed: target.destroyed,
    targetRetreated: target.hasRetreated,
    targetEjected: target.hasEjected,
    targetIsPassenger: target.isPassenger,
    attackerBoardId: attacker.boardId,
    targetBoardId: target.boardId,
    targetIsSwarming: target.isSwarming,
    targetIsMakingDFA: target.isMakingDFA,
    targetIsMakingDisplacementAttack: target.isMakingDisplacementAttack,
    targetIsPushing: target.isPushing,
    targetDisplacementAttackTargetId: target.displacementAttackTargetId,
    targetedByDisplacementAttackerId: target.targetedByDisplacementAttackerId,
    targetIsAirborne: target.isAirborne,
    targetIsAirborneVTOLorWIGE:
      context.attackerJumpMP !== undefined &&
      context.elevationDifference !== undefined &&
      isPhysicalAirborneVtolOrWigeTarget(
        target.unitType,
        target.motionType,
        target.isAirborne,
      ),
    attackerJumpMP: context.attackerJumpMP,
    attackerOccupiedBuildingId: attacker.occupiedBuildingId,
    targetOccupiedBuildingId: target.occupiedBuildingId,
    targetIsSelf: attacker.id === target.id,
    targetIsFriendly: attacker.side === target.side,
    targetDistance,
    hexesMoved: attacker.hexesMovedThisTurn,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    targetEvading: target.isEvading,
    targetEvasionBonus: target.evasionBonus,
    attackerMovementModifier: context.attackerMovementModifier,
    hasTSM: context.hasTSM,
    attackerRanThisTurn: context.attackerRanThisTurn,
    attackerMovedBackwardThisTurn:
      context.attackerMovedBackwardThisTurn ?? attacker.movedBackwardThisTurn,
    attackerJumpedThisTurn:
      context.attackerJumpedThisTurn ??
      attacker.movementThisTurn === MovementType.Jump,
    attackerUsedMechanicalJumpBooster:
      context.attackerUsedMechanicalJumpBooster ??
      attacker.usedMechanicalJumpBoosterThisTurn,
    limbsUsedThisTurn: context.limbsUsedThisTurn,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
    leftLegHasTalons: context.leftLegHasTalons ?? attacker.leftLegHasTalons,
    rightLegHasTalons: context.rightLegHasTalons ?? attacker.rightLegHasTalons,
    leftArmHasTalons: context.leftArmHasTalons ?? attacker.leftArmHasTalons,
    rightArmHasTalons: context.rightArmHasTalons ?? attacker.rightArmHasTalons,
    leftFootActuatorPresent: context.leftFootActuatorPresent,
    rightFootActuatorPresent: context.rightFootActuatorPresent,
    leftArmFootActuatorPresent: context.leftArmFootActuatorPresent,
    rightArmFootActuatorPresent: context.rightArmFootActuatorPresent,
    leftArmHasClaw: context.leftArmHasClaw ?? attacker.leftArmHasClaw,
    rightArmHasClaw: context.rightArmHasClaw ?? attacker.rightArmHasClaw,
    optionalRules: context.optionalRules,
    tacOpsTripAttackEnabled: context.tacOpsTripAttackEnabled,
    attackerAlreadyGrappled: context.attackerAlreadyGrappled,
    targetInFrontArc: isTargetInFrontArc(
      attacker.position,
      attacker.facing,
      target.position,
    ),
    leftTripLimbUsable: context.leftTripLimbUsable,
    rightTripLimbUsable: context.rightTripLimbUsable,
    legAesFunctional: context.legAesFunctional,
    thrashBlockingTerrains: context.thrashBlockingTerrains,
    hasWorkingThrashArmOrLeg: context.hasWorkingThrashArmOrLeg,
    pushDestinationValid: context.pushDestinationValid,
    pushTargetDirectlyAhead: isTargetDirectlyAhead(
      attacker.position,
      attacker.facing,
      target.position,
    ),
    pilotAbilities: context.pilotAbilities ?? attacker.abilities,
    unitQuirks: context.unitQuirks ?? attacker.unitQuirks,
    elevationDifference: context.elevationDifference,
  } as const;

  const options: IPhysicalAttackOption[] = [];

  // Per spec scenario "Fully-intact mech returns punch + kick options":
  // emit one punch row per arm.
  const leftPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'left',
    limb: 'leftArm',
    weaponsFiredFromArm: context.weaponsFiredFromLeftArm,
  };
  const leftPunchRestriction = canPunch(leftPunchInput);
  options.push(
    buildOption('punch', leftPunchInput, leftPunchRestriction, 'leftArm'),
  );

  const rightPunchInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'punch',
    arm: 'right',
    limb: 'rightArm',
    weaponsFiredFromArm: context.weaponsFiredFromRightArm,
  };
  const rightPunchRestriction = canPunch(rightPunchInput);
  options.push(
    buildOption('punch', rightPunchInput, rightPunchRestriction, 'rightArm'),
  );

  // Kick × 2 legs.
  const leftKickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
    limb: 'leftLeg',
  };
  const leftKickRestriction = canKick(leftKickInput);
  options.push(
    buildOption('kick', leftKickInput, leftKickRestriction, 'leftLeg'),
  );

  const rightKickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
    limb: 'rightLeg',
  };
  const rightKickRestriction = canKick(rightKickInput);
  options.push(
    buildOption('kick', rightKickInput, rightKickRestriction, 'rightLeg'),
  );

  // Charge — restricted by `canCharge`. Per spec scenario "Charge
  // option requires ran this turn", attackers that didn't run receive
  // `restrictionsFailed: ['NoRunThisTurn']`.
  const chargeInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'charge',
    attackerJumpedThisTurn: attacker.movementThisTurn === MovementType.Jump,
  };
  const chargeRestriction = canCharge(chargeInput);
  options.push(buildOption('charge', chargeInput, chargeRestriction));

  // DFA — restricted by `canDFA`. Spec scenario "DFA option requires
  // jumped this turn" mirrors charge.
  const dfaInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'dfa',
  };
  const dfaRestriction = canDFA(dfaInput);
  options.push(buildOption('dfa', dfaInput, dfaRestriction));

  // Push is gated by facing, posture, elevation, quirks, and optional
  // displacement-destination validity when callers can compute it.
  const pushInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'push',
    weaponsFiredFromArm: [
      ...(context.weaponsFiredFromLeftArm ?? []),
      ...(context.weaponsFiredFromRightArm ?? []),
    ],
  };
  options.push(buildOption('push', pushInput, canPush(pushInput)));

  const tripInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'trip',
  };
  options.push(buildOption('trip', tripInput, canTripPhysical(tripInput)));

  if (targetDistance === 0) {
    const thrashInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: 'thrash',
      weaponsFiredFromArm: [
        ...(context.weaponsFiredThisTurn ?? [
          ...(context.weaponsFiredFromLeftArm ?? []),
          ...(context.weaponsFiredFromRightArm ?? []),
        ]),
      ],
    };
    options.push(
      buildOption('thrash', thrashInput, canThrashPhysical(thrashInput)),
    );
  }

  // Melee weapons — one row per equipped type, gated by
  // `canMeleeWeapon` (shoulder / hand / lower-arm actuator destruction
  // and per-arm weapon-fire lockouts).
  for (const weaponType of context.meleeWeaponsEquipped ?? []) {
    if (!isRuntimeMeleeWeaponAttackType(weaponType)) {
      continue;
    }

    const meleeInput: IPhysicalAttackInput = {
      ...baseInput,
      attackType: weaponType,
      // Default to right-arm for the restriction lookup; the sub-panel
      // can swap arms once limb selection is wired to melee weapons.
      weaponsFiredFromArm: context.weaponsFiredFromRightArm,
    };
    const restriction = canMeleeWeapon(meleeInput);
    options.push(buildOption(weaponType, meleeInput, restriction));
  }

  return options;
}
