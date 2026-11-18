import type { IGameEvent, IGameState } from '@/types/gameplay';

/**
 * The last event folded into a state, or `null` for the empty fold.
 *
 * Kept beside the state, never in it: a WeakMap keyed by the state object
 * adds no field to `IGameState`, so digests, recordings, saved payloads and
 * replay output are unchanged. A state rebuilt from JSON or transport, or
 * replaced outside the fold, has no stamp.
 */
export interface IFoldRevision {
  readonly eventId: string;
  readonly sequence: number;
}

/** A state set outside the fold on purpose (a GM correction). */
export const NOT_FOLDED = 'not-folded';

type FoldStamp = IFoldRevision | null | typeof NOT_FOLDED;

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
  lastEvent: IGameEvent | undefined,
): void {
  foldRevisions.set(
    state,
    lastEvent ? { eventId: lastEvent.id, sequence: lastEvent.sequence } : null,
  );
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

export function foldRevisionMatches(
  revision: FoldStamp,
  lastEvent: IGameEvent | undefined,
): boolean {
  if (revision === NOT_FOLDED) return false;
  if (revision === null || lastEvent === undefined) {
    return revision === null && lastEvent === undefined;
  }
  return (
    revision.eventId === lastEvent.id &&
    revision.sequence === lastEvent.sequence
  );
}

export function describeFoldRevision(revision: FoldStamp): string {
  if (revision === NOT_FOLDED) return 'no event (set outside the fold)';
  if (revision === null) return 'the empty log';
  return `event ${revision.eventId} (sequence ${revision.sequence})`;
}
