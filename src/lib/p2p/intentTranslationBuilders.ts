import type { IGameIntent } from '@/types/gameplay/GameSessionInterfaces';

import type {
  IActivateMovementEnhancementIntentPayload,
  IConcedeIntentPayload,
  IDeclareAttackIntentPayload,
  IDeclareMovementIntentPayload,
  IDeclarePhysicalIntentPayload,
  IEjectIntentPayload,
  IEndPhaseIntentPayload,
  IGoProneIntentPayload,
  IRequestSpotIntentPayload,
  IStandIntentPayload,
  ITorsoTwistIntentPayload,
  IWithdrawIntentPayload,
} from './intentTranslationPayloads';

export function buildDeclareMovementIntent(
  authorPeerId: string,
  payload: IDeclareMovementIntentPayload,
): IGameIntent {
  return {
    type: 'declareMovement',
    payload,
    authorPeerId,
  };
}

export function buildStandIntent(
  authorPeerId: string,
  payload: IStandIntentPayload,
): IGameIntent {
  return {
    type: 'stand',
    payload,
    authorPeerId,
  };
}

export function buildGoProneIntent(
  authorPeerId: string,
  payload: IGoProneIntentPayload,
): IGameIntent {
  return {
    type: 'goProne',
    payload,
    authorPeerId,
  };
}

export function buildActivateMovementEnhancementIntent(
  authorPeerId: string,
  payload: IActivateMovementEnhancementIntentPayload,
): IGameIntent {
  return {
    type: 'activateMovementEnhancement',
    payload,
    authorPeerId,
  };
}

export function buildTorsoTwistIntent(
  authorPeerId: string,
  payload: ITorsoTwistIntentPayload,
): IGameIntent {
  return {
    type: 'torsoTwist',
    payload,
    authorPeerId,
  };
}

export function buildDeclareAttackIntent(
  authorPeerId: string,
  payload: IDeclareAttackIntentPayload,
): IGameIntent {
  return {
    type: 'declareAttack',
    payload,
    authorPeerId,
  };
}

export function buildDeclarePhysicalIntent(
  authorPeerId: string,
  payload: IDeclarePhysicalIntentPayload,
): IGameIntent {
  return {
    type: 'declarePhysical',
    payload,
    authorPeerId,
  };
}

export function buildRequestSpotIntent(
  authorPeerId: string,
  payload: IRequestSpotIntentPayload,
): IGameIntent {
  return {
    type: 'requestSpot',
    payload,
    authorPeerId,
  };
}

export function buildEjectIntent(
  authorPeerId: string,
  payload: IEjectIntentPayload,
): IGameIntent {
  return {
    type: 'eject',
    payload,
    authorPeerId,
  };
}

export function buildWithdrawIntent(
  authorPeerId: string,
  payload: IWithdrawIntentPayload,
): IGameIntent {
  return {
    type: 'withdraw',
    payload,
    authorPeerId,
  };
}

export function buildConcedeIntent(
  authorPeerId: string,
  payload: IConcedeIntentPayload,
): IGameIntent {
  return {
    type: 'concede',
    payload,
    authorPeerId,
  };
}

export function buildEndPhaseIntent(
  authorPeerId: string,
  payload: IEndPhaseIntentPayload,
): IGameIntent {
  return {
    type: 'endPhase',
    payload,
    authorPeerId,
  };
}
