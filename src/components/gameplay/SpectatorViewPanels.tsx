import Link from 'next/link';
import React from 'react';

import type { InteractiveSession } from '@/engine/GameEngine';

import { Button } from '@/components/ui';
import {
  GamePhase,
  GameSide,
  IGameSession,
  IUnitGameState,
  IUnitToken,
} from '@/types/gameplay';

// =============================================================================
// Helpers
// =============================================================================

export function unitStateToToken(
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

export function speedToInterval(speed: 1 | 2 | 4): number {
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

export function PlaybackControls({
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
      <div className="mr-2 border-r border-gray-600 pr-4">
        <div className="text-xs font-medium tracking-wider text-gray-500 uppercase">
          Turn {turn}
        </div>
        <div className="text-sm font-semibold text-cyan-400 capitalize">
          {phase.replace('_', ' ')}
        </div>
      </div>

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

export function UnitRoster({
  session,
}: {
  session: IGameSession;
}): React.ReactElement {
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

export function ResultsOverlay({
  interactiveSession,
  sessionId,
}: {
  interactiveSession: InteractiveSession;
  sessionId: string;
}): React.ReactElement {
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
