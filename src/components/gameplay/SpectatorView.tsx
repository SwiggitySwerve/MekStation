/**
 * Spectator View Component
 * AI-vs-AI battle viewer with playback controls.
 * Both sides are controlled by BotPlayer; the user watches with play/pause/speed/step controls.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useGameplayStore } from '@/stores/useGameplayStore';
import { GamePhase, GameSide } from '@/types/gameplay';

import { HexMapDisplay } from './HexMapDisplay';
import {
  unitStateToToken,
  speedToInterval,
  PlaybackControls,
  UnitRoster,
  ResultsOverlay,
} from './SpectatorViewPanels';

export function SpectatorView(): React.ReactElement {
  const { session, interactiveSession, spectatorMode } = useGameplayStore();

  const [playing, setPlaying] = useState(spectatorMode?.playing ?? true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(spectatorMode?.speed ?? 1);
  const [gameOver, setGameOver] = useState(false);
  const tickRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runOneFullTurn = useCallback(() => {
    if (!interactiveSession) return false;

    if (interactiveSession.isGameOver()) {
      setGameOver(true);
      return false;
    }

    const state = interactiveSession.getState();
    const { phase } = state;

    if (phase === GamePhase.Initiative) {
      interactiveSession.advancePhase();
    }

    const stateAfterInit = interactiveSession.getState();
    if (stateAfterInit.phase === GamePhase.Movement) {
      interactiveSession.runAITurn(GameSide.Player);
      interactiveSession.runAITurn(GameSide.Opponent);
      interactiveSession.advancePhase();
    }

    if (interactiveSession.getState().phase === GamePhase.WeaponAttack) {
      interactiveSession.runAITurn(GameSide.Player);
      interactiveSession.runAITurn(GameSide.Opponent);
      interactiveSession.advancePhase();
    }

    if (interactiveSession.getState().phase === GamePhase.Heat) {
      interactiveSession.advancePhase();
    }

    if (interactiveSession.getState().phase === GamePhase.End) {
      interactiveSession.advancePhase();
    }

    if (interactiveSession.isGameOver()) {
      setGameOver(true);
      return false;
    }

    useGameplayStore.setState({
      session: interactiveSession.getSession(),
    });

    return true;
  }, [interactiveSession]);

  // Auto-advance timer
  useEffect(() => {
    if (!playing || gameOver || !interactiveSession) {
      if (tickRef.current) clearTimeout(tickRef.current);
      return;
    }

    const tick = () => {
      const continuePlay = runOneFullTurn();
      if (continuePlay) {
        tickRef.current = setTimeout(tick, speedToInterval(speed));
      } else {
        setPlaying(false);
      }
    };

    tickRef.current = setTimeout(tick, speedToInterval(speed));

    return () => {
      if (tickRef.current) clearTimeout(tickRef.current);
    };
  }, [playing, speed, gameOver, interactiveSession, runOneFullTurn]);

  const handleTogglePlay = useCallback(() => {
    setPlaying((prev) => !prev);
  }, []);

  const handleStepForward = useCallback(() => {
    runOneFullTurn();
  }, [runOneFullTurn]);

  const handleSetSpeed = useCallback((s: 1 | 2 | 4) => {
    setSpeed(s);
  }, []);

  // Build tokens from session
  const unitInfoLookup = useMemo(() => {
    if (!session) return {};
    const lookup: Record<string, { name: string; side: GameSide }> = {};
    for (const unit of session.units) {
      lookup[unit.id] = { name: unit.name, side: unit.side };
    }
    return lookup;
  }, [session]);

  const tokens = useMemo(() => {
    if (!session) return [];
    return Object.entries(session.currentState.units).map(([unitId, state]) => {
      const unitInfo = unitInfoLookup[unitId] || {
        name: 'Unknown',
        side: GameSide.Player,
      };
      return unitStateToToken(unitId, state, unitInfo);
    });
  }, [session, unitInfoLookup]);

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

      <div
        className="relative flex h-screen flex-col bg-gray-900"
        data-testid="spectator-view"
      >
        {/* Header bar */}
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

        {/* Main content: map + sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Map area */}
          <div className="relative flex-1" data-testid="spectator-map">
            <HexMapDisplay
              radius={session.config.mapRadius}
              tokens={tokens}
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

          {/* Side panel */}
          <div className="w-60 overflow-y-auto border-l border-gray-700 bg-gray-800/50">
            <UnitRoster session={session} />
          </div>
        </div>
      </div>
    </>
  );
}
