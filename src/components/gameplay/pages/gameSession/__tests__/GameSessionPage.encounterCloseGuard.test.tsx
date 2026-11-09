/**
 * Guarded close (S1b): tearing down the game page without a terminal
 * outcome must never complete the linked encounter. Completion rides the
 * replay-library persist, so the guard is "no persist before Completed".
 * The completed control proves the mocked persist is the one the hook uses.
 */

import type { NextRouter } from 'next/router';

import { act, renderHook, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';

import type { IGameSession } from '@/types/gameplay';

import { GameStatus } from '@/types/gameplay';

const mockPersistEncounter = jest.fn(async () => ({ ok: true }));
const mockFinalize = jest.fn<Promise<void>, [IGameSession]>(async () => {});
const mockPersistenceToast = jest.fn();

jest.mock('@/components/shared/Toast', () => ({
  toastHelpers: { error: (message: string) => mockPersistenceToast(message) },
}));

jest.mock('@/components/encounter/persistEncounterFromSession', () => ({
  persistEncounterFromSession: mockPersistEncounter,
}));
jest.mock('@/lib/combat/combatResolution', () => ({
  finalize: (session: IGameSession) => mockFinalize(session),
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

function mountCompletedSession(initialId = 'game-A', strict = false) {
  const loadSession = jest.fn(async () => {});
  const createDemoSession = jest.fn();
  const mounted = renderHook(
    ({ id, revision }: { id: string; revision: number }) =>
      useGameSessionLifecycle({
        router,
        routeId: id,
        matchId: null,
        session: {
          ...encounterSession(GameStatus.Completed),
          id,
          updatedAt: String(revision),
        },
        interactiveSession: null,
        isSpectatorMode: false,
        isCompletedForRedirect: true,
        isCampaignBound: false,
        loadSession,
        createDemoSession,
      }),
    {
      initialProps: { id: initialId, revision: 0 },
      wrapper: strict ? StrictMode : undefined,
    },
  );
  return {
    ...mounted,
    switchTo: (id: string, revision = 0) => mounted.rerender({ id, revision }),
  };
}

describe('session-scoped completion persistence', () => {
  beforeEach(() => {
    mockFinalize.mockReset().mockResolvedValue(undefined);
    mockPersistEncounter.mockReset().mockResolvedValue({ ok: true });
    mockPersistenceToast.mockReset();
    router.replace = jest.fn(async () => true);
  });

  it('persists A and B independently and does not resubmit A when revisited', async () => {
    const h = mountCompletedSession();
    await waitFor(() => expect(mockFinalize).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mockPersistEncounter).toHaveBeenCalledTimes(1));
    h.switchTo('game-B');
    await waitFor(() => expect(mockFinalize).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(mockPersistEncounter).toHaveBeenCalledTimes(2));
    h.switchTo('game-A', 1);
    await act(async () => {});
    expect(mockFinalize.mock.calls.map(([session]) => session.id)).toEqual([
      'game-A',
      'game-B',
    ]);
    expect(mockPersistEncounter.mock.calls).toHaveLength(2);
  });

  it('does not duplicate a pending save across rerenders or StrictMode effect replay', async () => {
    let finish!: () => void;
    mockFinalize.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    const h = mountCompletedSession('game-A', true);
    await waitFor(() => expect(mockFinalize).toHaveBeenCalledTimes(1));
    h.switchTo('game-A', 1);
    await act(async () => {});
    expect(mockFinalize).toHaveBeenCalledTimes(1);
    expect(mockPersistEncounter).toHaveBeenCalledTimes(1);
    await act(async () => finish());
  });

  it('keeps a late A result from suppressing B while B is still pending', async () => {
    const finishes = new Map<string, () => void>();
    mockFinalize.mockImplementation(
      (session) =>
        new Promise<void>((resolve) => {
          finishes.set(session.id, resolve);
        }),
    );
    const h = mountCompletedSession();
    await waitFor(() => expect(finishes.has('game-A')).toBe(true));
    h.switchTo('game-B');
    await waitFor(() => expect(finishes.has('game-B')).toBe(true));
    await act(async () => finishes.get('game-A')?.());
    h.switchTo('game-B', 1);
    await act(async () => {});
    expect(mockFinalize).toHaveBeenCalledTimes(2);
    await act(async () => finishes.get('game-B')?.());
    h.switchTo('game-A', 1);
    await act(async () => {});
    expect(mockFinalize).toHaveBeenCalledTimes(2);
  });

  it('reports a failed match-log save without blocking victory or automatically retrying', async () => {
    mockFinalize.mockRejectedValueOnce(new Error('Match storage offline'));
    const h = mountCompletedSession();
    await waitFor(() =>
      expect(mockPersistenceToast).toHaveBeenCalledWith(
        expect.stringContaining('match log'),
      ),
    );
    expect(router.replace).toHaveBeenCalledWith(
      '/gameplay/games/game-A/victory',
    );
    h.switchTo('game-A', 1);
    await act(async () => {});
    expect(mockFinalize).toHaveBeenCalledTimes(1);
    expect(mockPersistenceToast).toHaveBeenCalledTimes(1);
    h.switchTo('game-B');
    await waitFor(() => expect(mockFinalize).toHaveBeenCalledTimes(2));
  });

  it('reports a save failure even after the game page navigates away', async () => {
    let fail!: (reason: Error) => void;
    mockFinalize.mockImplementationOnce(
      () =>
        new Promise<void>((_resolve, reject) => {
          fail = reject;
        }),
    );
    const h = mountCompletedSession();
    await waitFor(() => expect(mockFinalize).toHaveBeenCalledTimes(1));
    h.unmount();
    await act(async () => fail(new Error('Late save failure')));
    expect(mockPersistenceToast).toHaveBeenCalledWith(
      expect.stringContaining('match log'),
    );
  });

  it('reports encounter replay failures without repeating them on rerender', async () => {
    mockPersistEncounter.mockResolvedValueOnce({ ok: false });
    const h = mountCompletedSession();
    await waitFor(() =>
      expect(mockPersistenceToast).toHaveBeenCalledWith(
        expect.stringContaining('encounter replay'),
      ),
    );
    h.switchTo('game-A', 1);
    await act(async () => {});
    expect(mockPersistEncounter).toHaveBeenCalledTimes(1);
  });

  it('reports thrown encounter replay failures', async () => {
    mockPersistEncounter.mockRejectedValueOnce(
      new Error('Replay storage offline'),
    );
    mountCompletedSession();
    await waitFor(() =>
      expect(mockPersistenceToast).toHaveBeenCalledWith(
        expect.stringContaining('encounter replay'),
      ),
    );
  });

  it('does not persist completed demo sessions', async () => {
    mountCompletedSession('demo');
    await act(async () => {});
    expect(mockFinalize).not.toHaveBeenCalled();
    expect(mockPersistEncounter).not.toHaveBeenCalled();
  });
});
