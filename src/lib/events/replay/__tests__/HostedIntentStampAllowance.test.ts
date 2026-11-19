import { GameEventType, GamePhase, type IGameEvent } from '@/types/gameplay';
import { createInitialGameState } from '@/utils/gameplay/gameState/initialization';

import { expectHostedStateWithIntentStamps } from './hostedIntentStampAllowance';

function phase(sequence: number): IGameEvent {
  return {
    id: `phase-${sequence}`,
    gameId: 'intent-stamp-allowance',
    sequence,
    timestamp: '2026-11-18T00:00:00.000Z',
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Movement,
    payload: { fromPhase: GamePhase.Initiative, toPhase: GamePhase.Movement },
  };
}

function stamp(event: IGameEvent, intentId: string): IGameEvent {
  // The host stamp is a transport key outside the canonical payload type.
  const payload: Record<string, unknown> = { ...event.payload, intentId };
  return { ...event, payload: payload as unknown as IGameEvent['payload'] };
}

const first = phase(11);
const unstamped = phase(19);
const live = {
  ...createInitialGameState(first.gameId),
  turnEvents: [first, unstamped],
};
const replayed = { ...live, turnEvents: [stamp(first, 'cmd-4'), unstamped] };
const firstSequences = new Map([[11, 'cmd-4']]);

it('allows exactly the stamp on each command first event', () => {
  expect(
    expectHostedStateWithIntentStamps(live, replayed, firstSequences),
  ).toBe(1);
});

it('rejects a wrong intentId value', () => {
  expect(() =>
    expectHostedStateWithIntentStamps(
      live,
      { ...live, turnEvents: [stamp(first, 'cmd-5'), unstamped] },
      firstSequences,
    ),
  ).toThrow();
});

it('rejects an extra stamp on an event that is not a command first event', () => {
  expect(() =>
    expectHostedStateWithIntentStamps(
      live,
      {
        ...live,
        turnEvents: [stamp(first, 'cmd-4'), stamp(unstamped, 'cmd-4')],
      },
      firstSequences,
    ),
  ).toThrow();
});

it('rejects the stamp on the wrong event', () => {
  expect(() =>
    expectHostedStateWithIntentStamps(
      live,
      { ...live, turnEvents: [first, stamp(unstamped, 'cmd-4')] },
      firstSequences,
    ),
  ).toThrow();
});

it('rejects the reversed direction (live stamped, replay bare)', () => {
  expect(() =>
    expectHostedStateWithIntentStamps(replayed, live, firstSequences),
  ).toThrow();
});

it('rejects any other difference', () => {
  expect(() =>
    expectHostedStateWithIntentStamps(
      live,
      { ...replayed, turn: live.turn + 1 },
      firstSequences,
    ),
  ).toThrow();
});
