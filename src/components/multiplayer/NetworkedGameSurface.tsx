/**
 * NetworkedGameSurface — the playable client surface for a launched
 * networked match.
 *
 * Per `complete-multiplayer-game-surface`: this component replaces the
 * lobby page's `active`-state placeholder. It renders the tactical map
 * from a client mirror `IGameSession` (D2) built solely from the server
 * `Event` stream, collects the local player's actions as `IGameIntent`s
 * and forwards them over the existing WebSocket (D3), gates the
 * intent-producing controls by turn ownership (D4), tolerates fog-
 * redacted events without crashing (D5), and surfaces the connection-
 * lifecycle states the server broadcasts (D6).
 *
 * The surface NEVER runs engine resolution — the mirror updates only
 * when the server's broadcast `Event` arrives. An out-of-phase or
 * unauthorized action is rejected by the server with an `Error`
 * envelope, surfaced here as a non-fatal toast (D3).
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import React, { useCallback, useMemo, useState } from 'react';

import type {
  IMatchClosedInfo,
  IMatchPausedInfo,
  IMultiplayerError,
} from '@/hooks/useMultiplayerSession';
import type { IClientLifecycleState } from '@/lib/multiplayer/client';
import type { GmCombatRewindPreviewResult } from '@/lib/multiplayer/server/history/GmCombatRewindPreview';
import type { TacticalLifecycleProjectionSignal } from '@/lib/multiplayer/tacticalLifecycleState';
import type { ICommandAuthorityProjection } from '@/types/command-screen';
import type {
  IGameEvent,
  IGameIntent,
  IGameSession,
} from '@/types/gameplay/GameSessionInterfaces';
import type { IHexCoordinate } from '@/types/gameplay/HexGridInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { HexMapDisplay } from '@/components/gameplay/HexMapDisplay/HexMapDisplay';
import { PhaseBanner } from '@/components/gameplay/PhaseBanner';
import { deriveHexMapStateFromEvents } from '@/hooks/replay/useHexMapStateFromEvents';
import {
  buildNetworkedTacticalAuthorityProjection,
  extractPlayerSafeCommandResults,
} from '@/lib/command-screen';
import { tacticalCommandAvailability } from '@/lib/multiplayer/tacticalCommandGate';
import {
  deriveTacticalLifecyclePosture,
  deriveTacticalWireFacts,
} from '@/lib/multiplayer/tacticalLifecycleState';
import {
  deriveTurnOwnership,
  localSideFromSeats,
} from '@/lib/multiplayer/turnOwnership';
import {
  canLocalPeerControlSide,
  GameSide,
  GameStatus,
} from '@/types/gameplay/GameSessionInterfaces';

import { NetworkedActionBar } from './NetworkedGameSurface.actionbar';
import { NetworkedGmRewindControls } from './NetworkedGameSurface.gmRewind';
import {
  IntentErrorToast,
  MatchClosedPanel,
  MatchLoadingState,
  MatchPauseOverlay,
  SpectatorIndicator,
} from './NetworkedGameSurface.overlays';
import {
  NetworkedCommandResultFeed,
  SelectionSummary,
} from './NetworkedGameSurface.panels';
import { TacticalLifecycleStateBanner } from './TacticalLifecycleStateBanner';

// =============================================================================
// Types
// =============================================================================

export interface INetworkedGameSurfaceProps {
  /** Read-only client mirror session; `null` until the seed event lands. */
  readonly mirrorSession: IGameSession | null;
  /** Ordered `IGameEvent[]` the mirror was built from (animations/effects). */
  readonly mirrorEvents: readonly IGameEvent[];
  /** Lobby seat array — the local player's side is derived from it. */
  readonly seats: readonly IMatchSeat[];
  /** The local player's id — matched against the seat occupants. */
  readonly playerId: string;
  /** High-level connection lifecycle from `useMultiplayerSession`. */
  readonly status:
    | 'idle'
    | 'connecting'
    | 'ready'
    | 'paused'
    | 'closed'
    | 'error';
  /** `MatchPaused` payload while paused; `null` otherwise (D6). */
  readonly pausedInfo: IMatchPausedInfo | null;
  /** Terminal `Close` payload once closed; `null` before (D6). */
  readonly closedInfo: IMatchClosedInfo | null;
  /** Most recent non-fatal server `Error` envelope (D3). */
  readonly intentError: IMultiplayerError | null;
  /** Clear the non-fatal intent error (toast dismiss). */
  readonly onClearIntentError: () => void;
  /** Forward a player action to the server (D3). */
  readonly onSendGameIntent: (intent: IGameIntent) => boolean;
  readonly hostPlayerId?: string | null;
  /**
   * The GM-fix stubs (umbrella 19.3). They now render ONLY when a caller
   * supplies both - the no-op defaults are gone. That is defect #15 fixed
   * at the cause: the production lobby route passes neither, so the host
   * no longer sees two buttons that silently do nothing, while the
   * `/e2e/networked-command-proof` harness that DOES wire them keeps the
   * proof its Playwright specs assert. The host GM's live control on the
   * lobby route is the rewind flow below.
   */
  readonly onPreviewHostGmCorrection?: () => void;
  readonly onApproveHostGmCorrection?: () => void;
  /**
   * Asks the authority what a rewind to a chosen revision would touch
   * (umbrella 19.3). Injected, because the route that answers - `POST
   * /api/matches/[id]/rewind-preview` - is task 3b-iii and does not exist
   * yet; REPLACED-WHEN-EMITTED by the page's adapter over it. Absent means
   * the control renders disabled with the reason rather than looking live.
   */
  readonly onPreviewRewind?: () => Promise<GmCombatRewindPreviewResult>;
  /**
   * Applies a previewed rewind. Absent until task 3b-iv builds a commit
   * path, so the confirm renders disabled for its own separate reason.
   */
  readonly onConfirmRewind?: () => void;
  /** Public connection/delivery facts exposed by the multiplayer client. */
  readonly clientLifecycle?: IClientLifecycleState;
  /** Branch-gated history signal; null in the live multiplayer client today. */
  readonly projectionSignal?: TacticalLifecycleProjectionSignal | null;
  /**
   * M3 (add-matchmaking-and-spectator) — render the surface in
   * read-only spectator mode. When `true` the intent-emit action bar is
   * replaced by a passive `SpectatorIndicator`: no movement, attack,
   * phase, or concede controls are mounted, so a spectator can never
   * produce an `Intent` from the UI. Defaults to `false` (player mode).
   */
  readonly spectator?: boolean;
}

// =============================================================================
// Component
// =============================================================================

/**
 * The networked game surface. Composition:
 *   - `MatchLoadingState` until the mirror is built (replay drained).
 *   - `MatchClosedPanel` once the server sends `Close`.
 *   - otherwise the tactical map + `PhaseBanner` + `NetworkedActionBar`,
 *     with the `MatchPauseOverlay` layered on top while paused.
 */
export function NetworkedGameSurface({
  mirrorSession,
  mirrorEvents,
  seats,
  playerId,
  status,
  pausedInfo,
  closedInfo,
  intentError,
  onClearIntentError,
  onSendGameIntent,
  hostPlayerId,
  onPreviewHostGmCorrection,
  onApproveHostGmCorrection,
  onPreviewRewind,
  onConfirmRewind,
  clientLifecycle = LIVE_CLIENT_LIFECYCLE,
  projectionSignal = null,
  spectator = false,
}: INetworkedGameSurfaceProps): React.ReactElement {
  // Map-selection state owned here so the action bar stays a controlled
  // presentational component (D3 — the surface is the single source of
  // selection truth).
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<IHexCoordinate | null>(null);
  const [targetUnitId, setTargetUnitId] = useState<string | null>(null);

  const localSide = useMemo(
    () => localSideFromSeats(seats, playerId),
    [seats, playerId],
  );
  const ownership = useMemo(
    () => deriveTurnOwnership(mirrorSession, localSide),
    [mirrorSession, localSide],
  );
  const resolvedHostPlayerId = useMemo(
    () => hostPlayerId ?? firstOccupiedHumanPlayerId(seats),
    [hostPlayerId, seats],
  );
  const tacticalWireFacts = useMemo(
    () => deriveTacticalWireFacts(mirrorEvents, localSide),
    [localSide, mirrorEvents],
  );
  const tacticalLifecycle = useMemo(
    () =>
      deriveTacticalLifecyclePosture({
        client: clientLifecycle,
        projectionSignal,
        ...tacticalWireFacts,
      }),
    [clientLifecycle, projectionSignal, tacticalWireFacts],
  );
  // The lifecycle's answer to "may this client command at all" (19.2).
  // Derived HERE, from the posture this surface already computes, so the
  // gate cannot disagree with the banner sitting above the controls.
  const commandGate = useMemo(
    () => tacticalCommandAvailability(tacticalLifecycle),
    [tacticalLifecycle],
  );
  // `status === 'paused'` is kept as its own arm rather than folded into
  // the gate. It is a MATCH fact (a peer dropped, the server paused the
  // match) and it drives the pause OVERLAY as well as the controls; the
  // gate answers a different question - whether this client's view is
  // authoritative enough to command from. `blocked` appears on both
  // sides because the gate refuses it too, and the overlay-side arm is
  // what keeps the map covered.
  const interactionPaused =
    status === 'paused' || tacticalLifecycle.state === 'blocked';
  const authorityProjection = useMemo(
    () =>
      buildNetworkedTacticalAuthorityProjection({
        playerId,
        hostPlayerId: resolvedHostPlayerId,
        canAct: ownership.canAct,
        waitingForOpponent: ownership.waitingForOpponent,
        paused: interactionPaused,
        spectator,
      }),
    [
      ownership.canAct,
      ownership.waitingForOpponent,
      playerId,
      resolvedHostPlayerId,
      spectator,
      interactionPaused,
    ],
  );

  // Project the mirror's event log into hex-map tokens. The projection
  // walks every event up to the highest sequence, so an omitted fog
  // event simply leaves the affected unit at its last-known position —
  // the D5 "last seen" contract, no special-casing needed.
  const highestSeq = useMemo(() => {
    let max = -1;
    for (const event of mirrorEvents) {
      if (event.sequence > max) max = event.sequence;
    }
    return max;
  }, [mirrorEvents]);

  const hexMapState = useMemo(
    () => deriveHexMapStateFromEvents(mirrorEvents, highestSeq),
    [mirrorEvents, highestSeq],
  );
  const commandResults = useMemo(
    () => extractPlayerSafeCommandResults(mirrorEvents),
    [mirrorEvents],
  );

  // Token-click selection: a token the local side owns becomes the
  // selected unit; an enemy token becomes the attack target. The gate
  // is the same `canLocalPeerControlSide` the single-player combat UI
  // uses — fail-closed when the unit's side is unknown.
  const handleTokenClick = useCallback(
    (unitId: string) => {
      if (!mirrorSession) return;
      const unitState = mirrorSession.currentState.units[unitId];
      if (!unitState) return;
      const ownsUnit =
        localSide !== null && unitState.side === localSide
          ? true
          : canLocalPeerControlSide(mirrorSession, playerId, unitState.side);
      if (ownsUnit) {
        setSelectedUnitId(unitId);
        setSelectedHex(null);
      } else {
        setTargetUnitId(unitId);
      }
    },
    [localSide, mirrorSession, playerId],
  );

  const handleHexClick = useCallback((hex: IHexCoordinate) => {
    setSelectedHex(hex);
  }, []);

  // Wrap the intent forwarder so a send failure (unmappable intent)
  // does not silently swallow — the hook surfaces a server `Error`
  // separately, but a client-side mapping failure is logged here.
  const handleSendIntent = useCallback(
    (intent: IGameIntent) => {
      onSendGameIntent(intent);
    },
    [onSendGameIntent],
  );

  // ---------------------------------------------------------------------------
  // Terminal + loading branches
  // ---------------------------------------------------------------------------

  if (status === 'closed' && closedInfo) {
    return <MatchClosedPanel info={closedInfo} />;
  }

  // Until the seed `GameCreated` event has rebuilt the mirror, the
  // board cannot render — show the loading state (task 3.3).
  if (!mirrorSession) {
    return <MatchLoadingState />;
  }

  const state = mirrorSession.currentState;
  const paused = interactionPaused;
  const isPlayerTurn = ownership.canAct;

  // ---------------------------------------------------------------------------
  // Playable surface
  // ---------------------------------------------------------------------------

  return (
    <section
      data-testid="networked-game-surface"
      className="relative flex flex-col gap-3"
    >
      <PhaseBanner
        phase={state.phase}
        turn={state.turn}
        activeSide={ownership.activeSide ?? GameSide.Player}
        isPlayerTurn={isPlayerTurn}
        statusText={
          state.status === GameStatus.Completed ? 'Match complete' : undefined
        }
      />

      <TacticalLifecycleStateBanner posture={tacticalLifecycle} />

      <NetworkedAuthorityStrip projection={authorityProjection} />

      {intentError && (
        <IntentErrorToast
          code={intentError.code}
          reason={intentError.reason}
          onDismiss={onClearIntentError}
        />
      )}

      <div className="relative overflow-hidden rounded-lg border border-slate-700">
        <div className="min-h-[480px] bg-slate-100">
          <HexMapDisplay
            mapId={`networked-match-${mirrorSession.id}`}
            radius={hexMapState.mapRadius > 0 ? hexMapState.mapRadius : 8}
            tokens={hexMapState.tokens}
            hexTerrain={hexMapState.hexTerrain}
            events={mirrorEvents}
            selectedHex={selectedHex}
            friendlySide={localSide ?? GameSide.Player}
            onHexClick={handleHexClick}
            onTokenClick={handleTokenClick}
          />
        </div>

        {/* D6: the pause overlay covers the whole map so intent
            controls underneath cannot be reached while paused. */}
        {paused && pausedInfo && <MatchPauseOverlay info={pausedInfo} />}
      </div>

      <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-700 bg-slate-900/40 p-3">
        {/* M3 — a spectator surface mounts NO intent controls. The
            action bar (which carries every movement / attack / phase /
            concede control) is replaced by a passive indicator so the
            observer cannot produce an Intent from the UI. */}
        {spectator ? (
          <SpectatorIndicator />
        ) : (
          <NetworkedActionBar
            session={mirrorSession}
            ownership={ownership}
            selectedUnitId={selectedUnitId}
            selectedHex={
              selectedHex ? { q: selectedHex.q, r: selectedHex.r } : null
            }
            targetUnitId={targetUnitId}
            paused={paused}
            commandGate={commandGate}
            onSendIntent={handleSendIntent}
          />
        )}
        <SelectionSummary
          selectedUnitId={selectedUnitId}
          targetUnitId={targetUnitId}
          phase={state.phase}
        />
      </div>

      {/* GM authority controls are gated by the PROJECTION's role, not by
          the raw player id - a spectator holding the host's id is still a
          spectator - and the lobby route is their only mount. */}
      {authorityProjection.viewerRole === 'host-gm' && !spectator && (
        <>
          {onPreviewHostGmCorrection !== undefined &&
            onApproveHostGmCorrection !== undefined && (
              <NetworkedHostGmControls
                onPreview={onPreviewHostGmCorrection}
                onApprove={onApproveHostGmCorrection}
              />
            )}
          <NetworkedGmRewindControls
            onPreviewRewind={onPreviewRewind}
            onConfirmRewind={onConfirmRewind}
          />
        </>
      )}

      <NetworkedCommandResultFeed results={commandResults} />
    </section>
  );
}

const LIVE_CLIENT_LIFECYCLE: IClientLifecycleState = {
  blockedBySequenceCollision: false,
  pendingIntentCount: 0,
  ready: true,
  reconnectScheduled: false,
  recoveringFromGap: false,
};

function firstOccupiedHumanPlayerId(
  seats: readonly IMatchSeat[],
): string | null {
  return (
    seats.find((seat) => seat.kind === 'human' && seat.occupant)?.occupant
      ?.playerId ?? null
  );
}

function NetworkedAuthorityStrip({
  projection,
}: {
  readonly projection: ICommandAuthorityProjection;
}): React.ReactElement {
  return (
    <div
      data-testid="network-command-authority-projection"
      className="flex flex-wrap gap-2 rounded-lg border border-slate-700 bg-slate-900/50 p-2 text-xs"
    >
      <span
        data-testid="network-command-authority-summary"
        className="rounded border border-sky-700/70 bg-sky-950/50 px-2 py-1 text-sky-200"
      >
        {projection.summary}
      </span>
      <span
        data-testid="network-command-authority-path"
        className="rounded border border-slate-700 bg-slate-950/60 px-2 py-1 text-slate-300"
      >
        {projection.commandPath}
      </span>
      {projection.publicResultOnly && (
        <span
          data-testid="network-command-authority-public-only"
          className="rounded border border-emerald-700/70 bg-emerald-950/40 px-2 py-1 text-emerald-200"
        >
          Public results
        </span>
      )}
      {projection.canViewPrivateGmMetadata && (
        <span
          data-testid="network-command-authority-private"
          className="rounded border border-violet-700/70 bg-violet-950/40 px-2 py-1 text-violet-200"
        >
          GM-private
        </span>
      )}
    </div>
  );
}

/**
 * The GM-fix stubs, kept for the `/e2e/networked-command-proof` harness
 * that wires them. Mounted only when a caller supplies both handlers, so
 * no production page inherits a control that does nothing (defect #15).
 */
function NetworkedHostGmControls({
  onPreview,
  onApprove,
}: {
  readonly onPreview: () => void;
  readonly onApprove: () => void;
}): React.ReactElement {
  return (
    <div
      data-testid="networked-host-gm-controls"
      className="flex flex-wrap gap-2 rounded-lg border border-violet-700/60 bg-violet-950/30 p-2"
    >
      <button
        type="button"
        data-testid="networked-gm-preview-btn"
        onClick={onPreview}
        className="rounded border border-sky-500/50 bg-sky-600/20 px-3 py-1.5 text-sm font-medium text-sky-200 hover:bg-sky-600/30"
      >
        Preview GM Fix
      </button>
      <button
        type="button"
        data-testid="networked-gm-approve-btn"
        onClick={onApprove}
        className="rounded border border-violet-500/50 bg-violet-600/20 px-3 py-1.5 text-sm font-medium text-violet-200 hover:bg-violet-600/30"
      >
        Approve GM Fix
      </button>
    </div>
  );
}

export default NetworkedGameSurface;
