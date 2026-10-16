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
 * The functions are pure: a fold is `{ state, lastSequence }` (plus any
 * held mission-launch facts) in and out, and a frame that must be
 * ignored (stale sequence, unparseable snapshot) returns `null` so the
 * caller can distinguish "rejected" from "accepted with an identical
 * value".
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D4, D9)
 */

import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { CAMPAIGN_BASELINE_SCHEMA_PACK } from '@/lib/events/replay/CampaignBaselineSchemaPack';
import { parseCampaignCoopSnapshot } from '@/types/campaign/campaignCoopSnapshot';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

/** A viewer's held authoritative state plus the cursor it holds it at. */
export interface ICampaignAuthoritativeFold {
  /** The folded state, or `null` before any frame has been accepted. */
  readonly state: ICampaignAuthoritativeState | null;
  /** Highest sequence folded in; `-1` before the first accepted frame. */
  readonly lastSequence: number;
  /**
   * Mission-launch facts held with the state: an adopted hydration
   * bundle plus later live launches. A launch leaves the state unchanged,
   * so these are the only record of it. Absent until a bundle is adopted,
   * so a legacy fold never claims a complete fact set.
   */
  readonly launchFacts?: readonly ICampaignEvent<'CampaignMissionLaunched'>[];
}

/** The baseline pack's strict v1 launch-payload parse. */
const LAUNCH_PAYLOAD = CAMPAIGN_BASELINE_SCHEMA_PACK.find(
  (registration) => registration.eventType === 'CampaignMissionLaunched',
)?.schemas[0];

function isLaunchFact(
  campaignId: string | undefined,
  fact: ICampaignEvent,
): fact is ICampaignEvent<'CampaignMissionLaunched'> {
  if (
    fact.type !== 'CampaignMissionLaunched' ||
    fact.campaignId !== campaignId ||
    !Number.isInteger(fact.sequence) ||
    fact.sequence < 0 ||
    !LAUNCH_PAYLOAD
  ) {
    return false;
  }
  try {
    LAUNCH_PAYLOAD.parse(fact.payload);
    return true;
  } catch {
    return false;
  }
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
  const next = { state: parsed.snapshot.state, lastSequence: adopted };
  return fold.launchFacts ? { ...next, launchFacts: fold.launchFacts } : next;
}

/**
 * Adopt an application baseline with its complete hydration bundle,
 * validated synchronously before anything is adopted. An explicit `[]`
 * is a complete empty bundle. An omitted, invalid, cross-campaign or
 * out-of-order bundle, or one that drops or alters a fact the fold
 * already holds, returns `null` so the caller keeps its prior fold. An
 * authorized `replacement` starts from EMPTY, never from the held
 * lineage, so stale held proof cannot refuse a reconnect at cursor zero.
 * Historic facts can be older than the adopted cursor, so they are kept
 * as given: never put on the live ordering guard, never refolded.
 */
export function foldCampaignHydration(
  fold: ICampaignAuthoritativeFold,
  snapshot: ICampaignEvent,
  hydrationFacts: readonly ICampaignEvent[] | undefined,
  replacement = false,
  resumeSequence?: number,
): ICampaignAuthoritativeFold | null {
  const held = replacement ? EMPTY_CAMPAIGN_AUTHORITATIVE_FOLD : fold;
  const facts = (hydrationFacts ?? []).filter(
    (fact, index, all): fact is ICampaignEvent<'CampaignMissionLaunched'> =>
      isLaunchFact(snapshot.campaignId, fact) &&
      (index === 0 || fact.sequence > all[index - 1].sequence),
  );
  if (
    !hydrationFacts ||
    facts.length !== hydrationFacts.length ||
    held.launchFacts?.some(
      (heldFact) =>
        !facts.some(
          (fact) => JSON.stringify(fact) === JSON.stringify(heldFact),
        ),
    )
  ) {
    return null;
  }
  const next = foldCampaignSnapshot(held, snapshot, resumeSequence);
  return next && { ...next, launchFacts: facts };
}

/**
 * Advance the fold by ONE broadcast campaign event through the shared
 * `applyCampaignEvent` reducer. Returns `null` for an out-of-order or
 * duplicate event (sequence <= the held cursor), so a replay burst that
 * arrived interleaved with live events still converges. A fold holding
 * launch facts also appends a live launch, and refuses one that is
 * malformed, foreign or already held.
 */
export function foldCampaignEvent(
  fold: ICampaignAuthoritativeFold,
  event: ICampaignEvent,
): ICampaignAuthoritativeFold | null {
  if (event.sequence <= fold.lastSequence) {
    return null;
  }
  let launchFacts = fold.launchFacts;
  if (launchFacts && event.type === 'CampaignMissionLaunched') {
    if (
      !isLaunchFact(fold.state?.campaignId, event) ||
      launchFacts.some((fact) => fact.sequence === event.sequence)
    ) {
      return null;
    }
    launchFacts = [...launchFacts, event];
  }
  // A snapshot (or the very first event) seeds the fold from empty
  // rather than layering onto a state this viewer never held.
  const base =
    event.type === 'CampaignSnapshotPublished' || fold.state === null
      ? createEmptyCampaignState(event.campaignId)
      : fold.state;
  const next = {
    state: applyCampaignEvent(base, event),
    lastSequence: event.sequence,
  };
  return launchFacts ? { ...next, launchFacts } : next;
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
