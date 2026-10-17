/**
 * V211-02 regression: reloading `/gameplay/games/<id>/victory` after the
 * in-memory session is gone must recover the post-battle report from the
 * persisted match (`GET /api/matches/:id`, the same source the reload-safe
 * `/gameplay/matches/<id>` route reads) instead of dead-ending on
 * "No active session".
 *
 * @spec openspec/specs/game-session-management/spec.md "Session Publishes
 *   Outcome Ready Event" (completed outcome is POSTed to /api/matches)
 */

import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import VictoryPage from '@/pages/gameplay/games/[id]/victory';
import { useGameplayStore } from '@/stores/useGameplayStore';

const mockReplace = jest.fn();
jest.mock('next/router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: jest.fn(),
    query: { id: 'match-v211' },
    pathname: '/gameplay/games/[id]/victory',
    isReady: true,
  }),
}));

function mockFetchStatus(status: number): jest.Mock {
  const fetchMock = jest.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({}),
  }));
  (globalThis as { fetch?: unknown }).fetch = fetchMock;
  return fetchMock;
}

describe('victory route reload recovery (V211-02)', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    useGameplayStore.setState({ session: null });
  });

  it('redirects to the persisted match report when the session is gone', async () => {
    const fetchMock = mockFetchStatus(200);

    render(<VictoryPage />);

    await waitFor(() =>
      expect(mockReplace).toHaveBeenCalledWith('/gameplay/matches/match-v211'),
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/matches/match-v211');
    expect(screen.queryByTestId('victory-no-session')).not.toBeInTheDocument();
  });

  it('keeps the no-session guidance when nothing was persisted', async () => {
    mockFetchStatus(404);

    render(<VictoryPage />);

    expect(await screen.findByTestId('victory-no-session')).toBeVisible();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
