import type { IGameState } from '@/types/gameplay';

import { replayFidelityState } from './replayFidelityTestState';

/** OPEN: Replayed hosted state retains the host's payload.intentId stamp.
 * Host fix (b) deletes this allowance; hydration fix (a) deletes the separate
 * replaySource allowance. The live session never carries the stamp; the
 * replayed event carries it exactly when it is the first stored event of a
 * command, with that command's intentId. Every other difference fails. */
export function expectHostedStateWithIntentStamps(
  live: IGameState,
  replayed: IGameState,
  intentIdByFirstSequence: ReadonlyMap<number, string>,
): number {
  expect(replayed.turnEvents).toHaveLength(live.turnEvents.length);
  let stamped = 0;
  const turnEvents = replayed.turnEvents.map((event, index) => {
    const liveEvent = live.turnEvents[index];
    expect(event.sequence).toBe(liveEvent.sequence);
    expect(Object.hasOwn(liveEvent.payload as object, 'intentId')).toBe(false);
    const expected = intentIdByFirstSequence.get(event.sequence);
    const payload = event.payload as Record<string, unknown>;
    expect(Object.hasOwn(payload, 'intentId')).toBe(expected !== undefined);
    if (expected === undefined) return event;
    expect(payload.intentId).toBe(expected);
    const { intentId: _stamp, ...domainPayload } = payload;
    stamped += 1;
    return { ...event, payload: domainPayload };
  });
  expect(replayFidelityState({ ...replayed, turnEvents })).toStrictEqual(
    replayFidelityState(live),
  );
  return stamped;
}
