/**
 * Importing a match's retained history as an immutable baseline
 * (adopt-combat-event-journal-authority task 1.3; design D4).
 *
 * A match that predates journal authority still has to be adoptable, and
 * adoption has exactly one honest move: record what the retained log
 * actually contains, and say plainly where truth begins. The tuple D4
 * names — `(streamType, streamId, branchId, revision, digest,
 * effectiveGeneration)` — is what a rollback reader consults later to
 * decide whether the legacy reader is still truthful for this match.
 *
 * Two rules do the load-bearing work here:
 *
 * - **Never invent a prefix.** If the retained log does not begin at the
 *   start of the stream, that is recorded as a `legacy-baseline` with
 *   the first revision that survives. Filling the gap would put events
 *   into history that nobody committed, and every later digest would
 *   agree with a past that never happened.
 * - **Never rewrite a baseline.** A second import returns the stored
 *   tuple rather than replacing it. A baseline that moves is not a
 *   baseline; a reader consulting it would be told whatever the last
 *   writer believed rather than what was imported.
 *
 * @spec openspec/changes/adopt-combat-event-journal-authority/design.md (D4)
 * @spec openspec/changes/adopt-combat-event-journal-authority/tasks.md (1.3)
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { sha256Sync } from '@/utils/events/hashUtils';

/** Where a baseline's history came from. */
export type MatchBaselineSource =
  /** The retained log begins at the start of the stream. */
  | 'retained-log'
  /** A prefix is missing; truth begins at `firstRetainedRevision`. */
  | 'legacy-baseline';

/** The immutable cutover fact for one match. */
export interface IMatchAuthorityBaseline {
  readonly streamType: 'match';
  readonly streamId: string;
  readonly branchId: string;
  readonly revision: number;
  readonly digest: string;
  readonly effectiveGeneration: number;
  readonly source: MatchBaselineSource;
  /** The lowest revision the retained log actually carries. */
  readonly firstRetainedRevision: number;
  readonly importedAt: string;
}

/**
 * The branch every imported match starts on. Named rather than inlined
 * so the sites that will one day carry a real branch id are findable.
 */
export const MATCH_BASELINE_BRANCH_ID = 'main';

/**
 * The generation an imported baseline starts at. It advances only when
 * a rewind supersedes history (sections 14-15 of the umbrella), which
 * does not exist yet — so every import is generation 1, and that is a
 * statement about today rather than a placeholder.
 */
export const MATCH_BASELINE_FIRST_GENERATION = 1;

/** The revision a complete stream begins at. */
const STREAM_FIRST_REVISION = 0;

export type MatchBaselineImportResult =
  | { readonly kind: 'imported'; readonly baseline: IMatchAuthorityBaseline }
  | {
      /** Already imported. The stored tuple is returned UNCHANGED. */
      readonly kind: 'already-imported';
      readonly baseline: IMatchAuthorityBaseline;
    }
  | {
      /** Nothing retained. There is no history to be the baseline OF. */
      readonly kind: 'empty-log';
    };

/** The persistence this import needs. Narrow on purpose. */
export interface IMatchBaselineStore {
  read(streamId: string): IMatchAuthorityBaseline | null;
  /** MUST fail rather than overwrite when a row already exists. */
  insert(baseline: IMatchAuthorityBaseline): void;
}

export interface IImportMatchBaselineDeps {
  readonly matchId: string;
  /** The retained legacy events, in ascending revision order. */
  readonly retained: readonly IGameEvent[];
  readonly store: IMatchBaselineStore;
  readonly nowIso: () => string;
}

/**
 * Digest of the retained facts.
 *
 * Over IDENTITY, not payload: revision plus event type. Two imports of
 * the same retained log must agree, and a payload whose serialisation
 * shifts between versions would otherwise make the same history digest
 * differently and look like tampering.
 */
export function digestRetainedMatchHistory(
  retained: readonly IGameEvent[],
): string {
  const material = retained.map((event) => ({
    sequence: sequenceOf(event),
    type: typeOf(event),
  }));
  return sha256Sync(canonicalizeJsonV1(material));
}

/**
 * Import a match's retained history as its immutable baseline.
 *
 * Idempotent by design rather than by luck: the second call reads the
 * stored tuple and returns it, so a retried import after an ambiguous
 * failure cannot move the baseline.
 */
export function importMatchAuthorityBaseline(
  deps: IImportMatchBaselineDeps,
): MatchBaselineImportResult {
  const existing = deps.store.read(deps.matchId);
  if (existing !== null) {
    return { kind: 'already-imported', baseline: existing };
  }
  if (deps.retained.length === 0) {
    // Not an error, and deliberately not a zero-revision baseline: a
    // match with nothing retained has no history to be the baseline of,
    // and recording one would claim a revision 0 that was never
    // committed.
    return { kind: 'empty-log' };
  }

  const firstRetainedRevision = sequenceOf(deps.retained[0]);
  const baseline: IMatchAuthorityBaseline = {
    streamType: 'match',
    streamId: deps.matchId,
    branchId: MATCH_BASELINE_BRANCH_ID,
    revision: sequenceOf(deps.retained[deps.retained.length - 1]),
    digest: digestRetainedMatchHistory(deps.retained),
    effectiveGeneration: MATCH_BASELINE_FIRST_GENERATION,
    source:
      firstRetainedRevision === STREAM_FIRST_REVISION
        ? 'retained-log'
        : 'legacy-baseline',
    firstRetainedRevision,
    importedAt: deps.nowIso(),
  };
  deps.store.insert(baseline);
  return { kind: 'imported', baseline };
}

/**
 * An event's revision. Events carry `sequence`; anything without one
 * cannot be placed in the stream, and treating it as 0 would silently
 * claim it is the first event.
 */
function sequenceOf(event: IGameEvent): number {
  const sequence = (event as { sequence?: unknown }).sequence;
  if (typeof sequence !== 'number' || !Number.isInteger(sequence)) {
    throw new Error(
      'Cannot import a match baseline: a retained event has no integer sequence',
    );
  }
  return sequence;
}

function typeOf(event: IGameEvent): string {
  const type = (event as { type?: unknown }).type;
  return typeof type === 'string' ? type : '';
}
