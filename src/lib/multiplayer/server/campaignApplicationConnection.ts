import type Database from 'better-sqlite3';

import { randomUUID } from 'node:crypto';

import type { CampaignApplicationResult } from '@/lib/campaign/sync/campaignPublicAppliedView';
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
import {
  CampaignPublicAppliedViewStore,
  campaignViewerAuthorityFingerprint,
  readCampaignPublicAppliedView,
} from '@/lib/campaign/sync/campaignPublicAppliedView';
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

import type {
  ICampaignSessionMembershipPort,
  IWireCampaignSocket,
} from './bindCampaignSyncConnection';
import type { ICampaignHostRegistryEntry } from './CampaignHostRegistry';
import type { ServerMatchBroadcaster } from './ServerMatchBroadcaster';
import type { IMatchSocket } from './ServerMatchSocketTypes';

import { campaignEventWireFrame } from './campaignEventWireFrame';
import { selectCampaignMissionLaunches } from './campaignMissionLaunchReplay';
import { campaignScopeAdmits } from './campaignWireScopeBoundary';

/** The campaign database the P2CA applied-view owner commits on. */
export interface ICampaignApplicationReceiptPort {
  readonly database: () => Database.Database;
}

export const NOT_OFFERED = 'campaign-application-not-offered';
const COMMIT_ATTEMPTS = 3;
/** Thrown inside the P2CA transaction when the head moved past the prepared cut. */
const HEAD_DRIFT = new Error('campaign-application-head-drift');

export function isApplicationAck(
  message: IClientMessage | ICampaignApplicationAck,
): message is ICampaignApplicationAck {
  return message.kind === 'CampaignAck' && message.appliedView !== undefined;
}

const sameAppliedView = (a: ICampaignAppliedView, b: ICampaignAppliedView) =>
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
async function preparePublicCut(
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

interface IApplicationCandidate {
  readonly frame: ICampaignApplicationOffer;
  readonly cut: number;
}

interface IApplicationView {
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

/**
 * P2CE: one socket's public application view. Offers bind this socket, its
 * verified principal, campaign, session, and the prepared authority and
 * lineage. An offer is ESTABLISHED only by a confirmed write through the
 * lifecycle's own broadcaster, and each delta links to the latest
 * established offer. An ACK commits through P2CA only for the latest
 * established offer (or the one in flight, held until its write settles),
 * and the confirmation follows the commit. Every step of a view runs on one
 * serialized chain.
 * Nothing is cached durably: deltas are re-read from the verified journal
 * on each commit wakeup. A rejoin, close, removal, failed write or
 * authority change ends the view; reconnecting gets a fresh baseline.
 */
export class CampaignApplicationConnection {
  private view: IApplicationView | null = null;

  constructor(
    private readonly participantId: string,
    private readonly deps: {
      readonly socket: IWireCampaignSocket;
      readonly entry: ICampaignHostRegistryEntry;
      readonly matchId: string;
      readonly broadcaster: ServerMatchBroadcaster;
      readonly membership: ICampaignSessionMembershipPort;
      readonly receipts: ICampaignApplicationReceiptPort;
      readonly logger: Pick<Console, 'error'>;
      readonly close: (code: IErrorCode, reason: string) => void;
    },
  ) {}

  /** Hydrate a fresh view; true once its baseline is established. */
  open = async (): Promise<boolean> => {
    this.invalidate();
    const view: IApplicationView = {
      viewId: randomUUID(),
      abort: new AbortController(),
      authority: null,
      latest: null,
      inFlight: null,
      pendingAck: null,
      chain: Promise.resolve(),
      refreshQueued: false,
    };
    this.view = view;
    // Subscribed before the cut is prepared, so no commit falls between.
    const unsubscribe = this.deps.entry.host.subscribe(() => this.wake(view));
    view.abort.signal.addEventListener('abort', unsubscribe, { once: true });
    await this.enqueue(view, () => this.refresh(view));
    return this.current(view) && view.latest !== null;
  };

  invalidate = (): void => {
    this.view?.abort.abort();
    this.view = null;
  };

  /** Admit only the live view's exact in-flight or latest receipt. */
  acknowledge = (appliedView: ICampaignAppliedView): void => {
    const view = this.view;
    const names = (candidate: IApplicationCandidate | null) =>
      candidate !== null &&
      sameAppliedView(candidate.frame.appliedView, appliedView);
    if (view === null || !(names(view.inFlight) || names(view.latest))) {
      const reason = view
        ? 'campaign-application-unknown-receipt'
        : NOT_OFFERED;
      send(
        this.deps.socket,
        errorFrame(this.deps.matchId, 'INVALID_INTENT', reason),
      );
      return;
    }
    // One exact slot: an ACK of the in-flight offer waits for its write.
    view.pendingAck = appliedView;
    void this.enqueue(view, () => this.processAck(view));
  };

  private current = (view: IApplicationView): boolean =>
    this.view === view && !view.abort.signal.aborted;

  private wake(view: IApplicationView): void {
    if (view.refreshQueued) return;
    view.refreshQueued = true;
    void this.enqueue(view, async () => {
      view.refreshQueued = false;
      await this.refresh(view);
    });
  }

  private enqueue(view: IApplicationView, step: () => Promise<void>) {
    view.chain = view.chain
      .then(() => (this.current(view) ? step() : undefined))
      .catch((error: unknown) => {
        this.deps.logger.error(
          '[campaign-sync] application view failed',
          error,
        );
        this.fail(view, 'INTERNAL_ERROR', 'campaign-application-unavailable');
      });
    return view.chain;
  }

  private fail(view: IApplicationView, code: IErrorCode, reason: string) {
    if (!this.current(view)) return;
    this.invalidate();
    this.deps.close(code, reason);
  }

  private async refresh(view: IApplicationView): Promise<void> {
    const { matchId, entry } = this.deps;
    const cut = await preparePublicCut(
      this.deps.receipts.database(),
      entry.campaignId,
      matchId,
      this.participantId,
    );
    if (!this.current(view)) return;
    if (cut === null || cut.removed) {
      return this.fail(view, 'AUTH_REJECTED', 'membership-revoked');
    }
    const authority = view.authority ?? {
      branchId: cut.branchId,
      effectiveGeneration: cut.effectiveGeneration,
      viewerAuthorityFingerprint: cut.viewerAuthorityFingerprint,
    };
    if (
      authority.branchId !== cut.branchId ||
      authority.effectiveGeneration !== cut.effectiveGeneration ||
      authority.viewerAuthorityFingerprint !== cut.viewerAuthorityFingerprint
    ) {
      return this.fail(view, 'INTERNAL_ERROR', 'campaign-application-replaced');
    }
    view.authority = authority;
    const appliedView = (previousReceiptId: string | null) => ({
      viewId: view.viewId,
      receiptId: randomUUID(),
      previousReceiptId,
    });
    if (view.latest === null) {
      const ts = nowIso();
      await this.publish(view, {
        cut: cut.revision,
        frame: {
          kind: 'CampaignSnapshot',
          matchId,
          ts,
          event: {
            type: 'CampaignSnapshotPublished',
            sequence: -1,
            campaignId: entry.campaignId,
            ts,
            authorPlayerId: entry.hostPlayerId,
            scope: 'campaign',
            payload: { state: cut.state, matchId },
          },
          hydrationFacts: [...cut.launches],
          appliedView: appliedView(null),
        },
      });
      return;
    }
    for (const { event, revision } of cut.visible) {
      if (revision <= view.latest.cut) continue;
      const frame = campaignEventWireFrame(matchId, event);
      const previous = view.latest.frame.appliedView.receiptId;
      const candidate = { ...frame, appliedView: appliedView(previous) };
      if (!(await this.publish(view, { cut: revision, frame: candidate }))) {
        return;
      }
    }
  }

  /** Write one candidate; establish it only on a confirmed write. */
  private async publish(
    view: IApplicationView,
    candidate: IApplicationCandidate,
  ): Promise<boolean> {
    view.inFlight = candidate;
    const result = await this.deps.broadcaster.sendConfirmed(
      this.deps.socket,
      candidate.frame,
      view.abort.signal,
    );
    if (!this.current(view)) return false;
    if (result.kind !== 'sent') {
      this.fail(view, 'INTERNAL_ERROR', 'campaign-application-send-failed');
      return false;
    }
    const { entry, matchId } = this.deps;
    if (
      this.deps.membership.isRevoked(
        entry.campaignId,
        matchId,
        this.participantId,
      )
    ) {
      this.fail(view, 'AUTH_REJECTED', 'membership-revoked');
      return false;
    }
    // An ACK of the previous latest that arrived meanwhile is still current;
    // the candidate stays in flight, so its own ACK is admitted meanwhile.
    await this.processAck(view);
    if (!this.current(view)) return false;
    view.latest = candidate;
    view.inFlight = null;
    await this.processAck(view);
    return this.current(view);
  }

  private async processAck(view: IApplicationView): Promise<void> {
    const ack = view.pendingAck;
    const latest = view.latest;
    if (!ack || !latest || !sameAppliedView(ack, latest.frame.appliedView)) {
      return;
    }
    view.pendingAck = null;
    await this.commit(view, latest);
  }

  /**
   * Durable commit through P2CA, then the exact confirmation. A fresh
   * verified preparation runs outside SQL; the owner's transaction resolves
   * only this view's latest offer and refuses if the head moved since.
   */
  private async commit(
    view: IApplicationView,
    offer: IApplicationCandidate,
  ): Promise<void> {
    const { socket, entry, matchId } = this.deps;
    const receiptId = offer.frame.appliedView.receiptId;
    const key = {
      campaignId: entry.campaignId,
      sessionId: matchId,
      participantId: this.participantId,
    };
    const stream = {
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: key.campaignId,
    };
    for (let attempt = 0; attempt < COMMIT_ATTEMPTS; attempt += 1) {
      const cut = await preparePublicCut(
        this.deps.receipts.database(),
        key.campaignId,
        key.sessionId,
        key.participantId,
      );
      if (!this.current(view) || view.latest !== offer || !view.authority) {
        return;
      }
      const authority = view.authority;
      let result: CampaignApplicationResult;
      try {
        result = new CampaignPublicAppliedViewStore(
          this.deps.receipts.database(),
          {
            resolveDeliveredOffer: (handle, request) => {
              if (request.receiptId !== receiptId || view.latest !== offer) {
                return null;
              }
              // Every view is rooted at a complete authorized baseline, so
              // its cumulative offer is a baseline when no row exists and
              // otherwise validly replaces the stored row.
              const previous = readCampaignPublicAppliedView(handle, key);
              return {
                ...key,
                ...authority,
                acknowledgedJournalCut: offer.cut,
                receiptId,
                kind: previous === null ? 'baseline' : 'replacement',
                predecessorReceiptId: previous?.receiptId ?? null,
              };
            },
            readCurrentContext: (handle) => {
              const branches = new SQLiteEventHistoryBranchStore(handle);
              const head = readEffectiveStreamHead(handle, branches, stream);
              if (
                cut !== null &&
                (head.branchId !== cut.branchId ||
                  head.revision !== cut.revision)
              ) {
                throw HEAD_DRIFT;
              }
              const membership = activeCampaignSessionMembership(
                key.campaignId,
                key.sessionId,
                key.participantId,
              );
              return {
                branchId: head.branchId,
                effectiveGeneration:
                  branches.requireEffectiveHead(stream).effectiveGeneration,
                headRevision: head.revision,
                viewer: {
                  participantId: key.participantId,
                  isGm: membership?.seat === 'gm',
                },
                membership,
                participantRemoved: cut?.removed ?? true,
              };
            },
          },
        ).accept({ ...key, receiptId });
      } catch (error) {
        if (error === HEAD_DRIFT) continue;
        throw error;
      }
      if (result.kind === 'stale') return;
      if (result.kind === 'refused') {
        const reason = `campaign-application-${result.reason}`;
        send(socket, errorFrame(matchId, 'INVALID_INTENT', reason));
        if (result.reason === 'not-admitted') {
          this.fail(view, 'AUTH_REJECTED', 'membership-revoked');
        }
        return;
      }
      const confirmation = await this.deps.broadcaster.sendConfirmed(
        socket,
        {
          kind: 'CampaignAck',
          matchId,
          ts: nowIso(),
          playerId: this.participantId,
          campaignId: entry.campaignId,
          appliedView: offer.frame.appliedView,
        },
        view.abort.signal,
      );
      if (confirmation.kind !== 'sent') {
        this.fail(
          view,
          'INTERNAL_ERROR',
          'campaign-application-confirmation-failed',
        );
      }
      return;
    }
    send(socket, errorFrame(matchId, 'INVALID_INTENT', HEAD_DRIFT.message));
  }
}
