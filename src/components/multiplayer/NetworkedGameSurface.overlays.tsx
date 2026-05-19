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
      className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/40 p-8 text-center"
    >
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"
        aria-hidden="true"
      />
      <h2 className="mt-4 text-lg font-semibold text-slate-200">
        Loading match…
      </h2>
      <p className="mt-1 text-xs text-slate-400">
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
 * Blocking overlay rendered on `MatchPaused` (D6). Names every pending
 * seat and shows the grace countdown; covers the surface so intent
 * controls underneath cannot be reached.
 */
export function MatchPauseOverlay({
  info,
}: IMatchPauseOverlayProps): React.ReactElement {
  const seconds = useGraceCountdown(info);
  const slotLabel =
    info.pendingSlots.length > 0 ? info.pendingSlots.join(', ') : 'an opponent';
  return (
    <div
      data-testid="match-pause-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-label="Match paused"
      className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 p-8 text-center backdrop-blur-sm"
    >
      <h2 className="text-xl font-semibold text-amber-200">Match paused</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-300">
        Waiting for{' '}
        <span className="font-mono text-amber-300">{slotLabel}</span> to
        reconnect.
      </p>
      <p
        data-testid="match-pause-countdown"
        className="mt-3 font-mono text-2xl text-amber-100"
      >
        {seconds}s
      </p>
      <p className="mt-2 text-xs text-slate-500">
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
      className="flex min-h-[480px] flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-900/60 p-8 text-center"
    >
      <h2 className="text-xl font-semibold text-slate-100">Match ended</h2>
      <p className="mt-2 max-w-sm text-sm text-slate-400">
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
        ✕
      </button>
    </div>
  );
}
