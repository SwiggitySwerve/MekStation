/**
 * The spectator's registration is a one-time `POST /spectate` per page load, and
 * the server releases a spectator seat when the viewer's sockets are gone (a
 * last-socket detach, or a restart). `reRegister()` is the bounded way back in:
 * one extra registration, refilled only by a successful bind.
 */

import { act, renderHook, waitFor } from '@testing-library/react';

import type { MultiplayerTokenState } from '@/pages-modules/multiplayer/multiplayerPage.helpers';

import {
  MAX_SPECTATOR_RE_REGISTRATIONS,
  useSpectatorRegistration,
} from '@/hooks/useSpectatorRegistration';

const token = {
  wireToken: 'wire-token',
  token: { playerId: 'pid_watch' },
  displayName: 'Watcher',
} as unknown as MultiplayerTokenState;

const registered = () => ({
  ok: true,
  status: 201,
  json: async () => ({ slotId: 'spectator-1' }),
});
const refused = (status: number, error: string) => ({
  ok: false,
  status,
  json: async () => ({ error }),
});

describe('useSpectatorRegistration', () => {
  let fetchMock: jest.Mock;

  beforeEach(() => {
    fetchMock = jest.fn(async () => registered());
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  const mount = () =>
    renderHook(() => useSpectatorRegistration('match-1', token));

  it('registers once with the bearer token and reports registered', async () => {
    const { result } = mount();

    await waitFor(() => expect(result.current.registered).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/multiplayer/matches/match-1/spectate',
      { method: 'POST', headers: { Authorization: 'Bearer wire-token' } },
    );
    expect(result.current.registerError).toBeNull();
  });

  it('waits for a match id and a token', () => {
    renderHook(() => useSpectatorRegistration(null, token));
    renderHook(() => useSpectatorRegistration('match-1', null));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('re-registers exactly once more, going unregistered in between', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.registered).toBe(true));

    act(() => result.current.reRegister());

    expect(result.current.registered).toBe(false);
    await waitFor(() => expect(result.current.registered).toBe(true));
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('is bounded: a second re-registration before a successful bind is a no-op', async () => {
    expect(MAX_SPECTATOR_RE_REGISTRATIONS).toBe(1);
    const { result } = mount();
    await waitFor(() => expect(result.current.registered).toBe(true));
    act(() => result.current.reRegister());
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(result.current.registered).toBe(true));

    act(() => result.current.reRegister());
    act(() => result.current.reRegister());

    expect(result.current.registered).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('a successful bind refills the budget', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.registered).toBe(true));
    act(() => result.current.reRegister());
    await waitFor(() => expect(result.current.registered).toBe(true));

    act(() => result.current.markBound());
    act(() => result.current.reRegister());

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  });

  it('surfaces a refused re-registration as an error and does not loop', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.registered).toBe(true));
    fetchMock.mockResolvedValueOnce(
      refused(409, 'Match is not spectatable (status: completed)'),
    );

    act(() => result.current.reRegister());

    await waitFor(() =>
      expect(result.current.registerError).toBe(
        'Match is not spectatable (status: completed)',
      ),
    );
    expect(result.current.registered).toBe(false);
    act(() => result.current.reRegister());
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('surfaces a network failure while re-registering as an error', async () => {
    const { result } = mount();
    await waitFor(() => expect(result.current.registered).toBe(true));
    fetchMock.mockRejectedValueOnce(new Error('network down'));

    act(() => result.current.reRegister());

    await waitFor(() =>
      expect(result.current.registerError).toBe('network down'),
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
