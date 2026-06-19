/**
 * Spectator View Component
 * AI-vs-AI battle viewer with playback controls.
 * Both sides are controlled by BotPlayer; the user watches with play/pause/speed/step controls.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useMemo } from 'react';

import { useGameplaySelector } from '@/stores/useGameplayStore';

import { HexMapDisplay } from './HexMapDisplay';
import {
  buildSpectatorTokens,
  buildUnitInfoLookup,
  terrainForInteractiveSession,
} from './SpectatorView.logic';
import {
  PlaybackControls,
  UnitRoster,
  ResultsOverlay,
} from './SpectatorViewPanels';
import { ShellSlot, TacticalCommandShell } from './TacticalCommandShell';
import { useSpectatorPlayback } from './useSpectatorPlayback';

export function SpectatorView(): React.ReactElement {
  // Per-field selectors (useGameplaySelector POC): each subscription
  // re-renders only when its own field reference changes, instead of
  // on every gameplay-store mutation. `useGameplayStore.setState`
  // remains the static-method imperative escape hatch for the
  // spectator's manual session-sync below.
  const session = useGameplaySelector((s) => s.session);
  const interactiveSession = useGameplaySelector((s) => s.interactiveSession);
  const spectatorMode = useGameplaySelector((s) => s.spectatorMode);

  const {
    playing,
    speed,
    gameOver,
    handleTogglePlay,
    handleStepForward,
    handleSetSpeed,
  } = useSpectatorPlayback({
    interactiveSession,
    initialPlaying: spectatorMode?.playing ?? true,
    initialSpeed: spectatorMode?.speed ?? 1,
  });

  // Build tokens from session
  const unitInfoLookup = useMemo(() => {
    return buildUnitInfoLookup(session);
  }, [session]);

  const tokens = useMemo(() => {
    return buildSpectatorTokens(session, unitInfoLookup);
  }, [session, unitInfoLookup]);

  const hexTerrain = useMemo(() => {
    return terrainForInteractiveSession(interactiveSession);
  }, [interactiveSession]);

  if (!session || !interactiveSession) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-900">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-cyan-500 border-t-transparent" />
          <p className="text-gray-400">Preparing spectator mode...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Spectator Mode - MekStation</title>
      </Head>

      {/* Wave 7.1 PR-C: Spectator mode renders through the same shell
          contract as combat/replay/gm, just with a `shellMode='spectator'`
          flag that filters mode-restricted slot owners (per spec
          `Shell Mode Ownership`). Note that no action-dock slot owner
          is registered here — spectator gets no private commands by
          construction, satisfying tasks.md §3.2. PlaybackControls
          remain because they are public (observer-controlled) not
          private (combat-actor-controlled). */}
      <TacticalCommandShell
        viewerPlayerId={session.id}
        shellMode="spectator"
        sessionId={session.id}
      >
        <div
          className="relative flex h-screen flex-col bg-gray-900"
          data-testid="spectator-view"
        >
          {/* Header bar — top-band slot. */}
          <ShellSlot id="top-band" ownerId="SpectatorHeader">
            <div className="flex items-center justify-between border-b border-gray-700 bg-gray-800/90 px-4 py-2 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Link
                  href="/gameplay/games"
                  className="text-gray-400 transition-colors hover:text-white"
                  aria-label="Back to games"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10 19l-7-7m0 0l7-7m-7 7h18"
                    />
                  </svg>
                </Link>
                <div>
                  <h1 className="text-sm font-semibold text-white">
                    AI vs AI — Spectator Mode
                  </h1>
                </div>
              </div>

              <PlaybackControls
                playing={playing}
                speed={speed}
                turn={session.currentState.turn}
                phase={session.currentState.phase}
                gameOver={gameOver}
                onTogglePlay={handleTogglePlay}
                onSetSpeed={handleSetSpeed}
                onStepForward={handleStepForward}
              />

              <div className="w-32" />
            </div>
          </ShellSlot>

          {/* Main content: map + sidebar */}
          <div className="flex flex-1 overflow-hidden">
            {/* Map area — map-center slot. */}
            <ShellSlot id="map-center" ownerId="SpectatorHexMap">
              <div className="relative flex-1" data-testid="spectator-map">
                <HexMapDisplay
                  radius={session.config.mapRadius}
                  tokens={tokens}
                  hexTerrain={hexTerrain}
                  selectedHex={null}
                  showCoordinates={false}
                />

                {/* Results overlay */}
                {gameOver && (
                  <ResultsOverlay
                    interactiveSession={interactiveSession}
                    sessionId={session.id}
                  />
                )}
              </div>
            </ShellSlot>

            {/* Side panel — right-tray slot. */}
            <ShellSlot id="right-tray" ownerId="SpectatorUnitRoster">
              <div className="w-60 overflow-y-auto border-l border-gray-700 bg-gray-800/50">
                <UnitRoster session={session} />
              </div>
            </ShellSlot>
          </div>
        </div>
      </TacticalCommandShell>
    </>
  );
}
