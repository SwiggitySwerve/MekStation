/**
 * Guarded close (S1b): tearing down the game page without a terminal
 * outcome must never complete the linked encounter. Completion rides the
 * replay-library persist, so the guard is "no persist before Completed".
 * The completed control proves the mocked persist is the one the hook uses.
 */

import type { NextRouter } from 'next/router';

import { act, renderHook } from '@testing-library/react';

import type { IGameSession } from '@/types/gameplay';

import { GameStatus } from '@/types/gameplay';

const mockPersistEncounter = jest.fn(async () => ({ ok: true }));

jest.mock('@/components/encounter/persistEncounterFromSession', () => ({
  persistEncounterFromSession: mockPersistEncounter,
}));
jest.mock('@/lib/combat/combatResolution', () => ({
  finalize: jest.fn(async () => {}),
}));
jest.mock('@/hooks/useP2PReconnectSession', () => ({
  deriveReconnectRoomCode: () => null,
  useP2PReconnectSession: () => {},
}));
jest.mock('@/hooks/useP2PPeerPresence', () => ({
  useP2PPeerPresence: () => {},
}));

import { useGameSessionLifecycle } from '@/components/gameplay/pages/gameSession/GameSessionPage.lifecycle';

const router = {
  replace: jest.fn(async () => true),
  push: jest.fn(),
  query: {},
  asPath: '/gameplay/games/game-1',
} as unknown as NextRouter;

function encounterSession(status: GameStatus): IGameSession {
  return {
    id: 'game-1',
    config: { encounterId: 'encounter-1' },
    events: [],
    currentState: { status },
  } as unknown as IGameSession;
}

async function mountThenClose(status: GameStatus): Promise<void> {
  const { unmount } = renderHook(() =>
    useGameSessionLifecycle({
      router,
      routeId: 'game-1',
      matchId: null,
      session: encounterSession(status),
      interactiveSession: null,
      isSpectatorMode: false,
      isCompletedForRedirect: status === GameStatus.Completed,
      isCampaignBound: false,
      loadSession: jest.fn(async () => {}),
      createDemoSession: jest.fn(),
    }),
  );
  unmount();
  // The persist is a dynamic import; let it settle before asserting.
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('game-session lifecycle guarded close', () => {
  beforeEach(() => mockPersistEncounter.mockClear());

  it.each([GameStatus.Setup, GameStatus.Active, GameStatus.Abandoned])(
    'unmounting a %s encounter session never submits completion',
    async (status) => {
      await mountThenClose(status);
      expect(mockPersistEncounter).not.toHaveBeenCalled();
    },
  );

  it('a Completed encounter session submits its terminal history once', async () => {
    await mountThenClose(GameStatus.Completed);
    expect(mockPersistEncounter).toHaveBeenCalledTimes(1);
  });
});
