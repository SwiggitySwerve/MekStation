/**
 * Later-use guard for campaign artifacts a correction has invalidated (16.4-b).
 *
 * 16.4-a seals ids onto a candidate's manifest. Sealing is not activation:
 * a sealed-but-never-activated candidate is still a draft, and treating
 * its list as live would block play against a correction nobody installed.
 * This consult reads only the effective branch's sealed manifest and
 * answers usable (null) or a typed refusal naming that branch and the
 * source revision that made the id stale. It never writes, and it never
 * looks at family names (those stay 16.1).
 */

import type { EventHistoryArtifactKind } from '@/lib/events/journal/EventHistoryArtifactManifest';
import type { IEventHistoryStreamRef } from '@/lib/events/journal/EventHistoryBranchContract';

export interface ICampaignArtifactIdentity {
  readonly artifactKind: EventHistoryArtifactKind;
  readonly artifactId: string;
}

/**
 * The refusal a later use must surface. `revision` is the sealed entry's
 * sourceRevision — the history the replacement superseded — not a
 * generation number the header does not carry.
 */
export interface InvalidatedCampaignArtifactRefusal {
  readonly kind: 'invalidated-artifact';
  readonly artifactKind: EventHistoryArtifactKind;
  readonly artifactId: string;
  readonly branchId: string;
  readonly revision: number;
}

/** Ports the consult needs. Both are reads; neither is the activation path. */
export interface ICampaignArtifactUseStores {
  readonly readEffectiveHead: (
    stream: IEventHistoryStreamRef,
  ) => { readonly branchId: string } | null;
  readonly readArtifactManifest: (
    stream: IEventHistoryStreamRef,
    candidateBranchId: string,
  ) => {
    readonly header: { readonly candidateBranchId: string };
    readonly entries: readonly {
      readonly artifactKind: EventHistoryArtifactKind;
      readonly artifactId: string;
      readonly sourceRevision: number;
    }[];
  } | null;
}

export type CampaignArtifactUseConsult = (
  artifact: ICampaignArtifactIdentity,
) => InvalidatedCampaignArtifactRefusal | null;

export function isInvalidatedCampaignArtifactRefusal(
  value: unknown,
): value is InvalidatedCampaignArtifactRefusal {
  if (typeof value !== 'object' || value === null) return false;
  const row = value as { readonly kind?: unknown };
  return row.kind === 'invalidated-artifact';
}

/**
 * Usable (null) unless the stream's effective branch sealed this kind+id.
 *
 * The head row is how activation is published. Walking every sealed
 * manifest would treat a never-activated candidate as live. Kind and id
 * both match because the same string can name a contract and a match.
 */
export function consultCampaignArtifactUse(
  stores: ICampaignArtifactUseStores,
  stream: IEventHistoryStreamRef,
  artifact: ICampaignArtifactIdentity,
): InvalidatedCampaignArtifactRefusal | null {
  const head = stores.readEffectiveHead(stream);
  if (head === null) return null;
  const manifest = stores.readArtifactManifest(stream, head.branchId);
  if (manifest === null) return null;
  const entry = manifest.entries.find(
    (row) =>
      row.artifactKind === artifact.artifactKind &&
      row.artifactId === artifact.artifactId,
  );
  if (entry === undefined) return null;
  return Object.freeze({
    kind: 'invalidated-artifact',
    artifactKind: entry.artifactKind,
    artifactId: entry.artifactId,
    branchId: manifest.header.candidateBranchId,
    revision: entry.sourceRevision,
  });
}

/** Bind stores+stream so a door can consult without knowing activation. */
export function bindCampaignArtifactUseConsult(
  stores: ICampaignArtifactUseStores,
  stream: IEventHistoryStreamRef,
): CampaignArtifactUseConsult {
  return (artifact) => consultCampaignArtifactUse(stores, stream, artifact);
}

/**
 * Launch and materialize share one draft list. A scenario id and its
 * `enc-<scenario>` twin both have to be checked; consulting after the
 * first REST write would turn this into a report.
 */
export function refuseCampaignLaunchArtifacts(
  consult: CampaignArtifactUseConsult,
  scenarioIds: readonly string[],
): InvalidatedCampaignArtifactRefusal | null {
  for (const id of scenarioIds) {
    const refused =
      consult({ artifactKind: 'scenario', artifactId: id }) ??
      consult({ artifactKind: 'encounter', artifactId: id }) ??
      (id.startsWith('enc-')
        ? null
        : consult({ artifactKind: 'encounter', artifactId: `enc-${id}` }));
    if (refused) return refused;
  }
  return null;
}
