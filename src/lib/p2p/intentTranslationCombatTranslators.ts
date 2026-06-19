import type {
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  canLocalPeerControlUnit,
  GamePhase,
} from '@/types/gameplay/GameSessionInterfaces';
import { RangeBracket } from '@/types/gameplay/HexGridInterfaces';
import { createAttackLockedEvent } from '@/utils/gameplay/gameEvents/combat';
import {
  createMovementDeclaredEvent,
  createMovementLockedEvent,
} from '@/utils/gameplay/gameEvents/movement';
import { declareAttack } from '@/utils/gameplay/gameSession';
import { hexEquals } from '@/utils/gameplay/hexMath';
import {
  buildMovementEventPath,
  maxMovementCostForCapability,
} from '@/utils/gameplay/movement/eventPath';
import { validateMovement } from '@/utils/gameplay/movement/validation';
import { buildWeaponAttacks } from '@/utils/gameplay/weaponAttackBuilder';

import type {
  IIntentTranslationAuthorityContext,
  IntentTranslationResult,
} from './intentTranslation';

import {
  asAttackPayload,
  asMovementPayload,
} from './intentTranslationPayloads';

export function translateDeclareMovement(
  intent: IGameIntent,
  session: IGameSession,
  authority: IIntentTranslationAuthorityContext | undefined,
): IntentTranslationResult {
  const payload = asMovementPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const unit = session.currentState.units[payload.unitId];
  if (!unit) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: `Unit '${payload.unitId}' does not exist`,
    };
  }

  if (!hexEquals(payload.from, unit.position)) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Movement origin does not match authoritative host state',
    };
  }

  const grid = authority?.movementGrid;
  const capability = authority?.movementByUnit?.get(payload.unitId);
  if (!grid || !capability) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Host movement authority is unavailable',
    };
  }

  const validation = validateMovement(
    grid,
    {
      unitId: payload.unitId,
      coord: unit.position,
      facing: unit.facing,
      prone: unit.prone ?? false,
      isStuck: unit.isStuck ?? false,
    },
    payload.to,
    payload.facing,
    payload.movementType,
    capability,
    unit.heat,
    undefined,
    { pilotAbilities: unit.abilities },
  );
  if (!validation.valid) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: validation.error ?? 'Invalid movement',
    };
  }

  const eventPath = buildMovementEventPath({
    grid,
    from: unit.position,
    to: payload.to,
    movementType: payload.movementType,
    maxCost: Math.min(
      validation.mpCost,
      maxMovementCostForCapability(capability, payload.movementType),
    ),
    movementContext: { pilotAbilities: unit.abilities },
  });

  const baseSeq = session.events.length;
  const declared = createMovementDeclaredEvent(
    session.id,
    baseSeq,
    session.currentState.turn,
    payload.unitId,
    unit.position,
    payload.to,
    payload.facing,
    payload.movementType,
    validation.mpCost,
    validation.heatGenerated,
    eventPath,
  );
  const locked = createMovementLockedEvent(
    session.id,
    baseSeq + 1,
    session.currentState.turn,
    payload.unitId,
  );

  return { ok: true, events: [declared, locked] };
}

export function translateDeclareAttack(
  intent: IGameIntent,
  session: IGameSession,
  authority: IIntentTranslationAuthorityContext | undefined,
): IntentTranslationResult {
  const payload = asAttackPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.WeaponAttack) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (
    !canLocalPeerControlUnit(session, intent.authorPeerId, payload.attackerId)
  ) {
    return { ok: false, reason: 'unowned-unit' };
  }

  const weaponsByUnit = authority?.weaponsByUnit;
  if (!weaponsByUnit) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'Host weapon authority is unavailable',
    };
  }

  const weaponAttacks = buildWeaponAttacks(
    payload.weapons,
    weaponsByUnit.get(payload.attackerId) ?? [],
    payload.attackerId,
  );
  if (weaponAttacks.length !== payload.weapons.length) {
    return {
      ok: false,
      reason: 'unsupported-intent',
      detail: 'One or more declared weapons are unavailable on the attacker',
    };
  }

  const eventCountBeforeDeclaration = session.events.length;
  let updatedSession = declareAttack(
    session,
    payload.attackerId,
    payload.targetId,
    weaponAttacks,
    3,
    RangeBracket.Short,
  );
  const declarationEmitted = updatedSession.events
    .slice(eventCountBeforeDeclaration)
    .some((event) => event.type === 'attack_declared');
  if (declarationEmitted) {
    updatedSession = {
      ...updatedSession,
      events: [
        ...updatedSession.events,
        createAttackLockedEvent(
          updatedSession.id,
          updatedSession.events.length,
          session.currentState.turn,
          payload.attackerId,
        ),
      ],
    };
  }

  return {
    ok: true,
    events: updatedSession.events.slice(eventCountBeforeDeclaration),
  };
}
