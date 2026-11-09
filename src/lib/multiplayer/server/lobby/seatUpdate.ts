/**
 * The one guarded seat writer (M-H2, Wave 4).
 *
 * Seat and roster mutations (REST spectate, lobby intents, spectator detach,
 * AI conversion) used to read the metadata, rewrite the whole `seats` array
 * and store it with no check, so a writer that read first could erase a
 * writer that wrote in between. They now derive a patch from the metadata they
 * hold and apply it with the revision they read; when another writer got
 * there first they derive again from the winner's metadata.
 */

import type { IMatchMeta, IMatchMetaPatch, IMatchStore } from '../IMatchStore';

import { metaRevision } from '../matchRoomCodes';

/** Derivations per call before giving up; contention beyond this is not a race. */
export const SEAT_UPDATE_MAX_ATTEMPTS = 5;

export type SeatUpdateResult =
  /** The patch was stored; `meta` is the stored metadata. */
  | { readonly kind: 'applied'; readonly meta: IMatchMeta }
  /** The derivation found nothing to change; `meta` is what it saw. */
  | { readonly kind: 'unchanged'; readonly meta: IMatchMeta }
  /** Every attempt lost to another writer; `meta` is the latest winner. */
  | { readonly kind: 'busy'; readonly meta: IMatchMeta };

/**
 * Derive from `meta`, synchronously: return the patch to store, or `null` for
 * no change. It runs again on a conflict, so keep it free of side effects; a
 * thrown error is a refusal, reaches the caller untouched and is not retried.
 */
export type SeatDerivation = (meta: IMatchMeta) => IMatchMetaPatch | null;

export async function updateMatchSeats(
  store: IMatchStore,
  matchId: string,
  derive: SeatDerivation,
): Promise<SeatUpdateResult> {
  let meta = await store.getMatchMeta(matchId);
  for (let attempt = 1; attempt <= SEAT_UPDATE_MAX_ATTEMPTS; attempt += 1) {
    const patch = derive(meta);
    if (patch === null) return { kind: 'unchanged', meta };
    const result = await store.updateMatchMetaIf(
      matchId,
      { expectedRevision: metaRevision(meta) },
      patch,
    );
    if (result.kind === 'applied') return result;
    meta = result.meta;
  }
  return { kind: 'busy', meta };
}
