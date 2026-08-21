/**
 * Replay Library load pipeline (replay-safety PR 18).
 *
 * Routes Replay Library NDJSON loading - the file drop zone AND the
 * `/api/replay-library/<source>/<gameId>` read - through the registered
 * legacy adapter, the composed baseline schema registry, the
 * deterministic-input provenance manifest, and an explicit-decision
 * library projector:
 *
 * 1. Every non-empty line is bound to its EXACT raw bytes by the
 *    `simulation-report-jsonl` adapter (sha256 evidence digest per
 *    line) and attributed baseline v1 - never an implicit version.
 * 2. The event envelope must satisfy `isGameEvent`; the payload must
 *    parse under the discriminant's strict baseline schema and carry
 *    its manifest-declared resolved inputs.
 * 3. A census projector with an explicit decision for every canonical
 *    discriminant (completeness-gated at module load) folds the
 *    accepted events - no implicit missing-handler success.
 *
 * ALL-OR-NOTHING: any failing line blocks the WHOLE history with typed
 * records preserving source identity and evidence (line number, byte
 * digest, reason, message). The pre-existing malformed-line skipping
 * and unknown-event partial success do not exist on this path.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import { sha256 } from 'js-sha256';

import type { IGameEvent } from '@/types/gameplay';

import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { ReplayQuarantineReason } from './ReplayQuarantineRegistry';

import {
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
  createReplayBaselineDomainRegistry,
} from './ReplayBaselineDomainRegistry';
import { assertReplayInputProvenance } from './ReplayInputProvenanceManifest';
import {
  LegacySourceAttributionError,
  bindLegacyByteEvent,
  type LegacySourceAttributionCode,
} from './ReplayLegacySourceAdapters';
import {
  ReplayProjector,
  assertReplayProjectorCompleteness,
} from './ReplayProjectorRegistry';
import { classifyReplayFailure } from './ReplayQuarantineRegistry';
import { UnsupportedReplayHistoryError } from './ReplaySchemaRegistry';

export const REPLAY_LIBRARY_SOURCE_FORMAT_ID = 'simulation-report-jsonl';
export const REPLAY_LIBRARY_SOURCE_FORMAT_VERSION = 1;

export type ReplayLibraryBlockReason =
  | LegacySourceAttributionCode
  | ReplayQuarantineReason;

/** One blocked line, with its source identity preserved. */
export interface IReplayLibraryBlockedLine {
  readonly line: number;
  readonly reason: ReplayLibraryBlockReason;
  readonly eventType: string | null;
  /** sha256 over the exact raw line bytes (adapter evidence). */
  readonly evidenceDigest: string;
  readonly message: string;
}

export interface IReplayLibraryCensusState {
  readonly eventsApplied: number;
}

export type ReplayLibraryLoadResult =
  | {
      readonly kind: 'loaded';
      readonly events: readonly IGameEvent[];
      /** sha256 over the complete raw source bytes. */
      readonly sourceDigest: string;
      readonly census: IReplayLibraryCensusState;
    }
  | {
      readonly kind: 'blocked';
      readonly sourceId: string;
      readonly formatId: string;
      readonly formatVersion: number;
      /** sha256 over the complete raw source bytes. */
      readonly sourceDigest: string;
      readonly blockedLines: readonly IReplayLibraryBlockedLine[];
    };

const registry = createReplayBaselineDomainRegistry();

/**
 * Library census projector: an explicit apply decision for EVERY
 * canonical discriminant (the library projection is an event census -
 * it derives no authoritative game state). Completeness is asserted at
 * module load so a new discriminant fails the pipeline until decided.
 */
const censusProjector = new ReplayProjector<IReplayLibraryCensusState>({
  projectorId: 'replay-library.census',
  projectorVersion: 1,
  initialState: () => ({ eventsApplied: 0 }),
  decisions: REPLAY_BASELINE_CANONICAL_EVENT_TYPES.map((eventType) => ({
    eventType,
    decision: {
      kind: 'apply' as const,
      apply: (state: IReplayLibraryCensusState) => ({
        eventsApplied: state.eventsApplied + 1,
      }),
    },
  })),
});
assertReplayProjectorCompleteness(
  censusProjector,
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
);

const encoder = new TextEncoder();

/**
 * Loads one NDJSON replay history all-or-nothing. `sourceId` names the
 * source for blocked evidence (file name or `<source>/<gameId>`).
 */
export function loadReplayLibraryNdjson(
  rawText: string,
  sourceId: string,
): ReplayLibraryLoadResult {
  const sourceDigest = sha256(encoder.encode(rawText));
  const events: IGameEvent[] = [];
  const blockedLines: IReplayLibraryBlockedLine[] = [];
  let census = censusProjector.initialState();

  const lines = rawText.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (line === undefined || line.trim().length === 0) continue;
    const lineNumber = index + 1;
    const bytes = encoder.encode(line);
    const lineDigest = sha256(bytes);
    let eventType: string | null = null;
    try {
      const attributed = bindLegacyByteEvent(
        REPLAY_LIBRARY_SOURCE_FORMAT_ID,
        REPLAY_LIBRARY_SOURCE_FORMAT_VERSION,
        bytes,
      );
      eventType = attributed.eventType;
      const envelope = attributed.payload;
      if (!isGameEvent(envelope))
        throw new UnsupportedReplayHistoryError(
          'invalid-payload',
          attributed.eventType,
          1,
          'Line is not a valid IGameEvent envelope',
        );
      const upcast = registry.upcast(
        envelope.type,
        attributed.schemaVersion,
        envelope.payload,
      );
      assertReplayInputProvenance(upcast.eventType, upcast.payload);
      census = censusProjector.project(census, upcast);
      events.push(envelope);
    } catch (error) {
      if (error instanceof LegacySourceAttributionError) {
        blockedLines.push(
          Object.freeze({
            line: lineNumber,
            reason: error.code,
            eventType,
            evidenceDigest: lineDigest,
            message: error.message,
          }),
        );
        continue;
      }
      if (error instanceof UnsupportedReplayHistoryError) {
        blockedLines.push(
          Object.freeze({
            line: lineNumber,
            reason: classifyReplayFailure(error),
            eventType: error.eventType,
            evidenceDigest: lineDigest,
            message: error.message,
          }),
        );
        continue;
      }
      throw error;
    }
  }

  if (blockedLines.length > 0)
    return Object.freeze({
      kind: 'blocked',
      sourceId,
      formatId: REPLAY_LIBRARY_SOURCE_FORMAT_ID,
      formatVersion: REPLAY_LIBRARY_SOURCE_FORMAT_VERSION,
      sourceDigest,
      blockedLines: Object.freeze(blockedLines),
    });
  return Object.freeze({
    kind: 'loaded',
    events: Object.freeze(events),
    sourceDigest,
    census,
  });
}
