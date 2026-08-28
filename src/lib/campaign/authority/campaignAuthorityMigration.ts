/**
 * Campaign authority migration machinery (design-campaign-authority-and-sync
 * task 5.2 — absorbed adopt PR 2; design D10, imported intact).
 *
 * One durable migration state per campaign — `legacy | shadowing | journal |
 * blocked` — carried by a cutover marker that records the imported source
 * snapshot revision/digest, the baseline identity, the projector version,
 * the deterministic campaign schema-pipeline fingerprint, and the first
 * journal-authority command once one commits. There is never dual
 * authority: transitions are pure functions here, persistence is the
 * marker store service, and every illegal move returns a typed result
 * instead of mutating.
 *
 * Rollback law (D10): snapshot-authority rollback is permitted only while
 * the journal head still equals the imported baseline and no
 * journal-authority command has committed; afterwards the campaign uses a
 * compatible journal reader or enters a truthful `blocked` state — never a
 * silent legacy fallback. Journal rows are never deleted by any transition.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/event-store/spec.md
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import {
  CAMPAIGN_BASELINE_EVENT_TYPES,
  CAMPAIGN_BASELINE_SCHEMA_PACK,
} from '@/lib/events/replay/CampaignBaselineSchemaPack';
import { ReplaySchemaRegistry } from '@/lib/events/replay/ReplaySchemaRegistry';

import { freezeCampaignEvent } from '../sync/campaignEventScope';
import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';

export type CampaignAuthorityMigrationState =
  | 'legacy'
  | 'shadowing'
  | 'journal'
  | 'blocked';

/** Version of the campaign replay reducer (`replayCampaignEvents`). */
export const CAMPAIGN_PROJECTOR_VERSION = 1;

export interface IImportedCampaignBaseline {
  /** Server-store `version` of the snapshot at import time. */
  readonly sourceSnapshotRevision: number;
  /** Digest of the imported authoritative state (no fabricated history). */
  readonly sourceSnapshotDigest: string;
  /** The baseline event's campaign sequence (always 0). */
  readonly baselineSequence: number;
  /** The journal command that committed the baseline. */
  readonly baselineCommandId: string;
  readonly importedAt: string;
}

export interface ICampaignCutoverMarker {
  readonly campaignId: string;
  readonly state: CampaignAuthorityMigrationState;
  readonly projectorVersion: number;
  readonly schemaPipelineFingerprint: string;
  /** Null for a journal-native campaign created after cutover (task 5.7). */
  readonly importedBaseline: IImportedCampaignBaseline | null;
  readonly firstJournalAuthorityCommandId: string | null;
  /** Populated only in `blocked`; both evidence digests are preserved. */
  readonly blocked: {
    readonly reason: string;
    readonly journalDigest: string;
    readonly snapshotDigest: string;
  } | null;
}

export type MigrationTransitionResult =
  | { readonly kind: 'ok'; readonly marker: ICampaignCutoverMarker }
  | {
      readonly kind: 'invalid-transition';
      readonly from: CampaignAuthorityMigrationState;
      readonly attempted: string;
    };

export type RollbackDecision =
  | { readonly kind: 'rolled-back'; readonly marker: ICampaignCutoverMarker }
  | {
      readonly kind: 'rollback-prohibited';
      readonly reason:
        | 'journal-authority-command-committed'
        | 'journal-head-past-baseline';
    };

let memoizedFingerprint: string | null = null;

/**
 * The deterministic fingerprint of the campaign baseline schema pipeline —
 * the identity every cutover marker and materialized snapshot binds. A
 * schema or transition registration change changes it, which is exactly
 * what invalidates stale materializations (D10).
 */
export function campaignSchemaPipelineFingerprint(): string {
  if (memoizedFingerprint === null) {
    const registry = new ReplaySchemaRegistry({
      events: CAMPAIGN_BASELINE_SCHEMA_PACK,
    });
    memoizedFingerprint = registry.fingerprintPipeline(
      CAMPAIGN_BASELINE_EVENT_TYPES.map((eventType) => ({
        eventType,
        schemaVersion: 1,
      })),
    );
  }
  return memoizedFingerprint;
}

/** Test seam: clear the fingerprint memo (pack contents never change at runtime). */
export function resetCampaignSchemaPipelineFingerprintForTests(): void {
  memoizedFingerprint = null;
}

function baseMarker(
  campaignId: string,
): Omit<ICampaignCutoverMarker, 'state' | 'importedBaseline'> {
  return {
    campaignId,
    projectorVersion: CAMPAIGN_PROJECTOR_VERSION,
    schemaPipelineFingerprint: campaignSchemaPipelineFingerprint(),
    firstJournalAuthorityCommandId: null,
    blocked: null,
  };
}

/** Marker for a campaign that has never begun migration. */
export function createLegacyMarker(campaignId: string): ICampaignCutoverMarker {
  return { ...baseMarker(campaignId), state: 'legacy', importedBaseline: null };
}

/** Marker for a journal-native campaign created after cutover (5.7). */
export function createJournalNativeMarker(
  campaignId: string,
): ICampaignCutoverMarker {
  return {
    ...baseMarker(campaignId),
    state: 'journal',
    importedBaseline: null,
  };
}

export type BaselineImportResult =
  | { readonly kind: 'imported'; readonly marker: ICampaignCutoverMarker }
  | { readonly kind: 'stream-not-empty'; readonly highestSequence: number }
  | { readonly kind: 'duplicate-import'; readonly commandId: string };

/**
 * Import an existing snapshot-only campaign as one explicit baseline event
 * (`CampaignSnapshotPublished` at sequence 0) with source revision/digest
 * metadata and NO fabricated history, then enter `shadowing`. The journal
 * stream must be empty; a retried import hits the journal's
 * command-identity guard rather than appending twice.
 */
export async function importCampaignBaseline(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  input: {
    readonly campaignId: string;
    readonly state: ICampaignAuthoritativeState;
    readonly sourceSnapshotRevision: number;
    readonly importedAt: string;
  },
): Promise<BaselineImportResult> {
  const sourceSnapshotDigest = computeCampaignStateDigest(input.state);
  const baselineCommandId = `campaign-baseline:${input.campaignId}`;
  const baselineEvent: ICampaignEvent<'CampaignSnapshotPublished'> =
    freezeCampaignEvent({
      sequence: 0,
      campaignId: input.campaignId,
      ts: input.importedAt,
      authorPlayerId: 'migration',
      type: 'CampaignSnapshotPublished',
      // Migration baseline is the shared imported ledger, not GM-only.
      scope: 'campaign',
      payload: { state: input.state, revision: 0 },
    });

  const result = await appendCampaignCommandBatch(journal, {
    campaignId: input.campaignId,
    commandId: baselineCommandId,
    events: [baselineEvent],
    expectedPostStateDigest: sourceSnapshotDigest,
    principal: {
      actorKind: 'migration',
      actorId: 'campaign-authority-migration',
      authorityType: 'campaign-source',
      authorityId: input.campaignId,
    },
  });
  if (result.kind === 'sequence-conflict') {
    return {
      kind: 'stream-not-empty',
      highestSequence: result.actualNextSequence - 1,
    };
  }
  if (result.kind === 'duplicate-command') {
    return { kind: 'duplicate-import', commandId: result.commandId };
  }
  if (result.kind !== 'committed') {
    return { kind: 'stream-not-empty', highestSequence: -1 };
  }
  return {
    kind: 'imported',
    marker: {
      ...baseMarker(input.campaignId),
      state: 'shadowing',
      importedBaseline: {
        sourceSnapshotRevision: input.sourceSnapshotRevision,
        sourceSnapshotDigest,
        baselineSequence: 0,
        baselineCommandId,
        importedAt: input.importedAt,
      },
    },
  };
}

export interface IShadowParity {
  readonly equal: boolean;
  readonly journalDigest: string;
  readonly snapshotDigest: string;
}

/** Compare the journal-replayed projection against the snapshot authority. */
export function evaluateShadowParity(
  journalProjection: ICampaignAuthoritativeState,
  snapshotProjection: ICampaignAuthoritativeState,
): IShadowParity {
  const journalDigest = computeCampaignStateDigest(journalProjection);
  const snapshotDigest = computeCampaignStateDigest(snapshotProjection);
  return {
    equal: journalDigest === snapshotDigest,
    journalDigest,
    snapshotDigest,
  };
}

/**
 * Advance a `shadowing` campaign on a parity result: equality cuts over to
 * `journal`; a mismatch blocks cutover truthfully, preserving both
 * evidence digests and leaving the legacy authority untouched.
 */
export function advanceAfterShadowParity(
  marker: ICampaignCutoverMarker,
  parity: IShadowParity,
): MigrationTransitionResult {
  if (marker.state !== 'shadowing') {
    return {
      kind: 'invalid-transition',
      from: marker.state,
      attempted: 'advance-after-shadow-parity',
    };
  }
  if (!parity.equal) {
    return {
      kind: 'ok',
      marker: {
        ...marker,
        state: 'blocked',
        blocked: {
          reason: 'shadow-projection-mismatch',
          journalDigest: parity.journalDigest,
          snapshotDigest: parity.snapshotDigest,
        },
      },
    };
  }
  return { kind: 'ok', marker: { ...marker, state: 'journal' } };
}

/**
 * Record the first journal-authority command. Idempotent for the same
 * command id; any second distinct id is a server bug surfaced as an
 * invalid transition (the marker records exactly one first command).
 */
export function recordFirstJournalAuthorityCommand(
  marker: ICampaignCutoverMarker,
  commandId: string,
): MigrationTransitionResult {
  if (marker.state !== 'journal') {
    return {
      kind: 'invalid-transition',
      from: marker.state,
      attempted: 'record-first-journal-authority-command',
    };
  }
  if (marker.firstJournalAuthorityCommandId === commandId) {
    return { kind: 'ok', marker };
  }
  if (marker.firstJournalAuthorityCommandId !== null) {
    return {
      kind: 'invalid-transition',
      from: marker.state,
      attempted: 'record-first-journal-authority-command',
    };
  }
  return {
    kind: 'ok',
    marker: { ...marker, firstJournalAuthorityCommandId: commandId },
  };
}

/**
 * The D10 rollback law. Rolling back never deletes journal rows — the
 * marker returns to `legacy` and the imported baseline stays recorded.
 */
export function rollbackToSnapshotAuthority(
  marker: ICampaignCutoverMarker,
  journalHighestSequence: number,
): RollbackDecision {
  if (marker.firstJournalAuthorityCommandId !== null) {
    return {
      kind: 'rollback-prohibited',
      reason: 'journal-authority-command-committed',
    };
  }
  const baselineHead = marker.importedBaseline
    ? marker.importedBaseline.baselineSequence
    : -1;
  if (journalHighestSequence !== baselineHead) {
    return {
      kind: 'rollback-prohibited',
      reason: 'journal-head-past-baseline',
    };
  }
  return {
    kind: 'rolled-back',
    marker: { ...marker, state: 'legacy', blocked: null },
  };
}

/**
 * Metadata every materialized campaign snapshot binds (D10): recovery
 * discards a materialization whose fingerprint differs from the live
 * pipeline even when projector version and stored digest still match.
 */
export interface IMaterializedCampaignSnapshotMeta {
  readonly branchId: 'root';
  readonly revision: number;
  readonly projectorVersion: number;
  readonly schemaPipelineFingerprint: string;
  readonly stateDigest: string;
}

export function isMaterializedSnapshotCompatible(
  meta: IMaterializedCampaignSnapshotMeta,
  current: {
    readonly projectorVersion: number;
    readonly schemaPipelineFingerprint: string;
  },
): boolean {
  return (
    meta.projectorVersion === current.projectorVersion &&
    meta.schemaPipelineFingerprint === current.schemaPipelineFingerprint
  );
}
