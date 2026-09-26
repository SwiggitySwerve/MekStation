/**
 * Per-grant campaign stream projection (design D4, task 3.2).
 *
 * Reads the campaign journal, keeps events whose stamped scope is in
 * the grant set (grantAllowsScope; no table outside the event), and
 * assigns contiguous per-grant sequences through the privacy-owned
 * delivery epoch. Out-of-scope events are absent: no stubs, no gaps,
 * no journal positions on the wire.
 *
 * This does not call projectWithCursor. That helper is bound to
 * ViewerProjectionService audience facts; composing it would assign
 * sequences to withheld identities or require a fake public projector.
 * The scope filter therefore forces a separate path. The cursor-first
 * control flow is the same: validateCursor before any projection or
 * assignSequences; a stale cursor returns the typed baseline only.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4)
 */

import type {
  IEventJournal,
  IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';
import type {
  IAuthorizedViewer,
  IVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import type { IDeliveryCursor } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { IDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type {
  CampaignEventType,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
} from '@/lib/events/journal/EventJournalContract';
import {
  AuthorizedViewerError,
  AuthorizedViewerResolver,
  isAuthorizedViewer,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  DELIVERY_EPOCH_MESSAGES,
  DeliveryEpochError,
} from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';

import type { ICampaignGrantStore } from '../grants/ICampaignGrantStore';
import type { ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import type {
  CampaignGrantClock,
  ICampaignGrantDeliveryItem,
  ICampaignGrantProjectedEvent,
  ProjectCampaignStreamResult,
} from './campaignDeliveryTypes';

import { grantAllowsScope } from '../grants/campaignGrantGuards';
import { campaignBaselineReachesViewer } from '../sync/campaignViewerProjection';
import {
  CAMPAIGN_STREAM_TYPE,
  envelopeOf,
} from '../sync/JournalCampaignEventStore';
import {
  CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON,
  CAMPAIGN_GRANT_PROJECTOR_VERSION,
} from './campaignDeliveryTypes';
import {
  isCampaignGrantActive,
  MembershipSourceUnavailableError,
} from './CampaignGrantMembershipSource';

export interface IProjectCampaignStreamDeps {
  readonly grantStore: ICampaignGrantStore;
  readonly viewerResolver: AuthorizedViewerResolver;
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
  readonly deliveryStore: IDeliveryEpochStore;
  readonly clock: CampaignGrantClock;
}

export interface IProjectCampaignStreamRequest {
  readonly principal: IVerifiedPrincipal;
  readonly grantId: string;
  readonly cursor: IDeliveryCursor | null;
}

/** Constant refused result: membership never minted a viewer. */
function refusedResult(): ProjectCampaignStreamResult {
  return Object.freeze({
    kind: 'refused' as const,
    reason: CAMPAIGN_GRANT_DELIVERY_REFUSED_REASON,
  });
}

/**
 * Loads one grant, mapping store throws to the typed unavailable
 * error so a driver failure cannot become an empty delivery.
 */
function loadGrant(store: ICampaignGrantStore, grantId: string) {
  try {
    return store.getGrant(grantId);
  } catch (error) {
    if (error instanceof MembershipSourceUnavailableError) throw error;
    throw new MembershipSourceUnavailableError(
      'Campaign grant read failed',
      error,
    );
  }
}

/**
 * Pages the campaign journal in order. Identity for sequence mapping is
 * the stored eventDigest, matching projectWithIdentities.
 */
async function readCampaignJournal(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  campaignId: string,
): Promise<readonly IStoredEvent<ICampaignJournalEnvelope>[]> {
  const stored: IStoredEvent<ICampaignJournalEnvelope>[] = [];
  let afterRevision = 0;
  for (;;) {
    const page = await journal.readStream({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: campaignId,
      branchId: ROOT_EVENT_BRANCH_ID,
      afterRevision,
      limit: EVENT_JOURNAL_MAX_PAGE_SIZE,
    });
    for (const row of page) stored.push(row);
    if (page.length < EVENT_JOURNAL_MAX_PAGE_SIZE) return stored;
    const last = page[page.length - 1];
    if (last === undefined) return stored;
    afterRevision = last.streamRevision;
  }
}

/**
 * Copies one narrowed campaign event without the source sequence so
 * the discriminant and payload stay paired.
 */
function freezeProjected<T extends CampaignEventType>(
  event: ICampaignEvent<T>,
): Omit<ICampaignEvent<T>, 'sequence'> {
  const { sequence: _sequence, ...rest } = event;
  return Object.freeze(rest);
}

/**
 * Drops the source stream sequence so the wire event cannot reveal
 * global positions. Other envelope fields (including campaignId and
 * stamped scope) stay intact. The switch keeps the per-type payload
 * paired with `type` after sequence is omitted.
 */
function toProjectedCampaignEvent(
  event: ICampaignEvent,
): ICampaignGrantProjectedEvent {
  switch (event.type) {
    case 'CampaignDayAdvanced':
      return freezeProjected(event);
    case 'FundsChanged':
      return freezeProjected(event);
    case 'PilotHired':
      return freezeProjected(event);
    case 'ContractAccepted':
      return freezeProjected(event);
    case 'RosterUnitChanged':
      return freezeProjected(event);
    case 'SalvageAllocated':
      return freezeProjected(event);
    case 'ParticipantRemoved':
      return freezeProjected(event);
    case 'CampaignSnapshotPublished':
      return freezeProjected(event);
  }
}

/** Stream plus projector version for the privacy-owned epoch 8-tuple. */
function epochRequest(campaignId: string) {
  return {
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: campaignId,
    projectorVersion: CAMPAIGN_GRANT_PROJECTOR_VERSION,
  };
}

/**
 * Projects the campaign stream for one grant. A revoked, expired, or
 * unknown grant is refused at membership (no viewer). An active grant
 * whose scopes match nothing is a page with zero items.
 */
export async function projectCampaignStreamForGrant(
  deps: IProjectCampaignStreamDeps,
  request: IProjectCampaignStreamRequest,
): Promise<ProjectCampaignStreamResult> {
  const grant = loadGrant(deps.grantStore, request.grantId);
  if (
    grant === null ||
    request.principal.principalId !== grant.participantId ||
    !isCampaignGrantActive(grant, deps.clock())
  ) {
    return refusedResult();
  }

  let viewer: IAuthorizedViewer;
  try {
    viewer = await deps.viewerResolver.resolve(
      request.principal,
      grant.campaignId,
    );
  } catch (error) {
    if (
      error instanceof AuthorizedViewerError &&
      error.code === 'no-active-membership'
    ) {
      return refusedResult();
    }
    throw error;
  }
  if (!isAuthorizedViewer(viewer)) {
    throw new DeliveryEpochError(
      'not-a-viewer',
      DELIVERY_EPOCH_MESSAGES.notAViewer,
    );
  }

  const requestEpoch = epochRequest(grant.campaignId);
  if (request.cursor !== null) {
    const validation = deps.deliveryStore.validateCursor(
      viewer,
      requestEpoch,
      request.cursor,
    );
    if (validation.kind === 'stale-epoch') {
      return Object.freeze({
        kind: 'stale-epoch' as const,
        message: validation.message,
        newBaseline: validation.newBaseline,
      });
    }
  }

  const baseline = deps.deliveryStore.resolveEpoch(viewer, requestEpoch);
  const storedEvents = await readCampaignJournal(
    deps.journal,
    grant.campaignId,
  );
  const visible: {
    readonly event: ICampaignEvent;
    readonly projectedEventIdentity: string;
  }[] = [];
  const admits = (scope: ICampaignEvent['scope']): boolean =>
    grantAllowsScope(grant, scope);
  // Latches on the first fact this grant may not see (an out-of-scope
  // fact or a refused baseline), as campaignViewerVisibleEvents does.
  let withheld = false;
  for (const stored of storedEvents) {
    // D12: the SINGLE narrowing from a stored row to a wire campaign event.
    // Never `stored.payload.*` inline here -- a journal-private sibling of
    // `campaignEvent` (the full contract, the remaining market) must be
    // unreachable from this path by construction, not by reviewer vigilance.
    const event = envelopeOf(stored);
    if (!admits(event.scope)) {
      withheld = true;
      continue;
    }
    // A stored CampaignSnapshotPublished carries the FULL authoritative
    // state and `applyCampaignEvent` REPLACES state wholesale with it,
    // and genesis, checkpoint and migration baselines are all stamped
    // `campaign`, so the scope check alone does not decide it. The
    // baseline law shared with the legacy arm does: a grant holding
    // `gm` and `campaign` receives every baseline; a restricted grant
    // never receives a migration import and receives any other baseline
    // only while nothing withheld precedes it.
    if (
      event.type === 'CampaignSnapshotPublished' &&
      !campaignBaselineReachesViewer(event, admits, withheld)
    ) {
      withheld = true;
      continue;
    }
    visible.push({
      event,
      projectedEventIdentity: stored.eventDigest,
    });
  }

  const identities = visible.map(function (entry) {
    return entry.projectedEventIdentity;
  });
  const assigned = deps.deliveryStore.assignSequences(
    baseline.deliveryEpochId,
    identities,
  );

  const items: ICampaignGrantDeliveryItem[] = [];
  for (let index = 0; index < visible.length; index += 1) {
    const entry = visible[index];
    const mapping = assigned[index];
    if (entry === undefined || mapping === undefined) {
      throw new DeliveryEpochError(
        'invalid-request',
        DELIVERY_EPOCH_MESSAGES.invalidRequest,
      );
    }
    const deliverySequence = mapping.deliverySequence;
    if (
      request.cursor !== null &&
      deliverySequence <= request.cursor.afterSequence
    ) {
      continue;
    }
    items.push(
      Object.freeze({
        deliverySequence,
        event: toProjectedCampaignEvent(entry.event),
      }),
    );
  }

  return Object.freeze({
    kind: 'page' as const,
    deliveryEpochId: baseline.deliveryEpochId,
    effectiveGeneration: baseline.effectiveGeneration,
    items: Object.freeze(items),
    baseline: Object.freeze({
      deliveryEpochId: baseline.deliveryEpochId,
      effectiveGeneration: baseline.effectiveGeneration,
    }),
  });
}
