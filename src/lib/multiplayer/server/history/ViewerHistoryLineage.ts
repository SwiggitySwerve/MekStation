/**
 * Viewer-projected branch/supersession lineage for match history HTTP.
 *
 * Built SERVER-SIDE from the journal branch store, effective head, the
 * effective branch's journal head, supersession rows, and the sealed
 * artifact manifest. It is a sibling
 * of the audit timeline, never a field on an IViewerTimelineEntry, so
 * the existing key allowlists and timelineDigest stay over audit rows
 * alone. A player still sees that a branch moved; they do not see the
 * GM-private reason, createdBy principal, or another viewer's
 * projection artifact.
 */

import type { ActionAuditActorRole } from '@/lib/events/audit/IActionAuditRepository';
import type { EventHistoryArtifactKind } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IAffectedArtifact } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type {
  IEventHistoryBranch,
  IEventHistoryEffectiveHead,
  IEventHistoryStreamRef,
  IEventHistorySupersession,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type { IEventHistoryEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';

export type ViewerLineageAudience = 'gm' | 'player';

export interface IViewerLineageArtifact {
  readonly artifactKind: EventHistoryArtifactKind;
  readonly artifactId: string;
}

export interface IViewerLineageEffectiveHead {
  readonly branchId: string;
  readonly revision: number;
  readonly generation: number;
}

export interface IViewerLineageTransitionBase {
  readonly fromBranchId: string;
  readonly toBranchId: string;
  readonly baseRevision: number;
  readonly actorRole: ActionAuditActorRole;
  readonly supersededAt: string;
  readonly invalidatedArtifacts: readonly IViewerLineageArtifact[];
}

export interface IGmLineageTransition extends IViewerLineageTransitionBase {
  readonly reason: string;
  readonly createdBy: string;
}

/** Player transition: reason/createdBy keys are omitted, not null. */
export type IPlayerLineageTransition = IViewerLineageTransitionBase;

export type IViewerLineageTransition =
  | IGmLineageTransition
  | IPlayerLineageTransition;

/**
 * Narrow a lineage transition to the GM member.
 *
 * The player alias is structurally the base, so TypeScript collapses the
 * union and `reason` is not a property of the shared type. This guard
 * restores the GM member without putting `reason` on the base (that
 * would leak the key into the player shape).
 */
export function isGmLineageTransition(
  transition: IViewerLineageTransition,
): transition is IGmLineageTransition {
  return 'reason' in transition;
}

export interface IViewerHistoryLineage {
  readonly effectiveHead: IViewerLineageEffectiveHead | null;
  readonly transitions: readonly IViewerLineageTransition[];
}

export interface IViewerHistoryLineageStores {
  readonly branches: {
    readonly listBranches: (
      stream: IEventHistoryStreamRef,
    ) => readonly IEventHistoryBranch[];
    readonly readEffectiveHead: (
      stream: IEventHistoryStreamRef,
    ) => IEventHistoryEffectiveHead | null;
    readonly readSupersessions: (
      stream: IEventHistoryStreamRef,
    ) => readonly IEventHistorySupersession[];
  };
  readonly manifests: {
    readonly readArtifactManifest: (
      stream: IEventHistoryStreamRef,
      candidateBranchId: string,
    ) => { readonly entries: readonly IAffectedArtifact[] } | null;
  };
  /**
   * The journal head the stream answers from: the stream-head row of its
   * effective branch (readEffectiveStreamHead), the read GET
   * /api/matches/:id/head and the correction lease make.
   */
  readonly readEffectiveStreamHead: (
    stream: IEventHistoryStreamRef,
  ) => IEventHistoryEffectiveStreamHead;
}

export interface IViewerLineageViewer {
  readonly audience: ViewerLineageAudience;
  readonly viewerId: string;
}

/**
 * Project one stream's stored lineage for one viewer.
 *
 * effectiveHead is null when the store has none — answering a synthetic
 * root would invent an authority nobody installed. Otherwise it names the
 * journal head stores.readEffectiveStreamHead answers.
 */
export function projectViewerHistoryLineage(
  stores: IViewerHistoryLineageStores,
  stream: IEventHistoryStreamRef,
  viewer: IViewerLineageViewer,
): IViewerHistoryLineage {
  const listed = stores.branches.listBranches(stream);
  const byId = new Map(listed.map((branch) => [branch.branchId, branch]));
  const storedHead = stores.branches.readEffectiveHead(stream);
  return Object.freeze({
    effectiveHead: projectEffectiveHead(stores, stream, storedHead),
    transitions: Object.freeze(
      stores.branches
        .readSupersessions(stream)
        .flatMap((row) => projectTransition(stores, stream, row, byId, viewer)),
    ),
  });
}

/**
 * Null when the stored effective head is null, before any journal read.
 * Otherwise the branch id and revision of the journal head
 * readEffectiveStreamHead answers, with the stored head's effective
 * generation: the body GET /api/matches/:id/head builds.
 */
function projectEffectiveHead(
  stores: IViewerHistoryLineageStores,
  stream: IEventHistoryStreamRef,
  storedHead: IEventHistoryEffectiveHead | null,
): IViewerLineageEffectiveHead | null {
  // The store's null is the answer. Do not substitute genesis.
  if (storedHead === null) return null;
  // The journal tip on the effective branch, not the branch's base
  // cutoff: the revision a rewind CAS and the lease compare against.
  const journalHead = stores.readEffectiveStreamHead(stream);
  return Object.freeze({
    branchId: journalHead.branchId,
    revision: journalHead.revision,
    generation: storedHead.effectiveGeneration,
  });
}

function projectTransition(
  stores: IViewerHistoryLineageStores,
  stream: IEventHistoryStreamRef,
  row: IEventHistorySupersession,
  byId: ReadonlyMap<string, IEventHistoryBranch>,
  viewer: IViewerLineageViewer,
): readonly IViewerLineageTransition[] {
  const replacement = byId.get(row.replacementBranchId);
  // Cutoff lives on the replacement branch. Skip rather than borrow an
  // audit committedFirstRevision the player path is not allowed to see.
  if (replacement === undefined) return [];
  const artifacts = projectArtifacts(
    stores.manifests.readArtifactManifest(stream, row.replacementBranchId)
      ?.entries ?? [],
    viewer,
  );
  const shared: IViewerLineageTransitionBase = {
    fromBranchId: row.supersededBranchId,
    toBranchId: row.replacementBranchId,
    baseRevision: replacement.baseRevision,
    actorRole: 'gm',
    supersededAt: row.recordedAt,
    invalidatedArtifacts: artifacts,
  };
  if (viewer.audience === 'gm') {
    return [
      Object.freeze({
        ...shared,
        reason: row.reason,
        createdBy: replacement.createdBy,
      }),
    ];
  }
  return [Object.freeze(shared)];
}

function projectArtifacts(
  entries: readonly IAffectedArtifact[],
  viewer: IViewerLineageViewer,
): readonly IViewerLineageArtifact[] {
  const projected: IViewerLineageArtifact[] = [];
  for (const entry of entries) {
    // Projection artifacts carry the viewer id as artifactId. Other
    // kinds have no viewer stamp, so both audiences see kind+id only.
    if (
      entry.artifactKind === 'projection' &&
      viewer.audience !== 'gm' &&
      entry.artifactId !== viewer.viewerId
    ) {
      continue;
    }
    projected.push(
      Object.freeze({
        artifactKind: entry.artifactKind,
        artifactId: entry.artifactId,
      }),
    );
  }
  return Object.freeze(projected);
}
