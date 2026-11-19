import type { IGameEvent, IGameState } from '@/types/gameplay';

/**
 * The events array a state was folded from, and its length then.
 *
 * Kept beside the state, never in it: a WeakMap keyed by the state object
 * adds no field to `IGameState`, so digests, recordings, saved payloads and
 * replay output are unchanged. A state rebuilt from JSON or transport, or
 * replaced outside the fold, has no stamp.
 *
 * The array's identity, not its tail, is what ties a state to its log:
 * appendEvent and deriveFoldedState stamp the very array they return or were
 * given, while any truncation or rewrite of a log, even one that keeps the
 * last event, produces a new array.
 */
export interface IFoldRevision {
  readonly events: readonly IGameEvent[];
  readonly length: number;
}

/** A state set outside the fold on purpose (a GM correction). */
export const NOT_FOLDED = 'not-folded';

type FoldStamp = IFoldRevision | typeof NOT_FOLDED;

const foldRevisions = new WeakMap<IGameState, FoldStamp>();

/**
 * Set by the Jest setup only. Folded states are then deep-frozen, so an
 * in-place edit throws where it happens instead of riding along under the
 * incremental fold. Never set in dev or production builds.
 */
const FREEZE_FLAG = '__MEKSTATION_FREEZE_FOLDED_STATE__';

function deepFreeze(value: unknown): void {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return;
  }
  Object.freeze(value);
  for (const key of Reflect.ownKeys(value)) {
    deepFreeze((value as Record<PropertyKey, unknown>)[key]);
  }
}

export function stampFoldRevision(
  state: IGameState,
  events: readonly IGameEvent[],
): void {
  foldRevisions.set(state, { events, length: events.length });
  if ((globalThis as Record<string, unknown>)[FREEZE_FLAG] === true) {
    deepFreeze(state);
  }
}

/** The next append refuses this state rather than folding onto it. */
export function markNotFolded(state: IGameState): void {
  foldRevisions.set(state, NOT_FOLDED);
}

/** `undefined`: the state carries no stamp. */
export function readFoldRevision(state: IGameState): FoldStamp | undefined {
  return foldRevisions.get(state);
}

/** In step only with the very events array it was folded from, unextended. */
export function foldRevisionMatches(
  revision: FoldStamp,
  events: readonly IGameEvent[],
): boolean {
  return (
    revision !== NOT_FOLDED &&
    revision.events === events &&
    revision.length === events.length
  );
}

export function describeEventLog(events: readonly IGameEvent[]): string {
  const last = events.at(-1);
  return last
    ? `a ${events.length}-event log ending at event ${last.id} (sequence ${last.sequence})`
    : 'the empty log';
}

export function describeFoldRevision(revision: FoldStamp): string {
  if (revision === NOT_FOLDED) return 'no event (set outside the fold)';
  return `${describeEventLog(revision.events.slice(0, revision.length))}, a different events array`;
}
