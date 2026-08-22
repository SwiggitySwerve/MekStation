/**
 * Application viewer projection service (authority-audit PR 6, design D2).
 *
 * Requires a branded authorized viewer, authorizes the requested stream
 * against that viewer's own campaignSessionId/matchId, reads the journal
 * INSIDE this service, and returns only versioned viewer-safe projection
 * objects. Membership failure, audience-catalog failure, or projection
 * failure yields a typed refusal with NO raw fallback.
 *
 * This service is STATELESS: it returns no cursor, epoch, or delivery
 * identity. PR 7 owns durable viewer delivery sequences.
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import {
  EVENT_JOURNAL_MAX_PAGE_SIZE,
  ROOT_EVENT_BRANCH_ID,
  type IEventJournal,
  type IStoredEvent,
} from '@/lib/events/journal/EventJournalContract';

import {
  isAuthorizedViewer,
  type IAuthorizedViewer,
} from '../authorization/AuthorizedViewer';
import {
  isOwnerAudienceMatch,
  type ViewerAudienceDecision,
  type ViewerAudienceProjector,
  type ViewerAudienceProjectorRegistry,
} from './ViewerAudienceProjector';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
  type IViewerProjectionRequest,
  type IViewerSafeFact,
  type IViewerSafeProjection,
  type JsonValue,
} from './ViewerProjectionTypes';

export interface IViewerProjectionServiceDeps {
  readonly journal: IEventJournal;
  readonly registry: ViewerAudienceProjectorRegistry;
}

/**
 * Stream-scope law mirrored from
 * HumanActionAuthorizationGate.assertStreamScope: compare the requested
 * streamId against viewer.campaignSessionId and viewer.matchId only.
 * Never load the named foreign session. One constant refusal for any
 * mismatch (existence-oracle prevention).
 */
function streamBelongsToViewer(
  viewer: IAuthorizedViewer,
  streamId: string,
): boolean {
  if (streamId === viewer.campaignSessionId) return true;
  return viewer.matchId !== null && streamId === viewer.matchId;
}

/**
 * True when this viewer may receive a fact for `decision`. Hidden and
 * out-of-audience facts return false so the service can skip them
 * silently (no gap marker, no placeholder).
 */
function isVisibleToViewer(
  viewer: IAuthorizedViewer,
  decision: ViewerAudienceDecision,
  payload: unknown,
): boolean {
  if (decision.kind === 'hidden') return false;
  if (decision.kind === 'gm-only') return viewer.role === 'gm';
  if (decision.kind === 'owner-only')
    return isOwnerAudienceMatch(viewer, payload);
  return true;
}

/**
 * Builds one viewer-safe fact wrapper. The service always constructs
 * this object itself so a stored journal row can never be placed in
 * output. `sequenceHint` is the local visible ordinal, not a journal
 * position.
 */
function freezeFact(
  factType: string,
  sequenceHint: number,
  payload: JsonValue,
): IViewerSafeFact {
  return Object.freeze({ factType, sequenceHint, payload });
}

/**
 * Maps a projector throw onto the constant projection-failed refusal
 * so inner error messages (and any payload they named) cannot leak.
 */
function throwProjectionFailed(): never {
  throw new ViewerProjectionError(
    'projection-failed',
    VIEWER_PROJECTION_MESSAGES.projectionFailed,
  );
}

/**
 * Runs the audience `project` function and refuses the WHOLE request
 * if it throws. Does not attach the inner error as `cause`.
 */
function projectPayload(
  decision: ViewerAudienceDecision,
  payload: unknown,
  viewer: IAuthorizedViewer,
): JsonValue {
  if (decision.kind === 'hidden') throwProjectionFailed();
  try {
    return decision.project(payload, viewer);
  } catch {
    throwProjectionFailed();
  }
}

export class ViewerProjectionService {
  /**
   * Binds journal plus registry. Both are required so there is no
   * construction path that can read raw rows without a projector.
   */
  public constructor(private readonly deps: IViewerProjectionServiceDeps) {}

  /**
   * Projects a stream for one branded viewer. Order is binding:
   * (1) brand check, (2) stream scope vs viewer fields only, (3)
   * registry lookup, (4) journal read, (5) per-event audience apply.
   * Any projector throw or missing decision refuses with no partial
   * facts and no delivery identity.
   */
  public async project(
    viewer: IAuthorizedViewer,
    request: IViewerProjectionRequest,
  ): Promise<IViewerSafeProjection> {
    if (!isAuthorizedViewer(viewer))
      throw new ViewerProjectionError(
        'not-a-viewer',
        VIEWER_PROJECTION_MESSAGES.notAViewer,
      );
    if (!streamBelongsToViewer(viewer, request.streamId))
      throw new ViewerProjectionError(
        'wrong-session',
        VIEWER_PROJECTION_MESSAGES.wrongSession,
      );

    const projector = this.deps.registry.projectorFor(request.streamType);
    const storedEvents = await this.readAuthorizedStream(request);
    const facts = this.projectAllOrThrow(viewer, projector, storedEvents);

    return Object.freeze({
      projectorVersion: projector.projectorVersion,
      streamType: request.streamType,
      streamId: request.streamId,
      viewerScope: Object.freeze({
        principalId: viewer.principalId,
        participantId: viewer.participantId,
        role: viewer.role,
      }),
      facts: Object.freeze(facts),
    });
  }

  /**
   * Reads the journal only AFTER viewer + scope + registry succeeded.
   * Journal infrastructure errors become projection-failed so Zod or
   * storage messages cannot leak through this boundary.
   */
  private async readAuthorizedStream(
    request: IViewerProjectionRequest,
  ): Promise<readonly IStoredEvent[]> {
    const afterRevision = request.afterRevision ?? 0;
    const limit = request.limit ?? EVENT_JOURNAL_MAX_PAGE_SIZE;
    try {
      return await this.deps.journal.readStream({
        streamType: request.streamType,
        streamId: request.streamId,
        branchId: ROOT_EVENT_BRANCH_ID,
        afterRevision,
        limit,
      });
    } catch (error) {
      if (error instanceof ViewerProjectionError) throw error;
      throwProjectionFailed();
    }
  }

  /**
   * Applies audience decisions across the page. Hidden / out-of-audience
   * events are omitted with no placeholder so sequenceHint stays gapless
   * over visible facts (hidden events stay uncountable). Missing
   * decisions and projector throws discard any facts already built.
   */
  private projectAllOrThrow(
    viewer: IAuthorizedViewer,
    projector: ViewerAudienceProjector,
    storedEvents: readonly IStoredEvent[],
  ): IViewerSafeFact[] {
    const facts: IViewerSafeFact[] = [];
    for (const stored of storedEvents) {
      const decision = projector.decisionFor(stored.eventType);
      if (decision === undefined) throwProjectionFailed();
      if (!isVisibleToViewer(viewer, decision, stored.payload)) continue;
      const payload = projectPayload(decision, stored.payload, viewer);
      facts.push(freezeFact(stored.eventType, facts.length + 1, payload));
    }
    return facts;
  }
}
