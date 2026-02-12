/**
 * Spectator View Component
 * AI-vs-AI battle viewer with playback controls.
 * Both sides are controlled by BotPlayer; the user watches with play/pause/speed/step controls.
 */

import Head from 'next/head';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';

import { Button } from '@/components/ui';
import { useGameplayStore } from '@/stores/useGameplayStore';
import {
  GamePhase,
  GameSide,
  IGameSession,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

import { HexMapDisplay } from './HexMapDisplay';

// =============================================================================
// Helpers
// =============================================================================

function unitStateToToken(
  unitId: string,
  state: IUnitGameState,
  unitInfo: { name: string; side: GameSide },
): IUnitToken {
  const designation = unitInfo.name
    .split(/[\s-]+/)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);

  return {
    unitId,
    name: unitInfo.name,
    side: unitInfo.side,
    position: state.position,
    facing: state.facing,
    isSelected: false,
    isValidTarget: false,
    isDestroyed: state.destroyed,
    designation,
  };
}

function speedToInterval(speed: 1 | 2 | 4): number {
  return 1200 / speed;
}

// =============================================================================
// Playback Controls
// =============================================================================

interface PlaybackControlsProps {
  playing: boolean;
  speed: 1 | 2 | 4;
  turn: number;
  phase: GamePhase;
  gameOver: boolean;
  onTogglePlay: () => void;
  onSetSpeed: (speed: 1 | 2 | 4) => void;
  onStepForward: () => void;
}

function PlaybackControls({
  playing,
  speed,
  turn,
  phase,
  gameOver,
  onTogglePlay,
  onSetSpeed,
  onStepForward,
}: PlaybackControlsProps): React.ReactElement {
  const speeds: (1 | 2 | 4)[] = [1, 2, 4];

  return (
    <div
      className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-800/90 px-5 py-3 shadow-lg backdrop-blur-sm"
      data-testid="spectator-controls"
    >
      {/* Turn / Phase indicator */}
      <div className="mr-2 border-r border-gray-600 pr-4">
        <div className="text-xs font-medium tracking-wider text-gray-500 uppercase">
          Turn {turn}
        </div>
        <div className="text-sm font-semibold text-cyan-400 capitalize">
          {phase.replace('_', ' ')}
        </div>
      </div>

      {/* Play / Pause */}
      <button
        onClick={onTogglePlay}
        disabled={gameOver}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-cyan-600 text-white transition-colors hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="spectator-play-pause"
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing ? (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Step Forward */}
      <button
        onClick={onStepForward}
        disabled={playing || gameOver}
        className="flex h-8 w-8 items-center justify-center rounded-md border border-gray-600 text-gray-300 transition-colors hover:border-gray-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        data-testid="spectator-step"
        aria-label="Step Forward"
      >
        <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M5 4v16l10-8zM17 4h2v16h-2z" />
        </svg>
      </button>

      {/* Speed selector */}
      <div className="flex items-center gap-1 rounded-md border border-gray-600 p-0.5">
        {speeds.map((s) => (
          <button
            key={s}
            onClick={() => onSetSpeed(s)}
            className={`rounded px-2.5 py-1 text-xs font-bold transition-colors ${
              speed === s
                ? 'bg-cyan-600 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
            data-testid={`spectator-speed-${s}`}
          >
            {s}×
          </button>
        ))}
      </div>

      {gameOver && (
        <span className="ml-2 text-sm font-semibold text-amber-400">
          Battle Complete
        </span>
      )}
    </div>
  );
}

// =============================================================================
// Unit Roster Panel
// =============================================================================

interface UnitRosterProps {
  session: IGameSession;
}

function UnitRoster({ session }: UnitRosterProps): React.ReactElement {
  const { units, currentState } = session;

  const playerUnits = units.filter((u) => u.side === GameSide.Player);
  const opponentUnits = units.filter((u) => u.side === GameSide.Opponent);

  const getStatus = (unitId: string) => {
    const state = currentState.units[unitId];
    if (!state) return 'unknown';
    if (state.destroyed) return 'destroyed';
    return 'active';
  };

  return (
    <div className="flex flex-col gap-3 p-3" data-testid="spectator-roster">
      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wider text-cyan-400 uppercase">
          Player Force
        </h3>
        <div className="space-y-1">
          {playerUnits.map((u) => {
            const status = getStatus(u.id);
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                  status === 'destroyed'
                    ? 'bg-red-900/30 text-gray-500 line-through'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                <span>{u.name}</span>
                <span className="text-gray-500">
                  {u.gunnery}/{u.piloting}
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-xs font-bold tracking-wider text-red-400 uppercase">
          Opponent Force
        </h3>
        <div className="space-y-1">
          {opponentUnits.map((u) => {
            const status = getStatus(u.id);
            return (
              <div
                key={u.id}
                className={`flex items-center justify-between rounded px-2 py-1.5 text-xs ${
                  status === 'destroyed'
                    ? 'bg-red-900/30 text-gray-500 line-through'
                    : 'bg-gray-800 text-gray-200'
                }`}
              >
                <span>{u.name}</span>
                <span className="text-gray-500">
                  {u.gunnery}/{u.piloting}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Results Overlay
// =============================================================================

interface ResultsOverlayProps {
  interactiveSession: InteractiveSession;
  sessionId: string;
}

function ResultsOverlay({
  interactiveSession,
  sessionId,
}: ResultsOverlayProps): React.ReactElement {
  const result = interactiveSession.getResult();
  const rawWinner = result?.winner ?? 'draw';

  const winnerText =
    rawWinner === 'draw'
      ? 'Draw'
      : rawWinner === 'player'
        ? 'Player Victory'
        : 'Opponent Victory';

  const winnerColor =
    rawWinner === 'draw'
      ? 'text-amber-400'
      : rawWinner === 'player'
        ? 'text-emerald-400'
        : 'text-red-400';

  return (
    <div
      className="absolute inset-0 z-20 flex items-center justify-center bg-gray-900/80 backdrop-blur-sm"
      data-testid="spectator-results"
    >
      <div className="max-w-md rounded-xl border border-gray-700 bg-gray-800 p-8 text-center shadow-2xl">
        <div className={`mb-3 text-4xl font-black ${winnerColor}`}>
          {winnerText}
        </div>
        <p className="mb-6 text-gray-400 capitalize">
          {(result?.reason ?? 'unknown').replace(/_/g, ' ')}
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link href={`/gameplay/games/${sessionId}/replay`}>
            <Button variant="primary" data-testid="spectator-replay-btn">
              Watch Replay
            </Button>
          </Link>
          <Link href="/gameplay/games">
            <Button variant="secondary" data-testid="spectator-back-btn">
              Back to Games
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Main SpectatorView
// =============================================================================

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
