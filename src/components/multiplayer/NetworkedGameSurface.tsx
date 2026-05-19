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
  deriveTurnOwnership,
  localSideFromSeats,
} from '@/lib/multiplayer/turnOwnership';
import {
  canLocalPeerControlSide,
  GamePhase,
  GameSide,
  GameStatus,
} from '@/types/gameplay/GameSessionInterfaces';

import { NetworkedActionBar } from './NetworkedGameSurface.actionbar';
import {
  IntentErrorToast,
  MatchClosedPanel,
  MatchLoadingState,
  MatchPauseOverlay,
  SpectatorIndicator,
} from './NetworkedGameSurface.overlays';

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
  const paused = status === 'paused';
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
            onSendIntent={handleSendIntent}
          />
        )}
        <SelectionSummary
          selectedUnitId={selectedUnitId}
          targetUnitId={targetUnitId}
          phase={state.phase}
        />
      </div>
    </section>
  );
}

// =============================================================================
// Selection summary
// =============================================================================

interface ISelectionSummaryProps {
  readonly selectedUnitId: string | null;
  readonly targetUnitId: string | null;
  readonly phase: GamePhase;
}

/**
 * Small read-out of the current map selection so the player can see
 * what their next intent will act on. Purely informational.
 */
function SelectionSummary({
  selectedUnitId,
  targetUnitId,
  phase,
}: ISelectionSummaryProps): React.ReactElement {
  const isAttackPhase =
    phase === GamePhase.WeaponAttack || phase === GamePhase.PhysicalAttack;
  return (
    <div
      data-testid="selection-summary"
      className="shrink-0 text-right text-xs text-slate-400"
    >
      <p>
        Unit:{' '}
        <span className="font-mono text-slate-200">
          {selectedUnitId ?? '—'}
        </span>
      </p>
      {isAttackPhase && (
        <p>
          Target:{' '}
          <span className="font-mono text-slate-200">
            {targetUnitId ?? '—'}
          </span>
        </p>
      )}
    </div>
  );
}

export default NetworkedGameSurface;
