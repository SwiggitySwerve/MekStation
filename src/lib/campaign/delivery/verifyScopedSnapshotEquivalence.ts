/**
 * Snapshot-versus-scoped-replay equivalence harness (task 3.4).
 *
 * For one campaign + grant + cut point, computes:
 *   (a) fold(applyCampaignEvent) over the full projected stream
 *   (b) hydrate(snapshot at N) then fold the tail after N
 * and throws if those states are not deeply equal. Tests loop this
 * over every N in 0..head rather than pinning a single cut.
 */

import type { IVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import type { ICampaignGrantDeliveryItem } from './campaignDeliveryTypes';
import type { IScopedCampaignSnapshot } from './campaignGrantSnapshotTypes';
import type { IProjectCampaignStreamDeps } from './projectCampaignStreamForGrant';

import { buildScopedCampaignSnapshot } from './buildScopedCampaignSnapshot';
import {
  campaignJsonEquals,
  foldCampaignGrantDeliveryItems,
  hydrateCampaignGrantFromSnapshot,
} from './foldCampaignGrantDelivery';
import { projectCampaignStreamForGrant } from './projectCampaignStreamForGrant';

export class ScopedSnapshotEquivalenceError extends Error {
  public readonly name = 'ScopedSnapshotEquivalenceError';

  /**
   * Names the cut that disagreed and keeps both ledgers so a failing
   * test can print the actual divergence instead of a boolean.
   */
  public constructor(
    readonly asOfDeliverySequence: number,
    readonly fullReplay: ICampaignAuthoritativeState,
    readonly snapshotPlusTail: ICampaignAuthoritativeState,
  ) {
    super(
      'scoped snapshot at deliverySequence ' +
        String(asOfDeliverySequence) +
        ' disagrees with full scoped replay',
    );
  }
}

export interface IScopedSnapshotEquivalenceProof {
  readonly asOfDeliverySequence: number;
  readonly tailLength: number;
  readonly inScopeCount: number;
  readonly fullReplay: ICampaignAuthoritativeState;
  readonly snapshotPlusTail: ICampaignAuthoritativeState;
  readonly snapshot: IScopedCampaignSnapshot;
  readonly tail: readonly ICampaignGrantDeliveryItem[];
}

/**
 * Projects the grant once, builds the snapshot at N through the public
 * builder, hydrates snapshot plus tail, and asserts deep equality with
 * the full scoped fold. Throws ScopedSnapshotEquivalenceError on
 * disagreement so a single cut-point bug cannot hide behind a later
 * passing cut.
 */
export async function verifyScopedSnapshotEquivalence(
  deps: IProjectCampaignStreamDeps,
  request: {
    readonly principal: IVerifiedPrincipal;
    readonly grantId: string;
    readonly asOfDeliverySequence: number;
    readonly nowIso: string;
  },
): Promise<IScopedSnapshotEquivalenceProof> {
  const page = await projectCampaignStreamForGrant(deps, {
    principal: request.principal,
    grantId: request.grantId,
    cursor: null,
  });
  if (page.kind !== 'page') {
    throw new Error(
      'equivalence harness requires a projected page, got ' + page.kind,
    );
  }
  const built = await buildScopedCampaignSnapshot(deps, {
    principal: request.principal,
    grantId: request.grantId,
    asOfDeliverySequence: request.asOfDeliverySequence,
    nowIso: request.nowIso,
  });
  if (built.kind !== 'snapshot') {
    throw new Error(
      'equivalence harness requires a snapshot, got ' + built.kind,
    );
  }

  const campaignId = built.snapshot.campaignId;
  const fullReplay = foldCampaignGrantDeliveryItems(campaignId, page.items);
  const snapshotPlusTail = hydrateCampaignGrantFromSnapshot(
    built.snapshot,
    built.tail,
  );

  if (!campaignJsonEquals(fullReplay, snapshotPlusTail)) {
    throw new ScopedSnapshotEquivalenceError(
      request.asOfDeliverySequence,
      fullReplay,
      snapshotPlusTail,
    );
  }

  return {
    asOfDeliverySequence: request.asOfDeliverySequence,
    tailLength: built.tail.length,
    inScopeCount: page.items.length,
    fullReplay,
    snapshotPlusTail,
    snapshot: built.snapshot,
    tail: built.tail,
  };
}

/**
 * Runs verifyScopedSnapshotEquivalence for every cut 0..head inclusive.
 * Head is the last in-scope deliverySequence (0 when the page is empty).
 */
export async function verifyScopedSnapshotEquivalenceAtEveryCut(
  deps: IProjectCampaignStreamDeps,
  request: {
    readonly principal: IVerifiedPrincipal;
    readonly grantId: string;
    readonly nowIso: string;
  },
): Promise<readonly IScopedSnapshotEquivalenceProof[]> {
  const page = await projectCampaignStreamForGrant(deps, {
    principal: request.principal,
    grantId: request.grantId,
    cursor: null,
  });
  if (page.kind !== 'page') {
    throw new Error(
      'every-cut harness requires a projected page, got ' + page.kind,
    );
  }
  const head = page.items[page.items.length - 1]?.deliverySequence ?? 0;
  const proofs: IScopedSnapshotEquivalenceProof[] = [];
  for (let asOf = 0; asOf <= head; asOf += 1) {
    proofs.push(
      await verifyScopedSnapshotEquivalence(deps, {
        principal: request.principal,
        grantId: request.grantId,
        asOfDeliverySequence: asOf,
        nowIso: request.nowIso,
      }),
    );
  }
  return proofs;
}
