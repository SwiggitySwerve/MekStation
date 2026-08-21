/**
 * Replay surface gate (replay-safety PR 19A).
 *
 * The shared validation + identity-reporting layer every replay surface
 * rides: cold recovery and snapshot hydration route their OBJECT-BACKED
 * stored events through here (the Replay Library's byte-backed NDJSON
 * path shares the same report builder), so one registered pipeline -
 * legacy-source attribution, composed baseline schemas, provenance,
 * census projector - serves every surface, and each surface reports
 * the same identity septet for the same history: stream, fixed root
 * branch, event range, schema-pipeline fingerprint, projector
 * id/version, state digest, and audience-safe digest.
 *
 * ALL-OR-NOTHING: one unsupported event blocks the WHOLE history with
 * typed per-event evidence; no partial baseline can be hydrated from a
 * blocked gate result because accepted events are only returned on the
 * fully-accepted arm.
 *
 * @spec openspec/changes/add-replay-schema-and-checkpoint-safety/specs/replay-library/spec.md
 */

import type { IGameEvent } from '@/types/gameplay';

import { isGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { LegacySourceAttributionCode } from './ReplayLegacySourceAdapters';
import type { ReplayQuarantineReason } from './ReplayQuarantineRegistry';

import {
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
  createReplayBaselineDomainRegistry,
} from './ReplayBaselineDomainRegistry';
import { digestReplayCheckpointState } from './ReplayCheckpointCompatibility';
import { assertReplayInputProvenance } from './ReplayInputProvenanceManifest';
import {
  LegacySourceAttributionError,
  bindLegacyObjectEvent,
} from './ReplayLegacySourceAdapters';
import {
  ReplayProjector,
  assertReplayProjectorCompleteness,
} from './ReplayProjectorRegistry';
import { classifyReplayFailure } from './ReplayQuarantineRegistry';
import { UnsupportedReplayHistoryError } from './ReplaySchemaRegistry';

export type ReplaySurfaceBlockReason =
  | LegacySourceAttributionCode
  | ReplayQuarantineReason;

export interface IReplayLibraryCensusState {
  readonly eventsApplied: number;
}

/** The one composed registry every replay surface shares. */
export const REPLAY_SURFACE_REGISTRY = createReplayBaselineDomainRegistry();

/**
 * Library census projector: an explicit apply decision for EVERY
 * canonical discriminant (the surface projection is an event census -
 * it derives no authoritative game state). Completeness is asserted at
 * module load so a new discriminant fails every surface until decided.
 */
export const REPLAY_LIBRARY_CENSUS_PROJECTOR =
  new ReplayProjector<IReplayLibraryCensusState>({
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
  REPLAY_LIBRARY_CENSUS_PROJECTOR,
  REPLAY_BASELINE_CANONICAL_EVENT_TYPES,
);

/** The identity septet plus source-format identity for one surface. */
export interface IReplaySurfaceReport {
  readonly surfaceId: string;
  readonly formatId: string;
  readonly formatVersion: number;
  readonly streamId: string;
  readonly branchId: 'root';
  readonly range: {
    readonly firstSequence: number | null;
    readonly lastSequence: number | null;
    readonly eventCount: number;
  };
  readonly schemaPipelineFingerprint: string;
  readonly projectorId: string;
  readonly projectorVersion: number;
  readonly stateDigest: string;
  readonly audienceSafeDigest: string;
}

export interface IReplaySurfaceBlockedEvent {
  readonly index: number;
  readonly sequence: number | null;
  readonly reason: ReplaySurfaceBlockReason;
  readonly eventType: string | null;
  readonly evidenceDigest: string | null;
  readonly message: string;
}

export type ReplaySurfaceGateResult =
  | {
      readonly kind: 'accepted';
      readonly events: readonly IGameEvent[];
      readonly report: IReplaySurfaceReport;
    }
  | {
      readonly kind: 'blocked';
      readonly surfaceId: string;
      readonly streamId: string;
      readonly formatId: string;
      readonly formatVersion: number;
      readonly blockedEvents: readonly IReplaySurfaceBlockedEvent[];
    };

/**
 * Builds the surface report every surface must agree on for the same
 * accepted history. Exported so the byte-backed library pipeline and
 * the object-backed gate share ONE identity computation.
 */
export function buildReplaySurfaceReport(options: {
  readonly surfaceId: string;
  readonly formatId: string;
  readonly formatVersion: number;
  readonly streamId: string;
  readonly events: readonly IGameEvent[];
  readonly census: IReplayLibraryCensusState;
}): IReplaySurfaceReport {
  const sequences = options.events.map((event) => event.sequence);
  const historicalVersions = Array.from(
    new Set(options.events.map((event) => event.type)),
  )
    .sort()
    .map((eventType) => ({ eventType, schemaVersion: 1 }));
  return Object.freeze({
    surfaceId: options.surfaceId,
    formatId: options.formatId,
    formatVersion: options.formatVersion,
    streamId: options.streamId,
    branchId: 'root',
    range: Object.freeze({
      firstSequence: sequences.length > 0 ? Math.min(...sequences) : null,
      lastSequence: sequences.length > 0 ? Math.max(...sequences) : null,
      eventCount: options.events.length,
    }),
    schemaPipelineFingerprint:
      REPLAY_SURFACE_REGISTRY.fingerprintPipeline(historicalVersions),
    projectorId: REPLAY_LIBRARY_CENSUS_PROJECTOR.projectorId,
    projectorVersion: REPLAY_LIBRARY_CENSUS_PROJECTOR.projectorVersion,
    stateDigest: digestReplayCheckpointState(options.events),
    audienceSafeDigest: digestReplayCheckpointState(options.census),
  });
}

/**
 * Gates one object-backed stored history (cold recovery, snapshot
 * hydration) through the registered pipeline.
 */
export function gateReplaySurfaceHistory(
  storedEvents: readonly unknown[],
  options: {
    readonly surfaceId: string;
    readonly streamId: string;
    readonly formatId: string;
    readonly formatVersion: number;
  },
): ReplaySurfaceGateResult {
  const accepted: IGameEvent[] = [];
  const blocked: IReplaySurfaceBlockedEvent[] = [];
  let census = REPLAY_LIBRARY_CENSUS_PROJECTOR.initialState();

  for (let index = 0; index < storedEvents.length; index += 1) {
    const stored = storedEvents[index];
    const sequence =
      typeof (stored as { sequence?: unknown })?.sequence === 'number'
        ? (stored as { sequence: number }).sequence
        : null;
    let eventType: string | null = null;
    let boundEvidenceDigest: string | null = null;
    try {
      // Bind the record's JSON IMAGE: live/stored event objects may
      // carry keys whose value is `undefined` (structured clone keeps
      // them; JSON has no such value) and non-finite numbers
      // (Infinity/NaN image to null - exactly the PR-18 stored forms),
      // and the canonical encoding rightly refuses both. Every
      // byte-backed surface reads the JSON serialization, so the JSON
      // image IS the stored form this object-backed surface binds and
      // the ACCEPTED envelopes returned to callers are those imaged
      // records - the validated record and the consumed record are the
      // same object, never the un-imaged original.
      let jsonImage: unknown;
      try {
        jsonImage = JSON.parse(JSON.stringify(stored));
      } catch (error) {
        throw new LegacySourceAttributionError(
          'invalid-source-event',
          options.formatId,
          options.formatVersion,
          `Stored record has no JSON image: ${String(error)}`,
        );
      }
      const attributed = bindLegacyObjectEvent(
        options.formatId,
        options.formatVersion,
        jsonImage,
      );
      eventType = attributed.eventType;
      boundEvidenceDigest = attributed.source.evidenceDigest;
      const envelope = attributed.payload;
      if (!isGameEvent(envelope))
        throw new UnsupportedReplayHistoryError(
          'invalid-payload',
          attributed.eventType,
          1,
          'Stored record is not a valid IGameEvent envelope',
        );
      const upcast = REPLAY_SURFACE_REGISTRY.upcast(
        envelope.type,
        attributed.schemaVersion,
        envelope.payload,
      );
      assertReplayInputProvenance(upcast.eventType, upcast.payload);
      census = REPLAY_LIBRARY_CENSUS_PROJECTOR.project(census, upcast);
      accepted.push(envelope);
    } catch (error) {
      if (error instanceof LegacySourceAttributionError) {
        blocked.push(
          Object.freeze({
            index,
            sequence,
            reason: error.code,
            eventType,
            evidenceDigest: null,
            message: error.message,
          }),
        );
        continue;
      }
      if (error instanceof UnsupportedReplayHistoryError) {
        blocked.push(
          Object.freeze({
            index,
            sequence,
            reason: classifyReplayFailure(error),
            eventType: error.eventType,
            evidenceDigest: boundEvidenceDigest,
            message: error.message,
          }),
        );
        continue;
      }
      throw error;
    }
  }

  if (blocked.length > 0)
    return Object.freeze({
      kind: 'blocked',
      surfaceId: options.surfaceId,
      streamId: options.streamId,
      formatId: options.formatId,
      formatVersion: options.formatVersion,
      blockedEvents: Object.freeze(blocked),
    });
  return Object.freeze({
    kind: 'accepted',
    events: Object.freeze(accepted),
    report: buildReplaySurfaceReport({
      surfaceId: options.surfaceId,
      formatId: options.formatId,
      formatVersion: options.formatVersion,
      streamId: options.streamId,
      events: accepted,
      census,
    }),
  });
}
