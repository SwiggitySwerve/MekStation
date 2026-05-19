/**
 * Storybook stories for `NetworkedGameSurface`.
 *
 * Per `complete-multiplayer-game-surface` task 3.4: covers the loading,
 * active-play, opponent-turn, paused, and closed states. Each story
 * builds a real authoritative event log through the engine reducer so
 * the rendered board is representative of a live networked match.
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import type { IGameSession } from '@/types/gameplay/GameSessionInterfaces';
import type { IMatchSeat } from '@/types/multiplayer/Lobby';

import { buildMirrorSession } from '@/lib/multiplayer/mirrorMatchSession';
import { GameSide } from '@/types/gameplay/GameSessionInterfaces';
import {
  advancePhase,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSessionCore';

import { NetworkedGameSurface } from './NetworkedGameSurface';

// =============================================================================
// Fixture — a real authoritative session.
// =============================================================================

function buildSession(): IGameSession {
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
    { id: 'story-match', createdAt: '2026-05-19T00:00:00.000Z' },
  );
  session = startGame(session, GameSide.Player);
  session = rollInitiative(session, GameSide.Player);
  session = advancePhase(session); // → Movement
  return session;
}

const AUTHORITATIVE = buildSession();
const MIRROR = buildMirrorSession(AUTHORITATIVE.events);

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

const noop = (): void => undefined;
const sendIntent = (): boolean => true;

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<typeof NetworkedGameSurface> = {
  title: 'Multiplayer/NetworkedGameSurface',
  component: NetworkedGameSurface,
  parameters: { layout: 'padded' },
  decorators: [
    (Story) => (
      <div className="min-h-[640px] w-full bg-slate-950 p-4">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof NetworkedGameSurface>;

// =============================================================================
// Stories
// =============================================================================

/**
 * Loading — the mirror has not been built yet (join replay still
 * draining). Task 3.3.
 */
export const Loading: Story = {
  args: {
    mirrorSession: null,
    mirrorEvents: [],
    seats: SEATS,
    playerId: 'pid_host',
    status: 'connecting',
    pausedInfo: null,
    closedInfo: null,
    intentError: null,
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};

/**
 * Active play — the local player (Alpha → Player) is the active side;
 * intent controls are enabled.
 */
export const ActivePlay: Story = {
  args: {
    mirrorSession: MIRROR,
    mirrorEvents: AUTHORITATIVE.events,
    seats: SEATS,
    playerId: 'pid_host',
    status: 'ready',
    pausedInfo: null,
    closedInfo: null,
    intentError: null,
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};

/**
 * Opponent turn — the local player (Bravo → Opponent) is NOT the
 * active side; the passive "waiting for opponent" indicator shows.
 */
export const OpponentTurn: Story = {
  args: {
    mirrorSession: MIRROR,
    mirrorEvents: AUTHORITATIVE.events,
    seats: SEATS,
    playerId: 'pid_guest',
    status: 'ready',
    pausedInfo: null,
    closedInfo: null,
    intentError: null,
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};

/**
 * Paused — a `MatchPaused` overlay blocks input while an opponent
 * reconnects (D6).
 */
export const Paused: Story = {
  args: {
    mirrorSession: MIRROR,
    mirrorEvents: AUTHORITATIVE.events,
    seats: SEATS,
    playerId: 'pid_host',
    status: 'paused',
    pausedInfo: {
      pendingSlots: ['bravo-1'],
      graceRemainingMs: 45_000,
      pendingExpiresAtMs: null,
    },
    closedInfo: null,
    intentError: null,
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};

/**
 * Rejected intent — a non-fatal server `Error` toast over an otherwise
 * playable surface (D3).
 */
export const RejectedIntent: Story = {
  args: {
    mirrorSession: MIRROR,
    mirrorEvents: AUTHORITATIVE.events,
    seats: SEATS,
    playerId: 'pid_host',
    status: 'ready',
    pausedInfo: null,
    closedInfo: null,
    intentError: { code: 'INVALID_INTENT', reason: 'Not your turn' },
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};

/**
 * Closed — the terminal panel routing back to the multiplayer hub
 * after the server sends `Close` (D6).
 */
export const Closed: Story = {
  args: {
    mirrorSession: MIRROR,
    mirrorEvents: AUTHORITATIVE.events,
    seats: SEATS,
    playerId: 'pid_host',
    status: 'closed',
    pausedInfo: null,
    closedInfo: { reason: 'Match closed' },
    intentError: null,
    onClearIntentError: noop,
    onSendGameIntent: sendIntent,
  },
};
