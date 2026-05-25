import type { IGameSession, IUnitGameState } from '@/types/gameplay';

import type { PhysicalAttackType } from './physicalAttacks/types';

import { createPhysicalAttackResolvedEvent } from './gameEvents';
import { appendEvent } from './gameSessionCore';
import { hexDistance } from './hexMath';
import {
  canCharge,
  canDFA,
  canKick,
  canMeleeWeapon,
  canPunch,
  canPush,
  type IPhysicalAttackInput,
  IPhysicalAttackRestriction,
  PhysicalAttackLimb,
} from './physicalAttacks';

/**
 * Attacker / target bag passed by callers that supply per-unit static
 * data not stored on `IGameUnit` (tonnage, etc.).
 */
export interface IPhysicalAttackContext {
  readonly attackerTonnage: number;
  readonly targetTonnage?: number;
  readonly pilotingSkill: number;
  readonly arm?: 'left' | 'right';
  readonly hexesMoved?: number;
  readonly weaponsFiredFromArm?: readonly string[];
  /**
   * Per `implement-physical-attack-phase` task 4.3 / 5.3: target movement
   * modifier (TMM). Threaded into punch / kick / melee / DFA to-hit.
   */
  readonly targetMovementModifier?: number;
  /**
   * Per task 6.1: attacker-movement modifier for charge to-hit.
   */
  readonly attackerMovementModifier?: number;
  /**
   * Per task 3.5: limbs already used for physical attacks this turn
   * (same limb cannot punch AND kick in one turn).
   */
  readonly limbsUsedThisTurn?: readonly PhysicalAttackLimb[];
  /**
   * Per task 2.3: the limb this declaration targets (required for punch
   * and kick; optional for club attacks).
   */
  readonly limb?: PhysicalAttackLimb;
  /**
   * Per tasks 3.3 / 3.4: actuator-presence booleans feed the restriction
   * validator — destruction lives in `componentDamage`, but "mech was
   * built without this actuator" is a separate concern.
   */
  readonly lowerArmActuatorPresent?: boolean;
  readonly handActuatorPresent?: boolean;
  readonly upperLegActuatorPresent?: boolean;
  readonly footActuatorPresent?: boolean;
  /**
   * Per tasks 3.6 / 3.7: DFA requires a jump; charge requires a run.
   */
  readonly attackerJumpedThisTurn?: boolean;
  readonly attackerRanThisTurn?: boolean;
  readonly attackerUnitType?: IPhysicalAttackInput['attackerUnitType'];
  readonly attackerMovementMode?: IPhysicalAttackInput['attackerMovementMode'];
  readonly attackerConversionMode?: IPhysicalAttackInput['attackerConversionMode'];
  readonly attackerIsAirborneVTOLOrWiGE?: IPhysicalAttackInput['attackerIsAirborneVTOLOrWiGE'];
  readonly optionalRules?: IPhysicalAttackInput['optionalRules'];
  readonly targetUnitType?: IPhysicalAttackInput['targetUnitType'];
  readonly targetProne?: boolean;
  readonly targetIsAirborne?: boolean;
  /**
   * Per task 8.5: the destination hex for a push. If `false` the caller
   * has already determined the push target hex is blocked / off-map.
   */
  readonly pushDestinationValid?: boolean;
  readonly elevationContext?: IPhysicalAttackInput['elevationContext'];
  readonly terrainContext?: IPhysicalAttackInput['terrainContext'];
}

/**
 * Per `implement-physical-attack-phase` task 3.8: project a
 * restriction result's reason code to the canonical trigger source
 * consumed by the PSR queue. Used only for `AttackerProne` and
 * `LimbMissing` today; unknown codes fall through to a generic
 * descriptor.
 */
export function buildRestrictionEventReason(
  restriction: IPhysicalAttackRestriction,
): string {
  return (
    restriction.reasonCode ?? restriction.reason ?? 'PhysicalAttackInvalid'
  );
}

export function physicalTargetRangeRestriction(
  attacker: IUnitGameState,
  target: IUnitGameState,
): IPhysicalAttackRestriction {
  if (hexDistance(attacker.position, target.position) <= 1) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: 'Target not in physical attack range',
    reasonCode: 'TargetNotInPhysicalRange',
  };
}

export function physicalAttackRestrictionForType(
  attackType: PhysicalAttackType,
  input: IPhysicalAttackInput,
): IPhysicalAttackRestriction {
  if (attackType === 'punch') return canPunch(input);
  if (attackType === 'kick') return canKick(input);
  if (attackType === 'charge') return canCharge(input);
  if (attackType === 'dfa') return canDFA(input);
  if (attackType === 'push') return canPush(input);
  if (
    attackType === 'hatchet' ||
    attackType === 'sword' ||
    attackType === 'mace' ||
    attackType === 'lance'
  ) {
    return canMeleeWeapon(input);
  }
  return { allowed: true };
}

export function appendPhysicalAttackRestrictionResolution(
  session: IGameSession,
  attackerId: string,
  targetId: string,
  attackType: PhysicalAttackType,
  restriction: IPhysicalAttackRestriction,
): IGameSession {
  const sequence = session.events.length;
  const { turn } = session.currentState;
  return appendEvent(
    session,
    createPhysicalAttackResolvedEvent(
      session.id,
      sequence,
      turn,
      attackerId,
      targetId,
      attackType,
      0,
      Infinity,
      false,
      undefined,
      buildRestrictionEventReason(restriction),
    ),
  );
}
