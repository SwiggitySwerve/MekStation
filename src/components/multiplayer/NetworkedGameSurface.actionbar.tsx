/**
 * NetworkedGameSurface action bar — the intent-producing controls.
 *
 * Per `complete-multiplayer-game-surface` D3 / D4: a player's tactical
 * action is collected here as an `IGameIntent` and handed to the parent
 * surface's `sendGameIntent` forwarder — the controls NEVER resolve an
 * action locally. The whole bar is disabled (and replaced by the
 * passive "waiting for opponent" indicator) when the turn-ownership
 * gate is closed (D4).
 *
 * The bar is deliberately a controlled component: the parent owns the
 * map selection (`selectedUnitId` / `selectedHex` / `targetUnitId`) and
 * passes it down, so the single-source-of-truth for selection stays in
 * the surface and the bar stays a thin, testable presentational unit.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import React from 'react';

import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';

import {
  concedeIntent,
  declareAttackIntent,
  declareMovementIntent,
  declarePhysicalIntent,
  ejectIntent,
  endPhaseIntent,
  standIntent,
  type IDeclareMovementPayload,
} from '@/lib/multiplayer/gameIntentMap';
import { type ITurnOwnership } from '@/lib/multiplayer/turnOwnership';
import { GamePhase, GameSide } from '@/types/gameplay/GameSessionInterfaces';
import { MovementType } from '@/types/gameplay/HexGridInterfaces';

import { WaitingForOpponentIndicator } from './NetworkedGameSurface.overlays';

// =============================================================================
// Types
// =============================================================================

export interface INetworkedActionBarProps {
  /** The read-only mirror session driving the surface. */
  readonly session: IGameSession;
  /** The turn-ownership gate result — controls are enabled by `canAct`. */
  readonly ownership: ITurnOwnership;
  /** Unit the player has selected on the map (one of their own units). */
  readonly selectedUnitId: string | null;
  /** Hex the player has selected as a movement destination. */
  readonly selectedHex: { readonly q: number; readonly r: number } | null;
  /** Enemy unit the player has selected as an attack target. */
  readonly targetUnitId: string | null;
  /** Whether the match is paused (disables every control while true). */
  readonly paused: boolean;
  /** Forward an intent to the server. The bar never resolves locally. */
  readonly onSendIntent: (
    intent: ReturnType<typeof declareMovementIntent>,
  ) => void;
}

// =============================================================================
// Helpers
// =============================================================================

/** Stable button styling for an enabled / disabled intent control. */
function controlClass(enabled: boolean): string {
  return enabled
    ? 'rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-500'
    : 'rounded bg-slate-700 px-3 py-1.5 text-sm font-medium text-slate-400 cursor-not-allowed';
}

// =============================================================================
// Component
// =============================================================================

/**
 * Renders the per-phase intent controls. The visible control set is
 * driven by the mirror's current phase; every control is gated by
 * `ownership.canAct` (D4) and by `paused` (D6).
 */
export function NetworkedActionBar({
  session,
  ownership,
  selectedUnitId,
  selectedHex,
  targetUnitId,
  paused,
  onSendIntent,
}: INetworkedActionBarProps): React.ReactElement {
  const phase = session.currentState.phase;
  const localSide = ownership.localSide ?? GameSide.Player;
  // `authorPeerId` for the intent is the local side owner — the server
  // matches it against the seat assignment. When the session carries an
  // explicit `sideOwners` map we use the precise peer id; otherwise the
  // side string is a stable stand-in the server still authorizes.
  const authorPeerId = session.sideOwners?.[localSide] ?? localSide;

  // Controls are live only when the turn-ownership gate is open and the
  // match is not paused.
  const enabled = ownership.canAct && !paused;
  const controlContext: IActionControlContext = {
    session,
    enabled,
    authorPeerId,
    selectedUnitId,
    selectedHex,
    targetUnitId,
    onSendIntent,
  };

  // When the gate is closed and the match is live, show the passive
  // indicator instead of dead controls (D4).
  if (!ownership.canAct && ownership.waitingForOpponent) {
    return (
      <div
        data-testid="networked-action-bar"
        className="flex items-center gap-3"
      >
        <WaitingForOpponentIndicator />
        <ConcedeControl
          enabled={!paused}
          onConcede={() =>
            onSendIntent(concedeIntent(authorPeerId, { side: localSide }))
          }
        />
      </div>
    );
  }

  return (
    <div
      data-testid="networked-action-bar"
      className="flex flex-wrap items-center gap-2"
    >
      {phase === GamePhase.Movement && (
        <MovementPhaseControls context={controlContext} />
      )}

      {phase === GamePhase.WeaponAttack && (
        <WeaponAttackPhaseControls context={controlContext} />
      )}

      {phase === GamePhase.PhysicalAttack && (
        <PhysicalAttackPhaseControls context={controlContext} />
      )}

      <CommonPhaseControls context={controlContext} />

      <ConcedeControl
        enabled={!paused}
        onConcede={() =>
          onSendIntent(concedeIntent(authorPeerId, { side: localSide }))
        }
      />
    </div>
  );
}

interface IActionControlContext {
  readonly session: IGameSession;
  readonly enabled: boolean;
  readonly authorPeerId: string;
  readonly selectedUnitId: string | null;
  readonly selectedHex: { readonly q: number; readonly r: number } | null;
  readonly targetUnitId: string | null;
  readonly onSendIntent: INetworkedActionBarProps['onSendIntent'];
}

function MovementPhaseControls({
  context,
}: {
  readonly context: IActionControlContext;
}): React.ReactElement {
  const { enabled, selectedUnitId, selectedHex } = context;
  return (
    <>
      <button
        type="button"
        data-testid="declare-movement-button"
        className={controlClass(
          enabled && selectedUnitId !== null && selectedHex !== null,
        )}
        disabled={!enabled || !selectedUnitId || !selectedHex}
        onClick={() => sendMovementIntent(context)}
      >
        Declare movement
      </button>
      <button
        type="button"
        data-testid="stand-button"
        className={controlClass(enabled && selectedUnitId !== null)}
        disabled={!enabled || !selectedUnitId}
        onClick={() => sendStandIntent(context)}
      >
        Stand up
      </button>
    </>
  );
}

function WeaponAttackPhaseControls({
  context,
}: {
  readonly context: IActionControlContext;
}): React.ReactElement {
  const canDeclare =
    context.enabled &&
    context.selectedUnitId !== null &&
    context.targetUnitId !== null;
  return (
    <button
      type="button"
      data-testid="declare-attack-button"
      className={controlClass(canDeclare)}
      disabled={!canDeclare}
      onClick={() => sendWeaponAttackIntent(context)}
    >
      Declare attack
    </button>
  );
}

function PhysicalAttackPhaseControls({
  context,
}: {
  readonly context: IActionControlContext;
}): React.ReactElement {
  const canDeclare =
    context.enabled &&
    context.selectedUnitId !== null &&
    context.targetUnitId !== null;
  return (
    <button
      type="button"
      data-testid="declare-physical-button"
      className={controlClass(canDeclare)}
      disabled={!canDeclare}
      onClick={() => sendPhysicalAttackIntent(context)}
    >
      Declare physical
    </button>
  );
}

function CommonPhaseControls({
  context,
}: {
  readonly context: IActionControlContext;
}): React.ReactElement {
  return (
    <>
      <button
        type="button"
        data-testid="advance-phase-button"
        className={controlClass(context.enabled)}
        disabled={!context.enabled}
        onClick={() =>
          context.onSendIntent(endPhaseIntent(context.authorPeerId))
        }
      >
        End phase
      </button>

      <button
        type="button"
        data-testid="eject-button"
        className={controlClass(
          context.enabled && context.selectedUnitId !== null,
        )}
        disabled={!context.enabled || !context.selectedUnitId}
        onClick={() => sendEjectIntent(context)}
      >
        Eject
      </button>
    </>
  );
}

function sendMovementIntent(context: IActionControlContext): void {
  if (!context.selectedUnitId || !context.selectedHex) return;
  const payload: IDeclareMovementPayload = {
    unitId: context.selectedUnitId,
    to: context.selectedHex,
    facing:
      context.session.currentState.units[context.selectedUnitId]?.facing ?? 0,
    movementType: MovementType.Walk,
  };
  context.onSendIntent(declareMovementIntent(context.authorPeerId, payload));
}

function sendStandIntent(context: IActionControlContext): void {
  if (!context.selectedUnitId) return;
  context.onSendIntent(
    standIntent(context.authorPeerId, { unitId: context.selectedUnitId }),
  );
}

function sendWeaponAttackIntent(context: IActionControlContext): void {
  if (!context.selectedUnitId || !context.targetUnitId) return;
  context.onSendIntent(
    declareAttackIntent(context.authorPeerId, {
      attackerId: context.selectedUnitId,
      targetId: context.targetUnitId,
      // Wave-3 M1: fire every weapon the engine recognizes for
      // the unit; the server resolves per-weapon hit/miss.
      weaponIds: ['all-weapons'],
    }),
  );
}

function sendPhysicalAttackIntent(context: IActionControlContext): void {
  if (!context.selectedUnitId || !context.targetUnitId) return;
  context.onSendIntent(
    declarePhysicalIntent(context.authorPeerId, {
      attackerId: context.selectedUnitId,
      targetId: context.targetUnitId,
      attackType: 'punch',
    }),
  );
}

function sendEjectIntent(context: IActionControlContext): void {
  if (!context.selectedUnitId) return;
  context.onSendIntent(
    ejectIntent(context.authorPeerId, { unitId: context.selectedUnitId }),
  );
}

// =============================================================================
// Concede control
// =============================================================================

interface IConcedeControlProps {
  readonly enabled: boolean;
  readonly onConcede: () => void;
}

/**
 * The concede control is available in every phase regardless of the
 * turn-ownership gate — a player may always forfeit. It is still gated
 * by `paused` (D6) so a concede cannot race a reconnect.
 */
function ConcedeControl({
  enabled,
  onConcede,
}: IConcedeControlProps): React.ReactElement {
  return (
    <button
      type="button"
      data-testid="concede-button"
      className={
        enabled
          ? 'rounded border border-rose-700 px-3 py-1.5 text-sm font-medium text-rose-300 hover:bg-rose-900/30'
          : 'cursor-not-allowed rounded border border-slate-700 px-3 py-1.5 text-sm font-medium text-slate-500'
      }
      disabled={!enabled}
      onClick={onConcede}
    >
      Concede
    </button>
  );
}
