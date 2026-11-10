/**
 * If a guest mirror is ever asked to roll, the player is told (C-1c PR 0).
 *
 * The mirror roller throws `MirrorSessionRolledDiceError`. Uncaught, that
 * is a click that does nothing: the board stays where it is and nothing
 * says why. The store catches the named error at the one place every
 * phase-advancing action passes through and shows a specific message.
 * Any other error is not swallowed.
 */

jest.mock('@/components/shared/Toast', () => ({
  toast: jest.fn(),
}));

import { toast } from '@/components/shared/Toast';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { createMirrorDiceRoller } from '@/lib/p2p/mirrorDiceRoller';
import { useGameplayStore } from '@/stores/useGameplayStore';
import { GameEventType, GamePhase } from '@/types/gameplay';

import {
  advanceHostToEndWithQueuedPsr,
  makePsrFixtureHost,
} from '../../engine/__tests__/InteractiveSession.psrEndFixture.test-helpers';

function adoptGuestAtEndWithQueuedPsr(): InteractiveSession {
  const host = makePsrFixtureHost();
  advanceHostToEndWithQueuedPsr(host);
  const guest = InteractiveSession.fromSession(
    host.getSession(),
    createMirrorDiceRoller(),
  );
  useGameplayStore.getState().setInteractiveSession(guest);
  useGameplayStore.getState().setSession(guest.getSession());
  return guest;
}

describe('guest mirror asked to roll', () => {
  beforeEach(() => {
    (toast as jest.Mock).mockClear();
  });
  afterEach(() => {
    useGameplayStore.getState().reset();
  });

  it.each([
    ['Next Turn', () => useGameplayStore.getState().handleAction('next-turn')],
    [
      'the advance control',
      () => useGameplayStore.getState().advanceInteractivePhase(),
    ],
  ])('%s shows a specific message and leaves the board untouched', (_, act) => {
    const guest = adoptGuestAtEndWithQueuedPsr();
    const eventsBefore = guest.getSession().events.length;

    expect(act).not.toThrow();

    expect(toast).toHaveBeenCalledTimes(1);
    const shown = (toast as jest.Mock).mock.calls[0][0] as {
      message: string;
      variant: string;
    };
    expect(shown.variant).toBe('error');
    expect(shown.message).toMatch(/host/i);
    expect(shown.message).toMatch(/dice|roll/i);
    expect(guest.getSession().events).toHaveLength(eventsBefore);
    expect(guest.getSession().currentState.phase).toBe(GamePhase.End);
    expect(
      guest
        .getSession()
        .events.filter((e) => e.type === GameEventType.PSRResolved),
    ).toHaveLength(0);
  });

  it('does not swallow an unrelated error', () => {
    const guest = adoptGuestAtEndWithQueuedPsr();
    jest.spyOn(guest, 'advancePhase').mockImplementation(() => {
      throw new Error('something else broke');
    });

    expect(() => useGameplayStore.getState().advanceInteractivePhase()).toThrow(
      'something else broke',
    );
    expect(toast).not.toHaveBeenCalled();
  });
});
