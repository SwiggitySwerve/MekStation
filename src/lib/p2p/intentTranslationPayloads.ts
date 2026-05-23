import {
  GamePhase,
  GameSide,
  type IGameIntent,
  type IWeaponAttackData,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  type Facing,
  type IHexCoordinate,
  type MovementType,
} from '@/types/gameplay/HexGridInterfaces';
import {
  isSupportedPhysicalAttackType,
  type PhysicalAttackType,
} from '@/utils/gameplay/physicalAttacks/types';

/**
 * Payload the guest UI sends with a `declareMovement` intent. Mirrors
 * the parameters of `applyMovement` on the host's `InteractiveSession`
 * but expressed as a flat data record so it serializes cleanly through
 * the Yjs channel.
 */
export interface IDeclareMovementIntentPayload {
  readonly unitId: string;
  readonly from: IHexCoordinate;
  readonly to: IHexCoordinate;
  readonly facing: Facing;
  readonly movementType: MovementType;
  readonly mpUsed: number;
  readonly heatGenerated: number;
  readonly path?: readonly IHexCoordinate[];
}

export interface IStandIntentPayload {
  readonly unitId: string;
}

/**
 * Payload for a `declareAttack` intent. The host re-derives the actual
 * to-hit modifiers + range bracket from authoritative state at resolve
 * time; the intent only needs to name the attacker, target and weapon
 * picks plus the snapshot of weapon stats the UI was looking at.
 */
export interface IDeclareAttackIntentPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weapons: readonly string[];
  readonly toHitNumber: number;
  readonly weaponAttacks?: readonly IWeaponAttackData[];
}

export interface IDeclarePhysicalIntentPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
  readonly toHitNumber?: number;
}

/**
 * Payload for an `endPhase` intent - the guest is asking the host to
 * advance through the current phase. Host validates that the local
 * phase matches the intent's `phase` to refuse stale clicks.
 */
export interface IEndPhaseIntentPayload {
  readonly phase: GamePhase;
}

export interface IEjectIntentPayload {
  readonly unitId: string;
}

type WithdrawalEdge = 'north' | 'south' | 'east' | 'west';

export interface IWithdrawIntentPayload {
  readonly unitId: string;
  readonly edge: WithdrawalEdge;
}

export interface IConcedeIntentPayload {
  readonly side: GameSide;
}

export function asMovementPayload(
  payload: unknown,
): IDeclareMovementIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string') return null;
  if (!isHexCoord(payload.from) || !isHexCoord(payload.to)) return null;
  if (typeof payload.facing !== 'number') return null;
  if (typeof payload.movementType !== 'string') return null;
  if (typeof payload.mpUsed !== 'number') return null;
  if (typeof payload.heatGenerated !== 'number') return null;
  if (
    payload.path !== undefined &&
    !(Array.isArray(payload.path) && payload.path.every(isHexCoord))
  ) {
    return null;
  }
  return payload as unknown as IDeclareMovementIntentPayload;
}

export function asStandPayload(payload: unknown): IStandIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  return payload as unknown as IStandIntentPayload;
}

export function asAttackPayload(
  payload: unknown,
): IDeclareAttackIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.attackerId !== 'string') return null;
  if (typeof payload.targetId !== 'string') return null;
  if (
    !Array.isArray(payload.weapons) ||
    !payload.weapons.every((value) => typeof value === 'string')
  ) {
    return null;
  }
  if (typeof payload.toHitNumber !== 'number') return null;
  return payload as unknown as IDeclareAttackIntentPayload;
}

export function asPhysicalPayload(
  payload: unknown,
): IDeclarePhysicalIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.attackerId !== 'string') return null;
  if (typeof payload.targetId !== 'string') return null;
  if (!isSupportedPhysicalAttackType(payload.attackType)) return null;
  if (
    payload.toHitNumber !== undefined &&
    typeof payload.toHitNumber !== 'number'
  ) {
    return null;
  }
  return payload as unknown as IDeclarePhysicalIntentPayload;
}

export function asEndPhasePayload(
  payload: unknown,
): IEndPhaseIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.phase !== 'string') return null;
  return payload as unknown as IEndPhaseIntentPayload;
}

export function asEjectPayload(payload: unknown): IEjectIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  return payload as unknown as IEjectIntentPayload;
}

export function asWithdrawPayload(
  payload: unknown,
): IWithdrawIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  if (!isWithdrawalEdge(payload.edge)) return null;
  return payload as unknown as IWithdrawIntentPayload;
}

export function asConcedePayload(
  payload: unknown,
): IConcedeIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (!isGameSide(payload.side)) return null;
  return payload as unknown as IConcedeIntentPayload;
}

function isHexCoord(value: unknown): value is IHexCoordinate {
  return (
    isRecord(value) &&
    typeof value.q === 'number' &&
    typeof value.r === 'number'
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWithdrawalEdge(value: unknown): value is WithdrawalEdge {
  return (
    value === 'north' ||
    value === 'south' ||
    value === 'east' ||
    value === 'west'
  );
}

function isGameSide(value: unknown): value is GameSide {
  return value === GameSide.Player || value === GameSide.Opponent;
}

/**
 * Build a fully-formed `declareMovement` intent. The guest UI uses this
 * to keep the channel call site free of `as` casts; the host's
 * translator validates the shape regardless.
 */
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
