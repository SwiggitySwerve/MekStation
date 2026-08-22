/**
 * Viewer history, timeline, and export application service
 * (authority-audit PR 9, design D2/D4/D5).
 *
 * Server application functions later HTTP routes will call. This module
 * does not register routes. Every public entrypoint:
 *   1. Calls authorizeHumanAction (fresh resolve, kinds history-read /
 *      timeline / export).
 *   2. Brand-checks the returned viewer (property reads are not
 *      authorization).
 *   3. Delegates to existing seams (projectWithCursor, projection.project,
 *      auditRepo.readBySession, privateRepo.exportView).
 *
 * MembershipSourceUnavailableError and AuthorizedViewerError propagate
 * unchanged (auth-vs-infra split). Human refusals stay
 * HumanActionAuthorizationError with the constant id-free message.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type {
  IActionAuditRecord,
  IActionAuditRepository,
} from '@/lib/events/audit/IActionAuditRepository';
import type {
  IPrivateRecordExportView,
  IPrivateRecordPrivateExportView,
  IPrivateRecordRepository,
} from '@/lib/events/privacy/IPrivateRecordRepository';
import type { IDeliveryEpochStore } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { ViewerProjectionService } from '@/lib/multiplayer/server/projection/ViewerProjectionService';

import {
  isPrivateRecordError,
  PRIVATE_RECORD_ACCESS_DENIED_CODE,
} from '@/lib/events/privacy/IPrivateRecordRepository';
import {
  isAuthorizedViewer,
  type AuthorizedViewerResolver,
  type IAuthorizedViewer,
} from '@/lib/multiplayer/server/authorization/AuthorizedViewer';
import {
  authorizeHumanAction,
  HumanActionAuthorizationError,
  type IHumanStreamActionRequest,
} from '@/lib/multiplayer/server/authorization/HumanActionAuthorizationGate';
import { projectWithCursor } from '@/lib/multiplayer/server/delivery/projectWithDelivery';

import type {
  IGmTimelineEntry,
  IPlayerTimelineEntry,
  IViewerHistoryExport,
  IViewerHistoryExportRequest,
  IViewerHistoryReadRequest,
  IViewerTimelineEntry,
  IViewerTimelineReadRequest,
  ViewerHistoryPrivateRecord,
  ViewerHistoryReadResult,
} from './ViewerHistoryTypes';

/** Constant id-free refusal shared with the human-action gate. */
const SAFE_REFUSAL = 'Authorization refused';

export interface IViewerHistoryServiceDeps {
  readonly resolver: AuthorizedViewerResolver;
  readonly projection: ViewerProjectionService;
  readonly epochStore: IDeliveryEpochStore;
  readonly auditRepo: IActionAuditRepository;
  readonly privateRepo: IPrivateRecordRepository;
}

/**
 * Composes gated history, timeline, and export reads. Construction
 * injects the existing PR 3/4/5/6/7/8 seams; this class adds no store.
 */
export class ViewerHistoryService {
  /**
   * Binds resolver, projection, delivery epochs, action audit, and
   * private records. All five are required so there is no path that
   * can skip the gate or invent a second private-payload reader.
   */
  public constructor(private readonly deps: IViewerHistoryServiceDeps) {}

  /**
   * Gated journal-backed history page. Returns exactly the
   * projectWithCursor result so later routes cannot observe shape
   * drift: gating is the only addition.
   */
  public async readHistory(
    principalId: string,
    matchId: string,
    request: IViewerHistoryReadRequest,
  ): Promise<ViewerHistoryReadResult> {
    const viewer = await this.authorize(principalId, matchId, {
      kind: 'history-read',
      streamType: request.streamType,
      streamId: request.streamId,
    });
    return projectWithCursor(
      this.deps.projection,
      this.deps.epochStore,
      viewer,
      { streamType: request.streamType, streamId: request.streamId },
      request.cursor,
    );
  }

  /**
   * Gated action-audit timeline. Scope law: the requested
   * campaignSessionId is the viewer's own (carried as streamId and
   * entityRef so the gate never loads a foreign session). Rows are
   * mapped to viewer-safe entries; players never receive first/last
   * committed revisions.
   */
  public async readTimeline(
    principalId: string,
    matchId: string,
    request: IViewerTimelineReadRequest,
  ): Promise<readonly IViewerTimelineEntry[]> {
    const viewer = await this.authorize(principalId, matchId, {
      kind: 'timeline',
      streamType: 'timeline',
      streamId: request.campaignSessionId,
      entityRef: { campaignSessionId: request.campaignSessionId },
    });
    const rows = this.deps.auditRepo.readBySession(request.campaignSessionId);
    return Object.freeze(mapTimelineEntries(rows, viewer));
  }

  /**
   * Gated export snapshot: (1) full projected stream via project(),
   * no cursor; (2) the same redacted timeline as readTimeline; (3)
   * each privateRef through PR 5 exportView. Projection failure
   * throws before timeline or private composition so the caller
   * never observes a partial export.
   */
  public async exportForViewer(
    principalId: string,
    matchId: string,
    request: IViewerHistoryExportRequest,
  ): Promise<IViewerHistoryExport> {
    const viewer = await this.authorize(principalId, matchId, {
      kind: 'export',
      streamType: request.streamType,
      streamId: request.streamId,
    });
    const stream = await this.deps.projection.project(viewer, {
      streamType: request.streamType,
      streamId: request.streamId,
    });
    const rows = this.deps.auditRepo.readBySession(viewer.campaignSessionId);
    const timeline = Object.freeze(mapTimelineEntries(rows, viewer));
    const privateRecords = await collectPrivateExportViews(
      this.deps.privateRepo,
      this.deps.resolver,
      principalId,
      matchId,
      request,
    );
    return Object.freeze({ stream, timeline, privateRecords });
  }

  /**
   * Fresh human-action gate plus brand check. Lets infra and
   * resolver-integrity errors propagate; maps a missing brand to
   * the same no-viewer refusal as the gate.
   */
  private async authorize(
    principalId: string,
    matchId: string,
    request: IHumanStreamActionRequest,
  ): Promise<IAuthorizedViewer> {
    const viewer = await authorizeHumanAction(
      this.deps.resolver,
      principalId,
      matchId,
      request,
    );
    if (!isAuthorizedViewer(viewer)) {
      throw new HumanActionAuthorizationError('no-viewer', SAFE_REFUSAL);
    }
    return viewer;
  }
}

/**
 * Applies player vs GM timeline redaction across a session page.
 * Why: the audit repository is infrastructure-internal (design D2)
 * and returns actor principal ids plus committed revision ranges;
 * only the GM variant may carry those raw authority positions.
 */
function mapTimelineEntries(
  rows: readonly IActionAuditRecord[],
  viewer: IAuthorizedViewer,
): IViewerTimelineEntry[] {
  const entries: IViewerTimelineEntry[] = [];
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row === undefined) continue;
    if (viewer.role === 'gm') {
      entries.push(mapGmTimelineEntry(row));
    } else {
      entries.push(mapPlayerTimelineEntry(row, viewer.principalId));
    }
  }
  return entries;
}

/**
 * Player row: own principal id only, never first/last revision keys.
 * committedEventCount is a batch size, not a journal cursor, so it
 * stays. Other principals appear as actorRole without actorPrincipalId.
 */
function mapPlayerTimelineEntry(
  row: IActionAuditRecord,
  viewerPrincipalId: string,
): IPlayerTimelineEntry {
  const ownRow = row.actor.principalId === viewerPrincipalId;
  return Object.freeze({
    commandId: row.commandId,
    lifecycleState: row.lifecycleState,
    safeReasonCode: row.safeReasonCode,
    actorRole: row.actor.role,
    actorPrincipalId: ownRow ? row.actor.principalId : null,
    occurredAt: row.createdAt,
    publishedReceiptId: row.publishedReceiptId,
    committedEventCount: row.committedEventCount,
  });
}

/**
 * GM row: every actor principal and the committed revision range.
 * Justified by the raw-authority-position law: those positions are
 * campaign-authority facts, not player-visible history.
 */
function mapGmTimelineEntry(row: IActionAuditRecord): IGmTimelineEntry {
  return Object.freeze({
    commandId: row.commandId,
    lifecycleState: row.lifecycleState,
    safeReasonCode: row.safeReasonCode,
    actorRole: row.actor.role,
    actorPrincipalId: row.actor.principalId,
    occurredAt: row.createdAt,
    publishedReceiptId: row.publishedReceiptId,
    committedEventCount: row.committedEventCount,
    committedFirstRevision: row.committedFirstRevision,
    committedLastRevision: row.committedLastRevision,
  });
}

/**
 * Loads each requested private ref through PR 5 exportView only.
 * Missing refs (null) are omitted; this module never opens the
 * private table itself.
 */
async function collectPrivateExportViews(
  privateRepo: IPrivateRecordRepository,
  resolver: AuthorizedViewerResolver,
  principalId: string,
  matchId: string,
  request: IViewerHistoryExportRequest,
): Promise<readonly ViewerHistoryPrivateRecord[]> {
  const refs = request.privateRefs ?? [];
  const views: ViewerHistoryPrivateRecord[] = [];
  for (let index = 0; index < refs.length; index += 1) {
    const opaqueRef = refs[index];
    if (opaqueRef === undefined) continue;
    const view = await exportOnePrivateRef(
      privateRepo,
      resolver,
      principalId,
      matchId,
      request,
      opaqueRef,
    );
    if (view !== null) views.push(view);
  }
  return Object.freeze(views);
}

/**
 * One private ref. Default path is payload-free. includePrivate true
 * uses the PR 5 gm-gated path (which audits export-attempt).
 *
 * Deny-by-default law: the PR 5 includePrivate gate throws
 * access-denied for a non-gm (and records the denied attempt). This
 * composition CATCHES that typed denial and falls back to the payload-
 * free default shape. Silent default, not a typed refusal, so a player
 * cannot distinguish "not gm" from "payload excluded" and the export
 * does not become an authorization oracle. Other errors propagate.
 */
async function exportOnePrivateRef(
  privateRepo: IPrivateRecordRepository,
  resolver: AuthorizedViewerResolver,
  principalId: string,
  matchId: string,
  request: IViewerHistoryExportRequest,
  opaqueRef: string,
): Promise<IPrivateRecordExportView | IPrivateRecordPrivateExportView | null> {
  if (request.includePrivate !== true) {
    return privateRepo.exportView({ opaqueRef });
  }
  try {
    return await privateRepo.exportView({
      opaqueRef,
      includePrivate: true,
      resolver,
      principalId,
      matchId,
      streamId: request.streamId,
      occurredAt: request.occurredAt,
    });
  } catch (error) {
    if (
      isPrivateRecordError(error) &&
      error.code === PRIVATE_RECORD_ACCESS_DENIED_CODE
    ) {
      return privateRepo.exportView({ opaqueRef });
    }
    throw error;
  }
}
