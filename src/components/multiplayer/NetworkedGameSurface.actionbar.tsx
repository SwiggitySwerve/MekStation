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
import type { CommandAvailability } from '@/types/gameplay/TacticalCommandInterfaces';

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

import {
  buildActionControlContext,
  NETWORKED_ACTION_REFUSAL_ID,
  type IActionControlContext,
} from './NetworkedGameSurface.actionContext';
import { BranchRecoveryInstruction } from './NetworkedGameSurface.branchRecovery';
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
  /**
   * The tactical lifecycle's answer to "may this client command at all"
   * (umbrella 19.2). Refused in the postures where the client knows its
   * board is not the server's - rebuild, rewound branch, blocked
   * stream, and the three convergence states. Absent means ungated.
   */
  readonly commandGate?: CommandAvailability;
  /**
   * Server recoveryAction from a branch refusal, rendered verbatim.
   * Absent or empty means the bar names no recovery of its own.
   */
  readonly recoveryAction?: string | null;
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
  commandGate,
  recoveryAction = null,
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
  // match is not paused. Server-owned phases (Initiative / Heat / End)
  // have no active side, but a seated participant must still be able to
  // advance them or a launched match can stall before the first turn.
  const enabled = ownership.canAct && !paused;
  const canAdvanceServerPhase =
    ownership.localSide !== null && ownership.activeSide === null;
  const canAdvancePhase =
    !paused && (ownership.canAct || canAdvanceServerPhase);
  // One construction point for both halves of the gate: what a control
  // renders as, and what it is allowed to send. Splitting them is how a
  // surface ends up with a disabled button and a live dispatch path.
  const controlContext = buildActionControlContext({
    session,
    enabled,
    canAdvancePhase,
    authorPeerId,
    selectedUnitId,
    selectedHex,
    targetUnitId,
    onSendIntent,
    commandGate,
    recoveryAction,
  });

  // When the gate is closed and the match is live, show the passive
  // indicator instead of dead controls (D4).
  if (
    !ownership.canAct &&
    ownership.waitingForOpponent &&
    ownership.activeSide !== null
  ) {
    return (
      <div
        data-testid="networked-action-bar"
        className="flex items-center gap-3"
      >
        <WaitingForOpponentIndicator />
        <ConcedeControl
          enabled={!paused && !controlContext.refused}
          describedBy={controlContext.describedBy}
          onConcede={() =>
            controlContext.onSendIntent(
              concedeIntent(authorPeerId, { side: localSide }),
            )
          }
        />
        <GateRefusalDescription context={controlContext} />
        <BranchRecoveryInstruction
          recoveryAction={controlContext.recoveryAction}
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
        enabled={!paused && !controlContext.refused}
        describedBy={controlContext.describedBy}
        onConcede={() =>
          controlContext.onSendIntent(
            concedeIntent(authorPeerId, { side: localSide }),
          )
        }
      />

      <GateRefusalDescription context={controlContext} />
      <BranchRecoveryInstruction
        recoveryAction={controlContext.recoveryAction}
      />
    </div>
  );
}

/**
 * The refusal reason, in the DOM exactly when a control points at it.
 *
 * One element for the whole bar rather than one per control: every
 * gated control is refused for the SAME reason by construction (the
 * gate answers per surface, not per command), and a single node is what
 * makes `aria-describedby` resolvable instead of dangling - the mistake
 * finding #42 caught on the single-player dock.
 */
function GateRefusalDescription({
  context,
}: {
  readonly context: IActionControlContext;
}): React.ReactElement | null {
  if (context.refusalReason === null) return null;
  return (
    <span id={NETWORKED_ACTION_REFUSAL_ID} className="sr-only">
      {context.refusalReason}
    </span>
  );
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
        aria-describedby={context.describedBy}
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
        aria-describedby={context.describedBy}
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
      aria-describedby={context.describedBy}
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
      aria-describedby={context.describedBy}
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
        aria-describedby={context.describedBy}
        className={controlClass(context.canAdvancePhase)}
        disabled={!context.canAdvancePhase}
        onClick={() =>
          context.onSendIntent(endPhaseIntent(context.authorPeerId))
        }
      >
        End phase
      </button>

      <button
        type="button"
        data-testid="eject-button"
        aria-describedby={context.describedBy}
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
  readonly describedBy?: string | undefined;
  readonly onConcede: () => void;
}

/**
 * The concede control is available in every phase regardless of the
 * turn-ownership gate — a player may always forfeit. It is still gated
 * by `paused` (D6) so a concede cannot race a reconnect, and by the
 * lifecycle gate (19.2): a forfeit is an engine-mutating command like
 * any other, and the server refuses it while history is rebuilding.
 * Leaving it live would offer the player the one irreversible action on
 * a board the client already knows is not the server's.
 */
function ConcedeControl({
  enabled,
  describedBy,
  onConcede,
}: IConcedeControlProps): React.ReactElement {
  return (
    <button
      type="button"
      data-testid="concede-button"
      aria-describedby={describedBy}
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
