/**
 * Affected-artifact manifest: derive, seal, verify
 * (add-authoritative-history-branches task 2.3; design D2).
 *
 * The manifest answers one question before a candidate may activate: what
 * would activating it INVALIDATE? Replays, exports, checkpoints and cached
 * projections derived from history the replacement supersedes are all
 * stale the moment the new head installs, and an activation that cannot
 * name them is an activation nobody can audit afterwards.
 *
 * Three properties this module holds:
 *
 * - **Server-derived, never client-supplied.** The entries this store
 *   accepts are computed by the authority from its own rows. There is no
 *   path here that takes a caller's word for what is affected - the
 *   derivation lands with candidate verification, and this is the sealed
 *   record it writes.
 * - **The digest is order-free.** Entries are sorted into a canonical order
 *   before hashing, so two derivations that found the same artifacts in
 *   different sequences produce the same manifest. A digest that depended
 *   on discovery order would report a difference that does not exist.
 * - **Sealing is atomic and once.** Entries and the header commit in one
 *   transaction, so a manifest is never half-derived: it is sealed, or it
 *   does not exist. The schema's seal trigger then refuses any later entry,
 *   and a second seal is refused here by name rather than surfacing as a
 *   primary-key collision.
 *
 * `entryCount` and `manifestDigest` live in the header because SQL can
 * neither hash the canonical form this codebase hashes with nor be trusted
 * to agree with itself later; `verifyArtifactManifest` recomputes both from
 * the rows, so a header written against rows it does not cover is caught
 * rather than believed.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import { EVENT_HISTORY_ARTIFACT_KINDS } from '@/services/persistence/SQLiteService.artifactManifest.migration';
import { sha256Sync } from '@/utils/events/hashUtils';

import type { IEventHistoryStreamRef } from './EventHistoryBranchContract';

import { canonicalizeJsonV1 } from './EventJournalCanonicalizer';

export type EventHistoryArtifactKind =
  (typeof EVENT_HISTORY_ARTIFACT_KINDS)[number];

/** One artifact an activation would invalidate. */
export interface IAffectedArtifact {
  readonly artifactKind: EventHistoryArtifactKind;
  readonly artifactId: string;
  /** The revision whose replacement makes this artifact stale. */
  readonly sourceRevision: number;
}

/** The sealed header covering one candidate's entries. */
export interface IArtifactManifestHeader {
  readonly streamType: string;
  readonly streamId: string;
  readonly candidateBranchId: string;
  readonly manifestDigest: string;
  readonly entryCount: number;
  readonly derivedAt: string;
}

/** A sealed manifest, header and entries together. */
export interface IArtifactManifest {
  readonly header: IArtifactManifestHeader;
  readonly entries: readonly IAffectedArtifact[];
}

export type EventHistoryArtifactManifestErrorCode =
  /** An entry is malformed, or the same artifact appears twice. */
  | 'invalid-manifest-entry'
  /** The candidate does not exist in this stream. */
  | 'unknown-candidate-branch'
  /** This candidate already has a sealed manifest. */
  | 'manifest-already-sealed'
  /** No manifest has been sealed for this candidate. */
  | 'manifest-not-found'
  /** The header does not describe the rows it covers. */
  | 'manifest-digest-mismatch';

export class EventHistoryArtifactManifestError extends Error {
  public readonly name = 'EventHistoryArtifactManifestError';
  public constructor(
    public readonly code: EventHistoryArtifactManifestErrorCode,
    message: string,
  ) {
    super(message);
  }
}

/**
 * Canonical order for artifacts: kind, then id, then source revision.
 *
 * The order exists so the digest does not depend on how the deriver walked
 * its sources. It is total, because the three fields together are the
 * artifact's identity in the manifest.
 */
function compareArtifacts(
  left: IAffectedArtifact,
  right: IAffectedArtifact,
): number {
  if (left.artifactKind !== right.artifactKind) {
    return left.artifactKind < right.artifactKind ? -1 : 1;
  }
  if (left.artifactId !== right.artifactId) {
    return left.artifactId < right.artifactId ? -1 : 1;
  }
  return left.sourceRevision - right.sourceRevision;
}

/** Sort a copy into canonical order; the caller's array is left alone. */
function canonicalArtifacts(
  artifacts: readonly IAffectedArtifact[],
): readonly IAffectedArtifact[] {
  return [...artifacts].sort(compareArtifacts);
}

/**
 * Digest a set of affected artifacts.
 *
 * Over the same canonicalizer the journal hashes with, so a manifest digest
 * and an event digest mean the same kind of thing. The source revision is
 * part of the material: the same artifact invalidated from a different
 * revision is a different claim about what activation breaks.
 */
export function digestAffectedArtifacts(
  artifacts: readonly IAffectedArtifact[],
): string {
  return sha256Sync(
    canonicalizeJsonV1(
      canonicalArtifacts(artifacts).map((artifact) => ({
        artifactKind: artifact.artifactKind,
        artifactId: artifact.artifactId,
        sourceRevision: artifact.sourceRevision,
      })),
    ),
  );
}

/** Refuse a malformed entry set before any write. */
function assertValidArtifacts(artifacts: readonly IAffectedArtifact[]): void {
  const fail = (message: string): never => {
    throw new EventHistoryArtifactManifestError(
      'invalid-manifest-entry',
      message,
    );
  };
  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (
      !(EVENT_HISTORY_ARTIFACT_KINDS as readonly string[]).includes(
        artifact.artifactKind,
      )
    ) {
      fail(`Unknown artifact kind '${artifact.artifactKind}'`);
    }
    if (artifact.artifactId.trim().length === 0) {
      fail('artifactId must not be empty');
    }
    if (
      !Number.isSafeInteger(artifact.sourceRevision) ||
      artifact.sourceRevision < 0
    ) {
      fail('sourceRevision must be a non-negative safe integer');
    }
    // Kind + id is the storage identity. A repeat would collide on insert;
    // naming it here says which artifact was listed twice.
    const identity = `${artifact.artifactKind}/${artifact.artifactId}`;
    if (seen.has(identity)) fail(`Artifact '${identity}' is listed twice`);
    seen.add(identity);
  }
}

const HEADER_COLUMNS = `stream_type AS streamType, stream_id AS streamId, candidate_branch_id AS candidateBranchId, manifest_digest AS manifestDigest, entry_count AS entryCount, derived_at AS derivedAt`;
const ENTRY_COLUMNS = `artifact_kind AS artifactKind, artifact_id AS artifactId, source_revision AS sourceRevision`;

export class SQLiteEventHistoryArtifactManifestStore {
  public constructor(private readonly db: Database.Database) {}

  /**
   * Write the derived entries and seal them under a header, atomically.
   *
   * Entries first, header last - the schema's seal trigger closes the list
   * the moment the header lands, so this order is what makes the seal
   * meaningful rather than an obstacle.
   */
  public sealArtifactManifest(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
    artifacts: readonly IAffectedArtifact[],
    derivedAt: string,
  ): IArtifactManifestHeader {
    assertValidArtifacts(artifacts);
    return this.db.transaction((): IArtifactManifestHeader => {
      this.assertCandidateExists(stream, candidateBranchId);
      if (this.readHeader(stream, candidateBranchId) !== null) {
        throw new EventHistoryArtifactManifestError(
          'manifest-already-sealed',
          `Candidate '${candidateBranchId}' already has a sealed manifest; its list is closed`,
        );
      }
      const entry = this.db.prepare(
        `INSERT INTO event_history_artifact_manifest_entries (
           stream_type, stream_id, candidate_branch_id, artifact_kind,
           artifact_id, source_revision
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      );
      for (const artifact of canonicalArtifacts(artifacts)) {
        entry.run(
          stream.streamType,
          stream.streamId,
          candidateBranchId,
          artifact.artifactKind,
          artifact.artifactId,
          artifact.sourceRevision,
        );
      }
      this.db
        .prepare(
          `INSERT INTO event_history_artifact_manifests (
             stream_type, stream_id, candidate_branch_id, manifest_digest,
             entry_count, derived_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
        )
        .run(
          stream.streamType,
          stream.streamId,
          candidateBranchId,
          digestAffectedArtifacts(artifacts),
          artifacts.length,
          derivedAt,
        );
      return this.requireHeader(stream, candidateBranchId);
    })();
  }

  /** The sealed manifest, or null when none was ever derived. */
  public readArtifactManifest(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): IArtifactManifest | null {
    const header = this.readHeader(stream, candidateBranchId);
    if (header === null) return null;
    return Object.freeze({
      header,
      entries: this.readEntries(stream, candidateBranchId),
    });
  }

  /**
   * Recompute the digest and count from the rows and compare them to the
   * header. The seal stops the rows from moving, so a mismatch means the
   * header was never written against these rows - which is the one failure
   * the triggers cannot see.
   */
  public verifyArtifactManifest(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): IArtifactManifestHeader {
    const header = this.requireHeader(stream, candidateBranchId);
    const entries = this.readEntries(stream, candidateBranchId);
    const digest = digestAffectedArtifacts(entries);
    if (
      digest !== header.manifestDigest ||
      entries.length !== header.entryCount
    ) {
      throw new EventHistoryArtifactManifestError(
        'manifest-digest-mismatch',
        `Manifest for '${candidateBranchId}' claims ${header.entryCount} entries digesting to '${header.manifestDigest}' but holds ${entries.length} digesting to '${digest}'`,
      );
    }
    return header;
  }

  private assertCandidateExists(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): void {
    const row = this.db
      .prepare(
        `SELECT 1 AS present FROM event_history_branches
         WHERE stream_type = ? AND stream_id = ? AND branch_id = ?`,
      )
      .get(stream.streamType, stream.streamId, candidateBranchId);
    if (row !== undefined) return;
    throw new EventHistoryArtifactManifestError(
      'unknown-candidate-branch',
      `Branch '${candidateBranchId}' does not exist in stream ${stream.streamType}/${stream.streamId}`,
    );
  }

  private readHeader(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): IArtifactManifestHeader | null {
    const row = this.db
      .prepare(
        `SELECT ${HEADER_COLUMNS} FROM event_history_artifact_manifests
         WHERE stream_type = ? AND stream_id = ? AND candidate_branch_id = ?`,
      )
      .get(stream.streamType, stream.streamId, candidateBranchId) as
      | IArtifactManifestHeader
      | undefined;
    return row ?? null;
  }

  private requireHeader(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): IArtifactManifestHeader {
    const header = this.readHeader(stream, candidateBranchId);
    if (header === null) {
      throw new EventHistoryArtifactManifestError(
        'manifest-not-found',
        `No manifest has been sealed for candidate '${candidateBranchId}'`,
      );
    }
    return header;
  }

  /** Entries in canonical order, so a read matches what was digested. */
  private readEntries(
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ): readonly IAffectedArtifact[] {
    const rows = this.db
      .prepare(
        `SELECT ${ENTRY_COLUMNS} FROM event_history_artifact_manifest_entries
         WHERE stream_type = ? AND stream_id = ? AND candidate_branch_id = ?`,
      )
      .all(
        stream.streamType,
        stream.streamId,
        candidateBranchId,
      ) as IAffectedArtifact[];
    return canonicalArtifacts(rows);
  }
}
