/**
 * Storybook stories for `MatchBrowser`.
 *
 * Per `add-matchmaking-and-spectator` task 3.5: covers the populated,
 * empty, and refreshing states of the match browser. Each story injects
 * a `fetchImpl` stub so the surface renders without a live server.
 *
 * @spec openspec/changes/add-matchmaking-and-spectator/specs/multiplayer-matchmaking/spec.md
 */

import type { Meta, StoryObj } from '@storybook/react';

import type { IJoinableLobby } from '@/lib/multiplayer/server/joinableLobbies';

import { MatchBrowser } from './MatchBrowser';

// =============================================================================
// Fixtures
// =============================================================================

const SAMPLE_LOBBIES: readonly IJoinableLobby[] = [
  {
    matchId: 'm-1',
    roomCode: 'ALPHA1',
    layout: '1v1',
    hostDisplayName: 'Natasha Kerensky',
    occupancy: {
      humanSeats: 2,
      occupiedHumanSeats: 1,
      openHumanSeats: 1,
      aiSeats: 0,
      spectatorSeats: 0,
    },
    fogOfWar: true,
    createdAt: '2026-05-19T12:00:00.000Z',
  },
  {
    matchId: 'm-2',
    roomCode: 'BRAVO2',
    layout: '2v2',
    hostDisplayName: 'Morgan Kell',
    occupancy: {
      humanSeats: 4,
      occupiedHumanSeats: 2,
      openHumanSeats: 2,
      aiSeats: 1,
      spectatorSeats: 3,
    },
    fogOfWar: false,
    createdAt: '2026-05-19T11:30:00.000Z',
  },
  {
    matchId: 'm-3',
    roomCode: 'FFA004',
    layout: 'ffa-4',
    hostDisplayName: 'Yorinaga Kurita',
    occupancy: {
      humanSeats: 4,
      occupiedHumanSeats: 3,
      openHumanSeats: 1,
      aiSeats: 0,
      spectatorSeats: 0,
    },
    fogOfWar: false,
    createdAt: '2026-05-19T11:00:00.000Z',
  },
];

/** Build a `fetchImpl` stub returning a fixed lobby list. */
function fetchReturning(lobbies: readonly IJoinableLobby[]): typeof fetch {
  return async () =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: async () => Promise.resolve({ lobbies }),
    } as Response);
}

/** A `fetchImpl` stub that never resolves — pins the refreshing state. */
const NEVER_RESOLVING_FETCH: typeof fetch = () =>
  new Promise<Response>(() => {
    /* intentionally never resolves */
  });

// =============================================================================
// Meta
// =============================================================================

const meta: Meta<typeof MatchBrowser> = {
  title: 'Multiplayer/MatchBrowser',
  component: MatchBrowser,
  parameters: { layout: 'padded' },
};

export default meta;

type Story = StoryObj<typeof MatchBrowser>;

// =============================================================================
// Stories
// =============================================================================

/** Populated — three joinable lobbies of mixed layout and occupancy. */
export const Populated: Story = {
  args: {
    wireToken: 'demo-token',
    onJoinLobby: () => {
      /* navigation is a no-op in Storybook */
    },
    fetchImpl: fetchReturning(SAMPLE_LOBBIES),
    refreshMs: 0,
  },
};

/** Empty — the joinable-lobby query returned no open lobbies. */
export const Empty: Story = {
  args: {
    wireToken: 'demo-token',
    onJoinLobby: () => {
      /* no-op */
    },
    fetchImpl: fetchReturning([]),
    refreshMs: 0,
  },
};

/** Refreshing — the fetch is in flight; the refresh control is busy. */
export const Refreshing: Story = {
  args: {
    wireToken: 'demo-token',
    onJoinLobby: () => {
      /* no-op */
    },
    fetchImpl: NEVER_RESOLVING_FETCH,
    refreshMs: 0,
  },
};

/** Locked — no vault token, so the browser shows the unlock prompt. */
export const Locked: Story = {
  args: {
    wireToken: null,
    onJoinLobby: () => {
      /* no-op */
    },
  },
};
