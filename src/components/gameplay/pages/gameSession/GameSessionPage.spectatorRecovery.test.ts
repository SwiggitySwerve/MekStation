import { renderHook } from '@testing-library/react';

import type { InteractiveSession } from '@/engine/GameEngine';

import {
  gameSessionHref,
  resolveSpectatorRouteMode,
} from '@/lib/gameplay/tacticalNavigation';

import {
  shouldBlockForSpectatorRecovery,
  useRecoverSpectatorMode,
} from './GameSessionPage.spectator';

describe('spectator route recovery', () => {
  it('creates a durable spectator recovery URL', () => {
    expect(gameSessionHref('match 1', { spectator: true })).toBe(
      '/gameplay/games/match%201?spectator=1',
    );
  });

  it('resolves explicit query state before falling back to the current path', () => {
    expect(resolveSpectatorRouteMode('1', '/gameplay/games/match-1')).toBe(
      true,
    );
    expect(
      resolveSpectatorRouteMode('0', '/gameplay/games/match-1?spectator=1'),
    ).toBe(false);
    expect(
      resolveSpectatorRouteMode(
        undefined,
        '/gameplay/games/match-1?spectator=1',
      ),
    ).toBe(true);
  });

  it('restores spectator playback after the interactive session loads', () => {
    const interactiveSession = {} as InteractiveSession;
    const setSpectatorMode = jest.fn();

    renderHook(() =>
      useRecoverSpectatorMode({
        isSpectatorRoute: true,
        interactiveSession,
        isSpectatorMode: false,
        setSpectatorMode,
      }),
    );

    expect(setSpectatorMode).toHaveBeenCalledWith(interactiveSession, {
      enabled: true,
      playing: true,
      speed: 1,
    });
  });

  it('blocks player controls while spectator mode is being restored', () => {
    const interactiveSession = {} as InteractiveSession;

    expect(
      shouldBlockForSpectatorRecovery(true, interactiveSession, false),
    ).toBe(true);
    expect(
      shouldBlockForSpectatorRecovery(false, interactiveSession, false),
    ).toBe(false);
    expect(
      shouldBlockForSpectatorRecovery(true, interactiveSession, true),
    ).toBe(false);
  });

  it.each([
    { label: 'interactive route', isSpectatorRoute: false, active: false },
    { label: 'active spectator', isSpectatorRoute: true, active: true },
  ])('does not overwrite an $label', ({ active, isSpectatorRoute }) => {
    const setSpectatorMode = jest.fn();

    renderHook(() =>
      useRecoverSpectatorMode({
        isSpectatorRoute,
        interactiveSession: {} as InteractiveSession,
        isSpectatorMode: active,
        setSpectatorMode,
      }),
    );

    expect(setSpectatorMode).not.toHaveBeenCalled();
  });
});
