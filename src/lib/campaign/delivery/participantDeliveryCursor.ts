/**
 * Durable participant delivery cursors (task 5.5; design D4/D5, merging
 * the 3.2/3.5 delivery seams).
 *
 * Task 5.4 left every cursor in per-socket memory: a reconnect had to
 * supply its own, and a client that lost its cursor re-read the whole
 * stream. This records, per (campaign, grant, participant), the highest
 * per-grant delivery sequence the participant has reported APPLYING, so
 * a resume starts where the participant actually got to.
 *
 * Three things the record must never become:
 *
 * - **An authority on membership.** The cursor is a convenience. Every
 *   acknowledgement re-derives authorization from the grant store and
 *   the viewer resolver, so a revoked participant cannot keep moving a
 *   cursor just because a row with their name on it exists.
 * - **A channel that leaks.** An unauthorized acknowledgement gets ONE
 *   uniform refusal that reveals nothing - not whether the campaign
 *   exists, not whether the epoch is real, not how far the stream has
 *   run. "Revoked yesterday" and "never had a grant" are indistinguishable
 *   from outside.
 * - **A way to claim what was never delivered.** An acknowledgement past
 *   the highest sequence the server actually assigned is a gap, refused
 *   rather than stored, because a cursor that runs ahead of delivery
 *   would skip those events forever on the next resume.
 *
 * Sequences are only comparable WITHIN a delivery epoch, so the epoch is
 * stored beside the number and an acknowledgement naming a different one
 * is refused as foreign - reusing the task-3.3 fault vocabulary rather
 * than minting a second one.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D5)
 */

import type { Database } from 'better-sqlite3';

import type { IAuthorizedViewer } from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import {
  AuthorizedViewerError,
  isAuthorizedViewer,
  type IVerifiedPrincipal,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';

import type { IProjectCampaignStreamDeps } from './projectCampaignStreamForGrant';

import { CAMPAIGN_STREAM_TYPE } from '../sync/JournalCampaignEventStore';
import { CAMPAIGN_GRANT_PROJECTOR_VERSION } from './campaignDeliveryTypes';
import {
  isCampaignGrantActive,
  MembershipSourceUnavailableError,
} from './CampaignGrantMembershipSource';

/** One participant's durable place in a grant's delivery stream. */
export interface IParticipantDeliveryCursor {
  readonly campaignId: string;
  readonly grantId: string;
  readonly participantId: string;
  readonly deliveryEpochId: string;
  readonly ackedSequence: number;
}

/**
 * The one refusal an unauthorized caller ever sees. Deliberately carries
 * no detail: any variation here would answer questions the caller is not
 * entitled to ask.
 */
export const PARTICIPANT_CURSOR_NOT_AUTHORIZED = 'not-authorized';

export type ParticipantAckResult =
  | { readonly kind: 'applied'; readonly cursor: IParticipantDeliveryCursor }
  | { readonly kind: 'stale'; readonly cursor: IParticipantDeliveryCursor }
  | { readonly kind: 'gap'; readonly highestAssigned: number }
  | { readonly kind: 'foreign-epoch'; readonly currentEpochId: string }
  | {
      readonly kind: 'not-authorized';
      readonly reason: typeof PARTICIPANT_CURSOR_NOT_AUTHORIZED;
    };

export interface IParticipantAckRequest {
  readonly principal: IVerifiedPrincipal;
  readonly grantId: string;
  readonly deliveryEpochId: string;
  readonly ackedSequence: number;
}

interface ICursorRow {
  readonly campaign_id: string;
  readonly grant_id: string;
  readonly participant_id: string;
  readonly delivery_epoch_id: string;
  readonly acked_sequence: number;
}

/** Constant refusal, so no call site can accidentally vary the shape. */
function notAuthorized(): ParticipantAckResult {
  return Object.freeze({
    kind: 'not-authorized' as const,
    reason: PARTICIPANT_CURSOR_NOT_AUTHORIZED,
  });
}

function rowToCursor(row: ICursorRow): IParticipantDeliveryCursor {
  return {
    campaignId: row.campaign_id,
    grantId: row.grant_id,
    participantId: row.participant_id,
    deliveryEpochId: row.delivery_epoch_id,
    ackedSequence: row.acked_sequence,
  };
}

/** Reads the stored cursor, or null when this participant has none. */
export function readParticipantDeliveryCursor(
  db: Database,
  key: {
    readonly campaignId: string;
    readonly grantId: string;
    readonly participantId: string;
  },
): IParticipantDeliveryCursor | null {
  const row = db
    .prepare(
      `SELECT campaign_id, grant_id, participant_id, delivery_epoch_id,
              acked_sequence
         FROM campaign_participant_cursor
        WHERE campaign_id = ? AND grant_id = ? AND participant_id = ?`,
    )
    .get(key.campaignId, key.grantId, key.participantId) as
    | ICursorRow
    | undefined;
  return row === undefined ? null : rowToCursor(row);
}

/**
 * The highest delivery sequence the server has actually assigned in an
 * epoch. An acknowledgement beyond it is a claim about events that were
 * never sent.
 */
function highestAssignedSequence(
  deps: IProjectCampaignStreamDeps,
  deliveryEpochId: string,
): number {
  let highest = 0;
  for (;;) {
    const page = deps.deliveryStore.readMappings(deliveryEpochId, highest, 500);
    if (page.length === 0) return highest;
    highest = page[page.length - 1].deliverySequence;
  }
}

/**
 * Records a participant's applied high-water mark.
 *
 * Authorization is re-derived here rather than trusted from the socket:
 * a grant revoked mid-session must stop moving its cursor at the moment
 * of revocation, not at the moment the holder happens to disconnect.
 */
export async function recordParticipantAcknowledgement(
  db: Database,
  deps: IProjectCampaignStreamDeps,
  request: IParticipantAckRequest,
  nowIso: string,
): Promise<ParticipantAckResult> {
  if (
    !Number.isInteger(request.ackedSequence) ||
    request.ackedSequence < 0 ||
    request.deliveryEpochId.trim() === ''
  ) {
    return notAuthorized();
  }

  let grant;
  try {
    grant = deps.grantStore.getGrant(request.grantId);
  } catch (error) {
    // Infrastructure, never a verdict about the holder (task 3.3 split).
    throw new MembershipSourceUnavailableError(
      'Campaign grant read failed',
      error,
    );
  }
  if (
    grant === null ||
    request.principal.principalId !== grant.participantId ||
    !isCampaignGrantActive(grant, deps.clock())
  ) {
    return notAuthorized();
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
      return notAuthorized();
    }
    throw error;
  }
  if (!isAuthorizedViewer(viewer)) {
    return notAuthorized();
  }

  const baseline = deps.deliveryStore.resolveEpoch(viewer, {
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: grant.campaignId,
    projectorVersion: CAMPAIGN_GRANT_PROJECTOR_VERSION,
  });
  if (baseline.deliveryEpochId !== request.deliveryEpochId) {
    // The participant is acknowledging a generation that is no longer
    // theirs. Advancing the cursor on it would carry a number from one
    // numbering into another, which is how a resume silently skips.
    return { kind: 'foreign-epoch', currentEpochId: baseline.deliveryEpochId };
  }

  const stored = readParticipantDeliveryCursor(db, {
    campaignId: grant.campaignId,
    grantId: grant.grantId,
    participantId: grant.participantId,
  });
  if (
    stored !== null &&
    stored.deliveryEpochId === request.deliveryEpochId &&
    request.ackedSequence <= stored.ackedSequence
  ) {
    // A re-acknowledgement is ordinary client behaviour after a retry,
    // not a fault. The cursor only ever moves forward.
    return { kind: 'stale', cursor: stored };
  }

  const highestAssigned = highestAssignedSequence(
    deps,
    request.deliveryEpochId,
  );
  if (request.ackedSequence > highestAssigned) {
    return { kind: 'gap', highestAssigned };
  }

  const cursor: IParticipantDeliveryCursor = {
    campaignId: grant.campaignId,
    grantId: grant.grantId,
    participantId: grant.participantId,
    deliveryEpochId: request.deliveryEpochId,
    ackedSequence: request.ackedSequence,
  };
  db.prepare(
    `INSERT INTO campaign_participant_cursor
       (campaign_id, grant_id, participant_id, delivery_epoch_id,
        acked_sequence, updated_at)
     VALUES (@campaignId, @grantId, @participantId, @deliveryEpochId,
             @ackedSequence, @updatedAt)
     ON CONFLICT(campaign_id, grant_id, participant_id) DO UPDATE SET
       delivery_epoch_id = @deliveryEpochId,
       acked_sequence = @ackedSequence,
       updated_at = @updatedAt`,
  ).run({ ...cursor, updatedAt: nowIso });
  return { kind: 'applied', cursor };
}
