import {
  GamePhase,
  GameSide,
  type IGameIntent,
  type MovementEnhancementActivationKind,
  type IWeaponAttackData,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  type Facing,
  type IHexCoordinate,
  Facing as FacingValue,
  MovementType,
} from '@/types/gameplay/HexGridInterfaces';
import {
  isSupportedPhysicalAttackType,
  type PhysicalAttackLimb,
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

export interface IGoProneIntentPayload {
  readonly unitId: string;
}

export interface IActivateMovementEnhancementIntentPayload {
  readonly unitId: string;
  readonly enhancement: MovementEnhancementActivationKind;
}

export interface ITorsoTwistIntentPayload {
  readonly unitId: string;
  readonly secondaryFacing: Facing;
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
  readonly limb?: PhysicalAttackLimb;
  readonly toHitNumber?: number;
}

export interface IRequestSpotIntentPayload {
  readonly unitId: string;
  readonly targetId: string;
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
  if (!isFacing(payload.facing)) return null;
  if (!isMovementType(payload.movementType)) return null;
  if (!isFiniteNumber(payload.mpUsed)) return null;
  if (!isFiniteNumber(payload.heatGenerated)) return null;
  if (
    payload.path !== undefined &&
    !(Array.isArray(payload.path) && payload.path.every(isHexCoord))
  ) {
    return null;
  }
  return {
    unitId: payload.unitId,
    from: payload.from,
    to: payload.to,
    facing: payload.facing,
    movementType: payload.movementType,
    mpUsed: payload.mpUsed,
    heatGenerated: payload.heatGenerated,
    ...(payload.path !== undefined ? { path: payload.path } : {}),
  };
}

export function asStandPayload(payload: unknown): IStandIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  return payload as unknown as IStandIntentPayload;
}

export function asGoPronePayload(
  payload: unknown,
): IGoProneIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  return payload as unknown as IGoProneIntentPayload;
}

export function asActivateMovementEnhancementPayload(
  payload: unknown,
): IActivateMovementEnhancementIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  if (
    payload.enhancement !== 'MASC' &&
    payload.enhancement !== 'Supercharger'
  ) {
    return null;
  }
  return payload as unknown as IActivateMovementEnhancementIntentPayload;
}

export function asTorsoTwistPayload(
  payload: unknown,
): ITorsoTwistIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  if (
    typeof payload.secondaryFacing !== 'number' ||
    !Number.isInteger(payload.secondaryFacing) ||
    payload.secondaryFacing < 0 ||
    payload.secondaryFacing > 5
  ) {
    return null;
  }
  return payload as unknown as ITorsoTwistIntentPayload;
}

export function asAttackPayload(
  payload: unknown,
): IDeclareAttackIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.attackerId !== 'string') return null;
  if (typeof payload.targetId !== 'string') return null;
  if (
    !Array.isArray(payload.weapons) ||
    payload.weapons.length === 0 ||
    !payload.weapons.every(
      (value) => typeof value === 'string' && value.length > 0,
    )
  ) {
    return null;
  }
  if (!isFiniteNumber(payload.toHitNumber)) return null;
  if (
    payload.weaponAttacks !== undefined &&
    !(
      Array.isArray(payload.weaponAttacks) &&
      payload.weaponAttacks.every(isWeaponAttackData)
    )
  ) {
    return null;
  }
  return {
    attackerId: payload.attackerId,
    targetId: payload.targetId,
    weapons: payload.weapons,
    toHitNumber: payload.toHitNumber,
    ...(payload.weaponAttacks !== undefined
      ? { weaponAttacks: payload.weaponAttacks }
      : {}),
  };
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
  if (
    payload.limb !== undefined &&
    !['leftArm', 'rightArm', 'leftLeg', 'rightLeg'].includes(
      String(payload.limb),
    )
  ) {
    return null;
  }
  return payload as unknown as IDeclarePhysicalIntentPayload;
}

export function asRequestSpotPayload(
  payload: unknown,
): IRequestSpotIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.unitId !== 'string' || payload.unitId.length === 0) {
    return null;
  }
  if (typeof payload.targetId !== 'string' || payload.targetId.length === 0) {
    return null;
  }
  return payload as unknown as IRequestSpotIntentPayload;
}

export function asEndPhasePayload(
  payload: unknown,
): IEndPhaseIntentPayload | null {
  if (!isRecord(payload)) return null;
  if (!isGamePhase(payload.phase)) return null;
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
  return isRecord(value) && isFiniteNumber(value.q) && isFiniteNumber(value.r);
}

function isFacing(value: unknown): value is Facing {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= FacingValue.North &&
    value <= FacingValue.Northwest
  );
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isMovementType(value: unknown): value is MovementType {
  return Object.values(MovementType).includes(value as MovementType);
}

function isWeaponAttackData(value: unknown): value is IWeaponAttackData {
  return (
    isRecord(value) &&
    typeof value.weaponId === 'string' &&
    value.weaponId.length > 0 &&
    typeof value.weaponName === 'string' &&
    value.weaponName.length > 0 &&
    isFiniteNumber(value.damage) &&
    isFiniteNumber(value.heat)
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

function isGamePhase(value: unknown): value is GamePhase {
  return Object.values(GamePhase).includes(value as GamePhase);
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
