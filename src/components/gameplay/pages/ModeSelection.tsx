import React from 'react';

import { Card } from '@/components/ui';

interface ModeSelectionProps {
  onAutoResolve: () => void;
  onInteractive: () => void;
  onSpectate: () => void;
  /**
   * Per `add-p2p-game-session-sync` § 8.1: opens the Networked 1v1
   * lobby flow. Optional — when omitted, the option button is hidden
   * (e.g. on encounters that don't support multiplayer yet).
   */
  onNetworked1v1?: () => void;
  /**
   * Tooltip explaining why `onNetworked1v1` is disabled (e.g. no active
   * sync room). Per § 8.2. Ignored when `onNetworked1v1` is omitted.
   */
  networked1v1DisabledReason?: string | null;
  isResolving: boolean;
}

export function ModeSelection({
  onAutoResolve,
  onInteractive,
  onSpectate,
  onNetworked1v1,
  networked1v1DisabledReason,
  isResolving,
}: ModeSelectionProps): React.ReactElement {
  const networkedDisabled =
    isResolving ||
    !onNetworked1v1 ||
    (networked1v1DisabledReason !== undefined &&
      networked1v1DisabledReason !== null &&
      networked1v1DisabledReason !== '');
  // 4-up grid when the networked option is wired; 3-up otherwise so
  // legacy callers keep their layout.
  const gridCols = onNetworked1v1
    ? 'grid-cols-1 gap-4 md:grid-cols-4'
    : 'grid-cols-1 gap-4 md:grid-cols-3';
  return (
    <Card data-testid="mode-selection">
      <div className="p-6">
        <h2 className="text-text-theme-primary mb-2 text-lg font-medium">
          Choose Battle Mode
        </h2>
        <p className="text-text-theme-muted mb-6 text-sm">
          Select how you want to resolve this encounter.
        </p>

        <div className={`grid ${gridCols}`}>
          <button
            onClick={onAutoResolve}
            disabled={isResolving}
            className="group border-border-theme-subtle hover:border-accent rounded-lg border-2 p-6 text-left transition-all hover:bg-cyan-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="auto-resolve-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/20">
              {isResolving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" />
              ) : (
                <svg
                  className="h-5 w-5 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              )}
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              {isResolving ? 'Resolving Battle...' : 'Auto-Resolve Battle'}
            </h3>
            <p className="text-text-theme-muted text-sm">
              Simulate the entire battle instantly. The engine resolves all
              combat rounds and shows you the results.
            </p>
          </button>

          <button
            onClick={onInteractive}
            disabled={isResolving}
            className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left transition-all hover:border-amber-500/50 hover:bg-amber-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="play-manually-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/20">
              <svg
                className="h-5 w-5 text-amber-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
                />
              </svg>
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              Play Manually
            </h3>
            <p className="text-text-theme-muted text-sm">
              Take command and make tactical decisions each turn. Move units,
              choose targets, and manage heat.
            </p>
          </button>

          <button
            onClick={onSpectate}
            disabled={isResolving}
            className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 disabled:cursor-wait disabled:opacity-60"
            data-testid="simulate-battle-btn"
          >
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/20">
              <svg
                className="h-5 w-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-text-theme-primary mb-1 font-medium">
              Simulate Battle
            </h3>
            <p className="text-text-theme-muted text-sm">
              Watch AI control both sides. Playback controls let you pause,
              step, and adjust speed.
            </p>
          </button>

          {onNetworked1v1 && (
            <button
              onClick={onNetworked1v1}
              disabled={networkedDisabled}
              title={
                networked1v1DisabledReason
                  ? networked1v1DisabledReason
                  : 'Open a peer-to-peer 1v1 lobby'
              }
              className="group border-border-theme-subtle rounded-lg border-2 p-6 text-left transition-all hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="networked-1v1-btn"
              aria-disabled={networkedDisabled}
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-fuchsia-500/20">
                <svg
                  className="h-5 w-5 text-fuchsia-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
              <h3 className="text-text-theme-primary mb-1 font-medium">
                Networked 1v1
              </h3>
              <p className="text-text-theme-muted text-sm">
                {networked1v1DisabledReason ??
                  'Open a peer-to-peer lobby and battle a friend over the network.'}
              </p>
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================================
// add-skirmish-setup-ui § 1-8: Skirmish Launcher (Unit + Pilot pickers,
// deployment preview, validated "Launch Skirmish" button).
// =============================================================================
