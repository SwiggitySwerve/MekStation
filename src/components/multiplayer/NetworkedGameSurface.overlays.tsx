/**
 * NetworkedGameSurface overlays — the lifecycle + status UI fragments
 * the networked game surface composes over the tactical map.
 *
 * Per `complete-multiplayer-game-surface` D6: the surface renders the
 * connection-lifecycle states the server broadcasts — a blocking pause
 * overlay (`MatchPaused`), a terminal panel (`Close`) — plus the
 * turn-ownership "waiting for opponent" indicator (D4) and the loading
 * state shown until the join replay drains (task 3.3).
 *
 * These are intentionally small presentational components with no hook
 * usage so the main `NetworkedGameSurface` stays under the file LOC cap
 * and each fragment is independently testable.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import Link from 'next/link';
import React, { useEffect, useState } from 'react';

import type {
  IMatchClosedInfo,
  IMatchPausedInfo,
} from '@/hooks/useMultiplayerSession';

import { AppIcon } from '@/components/ui/AppIcon';
import { MATCH_PAUSE_MESSAGES } from '@/lib/multiplayer/matchPauseCopy';

// =============================================================================
// Loading state
// =============================================================================

/**
 * Shown until the join replay stream drains (`ReplayEnd`) and the seed
 * `GameCreated` event has rebuilt the mirror. Task 3.3 — the board is
 * committed in one render once the mirror is ready.
 */
export function MatchLoadingState(): React.ReactElement {
  return (
    <section
      data-testid="networked-game-loading"
      className="border-border-theme bg-surface-deep/40 flex min-h-[480px] flex-col items-center justify-center rounded-lg border p-8 text-center"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
        aria-hidden="true"
      />
      <h2 className="text-text-theme-primary mt-4 text-lg font-semibold">
        Loading match…
      </h2>
      <p className="text-text-theme-secondary mt-1 text-xs">
        Rebuilding the board from the match event stream.
      </p>
    </section>
  );
}

// =============================================================================
// Waiting-for-opponent indicator
// =============================================================================

/**
 * Passive indicator rendered when the turn-ownership gate is closed —
 * it is the opponent's turn or a server-only phase (D4). Non-blocking:
 * the player can still watch the opponent's moves animate on the map.
 */
export function WaitingForOpponentIndicator(): React.ReactElement {
  return (
    <div
      data-testid="waiting-for-opponent"
      role="status"
      className="flex items-center gap-2 rounded border border-amber-700/60 bg-amber-900/20 px-3 py-2 text-sm text-amber-200"
    >
      <span
        className="h-2 w-2 animate-pulse rounded-full bg-amber-400"
        aria-hidden="true"
      />
      Waiting for opponent…
    </div>
  );
}

// =============================================================================
// Spectator indicator
// =============================================================================

/**
 * Persistent badge shown on the spectator surface (M3 task 7.2) so the
 * observer always knows they are watching, not playing. Replaces the
 * action bar entirely — a spectator has no intent controls.
 */
export function SpectatorIndicator(): React.ReactElement {
  return (
    <div
      data-testid="spectator-indicator"
      role="status"
      className="flex items-center gap-2 rounded border border-sky-700/60 bg-sky-900/20 px-3 py-2 text-sm text-sky-200"
    >
      <span className="h-2 w-2 rounded-full bg-sky-400" aria-hidden="true" />
      Spectating — you are watching this match
    </div>
  );
}

// =============================================================================
// Pause overlay
// =============================================================================

/**
 * Format the live grace countdown. The overlay ticks a local 1s timer
 * off `pendingExpiresAtMs` so the number counts down without the server
 * re-broadcasting; falls back to the static `graceRemainingMs` snapshot
 * when no absolute deadline was supplied.
 */
function useGraceCountdown(info: IMatchPausedInfo): number {
  const [seconds, setSeconds] = useState<number>(() =>
    Math.max(0, Math.ceil(info.graceRemainingMs / 1000)),
  );
  useEffect(() => {
    if (info.pendingExpiresAtMs == null) {
      setSeconds(Math.max(0, Math.ceil(info.graceRemainingMs / 1000)));
      return;
    }
    const deadline = info.pendingExpiresAtMs;
    const tick = (): void => {
      setSeconds(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    };
    tick();
    const handle = setInterval(tick, 1000);
    return () => clearInterval(handle);
  }, [info.graceRemainingMs, info.pendingExpiresAtMs]);
  return seconds;
}

export interface IMatchPauseOverlayProps {
  readonly info: IMatchPausedInfo;
}

/**
 * Blocking overlay rendered on `MatchPaused` (D6). Names why the match
 * is paused, every pending seat and, only while a seat is pending, the
 * grace countdown; covers the surface so intent controls underneath
 * cannot be reached.
 */
export function MatchPauseOverlay({
  info,
}: IMatchPauseOverlayProps): React.ReactElement {
  const seconds = useGraceCountdown(info);
  const seatsPending = info.pendingSlots.length > 0;
  const slotLabel = seatsPending ? info.pendingSlots.join(', ') : 'an opponent';
  return (
    <div
      data-testid="match-pause-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Match Paused"
      className="bg-surface-deep/80 absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center backdrop-blur-sm"
    >
      <h2 className="text-xl font-semibold text-amber-200">Match Paused</h2>
      {info.reason !== 'peer-pending' && (
        <p
          data-testid="match-pause-reason"
          className="text-text-theme-secondary mt-2 max-w-sm text-sm"
        >
          {MATCH_PAUSE_MESSAGES[info.reason]}
        </p>
      )}
      {(seatsPending || info.reason === 'peer-pending') && (
        <p className="text-text-theme-secondary mt-2 max-w-sm text-sm">
          Waiting for{' '}
          <span className="font-mono text-amber-300">{slotLabel}</span> to
          reconnect.
        </p>
      )}
      {seatsPending && (
        <p
          data-testid="match-pause-countdown"
          className="mt-3 font-mono text-2xl text-amber-100"
        >
          {seconds}s
        </p>
      )}
      <p className="text-text-theme-muted mt-2 text-xs">
        Controls are disabled until the match resumes.
      </p>
    </div>
  );
}

// =============================================================================
// Terminal panel
// =============================================================================

export interface IMatchClosedPanelProps {
  readonly info: IMatchClosedInfo;
}

/**
 * Terminal panel rendered on `Close` (D6). Offers a route back to the
 * multiplayer hub — the surface is no longer playable once the server
 * has dropped the match.
 */
export function MatchClosedPanel({
  info,
}: IMatchClosedPanelProps): React.ReactElement {
  return (
    <section
      data-testid="match-closed-panel"
      className="border-border-theme bg-surface-deep/60 flex min-h-[480px] flex-col items-center justify-center rounded-lg border p-8 text-center"
    >
      <h2 className="text-text-theme-primary text-xl font-semibold">
        Match ended
      </h2>
      <p className="text-text-theme-secondary mt-2 max-w-sm text-sm">
        {info.reason ?? 'The match has been closed by the server.'}
        {info.code ? ` (${info.code})` : ''}
      </p>
      <Link
        href="/multiplayer"
        data-testid="match-closed-hub-link"
        className="mt-5 inline-block rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
      >
        Back to multiplayer hub
      </Link>
    </section>
  );
}

// =============================================================================
// Intent-error toast
// =============================================================================

export interface IIntentErrorToastProps {
  readonly code?: string;
  readonly reason?: string;
  readonly onDismiss: () => void;
}

/**
 * Non-fatal notification for a rejected intent (D3). The connection
 * stays open and the mirror is unchanged — this only tells the player
 * the server declined the action (wrong phase, unauthorized unit, ...).
 */
export function IntentErrorToast({
  code,
  reason,
  onDismiss,
}: IIntentErrorToastProps): React.ReactElement {
  return (
    <div
      data-testid="intent-error-toast"
      role="alert"
      className="flex items-start justify-between gap-3 rounded border border-rose-700 bg-rose-900/30 px-3 py-2 text-sm text-rose-200"
    >
      <span>
        Action rejected
        {code ? ` (${code})` : ''}
        {reason ? `: ${reason}` : '.'}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded px-1 text-rose-300 hover:text-rose-100"
      >
        <AppIcon name="close" size="inline" />
      </button>
    </div>
  );
}
