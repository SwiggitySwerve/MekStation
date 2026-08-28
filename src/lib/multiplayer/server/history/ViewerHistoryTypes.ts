/**
 * Closed viewer-safe shapes for history, timeline, and export
 * (authority-audit PR 9, design D2/D4/D5).
 *
 * History pagination returns the PR 8 projectWithCursor result unchanged
 * (no new page shape). Timeline and export are application projections:
 * they never carry stored-journal-row fields, journal positions, or private
 * payload keys on the player path. committedFirstRevision and
 * committedLastRevision exist only on the GM timeline variant because
 * those values are raw authority positions (design D2).
 *
 * @spec openspec/changes/add-authority-audit-and-privacy-proof/specs/gm-authority-redaction/spec.md
 */

import type {
  ActionAuditActorRole,
  ActionAuditLifecycleState,
  ActionAuditSafeReasonCode,
} from '@/lib/events/audit/IActionAuditRepository';
import type {
  IPrivateRecordExportView,
  IPrivateRecordPrivateExportView,
} from '@/lib/events/privacy/IPrivateRecordRepository';
import type { IDeliveryCursor } from '@/lib/multiplayer/server/delivery/IDeliveryEpochStore';
import type { ProjectWithCursorResult } from '@/lib/multiplayer/server/delivery/projectWithDelivery';
import type { IViewerSafeProjection } from '@/lib/multiplayer/server/projection/ViewerProjectionTypes';

/**
 * History read input. `cursor` null asks for a fresh baseline page.
 * `projectorVersion` is accepted so later HTTP routes can echo the
 * client copy; epoch derivation ignores it because the registry owns
 * projector version (PR 8 law).
 */
export interface IViewerHistoryReadRequest {
  readonly streamType: string;
  readonly streamId: string;
  readonly projectorVersion?: number;
  readonly cursor: IDeliveryCursor | null;
}

/**
 * Timeline read input. `campaignSessionId` is compared by the human
 * action gate as entityRef/streamId against the viewer fields only.
 */
export interface IViewerTimelineReadRequest {
  readonly campaignSessionId: string;
}

/**
 * Shared export fields. `privateRefs` are opaque PR 5 handles that
 * already appeared on player-safe rows; this module never invents refs.
 */
export interface IViewerHistoryExportBase {
  readonly streamType: string;
  readonly streamId: string;
  readonly privateRefs?: readonly string[];
}

/**
 * Default export: payload-free private shapes, no private-audit gate.
 */
export interface IViewerHistoryExportDefaultRequest extends IViewerHistoryExportBase {
  readonly includePrivate?: false;
}

/**
 * includePrivate export. `occurredAt` is required because the PR 5
 * gated path records an export-attempt row and must not read the
 * system clock.
 */
export interface IViewerHistoryExportPrivateRequest extends IViewerHistoryExportBase {
  readonly includePrivate: true;
  readonly occurredAt: string;
}

export type IViewerHistoryExportRequest =
  | IViewerHistoryExportDefaultRequest
  | IViewerHistoryExportPrivateRequest;

/**
 * History read output is exactly the PR 8 cursor result: a page of
 * viewer-safe facts plus durable sequences, or the typed stale-epoch
 * result. No extra wrapper.
 */
export type ViewerHistoryReadResult = ProjectWithCursorResult;

/**
 * Fields every timeline entry may show. actorPrincipalId is null when a
 * player views another principal's row. committedEventCount is a batch
 * size, not a journal cursor, so it is safe for players.
 */
export interface IViewerTimelineEntryBase {
  readonly commandId: string;
  readonly lifecycleState: ActionAuditLifecycleState;
  readonly safeReasonCode: ActionAuditSafeReasonCode | null;
  readonly actorRole: ActionAuditActorRole;
  readonly actorPrincipalId: string | null;
  readonly occurredAt: string;
  readonly publishedReceiptId: string | null;
  readonly committedEventCount: number | null;
}

/**
 * Player timeline row. First/last committed revisions are omitted as
 * keys (not present-as-null) so JSON cannot leak raw authority
 * positions.
 */
export type IPlayerTimelineEntry = IViewerTimelineEntryBase;

/**
 * GM timeline row. First/last committed revisions are allowed because
 * the GM is campaign authority; they remain absent from the player
 * variant.
 */
export interface IGmTimelineEntry extends IViewerTimelineEntryBase {
  readonly committedFirstRevision: number | null;
  readonly committedLastRevision: number | null;
}

export type IViewerTimelineEntry = IPlayerTimelineEntry | IGmTimelineEntry;

export const VIEWER_PLAYER_TIMELINE_KEYS = [
  'commandId',
  'lifecycleState',
  'safeReasonCode',
  'actorRole',
  'actorPrincipalId',
  'occurredAt',
  'publishedReceiptId',
  'committedEventCount',
] as const;

export const VIEWER_GM_TIMELINE_KEYS = [
  ...VIEWER_PLAYER_TIMELINE_KEYS,
  'committedFirstRevision',
  'committedLastRevision',
] as const;

export const VIEWER_PRIVATE_DEFAULT_EXPORT_KEYS = [
  'opaqueRef',
  'payloadState',
  'recordKind',
] as const;

/**
 * Private slice of an export. Default views have no payload key. GM
 * includePrivate views may include payload (null after erasure).
 */
export type ViewerHistoryPrivateRecord =
  | IPrivateRecordExportView
  | IPrivateRecordPrivateExportView;

/**
 * Export snapshot: projected stream (no cursor), redacted timeline, and
 * private refs through PR 5 exportView only.
 */
export interface IViewerHistoryExport {
  readonly stream: IViewerSafeProjection;
  readonly timeline: readonly IViewerTimelineEntry[];
  readonly privateRecords: readonly ViewerHistoryPrivateRecord[];
}

/**
 * True when the entry is the GM variant (has committed revision keys).
 * Player rows omit those keys entirely, so `in` is the discriminant.
 */
export function isGmTimelineEntry(
  entry: IViewerTimelineEntry,
): entry is IGmTimelineEntry {
  return 'committedFirstRevision' in entry;
}
