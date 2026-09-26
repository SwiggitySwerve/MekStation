/**
 * The shared per-viewer campaign projection contract (umbrella 12.1).
 *
 * `Visibility Is Equivalent Across Surfaces` asks that live, replay,
 * snapshot, cold recovery, timeline, and export expose equivalent
 * authorized fields for one participant and one authoritative event. The
 * six-surface inventory found those surfaces do not - and should not -
 * share one projector INSTANCE: the legacy session speaks viewer
 * identity, the grant channel speaks a signed scope set, the audit
 * timeline speaks role-mapped rows. Forcing one instance would break
 * proven contracts (`projectCampaignStreamForGrant` deliberately
 * withholds journal sequence and revision so a restricted snapshot
 * cannot leak identities).
 *
 * What they CAN share, and what this module is, is the CONTRACT: the
 * audience policy that decides what a viewer may see, and a per-viewer
 * digest computed over the viewer-visible facts. A surface keeps its own
 * shape - an event stream, a folded snapshot, an audit row - and proves
 * it agrees on the visibility SET through the digest.
 *
 * Deliberately authority-model-agnostic: the caller injects its own
 * admission predicate (`campaignScopeAdmits` for the legacy session,
 * `grantAllowsScope` for the grant channel), so this module imports
 * neither and cannot drift toward one. It imports only the closed event
 * vocabulary and `applyCampaignEvent`, the ONE reducer, so a projected
 * fold can never be a second reducer's opinion.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import type {
  CampaignEventScope,
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { canonicalizeJsonV1 } from '@/lib/events/journal/EventJournalCanonicalizer';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { sha256Sync } from '@/utils/events/hashUtils';

import { applyCampaignEvent } from './applyCampaignEvent';

/**
 * One surface's audience policy, reduced to the only question this
 * contract asks it: may this viewer see a fact stamped with this scope?
 */
export type CampaignScopeAdmits = (scope: CampaignEventScope) => boolean;

/** One viewer's agreed view of a campaign stream. */
export interface ICampaignViewerProjection {
  /** The visibility SET - the events this viewer may see, in order. */
  readonly visible: readonly ICampaignEvent[];
  /** The fold of exactly that set. Withheld effects are absent because
   * they never entered the fold, not because a filter redacted them. */
  readonly state: ICampaignAuthoritativeState;
  /** Digest over the ordered viewer-visible facts. */
  readonly factsDigest: string;
  /** Digest over the folded viewer-visible state. */
  readonly stateDigest: string;
  /** Digest over both - the per-viewer projection digest. */
  readonly digest: string;
}

/**
 * The `authorPlayerId` the migration import stamps on its baseline
 * (`importCampaignBaseline`). That baseline is an existing campaign's
 * whole state, so it can carry material a restricted viewer may not see.
 */
export const CAMPAIGN_MIGRATION_AUTHOR_ID = 'migration';

/**
 * The baseline law (umbrella 12.1, OD-umbrella-12-1-slice): may a stored
 * full-state `CampaignSnapshotPublished` the viewer's scope already admits
 * be folded for them? Both projection arms ask this and only this - the
 * legacy session through `campaignViewerVisibleEvents`, the grant channel
 * in `projectCampaignStreamForGrant`.
 *
 * - A viewer admitted to both `gm` and `campaign` is entitled to the
 *   full authoritative state and receives every baseline.
 * - For any other viewer a baseline authored
 *   `CAMPAIGN_MIGRATION_AUTHOR_ID` is never admitted: it is an imported
 *   campaign's whole state, not a function of facts the viewer was shown.
 * - Any other baseline (a genesis, a record checkpoint) is admitted only
 *   while `withheldBefore` is false. `applyCampaignEvent` REPLACES state
 *   wholesale on a snapshot, so one minted after something was withheld
 *   carries that fact's effect; before the first withhold it is a pure
 *   function of facts this viewer may see, which keeps the genesis ledger
 *   shared rather than starting a restricted viewer from nothing.
 *
 * A caller that gets `false` counts the baseline as withheld from then
 * on: a later checkpoint folded from an imported record carries the same
 * material the refused baseline did.
 */
export function campaignBaselineReachesViewer(
  baseline: ICampaignEvent,
  admits: CampaignScopeAdmits,
  withheldBefore: boolean,
): boolean {
  if (admits('gm') && admits('campaign')) return true;
  if (baseline.authorPlayerId === CAMPAIGN_MIGRATION_AUTHOR_ID) return false;
  return !withheldBefore;
}

/**
 * The visibility SET for one viewer, in stream order.
 *
 * 1. A fact whose scope the viewer is not admitted to is absent.
 *
 * 2. A full-state `CampaignSnapshotPublished` is present only when
 *    `campaignBaselineReachesViewer` admits it, the law the grant arm
 *    (`projectCampaignStreamForGrant`) applies too, so both arms hand the
 *    same viewer the same baseline from the same committed stream
 *    (`campaignGenesisArmParity.test.ts`).
 *
 * The withhold latch is set by the first absent fact of either kind.
 */
export function campaignViewerVisibleEvents(
  events: readonly ICampaignEvent[],
  admits: CampaignScopeAdmits,
): readonly ICampaignEvent[] {
  const visible: ICampaignEvent[] = [];
  // Latches on the first fact this viewer may not see; from then on a
  // full-state snapshot is no longer safe to fold for them.
  let withheld = false;
  for (const event of events) {
    if (!admits(event.scope)) {
      withheld = true;
      continue;
    }
    if (
      event.type === 'CampaignSnapshotPublished' &&
      !campaignBaselineReachesViewer(event, admits, withheld)
    ) {
      withheld = true;
      continue;
    }
    visible.push(event);
  }
  return Object.freeze(visible);
}

/**
 * Canonical digest material for one fact.
 *
 * `sequence` is stripped, and that is load-bearing rather than tidiness:
 * the same authoritative fact carries a journal sequence on the legacy
 * surface and a per-grant delivery sequence (or none at all) on the
 * scoped surface, so a digest that included it could never let two
 * surfaces agree - and would itself become a channel for the journal
 * positions `projectCampaignStreamForGrant` deliberately withholds.
 * Every other field is a committed property of the fact and stays.
 */
function campaignFactMaterial(event: ICampaignEvent): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
  delete cloned.sequence;
  return cloned;
}

/**
 * The ONE hash law every viewer-projection digest goes through, on every
 * surface and in every vocabulary.
 *
 * Exported because the surfaces that must agree do not share a data
 * shape: campaign events here, folded ledger state on the snapshot arm,
 * action-audit rows on the timeline and export arms (see
 * `viewerTimelineDigest`). What they CAN share is the canonicalization
 * and the hash - so two surfaces that project the same viewer-visible
 * facts land on the same number, and a surface that quietly projects
 * something else does not. Two hash call sites would be two laws.
 */
export function viewerProjectionHash(material: unknown): string {
  return sha256Sync(canonicalizeJsonV1(material));
}

/**
 * Digest over the ordered viewer-visible facts. This is the half a
 * surface that carries EVENTS can compare - live, replay, and the
 * stream half of export.
 */
export function campaignViewerFactsDigest(
  visible: readonly ICampaignEvent[],
): string {
  return viewerProjectionHash(visible.map(campaignFactMaterial));
}

/**
 * Digest over the folded viewer-visible state. This is the half a
 * surface that carries only STATE can compare - a snapshot baseline, a
 * cold-recovery rehydration - where no event identity survives.
 */
export function campaignViewerStateDigest(
  state: ICampaignAuthoritativeState,
): string {
  return viewerProjectionHash(state);
}

/**
 * The per-viewer projection digest: both halves bound together, so a
 * surface carrying facts AND state proves both agree. Split into halves
 * because the surfaces genuinely differ in what they carry - demanding
 * one number from a surface that has no events would make parity
 * unprovable rather than proven.
 */
export function campaignViewerProjectionDigest(
  factsDigest: string,
  stateDigest: string,
): string {
  return viewerProjectionHash({ factsDigest, stateDigest });
}

/**
 * Project one campaign stream for one viewer: the visibility set, the
 * fold of exactly that set, and the digests that let another surface
 * prove it agrees.
 */
export function projectCampaignForViewer(
  campaignId: string,
  events: readonly ICampaignEvent[],
  admits: CampaignScopeAdmits,
): ICampaignViewerProjection {
  const visible = campaignViewerVisibleEvents(events, admits);
  let state = createEmptyCampaignState(campaignId);
  for (const event of visible) {
    state = applyCampaignEvent(state, event);
  }
  const factsDigest = campaignViewerFactsDigest(visible);
  const stateDigest = campaignViewerStateDigest(state);
  return Object.freeze({
    visible,
    state,
    factsDigest,
    stateDigest,
    digest: campaignViewerProjectionDigest(factsDigest, stateDigest),
  });
}
