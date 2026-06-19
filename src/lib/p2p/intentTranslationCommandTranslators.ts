import type {
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';

import {
  canLocalPeerControlSide,
  canLocalPeerControlUnit,
  GamePhase,
  GameSide,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IntentTranslationResult } from './intentTranslation';

import {
  asActivateMovementEnhancementPayload,
  asConcedePayload,
  asEndPhasePayload,
  asGoPronePayload,
  asStandPayload,
} from './intentTranslationPayloads';

export function translateStand(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asStandPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'stand', unitId: payload.unitId },
  };
}

export function translateGoProne(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asGoPronePayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'goProne', unitId: payload.unitId },
  };
}

export function translateActivateMovementEnhancement(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asActivateMovementEnhancementPayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (session.currentState.phase !== GamePhase.Movement) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!canLocalPeerControlUnit(session, intent.authorPeerId, payload.unitId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: {
      kind: 'activateMovementEnhancement',
      unitId: payload.unitId,
      enhancement: payload.enhancement,
    },
  };
}

export function translateEndPhase(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asEndPhasePayload(intent.payload);
  if (!payload) return { ok: false, reason: 'malformed-payload' };

  if (session.currentState.phase !== payload.phase) {
    return { ok: false, reason: 'wrong-phase' };
  }

  if (!peerOwnsAnySide(session, intent.authorPeerId)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'advancePhase', phase: payload.phase },
  };
}

export function translateConfirmHeat(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  if (session.currentState.phase !== GamePhase.Heat) {
    return { ok: false, reason: 'wrong-phase' };
  }

  return peerOwnsAnySide(session, intent.authorPeerId)
    ? {
        ok: true,
        events: [],
        command: { kind: 'advancePhase', phase: GamePhase.Heat },
      }
    : { ok: false, reason: 'unowned-unit' };
}

export function translateConcede(
  intent: IGameIntent,
  session: IGameSession,
): IntentTranslationResult {
  const payload = asConcedePayload(intent.payload);
  if (!payload) {
    return { ok: false, reason: 'malformed-payload' };
  }

  if (!canLocalPeerControlSide(session, intent.authorPeerId, payload.side)) {
    return { ok: false, reason: 'unowned-unit' };
  }

  return {
    ok: true,
    events: [],
    command: { kind: 'concede', side: payload.side },
  };
}

function peerOwnsAnySide(session: IGameSession, peerId: string): boolean {
  return (
    canLocalPeerControlSide(session, peerId, GameSide.Player) ||
    canLocalPeerControlSide(session, peerId, GameSide.Opponent)
  );
}
