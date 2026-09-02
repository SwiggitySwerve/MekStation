/**
 * Affected-artifact impact derivation (add-authoritative-history-branches
 * task 2.3; design D2).
 *
 * The manifest tables (migration 25) record WHAT an activation would
 * invalidate, and the verification seam proves the candidate replays. This
 * is the piece between them: it re-derives every viewer's projection over
 * the prior effective head AND over the verified candidate, and the
 * artifacts whose projection CHANGES between the two are exactly the
 * manifest entries.
 *
 * Server-derived, never client-supplied. Nothing here takes a caller's word
 * for what is affected: the viewer set is named, but every digest is
 * obtained by running the probe over events this module materialised
 * itself, and the checkpoint rows are read from storage. That is the one
 * property the manifest exists to guarantee, so an inventory handed in by a
 * caller is deliberately not accepted.
 *
 * Both heads are probed TWICE per viewer and the answers compared. A probe
 * that will not reproduce cannot be sealed against - the manifest would
 * record an impact nobody can re-derive - and the refusal is the same
 * typed `branch-integrity` the resolver uses for history that will not
 * reproduce, because it is the same kind of failure one layer up.
 *
 * ORDER MATTERS, and it is control flow rather than a transaction. The
 * candidate is verified first; the seal below is unreachable unless
 * verification returned. It cannot be one transaction with the
 * verification: materialisation is async and better-sqlite3 transactions
 * are strictly synchronous. The SEAL itself is one transaction (the
 * manifest store's), so a manifest is never half-written - but "no
 * manifest for an unverified candidate" is guaranteed by the fact that
 * this function returns before sealing on any verification failure, not by
 * atomicity. A test pins it from the outside: a candidate that fails
 * verification leaves zero manifest rows.
 *
 * NOT claimed: the `replay` and `export` artifact kinds. Neither is
 * derivable server-side today - the replay index is a JSON file keyed by
 * match id that carries no stream revision, and exports are not persisted
 * at all - so there is no `sourceRevision` to record for either. Both kinds
 * stay in the schema's closed set for a later change that gives them a
 * revision-carrying index. Also not claimed: the concrete campaign and
 * combat viewer digesters. The probe is injected so this stays out of the
 * live projection surfaces; adopting them is their owners' work.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/event-store/spec.md
 */

import type Database from 'better-sqlite3';

import type {
  IAffectedArtifact,
  IArtifactManifestHeader,
} from './EventHistoryArtifactManifest';
import type { IEventHistoryStreamRef } from './EventHistoryBranchContract';
import type { IBranchSegmentReader } from './EventHistoryBranchResolver';
import type {
  ICandidateVerificationOptions,
  IProjectableBranchEvent,
} from './EventHistoryCandidateVerification';
import type { SQLiteEventHistoryBranchStore } from './SQLiteEventHistoryBranchStore';

import { SQLiteEventHistoryArtifactManifestStore } from './EventHistoryArtifactManifest';
import { EventHistoryBranchError } from './EventHistoryBranchContract';
import {
  materializeBranchPath,
  resolveBranchPath,
} from './EventHistoryBranchResolver';
import { verifyCandidatePath } from './EventHistoryCandidateVerification';

/**
 * One viewer's view of a materialised head, reduced to a digest.
 *
 * Injected rather than imported: the campaign projector consumes campaign
 * events and the combat one consumes game events, and neither speaks
 * branch events. Parameterising keeps this module out of both live
 * projection surfaces while still asking them the only question that
 * matters here - did what this viewer sees change?
 */
export interface IViewerProjectionProbe {
  digest(viewerId: string, events: readonly IProjectableBranchEvent[]): string;
}

export interface IImpactDerivationRequest<TState> {
  readonly stream: IEventHistoryStreamRef;
  readonly candidateBranchId: string;
  /** The journal revision the prior effective head currently answers at. */
  readonly priorHeadRevision: number;
  readonly viewerIds: readonly string[];
  readonly probe: IViewerProjectionProbe;
  readonly derivedAt: string;
  readonly verification: ICandidateVerificationOptions<TState>;
}

export interface IDerivedCandidateImpact {
  readonly header: IArtifactManifestHeader;
  readonly entries: readonly IAffectedArtifact[];
  /** Viewers whose projection differs between the two heads. */
  readonly changedViewerIds: readonly string[];
}

/** Probe one head twice and refuse an answer that will not reproduce. */
function stableDigest(
  probe: IViewerProjectionProbe,
  viewerId: string,
  events: readonly IProjectableBranchEvent[],
  head: string,
): string {
  const first = probe.digest(viewerId, events);
  if (first !== probe.digest(viewerId, events)) {
    throw new EventHistoryBranchError(
      'branch-integrity',
      `The projection probe answered differently twice for viewer '${viewerId}' at the ${head} head; an impact that cannot be re-derived cannot be sealed`,
    );
  }
  return first;
}

/** What a comparison between two heads found, before anything is sealed. */
export interface IImpactBetweenHeads {
  /** Viewers whose projection differs between the two heads. */
  readonly changedViewerIds: readonly string[];
  /** The manifest entries an activation of this replacement would seal. */
  readonly entries: readonly IAffectedArtifact[];
}

export interface IImpactBetweenHeadsInput {
  readonly priorEvents: readonly IProjectableBranchEvent[];
  /** The replacement history: a verified candidate, or a truncation. */
  readonly candidateEvents: readonly IProjectableBranchEvent[];
  readonly viewerIds: readonly string[];
  readonly probe: IViewerProjectionProbe;
  /** The revision the replacement rejoins history at. */
  readonly baseRevision: number;
  /** Checkpoint rows already read from storage by the caller. */
  readonly checkpoints: readonly IAffectedArtifact[];
}

/**
 * The comparison itself, with nothing around it: no database, no branch
 * store, no seal, and no possibility of a write.
 *
 * Extracted so the GM's PREVIEW of a rewind and the ACTIVATION that
 * follows it run the same comparison rather than two implementations
 * that agree until one is edited. The preview is only trustworthy if it
 * reports what activation would actually do, and the cheapest way to
 * guarantee that is for there to be one derivation.
 *
 * The impure halves stay outside deliberately: materialising the two
 * heads and reading the checkpoint rows are the caller's job, because
 * they are what differs between a sealed candidate (read through its
 * branch row) and a preview (read as a truncation of the prior branch).
 */
export function deriveImpactBetween(
  input: IImpactBetweenHeadsInput,
): IImpactBetweenHeads {
  const changedViewerIds: string[] = [];
  for (const viewerId of input.viewerIds) {
    const before = stableDigest(
      input.probe,
      viewerId,
      input.priorEvents,
      'prior',
    );
    const after = stableDigest(
      input.probe,
      viewerId,
      input.candidateEvents,
      'candidate',
    );
    if (before !== after) changedViewerIds.push(viewerId);
  }
  return Object.freeze({
    changedViewerIds: Object.freeze([...changedViewerIds]),
    entries: Object.freeze([
      ...changedViewerIds.map((viewerId) => ({
        artifactKind: 'projection' as const,
        artifactId: viewerId,
        // The revision the replacement rejoins history at is what stales
        // every projection derived past it.
        sourceRevision: input.baseRevision,
      })),
      ...input.checkpoints,
    ]),
  });
}

/**
 * Checkpoints staled by the replacement: those recorded ABOVE the base
 * revision. One AT the base describes history the candidate keeps, so it
 * survives; everything above it was derived from events the replacement
 * supersedes.
 *
 * Exported because the preview asks the same question of the same rows.
 */
export function readStaleCheckpoints(
  db: Database.Database,
  stream: IEventHistoryStreamRef,
  baseRevision: number,
): readonly IAffectedArtifact[] {
  const rows = db
    .prepare(
      `SELECT checkpoint_id AS artifactId, revision AS sourceRevision
       FROM replay_checkpoints
       WHERE stream_id = ? AND revision > ?`,
    )
    .all(stream.streamId, baseRevision) as Array<{
    readonly artifactId: string;
    readonly sourceRevision: number;
  }>;
  return rows.map((row) => ({
    artifactKind: 'checkpoint' as const,
    artifactId: row.artifactId,
    sourceRevision: row.sourceRevision,
  }));
}

/**
 * Verify the candidate, derive what activating it would invalidate, and
 * seal that list against the candidate.
 *
 * The comparison is per viewer between the PRIOR effective head and the
 * candidate. A viewer whose digest is unchanged is not listed: the
 * manifest is what activation breaks, and listing something it does not
 * break would inflate a blast radius somebody has to review.
 */
export async function deriveAndSealCandidateImpact<TState>(
  db: Database.Database,
  branches: SQLiteEventHistoryBranchStore,
  reader: IBranchSegmentReader<IProjectableBranchEvent>,
  request: IImpactDerivationRequest<TState>,
): Promise<IDerivedCandidateImpact> {
  const { stream } = request;
  const candidate = branches.requireBranch(stream, request.candidateBranchId);
  const priorHead = branches.requireEffectiveHead(stream);

  // Verification first. Everything below is unreachable unless this
  // returns, which is what keeps an unverified candidate from ever
  // acquiring a manifest.
  const candidatePath = resolveBranchPath(
    branches,
    stream,
    candidate.branchId,
    candidate.baseRevision,
  );
  const verified = await verifyCandidatePath(
    reader,
    candidatePath,
    request.verification,
  );

  const priorEvents = await materializeBranchPath(
    reader,
    resolveBranchPath(
      branches,
      stream,
      priorHead.branchId,
      request.priorHeadRevision,
    ),
  );

  // The comparison is the SHARED one. Everything this function adds is
  // the sealing around it, which is exactly what the preview omits.
  const derived = deriveImpactBetween({
    priorEvents,
    candidateEvents: verified.events,
    viewerIds: request.viewerIds,
    probe: request.probe,
    baseRevision: candidate.baseRevision,
    checkpoints: readStaleCheckpoints(db, stream, candidate.baseRevision),
  });

  const header = new SQLiteEventHistoryArtifactManifestStore(
    db,
  ).sealArtifactManifest(
    stream,
    candidate.branchId,
    derived.entries,
    request.derivedAt,
  );
  return Object.freeze({
    header,
    entries: derived.entries,
    changedViewerIds: derived.changedViewerIds,
  });
}
