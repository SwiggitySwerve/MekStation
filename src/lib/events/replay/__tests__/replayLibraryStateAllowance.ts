import type { IGameEvent, IGameState, ReplaySource } from '@/types/gameplay';

import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSessionCore';

import { replayFidelityState } from './replayFidelityTestState';

/** OPEN: Replayed state retains recording-envelope fields in turnEvents.
 * Hydration fix (a) deletes this allowance; host fix (b) deletes the separate
 * payload.intentId allowance. Source evidence and transport stamps stay intact.
 * Only the exact writer-added key/value/count is allowed, at every boundary.
 * Both comparisons also use replayFidelityState's normalisation
 * (D8_DIAG_UNDEFINED_OWN_PROPERTY_AS_ABSENT): an own property whose value is
 * undefined counts as absent, on either side, matching JSON semantics. */
export function expectLibraryStateWithRecordingSource(
  live: IGameState,
  replayed: IGameState,
  source: ReplaySource,
): number {
  const expectedCount = live.turnEvents.length;
  expect(replayed.turnEvents).toHaveLength(expectedCount);
  let actualCount = 0;
  const turnEvents = replayed.turnEvents.map((event, index) => {
    expect(Object.hasOwn(live.turnEvents[index], 'replaySource')).toBe(false);
    expect(Object.hasOwn(event, 'replaySource')).toBe(true);
    expect(event.replaySource).toBe(source);
    const { replaySource: _source, ...domainEvent } = event;
    actualCount += 1;
    return domainEvent;
  });
  expect(actualCount).toBe(expectedCount);
  expect(replayFidelityState({ ...replayed, turnEvents })).toStrictEqual(
    replayFidelityState(live),
  );
  return actualCount;
}

/** Prefix control uses the original journal; the last boundary additionally
 * compares with the actual live session, rather than another fold. */
export function expectLibraryRecordingSourceAtEveryBoundary(
  gameId: string,
  original: readonly IGameEvent[],
  loaded: readonly IGameEvent[],
  live: IGameState,
  source: ReplaySource,
): readonly number[] {
  expect(loaded).toHaveLength(original.length);
  const counts = original.map((_, index) => {
    const end = index + 1;
    const control = hydrateGameSessionFromEvents(
      gameId,
      original.slice(0, end),
    ).currentState;
    const replayed = hydrateGameSessionFromEvents(
      gameId,
      loaded.slice(0, end),
    ).currentState;
    return expectLibraryStateWithRecordingSource(control, replayed, source);
  });
  expectLibraryStateWithRecordingSource(
    live,
    hydrateGameSessionFromEvents(gameId, loaded).currentState,
    source,
  );
  return counts;
}
