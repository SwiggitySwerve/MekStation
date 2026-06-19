import type { IGameSession, IGameUnit, IUnitGameState } from '@/types/gameplay';

import { GamePhase } from '@/types/gameplay';

import {
  invalidateEvadingAttackerAttack,
  invalidateInvalidTargetAttack,
  invalidateSprintingAttackerAttack,
} from './gameSessionAttackResolutionValidation';
import {
  type DeclareAttack,
  type IAttackParticipants,
  type IDeclareAttackContext,
} from './gameSessionCore.attack.types';
import {
  appendIndirectFireEvents,
  createDeclaredAttackEvent,
} from './gameSessionCore.attackEvents';
import { buildDeclaredAttackToHit } from './gameSessionCore.attackToHit';
import { appendEvent } from './gameSessionEvents';

function assertWeaponAttackPhase(session: IGameSession): void {
  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    throw new Error('Not in weapon attack phase');
  }
}

function getAttackerUnit(
  session: IGameSession,
  attackerId: string,
): IUnitGameState {
  const attackerUnit = session.currentState.units[attackerId];
  if (!attackerUnit) {
    throw new Error(`Attacker unit ${attackerId} not found`);
  }
  return attackerUnit;
}

function getTargetUnit(
  session: IGameSession,
  targetId: string,
): IUnitGameState {
  const targetUnit = session.currentState.units[targetId];
  if (!targetUnit) {
    throw new Error(`Target unit ${targetId} not found`);
  }
  return targetUnit;
}

function getAttacker(session: IGameSession, attackerId: string): IGameUnit {
  const attacker = session.units.find((unit) => unit.id === attackerId);
  if (!attacker) {
    throw new Error(`Attacker ${attackerId} not found in units`);
  }
  return attacker;
}

function invalidateAttackDeclaration(
  context: IDeclareAttackContext,
  weaponIds: readonly string[],
): IGameSession | undefined {
  return (
    invalidateInvalidTargetAttack(
      context.session,
      context.attackerId,
      context.targetId,
      weaponIds,
    ) ??
    invalidateEvadingAttackerAttack(
      context.session,
      context.attackerId,
      context.targetId,
      weaponIds,
    ) ??
    invalidateSprintingAttackerAttack(
      context.session,
      context.attackerId,
      context.targetId,
      weaponIds,
    ) ??
    undefined
  );
}

function getAttackParticipants(
  context: IDeclareAttackContext,
): IAttackParticipants | IGameSession {
  const attackerUnit = getAttackerUnit(context.session, context.attackerId);
  const weaponIds = context.weapons.map((weapon) => weapon.weaponId);
  const invalidSession = invalidateAttackDeclaration(context, weaponIds);
  if (invalidSession) return invalidSession;

  return {
    attacker: getAttacker(context.session, context.attackerId),
    attackerUnit,
    targetUnit: getTargetUnit(context.session, context.targetId),
  };
}

export const declareAttack: DeclareAttack = (...args) => {
  const [
    session,
    attackerId,
    targetId,
    weapons,
    range,
    rangeBracket,
    indirectFireResolutionInput,
    targetHex,
    targetPartialCover = false,
    interveningTerrainEffects = [],
    targetTerrainModifier = null,
    selectedAMSWeaponIds,
    selectedAMSWeaponMounts,
  ] = args;
  const context: IDeclareAttackContext = {
    session,
    attackerId,
    targetId,
    weapons,
    range,
    rangeBracket,
    indirectFireResolutionInput,
    targetHex,
    targetPartialCover,
    interveningTerrainEffects,
    targetTerrainModifier,
    selectedAMSWeaponIds,
    selectedAMSWeaponMounts,
  };

  assertWeaponAttackPhase(session);
  const participantsOrInvalidSession = getAttackParticipants(context);
  if ('events' in participantsOrInvalidSession)
    return participantsOrInvalidSession;

  const toHit = buildDeclaredAttackToHit(context, participantsOrInvalidSession);
  const event = createDeclaredAttackEvent(context, toHit);
  const updatedSession = appendEvent(session, event);

  return appendIndirectFireEvents(
    updatedSession,
    context,
    participantsOrInvalidSession,
    toHit.indirectFireResolution,
  );
};
