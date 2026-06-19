import type { EligibilityBaseInput } from './eligibilityBaseInput';
import type { IEligibilityContext } from './eligibilityContext';

import { buildOption } from './eligibilityOptionFactory';
import {
  canBrushOffPhysical,
  canBreakGrapplePhysical,
  canCharge,
  canDFA,
  canGrapplePhysical,
  canKick,
  canJumpJetAttackPhysical,
  canMeleeWeapon,
  canPunch,
  canPush,
  canThrashPhysical,
  canTripPhysical,
} from './restrictions';
import {
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
  type IPhysicalAttackInput,
  type IPhysicalAttackOption,
  type PhysicalAttackLimb,
  type PhysicalAttackType,
} from './types';

const SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPE_SET = new Set<string>(
  SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPES,
);
const TACOPS_JUMP_JET_ATTACK_OPTIONS = new Set([
  'tacops_jump_jet_attack',
  'advanced_combat_tac_ops_jump_jet_attack',
  'jump_jet_attack',
]);

function isRuntimeMeleeWeaponAttackType(
  weaponType: PhysicalAttackType,
): boolean {
  return SUPPORTED_PHYSICAL_WEAPON_ATTACK_TYPE_SET.has(weaponType);
}

function meleeWeaponArmOptions(
  weaponType: PhysicalAttackType,
): readonly PhysicalAttackLimb[] {
  return weaponType === 'wrecking-ball' ? [] : ['leftArm', 'rightArm'];
}

function meleeWeaponArm(limb: PhysicalAttackLimb): IPhysicalAttackInput['arm'] {
  return limb === 'leftArm' ? 'left' : 'right';
}

function jumpJetAttackOptionEnabled(context: IEligibilityContext): boolean {
  if (context.tacOpsJumpJetAttackEnabled === true) return true;
  return (
    context.optionalRules?.some((rule) =>
      TACOPS_JUMP_JET_ATTACK_OPTIONS.has(
        rule
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_'),
      ),
    ) ?? false
  );
}

function appendGrappleOptions(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
  context: IEligibilityContext,
  targetId: string,
): void {
  const grapplingEnabled =
    baseInput.tacOpsGrapplingEnabled === true ||
    baseInput.optionalRules?.some((rule) =>
      [
        'tacops_grappling',
        'advanced_combat_tac_ops_grappling',
        'grappling',
      ].includes(
        rule
          .trim()
          .toLowerCase()
          .replace(/[\s-]+/g, '_'),
      ),
    );
  if (!grapplingEnabled) return;

  const grappleInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'grapple',
    weaponsFiredFromArm: context.weaponsFiredThisTurn,
  };
  attackOptions.push(
    buildOption('grapple', grappleInput, canGrapplePhysical(grappleInput)),
  );

  if (baseInput.attackerGrappledTargetId !== targetId) return;

  const breakGrappleInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'break-grapple',
  };
  attackOptions.push(
    buildOption(
      'break-grapple',
      breakGrappleInput,
      canBreakGrapplePhysical(breakGrappleInput),
    ),
  );
}

function appendBrushOffOption(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
  context: IEligibilityContext,
): void {
  if (
    baseInput.targetIsSwarmingInfantryOnAttacker !== true &&
    baseInput.targetIsINarcPod !== true
  ) {
    return;
  }

  const brushOffInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'brush-off',
    arm: 'right',
    limb: 'rightArm',
    weaponsFiredFromArm: context.weaponsFiredFromRightArm,
  };
  attackOptions.push(
    buildOption(
      'brush-off',
      brushOffInput,
      canBrushOffPhysical(brushOffInput),
      'rightArm',
    ),
  );
}

function appendTripOption(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
): void {
  const tripInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'trip',
  };
  attackOptions.push(
    buildOption('trip', tripInput, canTripPhysical(tripInput)),
  );
}

function appendThrashOption(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
  context: IEligibilityContext,
  targetDistance: number,
): void {
  if (targetDistance !== 0) return;

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
  attackOptions.push(
    buildOption('thrash', thrashInput, canThrashPhysical(thrashInput)),
  );
}

function appendJumpJetOption(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
  context: IEligibilityContext,
  targetDistance: number,
): void {
  if (targetDistance !== 1 || !jumpJetAttackOptionEnabled(context)) return;

  const jumpJetSelectedLeg = context.jumpJetAttackSelectedLeg ?? 'right';
  const limb = jumpJetSelectedLeg === 'left' ? 'leftLeg' : 'rightLeg';
  const jumpJetAttackInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'jump-jet-attack',
    limb,
    jumpJetAttackSelectedLeg: jumpJetSelectedLeg,
  };
  attackOptions.push(
    buildOption(
      'jump-jet-attack',
      jumpJetAttackInput,
      canJumpJetAttackPhysical(jumpJetAttackInput),
      limb,
    ),
  );
}

function appendMeleeWeaponOptions(
  attackOptions: IPhysicalAttackOption[],
  baseInput: EligibilityBaseInput,
  context: IEligibilityContext,
): void {
  for (const weaponType of context.meleeWeaponsEquipped ?? []) {
    if (!isRuntimeMeleeWeaponAttackType(weaponType)) continue;

    const armOptions = meleeWeaponArmOptions(weaponType);
    if (armOptions.length === 0) {
      const meleeInput: IPhysicalAttackInput = {
        ...baseInput,
        attackType: weaponType,
      };
      attackOptions.push(
        buildOption(weaponType, meleeInput, canMeleeWeapon(meleeInput)),
      );
      continue;
    }

    for (const limb of armOptions) {
      const meleeInput: IPhysicalAttackInput = {
        ...baseInput,
        attackType: weaponType,
        arm: meleeWeaponArm(limb),
        limb,
        weaponsFiredFromArm:
          limb === 'leftArm'
            ? context.weaponsFiredFromLeftArm
            : context.weaponsFiredFromRightArm,
      };
      attackOptions.push(
        buildOption(weaponType, meleeInput, canMeleeWeapon(meleeInput), limb),
      );
    }
  }
}

export function buildEligibilityAttackOptions(options: {
  readonly baseInput: EligibilityBaseInput;
  readonly context: IEligibilityContext;
  readonly targetDistance: number;
  readonly targetId: string;
  readonly chargeAttackerJumpedThisTurn: boolean;
}): readonly IPhysicalAttackOption[] {
  const {
    baseInput,
    chargeAttackerJumpedThisTurn,
    context,
    targetDistance,
    targetId,
  } = options;
  const attackOptions: IPhysicalAttackOption[] = [];

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
  attackOptions.push(
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
  attackOptions.push(
    buildOption('punch', rightPunchInput, rightPunchRestriction, 'rightArm'),
  );

  // Kick × 2 legs.
  const leftKickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
    limb: 'leftLeg',
  };
  const leftKickRestriction = canKick(leftKickInput);
  attackOptions.push(
    buildOption('kick', leftKickInput, leftKickRestriction, 'leftLeg'),
  );

  const rightKickInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'kick',
    limb: 'rightLeg',
  };
  const rightKickRestriction = canKick(rightKickInput);
  attackOptions.push(
    buildOption('kick', rightKickInput, rightKickRestriction, 'rightLeg'),
  );

  // Charge — restricted by `canCharge`. Per spec scenario "Charge
  // option requires ran this turn", attackers that didn't run receive
  // `restrictionsFailed: ['NoRunThisTurn']`.
  const chargeInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'charge',
    attackerJumpedThisTurn: chargeAttackerJumpedThisTurn,
  };
  const chargeRestriction = canCharge(chargeInput);
  attackOptions.push(buildOption('charge', chargeInput, chargeRestriction));

  // DFA — restricted by `canDFA`. Spec scenario "DFA option requires
  // jumped this turn" mirrors charge.
  const dfaInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'dfa',
  };
  const dfaRestriction = canDFA(dfaInput);
  attackOptions.push(buildOption('dfa', dfaInput, dfaRestriction));

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
  attackOptions.push(buildOption('push', pushInput, canPush(pushInput)));

  appendGrappleOptions(attackOptions, baseInput, context, targetId);
  appendBrushOffOption(attackOptions, baseInput, context);
  appendTripOption(attackOptions, baseInput);
  appendThrashOption(attackOptions, baseInput, context, targetDistance);
  appendJumpJetOption(attackOptions, baseInput, context, targetDistance);
  appendMeleeWeaponOptions(attackOptions, baseInput, context);

  return attackOptions;
}
