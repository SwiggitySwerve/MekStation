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

import type { IUnitGameState } from '@/types/gameplay';

import { hexDistance } from '../hexMath';
import { calculatePhysicalDamage } from './damage';
import {
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
} from './restrictions';
import { calculatePhysicalToHit } from './toHit';
import {
  IPhysicalAttackInput,
  IPhysicalAttackOption,
  IPhysicalAttackRestriction,
  IPhysicalAttackSelfRisk,
  PhysicalAttackInvalidReason,
  PhysicalAttackLimb,
  PhysicalAttackType,
} from './types';

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
  /** Limbs already used for a physical attack this turn. */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /** True when the attacker ran this turn — gates charge. */
  readonly attackerRanThisTurn?: boolean;
  /** True when the attacker jumped this turn — gates DFA. */
  readonly attackerJumpedThisTurn?: boolean;
  /** Target movement modifier (TMM). */
  readonly targetMovementModifier?: number;
  /** Attacker movement modifier (used by charge to-hit). */
  readonly attackerMovementModifier?: number;
  /** Per-attacker presence flags for arm actuators (punches). */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
  /** Equipped melee weapon types (hatchet / sword / mace / lance). */
  readonly meleeWeaponsEquipped?: readonly PhysicalAttackType[];
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
  if (attacker.destroyed || target.destroyed) return [];
  // Per spec scenario "Non-adjacent target returns empty list".
  if (hexDistance(attacker.position, target.position) !== 1) return [];

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
    attackerTonnage: context.attackerTonnage,
    pilotingSkill: context.attackerPilotingSkill,
    componentDamage,
    heat: attacker.heat,
    attackerProne: attacker.prone,
    hexesMoved: attacker.hexesMovedThisTurn,
    targetTonnage: context.targetTonnage,
    targetMovementModifier: context.targetMovementModifier,
    attackerMovementModifier: context.attackerMovementModifier,
    attackerRanThisTurn: context.attackerRanThisTurn,
    attackerJumpedThisTurn: context.attackerJumpedThisTurn,
    limbsUsedThisTurn: context.limbsUsedThisTurn,
    lowerArmActuatorPresent: context.lowerArmActuatorPresent,
    handActuatorPresent: context.handActuatorPresent,
    upperLegActuatorPresent: context.upperLegActuatorPresent,
    footActuatorPresent: context.footActuatorPresent,
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

  // Push — no restrictions today (the engine handles displacement
  // rules at resolution). Always eligible when a target is adjacent.
  const pushInput: IPhysicalAttackInput = {
    ...baseInput,
    attackType: 'push',
  };
  options.push(buildOption('push', pushInput, { allowed: true }));

  // Melee weapons — one row per equipped type, gated by
  // `canMeleeWeapon` (shoulder / hand / lower-arm actuator destruction
  // and per-arm weapon-fire lockouts).
  for (const weaponType of context.meleeWeaponsEquipped ?? []) {
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
