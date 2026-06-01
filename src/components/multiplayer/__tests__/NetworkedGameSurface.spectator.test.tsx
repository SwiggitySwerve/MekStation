/**
 * NetworkedGameSurface spectator-mode tests — M3 (task 7).
 *
 * Covers design D5: the spectator surface renders the read-only mirror
 * session and exposes NO movement, attack, phase, or concede controls,
 * plus a visible spectator indicator (task 7.2).
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import { NetworkedGameSurface } from '../NetworkedGameSurface';

function buildSession() {
  let session = createGameSession(
    {
      mapRadius: 6,
      turnLimit: 0,
      victoryConditions: ['elimination'],
      optionalRules: [],
    },
    [
      {
        id: 'player-1',
        name: 'Atlas',
        side: GameSide.Player,
        unitRef: 'atlas-as7-d',
        pilotRef: 'pilot-1',
        gunnery: 4,
        piloting: 5,
      },
      {
        id: 'opponent-1',
        name: 'Marauder',
        side: GameSide.Opponent,
        unitRef: 'marauder-mad-3r',
        pilotRef: 'pilot-2',
        gunnery: 4,
        piloting: 5,
      },
    ],
    { id: 'match-spectator-fixture', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session); // → Movement
  return session;
}

const SEATS: readonly IMatchSeat[] = [
  {
    slotId: 'alpha-1',
    side: 'Alpha',
    seatNumber: 1,
    occupant: { playerId: 'pid_host', displayName: 'Host' },
    kind: 'human',
    ready: true,
  },
  {
    slotId: 'bravo-1',
    side: 'Bravo',
    seatNumber: 1,
    occupant: { playerId: 'pid_guest', displayName: 'Guest' },
    kind: 'human',
    ready: true,
  },
  {
    slotId: 'spectator-1',
    side: 'spectator',
    seatNumber: 1,
    occupant: { playerId: 'pid_watcher', displayName: 'Watcher' },
    kind: 'spectator',
    ready: true,
  },
];

function renderSpectator() {
  const authoritative = buildSession();
  render(
    <NetworkedGameSurface
      mirrorSession={buildMirrorSession(authoritative.events)}
      mirrorEvents={authoritative.events}
      seats={SEATS}
      playerId="pid_watcher"
      status="ready"
      pausedInfo={null}
      closedInfo={null}
      intentError={null}
      onClearIntentError={jest.fn()}
      onSendGameIntent={jest.fn(() => true)}
      spectator
    />,
  );
}

describe('NetworkedGameSurface — spectator mode', () => {
  it('renders the mirror session board', () => {
    renderSpectator();
    expect(screen.getByTestId('networked-game-surface')).toBeInTheDocument();
  });

  it('shows the spectator indicator', () => {
    renderSpectator();
    expect(screen.getByTestId('spectator-indicator')).toBeInTheDocument();
  });

  it('mounts no action bar', () => {
    renderSpectator();
    expect(
      screen.queryByTestId('networked-action-bar'),
    ).not.toBeInTheDocument();
  });

  it('exposes no movement, attack, phase, or concede controls', () => {
    renderSpectator();
    expect(
      screen.queryByTestId('declare-movement-button'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('declare-attack-button'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('declare-physical-button'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('advance-phase-button'),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('eject-button')).not.toBeInTheDocument();
    expect(screen.queryByTestId('concede-button')).not.toBeInTheDocument();
  });
});
