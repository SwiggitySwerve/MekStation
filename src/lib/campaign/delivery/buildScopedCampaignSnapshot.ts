/**
 * Scoped CampaignSnapshotPublished builder (design D4, task 3.4).
 *
 * Derives one grant's snapshot from projectCampaignStreamForGrant so
 * the scope predicate cannot drift from live delivery. The snapshot
 * state is the fold of in-scope items up to asOfDeliverySequence.
 * Out-of-scope material is absent because those items never enter the
 * fold, not because a second filter redacts them afterwards.
 *
 * Restricted-grant ICampaignAuthoritativeState handling:
 *   campaignId     copied from the grant (identity, not a count)
 *   day            last in-scope CampaignDayAdvanced, else 0
 *   balance        last in-scope FundsChanged.balance, else 0
 *   rosterUnits    only units written by in-scope RosterUnitChanged /
 *                  SalvageAllocated recoveredUnit; GM-only units absent
 *   forceUnits     never written by any current reducer; stays {}
 *   pilots         only in-scope PilotHired; GM-only pilots absent
 *   contracts      only in-scope ContractAccepted
 *   factionStanding never written by any current reducer; stays {}
 *   salvagePool    last in-scope SalvageAllocated.poolRemaining, else 0
 * Empty maps and zero counters are the empty ledger, not a withheld
 * count: two streams that differ only in withheld events serialize to
 * the same restricted snapshot after id normalization.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4)
 */

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { IVerifiedPrincipal } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { CampaignEventScope } from '@/types/campaign/CampaignSync';

import type {
  ICampaignGrantDeliveryItem,
  IProjectCampaignStreamPage,
  ProjectCampaignStreamResult,
} from './campaignDeliveryTypes';
import type {
  IScopedCampaignSnapshot,
  IServedScopedCampaignSnapshot,
  ISnapshotCutRejected,
  ISnapshotGrantMismatch,
} from './campaignGrantSnapshotTypes';
import type { IProjectCampaignStreamDeps } from './projectCampaignStreamForGrant';

import { CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON } from './campaignDeliveryTypes';
import { MembershipSourceUnavailableError } from './CampaignGrantMembershipSource';
import {
  CAMPAIGN_GRANT_SNAPSHOT_AUTHOR,
  SNAPSHOT_CUT_INVALID_REASON,
  SNAPSHOT_CUT_PAST_HEAD_REASON,
  SNAPSHOT_GRANT_MISMATCH_REASON,
} from './campaignGrantSnapshotTypes';
import { foldCampaignGrantDeliveryItems } from './foldCampaignGrantDelivery';
import { projectCampaignStreamForGrant } from './projectCampaignStreamForGrant';

export type {
  IScopedCampaignSnapshot,
  IServedScopedCampaignSnapshot,
  ISnapshotCutRejected,
  ISnapshotGrantMismatch,
} from './campaignGrantSnapshotTypes';
export {
  CAMPAIGN_GRANT_SNAPSHOT_AUTHOR,
  SNAPSHOT_CUT_INVALID_REASON,
  SNAPSHOT_CUT_PAST_HEAD_REASON,
  SNAPSHOT_GRANT_MISMATCH_REASON,
} from './campaignGrantSnapshotTypes';

export interface IBuildScopedCampaignSnapshotRequest {
  readonly principal: IVerifiedPrincipal;
  readonly grantId: string;
  /**
   * Inclusive per-grant sequence the snapshot encodes. 0 is the empty
   * ledger. Omitted means the current projected head.
   */
  readonly asOfDeliverySequence?: number;
  /** Injected snapshot timestamp; delivery modules never read the clock. */
  readonly nowIso: string;
}

export interface IBuiltScopedCampaignSnapshot {
  readonly kind: 'snapshot';
  readonly snapshot: IScopedCampaignSnapshot;
  readonly tail: readonly ICampaignGrantDeliveryItem[];
  readonly page: IProjectCampaignStreamPage;
}

export type BuildScopedCampaignSnapshotResult =
  | IBuiltScopedCampaignSnapshot
  | Exclude<ProjectCampaignStreamResult, IProjectCampaignStreamPage>
  | ISnapshotCutRejected;

/**
 * Last contiguous deliverySequence in a page, or 0 when the grant has
 * no in-scope items yet.
 */
export function projectedHeadDeliverySequence(
  items: readonly ICampaignGrantDeliveryItem[],
): number {
  const last = items[items.length - 1];
  return last === undefined ? 0 : last.deliverySequence;
}

/**
 * Splits a projected page into the prefix encoded by the snapshot and
 * the tail the replica must still apply. asOf 0 yields an empty prefix.
 */
export function sliceProjectedPageAtSequence(
  items: readonly ICampaignGrantDeliveryItem[],
  asOfDeliverySequence: number,
): {
  readonly prefix: readonly ICampaignGrantDeliveryItem[];
  readonly tail: readonly ICampaignGrantDeliveryItem[];
} {
  const prefix: ICampaignGrantDeliveryItem[] = [];
  const tail: ICampaignGrantDeliveryItem[] = [];
  for (const item of items) {
    if (item.deliverySequence <= asOfDeliverySequence) {
      prefix.push(item);
    } else {
      tail.push(item);
    }
  }
  return { prefix: Object.freeze(prefix), tail: Object.freeze(tail) };
}

/**
 * First canonical grant scope, used only as the synthetic snapshot
 * event's envelope scope so the frame stays inside the grant vocabulary.
 */
function snapshotScopeFromGrant(grant: ICampaignGrant): CampaignEventScope {
  const first = grant.scopes[0];
  if (first === undefined) {
    throw new Error('active grant is missing a canonical scope');
  }
  return first;
}

/**
 * Pure snapshot construction from an already-projected page. Callers
 * that already have a page (the channel join) must use this rather than
 * projecting a second time over a moving journal.
 */
export function scopedSnapshotFromProjectedPage(args: {
  readonly grant: ICampaignGrant;
  readonly page: IProjectCampaignStreamPage;
  readonly asOfDeliverySequence: number;
  readonly nowIso: string;
}): IBuiltScopedCampaignSnapshot | ISnapshotCutRejected {
  if (
    !Number.isInteger(args.asOfDeliverySequence) ||
    args.asOfDeliverySequence < 0
  ) {
    return {
      kind: 'cut-rejected',
      reason: SNAPSHOT_CUT_INVALID_REASON,
    };
  }
  const head = projectedHeadDeliverySequence(args.page.items);
  if (args.asOfDeliverySequence > head) {
    return {
      kind: 'cut-rejected',
      reason: SNAPSHOT_CUT_PAST_HEAD_REASON,
    };
  }
  const sliced = sliceProjectedPageAtSequence(
    args.page.items,
    args.asOfDeliverySequence,
  );
  const snapshot: IScopedCampaignSnapshot = Object.freeze({
    grantId: args.grant.grantId,
    campaignId: args.grant.campaignId,
    deliveryEpochId: args.page.deliveryEpochId,
    baseline: args.page.baseline,
    asOfDeliverySequence: args.asOfDeliverySequence,
    snapshotScope: snapshotScopeFromGrant(args.grant),
    ts: args.nowIso,
    authorPlayerId: CAMPAIGN_GRANT_SNAPSHOT_AUTHOR,
    state: foldCampaignGrantDeliveryItems(args.grant.campaignId, sliced.prefix),
  });
  return {
    kind: 'snapshot',
    snapshot,
    tail: sliced.tail,
    page: args.page,
  };
}

/**
 * Loads the grant after a successful projection. A disappearing row
 * becomes membership refusal rather than a snapshot for a ghost grant.
 */
function loadGrantAfterProjection(
  deps: IProjectCampaignStreamDeps,
  grantId: string,
): ICampaignGrant | null {
  try {
    return deps.grantStore.getGrant(grantId);
  } catch (error) {
    if (error instanceof MembershipSourceUnavailableError) throw error;
    throw new MembershipSourceUnavailableError(
      'Campaign grant read failed',
      error,
    );
  }
}

/**
 * Builds a scoped snapshot for one grant by reusing the delivery
 * projector (the only scope filter). asOfDeliverySequence omitted
 * means the projected head, which is the late-join compression cut.
 */
export async function buildScopedCampaignSnapshot(
  deps: IProjectCampaignStreamDeps,
  request: IBuildScopedCampaignSnapshotRequest,
): Promise<BuildScopedCampaignSnapshotResult> {
  const projected = await projectCampaignStreamForGrant(deps, {
    principal: request.principal,
    grantId: request.grantId,
    cursor: null,
  });
  if (projected.kind !== 'page') {
    return projected;
  }
  const grant = loadGrantAfterProjection(deps, request.grantId);
  if (grant === null) {
    return {
      kind: 'refused',
      reason: CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON,
    };
  }
  const asOf =
    request.asOfDeliverySequence === undefined
      ? projectedHeadDeliverySequence(projected.items)
      : request.asOfDeliverySequence;
  return scopedSnapshotFromProjectedPage({
    grant,
    page: projected,
    asOfDeliverySequence: asOf,
    nowIso: request.nowIso,
  });
}

/**
 * Serving gate: a snapshot is only handed to the grant it was built
 * for. A mismatched grantId is a typed refusal, never a foreign
 * baseline on the wire.
 */
export function serveScopedCampaignSnapshot(
  snapshot: IScopedCampaignSnapshot,
  forGrantId: string,
): IServedScopedCampaignSnapshot | ISnapshotGrantMismatch {
  if (snapshot.grantId !== forGrantId) {
    return {
      kind: 'refused',
      reason: SNAPSHOT_GRANT_MISMATCH_REASON,
    };
  }
  return { kind: 'served', snapshot };
}
