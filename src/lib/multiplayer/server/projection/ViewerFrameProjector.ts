/**
 * The pre-serialization viewer projector (umbrella task 11.1).
 *
 * `gm-authority-redaction` requires that the object handed to
 * `JSON.stringify` ALREADY excludes non-viewer authority metadata - not
 * that the client is trusted to ignore it. `ViewerPublicationBoundary`
 * settles WHETHER a viewer may receive an event; this settles WHAT the
 * event may contain once they may.
 *
 * ONE function, called from ONE place: the boundary's per-event
 * decision, which every frame that REACHES the boundary funnels through
 * before `safeSend` serializes - live broadcast, SessionJoin baseline,
 * guarded replay. Applying it per surface let those surfaces disagree,
 * measurably: redacting only the live path left a mid-match joiner's
 * replayed events carrying a field the continuously connected client
 * had already lost.
 *
 * Outbound paths that never reach the boundary are unchanged by this
 * slice: `sendReplay`'s no-playerId branch has no viewer to project for
 * (test callers only today), and `answerReconnectRequest` in
 * `p2p/gameSessionChannel` streams raw store rows with no viewer at all.
 *
 * PURE, like the rest of this directory: no IO, no clock, no store.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 */

import type { IAuthorizedViewer } from '../authorization/AuthorizedViewer';

import { isAuthorizedViewer } from '../authorization/AuthorizedViewer';
import {
  VIEWER_PROJECTION_MESSAGES,
  ViewerProjectionError,
} from './ViewerProjectionTypes';

/**
 * Event fields that are server-only and reach NO viewer.
 *
 * `visibility` is the fog classifier's own concealment class, read by
 * `fogOfWar.ts` before this projector runs and by the helper that
 * stamps it. Nothing on the receiving side reads it.
 *
 * WHAT `visibility` IS WORTH, HONESTLY: it closes no information
 * channel. `visibility` is a pure function of `type`, which the
 * projector deliberately keeps - `classifyGameEventVisibility`
 * (`@/utils/gameplay/gameEventVisibility`) is a lookup on `type` alone
 * and both of its writers agree with it - so a recipient recomputes the
 * removed value exactly. What the removal buys is the MECHANISM: one
 * declared list, applied once, pinned at the wire.
 *
 * `sequence` is the member that DOES carry information. Under fog the
 * holes in a player's slice of it counted concealed events
 * (`viewerSequenceConcealmentLeak`). Player payloads SHALL NOT expose
 * hidden authority identifiers or gaps that reveal concealed events
 * (`Authority and Viewer Sequences Are Separate`). Removal is
 * per-viewer at this projector, not at the event source: GM/authority
 * projection streams keep the field; player projections do not.
 */
export const AUTHORITY_ONLY_EVENT_FIELDS = ['visibility', 'sequence'] as const;

const AUTHORITY_ONLY_EVENT_FIELD_SET: ReadonlySet<string> = new Set(
  AUTHORITY_ONLY_EVENT_FIELDS,
);

/** The event value this viewer may be sent. */
export interface IViewerEventProjected {
  readonly kind: 'project';
  readonly event: unknown;
}

/** Typed fail-closed refusal. Never carries a payload fragment. */
export interface IViewerEventProjectionFailure {
  readonly kind: 'failure';
  readonly error: ViewerProjectionError;
}

export type ViewerEventProjection =
  | IViewerEventProjected
  | IViewerEventProjectionFailure;

/**
 * Constant projection-failed refusal, matching the publication
 * boundary's law that an inner message never rides out on the error.
 */
function projectionFailed(): ViewerProjectionError {
  return new ViewerProjectionError(
    'projection-failed',
    VIEWER_PROJECTION_MESSAGES.projectionFailed,
  );
}

/** Constant not-a-viewer refusal for a value that failed the brand. */
function notAViewer(): ViewerProjectionError {
  return new ViewerProjectionError(
    'not-a-viewer',
    VIEWER_PROJECTION_MESSAGES.notAViewer,
  );
}

/**
 * Project one event value for one branded viewer.
 *
 * Returns the ORIGINAL object when it carries no authority-only field;
 * callers read that identity to decide whether the surrounding envelope
 * or replay chunk needs rebuilding at all. Fails closed on a value that
 * is not a branded viewer and on an event that is not a plain object -
 * the caller sends nothing, there is no raw fallback.
 */
export function projectEventForViewer(
  viewer: IAuthorizedViewer,
  event: unknown,
): ViewerEventProjection {
  if (!isAuthorizedViewer(viewer)) {
    return { kind: 'failure', error: notAViewer() };
  }
  if (typeof event !== 'object' || event === null || Array.isArray(event)) {
    return { kind: 'failure', error: projectionFailed() };
  }
  const record = event as Record<string, unknown>;
  const carries = Object.keys(record).some((key) =>
    shouldRemoveAuthorityField(viewer, key),
  );
  if (!carries) {
    return { kind: 'project', event };
  }
  const projected: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record)) {
    if (shouldRemoveAuthorityField(viewer, key)) continue;
    projected[key] = value;
  }
  return { kind: 'project', event: projected };
}

/**
 * Authority-only fields leave PLAYER projection frames. GM viewers
 * keep `sequence` because they are the authority surface; the
 * boundary already branches on `viewer.role === 'gm'` for gm-only
 * facts, and this is the same discrimination for field removal.
 *
 * Enforces `Authority and Viewer Sequences Are Separate`: player
 * payloads SHALL NOT expose hidden authority identifiers.
 */
function shouldRemoveAuthorityField(
  viewer: IAuthorizedViewer,
  key: string,
): boolean {
  if (!AUTHORITY_ONLY_EVENT_FIELD_SET.has(key)) return false;
  if (key === 'sequence' && viewer.role === 'gm') return false;
  return true;
}
