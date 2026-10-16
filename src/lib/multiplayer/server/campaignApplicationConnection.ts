import type Database from 'better-sqlite3';

import type {
  CampaignEventScope,
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type {
  ICampaignAppliedView,
  ICampaignApplicationAck,
  ICampaignApplicationOffer,
  IClientMessage,
  IErrorCode,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { campaignBranchSegmentReader } from '@/lib/campaign/rebuild/campaignBranchSegmentReader';
import { campaignViewerAuthorityFingerprint } from '@/lib/campaign/sync/campaignPublicAppliedView';
import { projectCampaignForViewer } from '@/lib/campaign/sync/campaignViewerProjection';
import {
  CAMPAIGN_STREAM_TYPE,
  envelopeOf,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import {
  materializeBranchPath,
  resolveBranchPath,
} from '@/lib/events/journal/EventHistoryBranchResolver';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { activeCampaignSessionMembership } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchSocket } from './ServerMatchSocketTypes';

import { selectCampaignMissionLaunches } from './campaignMissionLaunchReplay';
import { campaignScopeAdmits } from './campaignWireScopeBoundary';

/** The campaign database the P2CA applied-view owner commits on. */
export interface ICampaignApplicationReceiptPort {
  readonly database: () => Database.Database;
}

export const NOT_OFFERED = 'campaign-application-not-offered';
export const COMMIT_ATTEMPTS = 3;
/** Thrown inside the P2CA transaction when the head moved past the prepared cut. */
export const HEAD_DRIFT = new Error('campaign-application-head-drift');

export function isApplicationAck(
  message: IClientMessage | ICampaignApplicationAck,
): message is ICampaignApplicationAck {
  return message.kind === 'CampaignAck' && message.appliedView !== undefined;
}

export const sameAppliedView = (
  a: ICampaignAppliedView,
  b: ICampaignAppliedView,
) =>
  a.viewId === b.viewId &&
  a.receiptId === b.receiptId &&
  a.previousReceiptId === b.previousReceiptId;

/** One participant's verified public view at one captured journal cut. */
export interface IPublicCut {
  readonly branchId: string;
  readonly effectiveGeneration: number;
  readonly revision: number;
  readonly viewerAuthorityFingerprint: string;
  readonly removed: boolean;
  readonly state: ICampaignAuthoritativeState;
  readonly launches: readonly ICampaignEvent[];
  readonly visible: readonly { event: ICampaignEvent; revision: number }[];
}

/**
 * Head, branch path and durable seat are captured in one read transaction;
 * the captured path is materialized outside SQL and must reach the captured
 * digest. Projection, withholding and launch selection are the existing
 * owners'. Null when the participant holds no active seat.
 */
export async function preparePublicCut(
  db: Database.Database,
  campaignId: string,
  sessionId: string,
  participantId: string,
): Promise<IPublicCut | null> {
  const stream = { streamType: CAMPAIGN_STREAM_TYPE, streamId: campaignId };
  const branches = new SQLiteEventHistoryBranchStore(db);
  const captured = db.transaction(() => {
    const head = readEffectiveStreamHead(db, branches, stream);
    return {
      head,
      generation: branches.requireEffectiveHead(stream).effectiveGeneration,
      path: resolveBranchPath(branches, stream, head.branchId, head.revision),
      membership: activeCampaignSessionMembership(
        campaignId,
        sessionId,
        participantId,
      ),
    };
  })();
  if (captured.membership === null) return null;
  const stored = await materializeBranchPath(
    campaignBranchSegmentReader(
      new SQLiteEventJournal<ICampaignJournalEnvelope>(db),
    ),
    captured.path,
  );
  const reached =
    stored.at(-1)?.eventDigest ?? captured.path.segments[0].baseDigest;
  if (reached !== captured.head.digest) {
    throw new Error('campaign-application-history-integrity');
  }
  const events = stored.map(envelopeOf);
  const viewer = { participantId, isGm: captured.membership.seat === 'gm' };
  const admits = (scope: CampaignEventScope) =>
    campaignScopeAdmits(scope, viewer);
  const { visible, state } = projectCampaignForViewer(
    campaignId,
    events,
    admits,
  );
  const revisionOf = new Map(
    events.map((event, index) => [event, stored[index].streamRevision]),
  );
  return {
    branchId: captured.head.branchId,
    effectiveGeneration: captured.generation,
    revision: captured.head.revision,
    viewerAuthorityFingerprint: campaignViewerAuthorityFingerprint(
      captured.membership,
      viewer,
    ),
    // From the whole verified history, so it holds before the seat heals.
    removed: events.some(
      (event) =>
        event.type === 'ParticipantRemoved' &&
        event.payload.participantId === participantId,
    ),
    state,
    // `visible` is already bounded by the captured cut.
    launches: selectCampaignMissionLaunches(visible, Infinity, admits),
    visible: visible.map((event) => ({
      event,
      revision: revisionOf.get(event) ?? 0,
    })),
  };
}

export interface IApplicationCandidate {
  readonly frame: ICampaignApplicationOffer;
  readonly cut: number;
}

export interface IApplicationView {
  readonly viewId: string;
  readonly abort: AbortController;
  authority: Pick<
    IPublicCut,
    'branchId' | 'effectiveGeneration' | 'viewerAuthorityFingerprint'
  > | null;
  latest: IApplicationCandidate | null;
  inFlight: IApplicationCandidate | null;
  pendingAck: ICampaignAppliedView | null;
  chain: Promise<void>;
  refreshQueued: boolean;
}

export function errorFrame(
  matchId: string,
  code: IErrorCode,
  reason: string,
  intentId?: string,
): Extract<IServerMessage, { kind: 'Error' }> {
  return {
    kind: 'Error',
    matchId,
    ts: nowIso(),
    code,
    reason,
    ...(intentId ? { intentId } : {}),
  };
}

export function send(socket: IMatchSocket, message: IServerMessage): void {
  if (socket.readyState !== 1) return;
  try {
    socket.send(JSON.stringify(message));
  } catch {
    // A downstream socket is allowed to fail; the SOURCE is not allowed
    // to fail with it. A real socket throws from send when it is closing
    // or already closed, and this helper is called from the close path
    // itself - which runs inside a catch handler, so a throw here would
    // escape the handler entirely and surface as an unhandled rejection
    // in the source process. One-way data flow means a consumer can lose
    // frames, never that it can throw into the server.
  }
}
