/**
 * Copy retained legacy match events into the journal (task 1.3
 * event-import half; design D4).
 *
 * The baseline tuple already records what the retained log contains.
 * This half copies the events themselves. Three properties do the
 * load-bearing work:
 *
 * - **Source identities.** Every imported event is labelled
 *   `imported-legacy` and bound to object-backed evidence over its
 *   identity (id + sequence + type). Journal-native appends carry no
 *   such row. Evidence is over identity, not payload, for the same
 *   reason the baseline digest is: a payload whose serialisation
 *   shifts must not make the same event look like a different source.
 * - **Missing prefixes stay missing.** Import never fabricates events
 *   before `firstRetainedRevision`. The baseline recorded the gap;
 *   filling it would put events into history that nobody committed.
 * - **Idempotent.** A second import reads the completion marker and
 *   returns it unchanged. The marker is written in the same
 *   transaction as the events, so a crash mid-copy cannot look like a
 *   finished import and cannot double-insert on retry.
 *
 * The copy goes through a store-supplied bulk path rather than
 * `appendCommandBatch`. That command path's head check treats an empty
 * stream as revision 0, so a retained log that starts at K>0 would be
 * a revision conflict — which is the right answer for a live command
 * and the wrong one for adopting a log that honestly begins later.
 *
 * @spec openspec/changes/adopt-combat-event-journal-authority/design.md (D4)
 * @spec openspec/changes/adopt-combat-event-journal-authority/tasks.md (1.3)
 */

import { sha256 as sha256Pure } from 'js-sha256';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';

import type { IMatchAuthorityBaseline } from './matchAuthorityBaseline';

import { firstNonContiguousSequence } from './matchCommandBatch';

export const IMPORTED_LEGACY_SOURCE_KIND = 'imported-legacy' as const;

export interface ILegacyImportSourceIdentity {
  readonly formatId: string;
  readonly formatVersion: number;
}

export interface IImportedEventSource {
  readonly kind: typeof IMPORTED_LEGACY_SOURCE_KIND;
  readonly formatId: string;
  readonly formatVersion: number;
  readonly binding: 'object-backed';
  readonly evidenceDigest: string;
  readonly evidenceByteLength: number;
}

export interface IImportedLegacyEvent {
  readonly event: IGameEvent;
  readonly source: IImportedEventSource;
}

export interface ILegacyImportMarker {
  readonly matchId: string;
  readonly firstRevision: number;
  readonly lastRevision: number;
  readonly eventCount: number;
  readonly sourceLabel: typeof IMPORTED_LEGACY_SOURCE_KIND;
  readonly importedAt: string;
}

/** Persistence this import needs. Narrow on purpose. */
export interface ILegacyEventImportStore {
  readMarker(matchId: string): ILegacyImportMarker | null;
  /**
   * Run the inserts as one unit. The SQLite adapter wraps this in a
   * transaction; a memory store just calls `work`.
   */
  runImport(work: () => void): void;
  insertImportedEvent(matchId: string, row: IImportedLegacyEvent): void;
  insertMarker(marker: ILegacyImportMarker): void;
}

export type LegacyEventImportResult =
  | {
      readonly kind: 'imported';
      readonly marker: ILegacyImportMarker;
      readonly events: readonly IImportedLegacyEvent[];
    }
  | {
      readonly kind: 'already-imported';
      readonly marker: ILegacyImportMarker;
    }
  | { readonly kind: 'empty-log' }
  | { readonly kind: 'no-baseline' }
  | {
      readonly kind: 'non-contiguous';
      readonly expectedRevision: number;
      readonly offendingSequence: number;
    };

export interface IImportLegacyMatchEventsDeps {
  readonly matchId: string;
  readonly retained: readonly IGameEvent[];
  readonly baseline: IMatchAuthorityBaseline | null;
  readonly source: ILegacyImportSourceIdentity;
  readonly store: ILegacyEventImportStore;
  readonly nowIso: () => string;
}

/**
 * Import retained legacy events for one match.
 *
 * Idempotent by the completion marker, not by luck: a retry after an
 * ambiguous failure that actually committed reads the marker and
 * returns it, and a retry after a rollback sees no marker and copies
 * again.
 */
export function importLegacyMatchEvents(
  deps: IImportLegacyMatchEventsDeps,
): LegacyEventImportResult {
  const existing = deps.store.readMarker(deps.matchId);
  if (existing !== null) {
    return { kind: 'already-imported', marker: existing };
  }
  if (deps.baseline === null) {
    return { kind: 'no-baseline' };
  }
  if (deps.retained.length === 0) {
    return { kind: 'empty-log' };
  }

  const toCopy: IImportedLegacyEvent[] = [];
  for (const retained of deps.retained) {
    const sequence = sequenceOf(retained);
    if (sequence < deps.baseline.firstRetainedRevision) {
      // The baseline already said truth begins later. Importing these
      // would fill a prefix nobody committed.
      continue;
    }
    toCopy.push({
      event: retained,
      source: bindIdentity(retained, deps.source),
    });
  }
  if (toCopy.length === 0) {
    return { kind: 'empty-log' };
  }

  const offending = firstNonContiguousSequence({
    commandId: `legacy-import:${deps.matchId}`,
    actorId: 'migration',
    expectedRevision: deps.baseline.firstRetainedRevision,
    events: toCopy.map((row) => row.event),
  });
  if (offending !== null) {
    return {
      kind: 'non-contiguous',
      expectedRevision: deps.baseline.firstRetainedRevision,
      offendingSequence: offending,
    };
  }

  const marker: ILegacyImportMarker = {
    matchId: deps.matchId,
    firstRevision: sequenceOf(toCopy[0].event),
    lastRevision: sequenceOf(toCopy[toCopy.length - 1].event),
    eventCount: toCopy.length,
    sourceLabel: IMPORTED_LEGACY_SOURCE_KIND,
    importedAt: deps.nowIso(),
  };

  deps.store.runImport(() => {
    for (const row of toCopy) {
      deps.store.insertImportedEvent(deps.matchId, row);
    }
    deps.store.insertMarker(marker);
  });
  return { kind: 'imported', marker, events: toCopy };
}

function bindIdentity(
  event: IGameEvent,
  source: ILegacyImportSourceIdentity,
): IImportedEventSource {
  const material = {
    id: idOf(event),
    sequence: sequenceOf(event),
    type: typeOf(event),
  };
  const canonical = canonicalizeJsonV1(material);
  const bytes = new TextEncoder().encode(canonical);
  return {
    kind: IMPORTED_LEGACY_SOURCE_KIND,
    formatId: source.formatId,
    formatVersion: source.formatVersion,
    binding: 'object-backed',
    evidenceDigest: sha256Pure(bytes),
    evidenceByteLength: bytes.byteLength,
  };
}

function sequenceOf(event: IGameEvent): number {
  const sequence = (event as { sequence?: unknown }).sequence;
  if (typeof sequence !== 'number' || !Number.isInteger(sequence)) {
    throw new Error(
      'Cannot import a match event: a retained event has no integer sequence',
    );
  }
  return sequence;
}

function idOf(event: IGameEvent): string {
  const id = (event as { id?: unknown }).id;
  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(
      'Cannot import a match event: a retained event has no string id',
    );
  }
  return id;
}

function typeOf(event: IGameEvent): string {
  const type = (event as { type?: unknown }).type;
  return typeof type === 'string' ? type : '';
}
