/**
 * The private-reason input on the host GM correction controls
 * (roadmap U5b, E2E-25's client half).
 *
 * Two relationships, both of which a component that "looks right" can get
 * wrong: the input reports what the GM typed to the producer that will
 * carry it, and the whole block - input included - stays behind the same
 * `host-gm && !spectator` gate the correction buttons already sit behind,
 * so a spectator holding the host's id never sees a GM-private field.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/e2e-testing/spec.md
 */

import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import type { INetworkedGameSurfaceProps } from '../NetworkedGameSurface';

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
    { id: 'match-correction-fixture', createdAt: '2026-09-17T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session);
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
];

function renderSurface(overrides: Partial<INetworkedGameSurfaceProps> = {}) {
  const authoritative = buildSession();
  return render(
    <NetworkedGameSurface
      mirrorSession={buildMirrorSession(authoritative.events)}
      mirrorEvents={authoritative.events}
      seats={SEATS}
      playerId="pid_host"
      hostPlayerId="pid_host"
      status="ready"
      pausedInfo={null}
      closedInfo={null}
      intentError={null}
      onClearIntentError={jest.fn()}
      onSendGameIntent={jest.fn(() => true)}
      {...overrides}
    />,
  );
}

const WIRED = {
  onPreviewHostGmCorrection: jest.fn(),
  onApproveHostGmCorrection: jest.fn(),
};

describe('NetworkedGameSurface - the private-reason input', () => {
  it('reports every keystroke to the producer that will carry it', async () => {
    const onPrivateReasonChange = jest.fn();
    renderSurface({ ...WIRED, onPrivateReasonChange });

    await userEvent.type(
      screen.getByTestId('networked-gm-private-reason'),
      'GM only',
    );

    expect(onPrivateReasonChange).toHaveBeenCalled();
    expect(
      onPrivateReasonChange.mock.calls[
        onPrivateReasonChange.mock.calls.length - 1
      ]?.[0],
    ).toBe('GM only');
  });

  it('carries an accessible name naming who may read it', () => {
    renderSurface({ ...WIRED, onPrivateReasonChange: jest.fn() });

    expect(screen.getByLabelText('Private reason (GM only)')).toBe(
      screen.getByTestId('networked-gm-private-reason'),
    );
  });

  it('is absent when no caller offered to carry a reason', () => {
    renderSurface(WIRED);

    expect(
      screen.getByTestId('networked-host-gm-controls'),
    ).toBeInTheDocument();
    expect(
      screen.queryByTestId('networked-gm-private-reason'),
    ).not.toBeInTheDocument();
  });

  it('is absent for a player at the table', () => {
    renderSurface({
      ...WIRED,
      onPrivateReasonChange: jest.fn(),
      playerId: 'pid_guest',
    });

    expect(
      screen.queryByTestId('networked-gm-private-reason'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('networked-host-gm-controls'),
    ).not.toBeInTheDocument();
  });

  it('is absent for a spectator holding the host id', () => {
    renderSurface({
      ...WIRED,
      onPrivateReasonChange: jest.fn(),
      spectator: true,
    });

    expect(
      screen.queryByTestId('networked-gm-private-reason'),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('networked-host-gm-controls'),
    ).not.toBeInTheDocument();
  });
});
