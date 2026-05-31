/**
 * Game Intent Mapping — `IGameIntent` → server `IIntentPayload`.
 *
 * Per `complete-multiplayer-game-surface` D3: a player's tactical-map
 * action is encoded as an `IGameIntent` (the `multiplayer-sync` contract
 * — abstract `type` + `payload`) and forwarded to the server as an
 * `Intent` envelope. The server's wire protocol (`IIntentPayload` in
 * `Protocol.ts`) speaks a slightly different, discriminated-union shape
 * (`Move` / `Attack` / `AdvancePhase` / `Concede`). This module is the
 * pure translation layer between the two.
 *
 * The client NEVER resolves an action locally — `toServerIntent` only
 * shapes the wire payload; the server validates it, runs engine
 * resolution, and broadcasts the resulting `Event`. An unmappable or
 * malformed intent returns `null` so the caller can surface a non-fatal
 * notification rather than send garbage (D3 / scenario "Rejected intent
 * surfaces without breaking the surface").
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import type { IIntentPayload } from '@/types/multiplayer/Protocol';
import type { PhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

import {
  GameSide,
  type GameIntentType,
  type IGameIntent,
  type MovementEnhancementActivationKind,
} from '@/types/gameplay/GameSessionInterfaces';
import { isSupportedPhysicalAttackType } from '@/utils/gameplay/physicalAttacks/types';

// =============================================================================
// Action payload shapes
// =============================================================================

/**
 * Movement-declaration payload carried by a `declareMovement`
 * `IGameIntent`. Mirrors the `Move` wire intent's fields so the mapper
 * is a straight projection.
 */
export interface IDeclareMovementPayload {
  readonly unitId: string;
  readonly to: { readonly q: number; readonly r: number };
  readonly facing: number;
  readonly movementType: string;
}

/**
 * Stand-up payload carried by a `stand` `IGameIntent`. The server owns the
 * PSR roll; the intent only names the unit trying to rise.
 */
export interface IStandPayload {
  readonly unitId: string;
}

export interface IGoPronePayload {
  readonly unitId: string;
}

export interface IActivateMovementEnhancementPayload {
  readonly unitId: string;
  readonly enhancement: MovementEnhancementActivationKind;
}

export interface ITorsoTwistPayload {
  readonly unitId: string;
  readonly secondaryFacing: number;
}

/**
 * Attack-declaration payload carried by a `declareAttack` `IGameIntent`.
 */
export interface IDeclareAttackPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly weaponIds: readonly string[];
}

/**
 * Physical-attack-declaration payload carried by a `declarePhysical`
 * `IGameIntent`. Physical combat has a dedicated `Physical` wire intent
 * so punch / kick / melee declarations never masquerade as ranged weapon
 * ids in the server dispatcher.
 */
export interface IDeclarePhysicalPayload {
  readonly attackerId: string;
  readonly targetId: string;
  readonly attackType: PhysicalAttackType;
}

export interface IRequestSpotPayload {
  readonly unitId: string;
  readonly targetId: string;
}

/**
 * Concede payload carried by a `concede` `IGameIntent`. `side` is the
 * side the conceding player owns.
 */
export interface IConcedePayload {
  readonly side: GameSide;
}

export interface IEjectPayload {
  readonly unitId: string;
}

export type WithdrawalEdge = 'north' | 'south' | 'east' | 'west';

export interface IWithdrawPayload {
  readonly unitId: string;
  readonly edge: WithdrawalEdge;
}

// =============================================================================
// Intent constructors
// =============================================================================

/**
 * Build a typed `IGameIntent` for a tactical-map action. `authorPeerId`
 * is the local player's id — the server uses it to authorize the intent
 * against the seat assignment. These constructors keep every call site
 * shaping a well-formed intent rather than hand-rolling the envelope.
 */
export function declareMovementIntent(
  authorPeerId: string,
  payload: IDeclareMovementPayload,
): IGameIntent {
  return { type: 'declareMovement', payload, authorPeerId };
}

export function standIntent(
  authorPeerId: string,
  payload: IStandPayload,
): IGameIntent {
  return { type: 'stand', payload, authorPeerId };
}

export function goProneIntent(
  authorPeerId: string,
  payload: IGoPronePayload,
): IGameIntent {
  return { type: 'goProne', payload, authorPeerId };
}

export function activateMovementEnhancementIntent(
  authorPeerId: string,
  payload: IActivateMovementEnhancementPayload,
): IGameIntent {
  return { type: 'activateMovementEnhancement', payload, authorPeerId };
}

export function torsoTwistIntent(
  authorPeerId: string,
  payload: ITorsoTwistPayload,
): IGameIntent {
  return { type: 'torsoTwist', payload, authorPeerId };
}

export function declareAttackIntent(
  authorPeerId: string,
  payload: IDeclareAttackPayload,
): IGameIntent {
  return { type: 'declareAttack', payload, authorPeerId };
}

export function declarePhysicalIntent(
  authorPeerId: string,
  payload: IDeclarePhysicalPayload,
): IGameIntent {
  return { type: 'declarePhysical', payload, authorPeerId };
}

export function requestSpotIntent(
  authorPeerId: string,
  payload: IRequestSpotPayload,
): IGameIntent {
  return { type: 'requestSpot', payload, authorPeerId };
}

export function endPhaseIntent(authorPeerId: string): IGameIntent {
  return { type: 'endPhase', payload: {}, authorPeerId };
}

export function ejectIntent(
  authorPeerId: string,
  payload: IEjectPayload,
): IGameIntent {
  return { type: 'eject', payload, authorPeerId };
}

export function withdrawIntent(
  authorPeerId: string,
  payload: IWithdrawPayload,
): IGameIntent {
  return { type: 'withdraw', payload, authorPeerId };
}

export function concedeIntent(
  authorPeerId: string,
  payload: IConcedePayload,
): IGameIntent {
  return { type: 'concede', payload, authorPeerId };
}

// =============================================================================
// Server-wire translation
// =============================================================================

/**
 * The engine-side concede uses `'player' | 'opponent'` literals; the
 * `IGameIntent` payload carries a `GameSide`. They are value-equal — the
 * enum members ARE those literals — so this is a safe narrowing.
 */
function sideToWire(side: GameSide): 'player' | 'opponent' {
  return side === GameSide.Opponent ? 'opponent' : 'player';
}

/**
 * Translate an `IGameIntent` into the server's `IIntentPayload` wire
 * shape. Returns `null` when the intent type is not one the Wave-3
 * server protocol accepts, or when the payload is structurally invalid
 * — the caller surfaces a non-fatal notification instead of sending.
 *
 * Note `confirmHeat` has no engine-mutating wire intent (heat is
 * server-resolved automatically); it maps to `AdvancePhase` so a player
 * confirming the heat phase advances the match like any other phase.
 */
export function toServerIntent(intent: IGameIntent): IIntentPayload | null {
  switch (intent.type as GameIntentType) {
    case 'declareMovement':
      return toMoveIntent(intent.payload);
    case 'stand':
      return toStandIntent(intent.payload);
    case 'goProne':
      return toGoProneIntent(intent.payload);
    case 'activateMovementEnhancement':
      return toActivateMovementEnhancementIntent(intent.payload);
    case 'torsoTwist':
      return toTorsoTwistIntent(intent.payload);
    case 'declareAttack':
      return toAttackIntent(intent.payload);
    case 'declarePhysical':
      return toPhysicalIntent(intent.payload);
    case 'requestSpot':
      return toRequestSpotIntent(intent.payload);
    case 'endPhase':
    case 'confirmHeat':
      return { kind: 'AdvancePhase' };
    case 'eject':
      return toEjectIntent(intent.payload);
    case 'withdraw':
      return toWithdrawIntent(intent.payload);
    case 'concede':
      return toConcedeIntent(intent.payload);
    default:
      return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function toMoveIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId, to, facing, movementType } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  if (!isRecord(to)) return null;
  if (typeof to.q !== 'number' || typeof to.r !== 'number') return null;
  if (typeof facing !== 'number') return null;
  if (typeof movementType !== 'string' || movementType.length === 0) {
    return null;
  }
  return {
    kind: 'Move',
    unitId,
    to: { q: Math.trunc(to.q), r: Math.trunc(to.r) },
    // The wire schema clamps facing to 0-5; normalize a hex facing into
    // range so a wrapped value (e.g. 6) still sends a valid envelope.
    facing: ((Math.trunc(facing) % 6) + 6) % 6,
    movementType,
  };
}

function toStandIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  return { kind: 'Stand', unitId };
}

function toGoProneIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  return { kind: 'GoProne', unitId };
}

function toActivateMovementEnhancementIntent(
  payload: unknown,
): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId, enhancement } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  if (enhancement !== 'MASC' && enhancement !== 'Supercharger') return null;
  return { kind: 'ActivateMovementEnhancement', unitId, enhancement };
}

function toTorsoTwistIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId, secondaryFacing } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  if (typeof secondaryFacing !== 'number') return null;
  return {
    kind: 'TorsoTwist',
    unitId,
    secondaryFacing: ((Math.trunc(secondaryFacing) % 6) + 6) % 6,
  };
}

function toAttackIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { attackerId, targetId, weaponIds } = payload;
  if (typeof attackerId !== 'string' || attackerId.length === 0) return null;
  if (typeof targetId !== 'string' || targetId.length === 0) return null;
  if (!Array.isArray(weaponIds) || weaponIds.length === 0) return null;
  const ids = weaponIds.filter(
    (id): id is string => typeof id === 'string' && id.length > 0,
  );
  if (ids.length === 0) return null;
  return { kind: 'Attack', attackerId, targetId, weaponIds: ids };
}

function toPhysicalIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { attackerId, targetId, attackType } = payload;
  if (typeof attackerId !== 'string' || attackerId.length === 0) return null;
  if (typeof targetId !== 'string' || targetId.length === 0) return null;
  if (!isSupportedPhysicalAttackType(attackType)) return null;
  return {
    kind: 'Physical',
    attackerId,
    targetId,
    attackType,
  };
}

function toRequestSpotIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId, targetId } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  if (typeof targetId !== 'string' || targetId.length === 0) return null;
  return { kind: 'RequestSpot', unitId, targetId };
}

function toEjectIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  return { kind: 'Eject', unitId };
}

function isWithdrawalEdge(value: unknown): value is WithdrawalEdge {
  return (
    value === 'north' ||
    value === 'south' ||
    value === 'east' ||
    value === 'west'
  );
}

function toWithdrawIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { unitId, edge } = payload;
  if (typeof unitId !== 'string' || unitId.length === 0) return null;
  if (!isWithdrawalEdge(edge)) return null;
  return { kind: 'Withdraw', unitId, edge };
}

function toConcedeIntent(payload: unknown): IIntentPayload | null {
  if (!isRecord(payload)) return null;
  const { side } = payload;
  if (side !== GameSide.Player && side !== GameSide.Opponent) return null;
  return { kind: 'Concede', side: sideToWire(side) };
}
