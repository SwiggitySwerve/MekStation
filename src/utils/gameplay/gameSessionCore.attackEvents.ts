import type {
  IAttackDeclaredPayload,
  IGameSession,
  IWeaponAttackData,
} from '@/types/gameplay';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IIndirectFireResolution } from '@/types/gameplay/IndirectFireInterfaces';

import type {
  IAttackParticipants,
  IDeclareAttackContext,
  IDeclaredAttackToHit,
} from './gameSessionCore.attack.types';

import {
  createAttackDeclaredEvent,
  createIndirectFireForwardObserverEvent,
  createIndirectFireNarcOverrideEvent,
  createIndirectFireSpotterSelectedEvent,
} from './gameEvents';
import { appendEvent } from './gameSessionEvents';

function weaponAttackData(context: IDeclareAttackContext): IWeaponAttackData[] {
  return context.weapons.map((weapon) => ({
    weaponId: weapon.weaponId,
    weaponName: weapon.weaponName,
    damage: weapon.damage,
    heat: weapon.heat,
  }));
}

function selectedAmsPayload(
  context: IDeclareAttackContext,
): Partial<IAttackDeclaredPayload> {
  return {
    ...(context.selectedAMSWeaponIds !== undefined
      ? { selectedAMSWeaponIds: context.selectedAMSWeaponIds }
      : {}),
    ...(context.selectedAMSWeaponMounts !== undefined
      ? { selectedAMSWeaponMounts: context.selectedAMSWeaponMounts }
      : {}),
  };
}

export function createDeclaredAttackEvent(
  context: IDeclareAttackContext,
  toHit: IDeclaredAttackToHit,
) {
  const weaponIds = context.weapons.map((weapon) => weapon.weaponId);
  const sequence = context.session.events.length;
  const { turn } = context.session.currentState;
  const baseEvent = createAttackDeclaredEvent(
    context.session.id,
    sequence,
    turn,
    context.attackerId,
    context.targetId,
    weaponIds,
    toHit.finalToHit,
    toHit.modifiers,
    weaponAttackData(context),
  );

  if (
    context.selectedAMSWeaponIds === undefined &&
    context.selectedAMSWeaponMounts === undefined
  ) {
    return baseEvent;
  }

  return {
    ...baseEvent,
    payload: {
      ...(baseEvent.payload as IAttackDeclaredPayload),
      ...selectedAmsPayload(context),
    },
  };
}

function appendNarcIndirectFireEvent(
  session: IGameSession,
  context: IDeclareAttackContext,
  resolution: IIndirectFireResolution,
  weaponId: string,
  targetHex: IHexCoordinate,
): IGameSession {
  const basis = resolution.basis;
  if (basis !== 'narc' && basis !== 'inarc') return session;

  return appendEvent(
    session,
    createIndirectFireNarcOverrideEvent(
      session.id,
      session.events.length,
      context.session.currentState.turn,
      context.attackerId,
      weaponId,
      targetHex,
      basis,
      resolution.toHitPenalty,
    ),
  );
}

function appendSpotterIndirectFireEvents(
  session: IGameSession,
  context: IDeclareAttackContext,
  resolution: IIndirectFireResolution,
  weaponId: string,
  targetHex: IHexCoordinate,
): IGameSession {
  if (!resolution.spotterId) return session;

  let updatedSession = appendEvent(
    session,
    createIndirectFireSpotterSelectedEvent(
      session.id,
      session.events.length,
      context.session.currentState.turn,
      context.attackerId,
      resolution.spotterId,
      weaponId,
      targetHex,
      resolution.toHitPenalty,
      undefined,
      resolution.spotterAttackedThisTurn,
    ),
  );

  if (resolution.forwardObserverApplied) {
    updatedSession = appendEvent(
      updatedSession,
      createIndirectFireForwardObserverEvent(
        updatedSession.id,
        updatedSession.events.length,
        context.session.currentState.turn,
        context.attackerId,
        resolution.spotterId,
        weaponId,
        targetHex,
        resolution.toHitPenalty,
        undefined,
        resolution.spotterAttackedThisTurn,
      ),
    );
  }

  return updatedSession;
}

export function appendIndirectFireEvents(
  session: IGameSession,
  context: IDeclareAttackContext,
  participants: IAttackParticipants,
  resolution: IIndirectFireResolution | undefined,
): IGameSession {
  const weaponId = context.weapons[0]?.weaponId;
  if (!resolution?.permitted || !resolution.isIndirect || !weaponId) {
    return session;
  }

  const resolvedTargetHex =
    context.targetHex ?? participants.targetUnit.position;
  if (resolution.basis === 'narc' || resolution.basis === 'inarc') {
    return appendNarcIndirectFireEvent(
      session,
      context,
      resolution,
      weaponId,
      resolvedTargetHex,
    );
  }

  return appendSpotterIndirectFireEvents(
    session,
    context,
    resolution,
    weaponId,
    resolvedTargetHex,
  );
}
