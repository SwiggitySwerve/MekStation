/**
 * The timeline and export arms' per-viewer projection digest
 * (umbrella 12.2, closing 12.1's `Timeline and Export Use the Same
 * Viewer Projection`).
 *
 * The six-surface inventory recorded why these two arms could not share
 * the campaign projector: an action-audit row is not a campaign event -
 * it has no scope stamp, no sequence, and no ledger fold, so there is no
 * event identity to unify. What it DOES have is a per-viewer visibility
 * decision (`mapTimelineEntries`: the GM sees every actor principal and
 * the committed revision range; a player sees their own principal and
 * neither revision key), and that decision is exactly what the shared
 * contract asks a surface to expose.
 *
 * So this arm consumes the contract at the layer it can: the ONE hash
 * law, `viewerProjectionHash`. Timeline and export produce their rows
 * through the same mapper and digest them through the same function, so
 * "the export contains the same authorized facts and no additional
 * private fields" becomes a number two surfaces either match on or do
 * not - rather than a shape a reader has to eyeball.
 *
 * The entry is digested VERBATIM, with no material stripping, and that
 * is the point: a player row OMITS `committedFirstRevision` /
 * `committedLastRevision` as keys rather than nulling them, so the GM
 * and player digests differ by construction. Stripping fields here would
 * erase precisely the redaction the digest exists to witness.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import { viewerProjectionHash } from '@/lib/campaign/sync/campaignViewerProjection';

import type { IViewerTimelineEntry } from './ViewerHistoryTypes';

/**
 * Per-viewer digest over an ordered run of projected timeline entries.
 *
 * Order is part of the material: the audit timeline is a sequence of
 * lifecycle facts, and two runs carrying the same rows in a different
 * order are not the same timeline.
 */
export function viewerTimelineDigest(
  entries: readonly IViewerTimelineEntry[],
): string {
  return viewerProjectionHash(entries);
}
