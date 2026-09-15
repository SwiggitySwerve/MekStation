/**
 * The single fold from broadcast campaign frames to authoritative state.
 *
 * Every consumer of the campaign event stream — the guest's
 * `useCampaignMirrorStore` and the GM/host's own browser surface —
 * advances its held `ICampaignAuthoritativeState` through THESE
 * functions. There is deliberately no second, host-flavoured reducer:
 * design D9 ("GM view is a grant property, not a hosting property —
 * same mechanism, no special path") makes the host just another
 * all-scopes viewer of the stream it publishes, and the
 * `design-campaign-authority-and-sync` tasks.md preamble rejects
 * "duplicating the guest mirror machinery" as the way to close the
 * host-view-staleness residual.
 *
 * The functions are pure: a fold is `{ state, lastSequence }` in and out,
 * and a frame that must be ignored (stale sequence, unparseable
 * snapshot) returns `null` so the caller can distinguish "rejected" from
 * "accepted with an identical value".
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D9)
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { parseCampaignCoopSnapshot } from '@/types/campaign/campaignCoopSnapshot';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

/** A viewer's held authoritative state plus the cursor it holds it at. */
export interface ICampaignAuthoritativeFold {
  /** The folded state, or `null` before any frame has been accepted. */
  readonly state: ICampaignAuthoritativeState | null;
  /** Highest sequence folded in; `-1` before the first accepted frame. */
  readonly lastSequence: number;
}

/** The fold a viewer starts from before any frame arrives. */
export const EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD: ICampaignAuthoritativeFold = {
  state: null,
  lastSequence: -1,
};

/**
 * Adopt a `CampaignSnapshotPublished` baseline. The snapshot REPLACES
 * whatever state the fold held, so it is also the large-gap resync path.
 *
 * `resumeSequence` is the cursor the caller wants the snapshot adopted
 * at — the live stream's next sequence minus one — when the snapshot's
 * own revision is not it. Returns `null` when the frame is not an
 * adoptable baseline: wrong type, unparseable, older than what is held,
 * or a same-revision snapshot that disagrees with the held state.
 */
export function foldCampaignSnapshot(
  fold: ICampaignAuthoritativeFold,
  snapshot: ICampaignEvent,
  resumeSequence?: number,
): ICampaignAuthoritativeFold | null {
  if (snapshot.type !== 'CampaignSnapshotPublished') {
    return null;
  }
  const parsed = parseCampaignCoopSnapshot({
    campaignId: snapshot.campaignId,
    matchId: snapshot.payload.matchId ?? snapshot.campaignId,
    revision: snapshot.payload.revision ?? 0,
    state: snapshot.payload.state,
  });
  if (!parsed.ok) {
    return null;
  }
  const adopted =
    resumeSequence ?? snapshot.payload.revision ?? snapshot.sequence;
  if (fold.state !== null && adopted < fold.lastSequence) {
    return null;
  }
  if (
    fold.state !== null &&
    adopted === fold.lastSequence &&
    JSON.stringify(fold.state) !== JSON.stringify(parsed.snapshot.state)
  ) {
    return null;
  }
  return { state: parsed.snapshot.state, lastSequence: adopted };
}

/**
 * Advance the fold by ONE broadcast campaign event through the shared
 * `applyCampaignEvent` reducer. Returns `null` for an out-of-order or
 * duplicate event (sequence <= the held cursor), so a replay burst that
 * arrived interleaved with live events still converges.
 */
export function foldCampaignEvent(
  fold: ICampaignAuthoritativeFold,
  event: ICampaignEvent,
): ICampaignAuthoritativeFold | null {
  if (event.sequence <= fold.lastSequence) {
    return null;
  }
  // A snapshot (or the very first event) seeds the fold from empty
  // rather than layering onto a state this viewer never held.
  const base =
    event.type === 'CampaignSnapshotPublished' || fold.state === null
      ? createEmptyCampaignState(event.campaignId)
      : fold.state;
  return {
    state: applyCampaignEvent(base, event),
    lastSequence: event.sequence,
  };
}

/**
 * Fold one frame off the live stream, dispatching on its type exactly as
 * the guest surface does: a baseline is adopted (a framing baseline
 * carries `sequence: -1`, so it is adopted at cursor 0 and the log
 * events that follow all pass the ordering guard), anything else is
 * applied as an event. A rejected frame returns the fold UNCHANGED — by
 * reference — so a caller can cheaply skip re-projecting.
 */
export function foldCampaignFrame(
  fold: ICampaignAuthoritativeFold,
  event: ICampaignEvent,
): ICampaignAuthoritativeFold {
  const next =
    event.type === 'CampaignSnapshotPublished'
      ? foldCampaignSnapshot(fold, event, event.sequence < 0 ? 0 : undefined)
      : foldCampaignEvent(fold, event);
  return next ?? fold;
}
