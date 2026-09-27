/**
 * One recipient's campaign wire gate (umbrella 11.1 scope boundary plus the
 * 12.1 baseline law, roadmap unit U94).
 *
 * The scope boundary alone admits a stored full-state
 * `CampaignSnapshotPublished` to every viewer, because genesis, record
 * checkpoint and migration baselines are all stamped `campaign`. A
 * checkpoint minted after a gm-scoped fact carries that fact's effect, so
 * the small-gap resync tail and the live fan-out handed a restricted player
 * the raw state the join baseline withholds. This gate applies the same law
 * the join baseline and the grant arm apply
 * (`campaignBaselineReachesViewer`), with the same latch.
 *
 * @spec openspec/specs/gm-authority-redaction/spec.md (Authorized Viewer Projection Precedes Serialization)
 */

import type {
  CampaignEventScope,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import {
  campaignBaselineReachesViewer,
  campaignViewerVisibleEvents,
} from '@/lib/campaign/sync/campaignViewerProjection';

import {
  campaignScopeAdmits,
  type ICampaignWireViewer,
} from './campaignWireScopeBoundary';

export interface ICampaignViewerWireGate {
  /**
   * Offer one committed log event. Callers offer events in ascending
   * sequence order.
   */
  readonly offer: (event: ICampaignEvent) => void;
  /**
   * Hand the gate the campaign log its latch is seeded from, or `null` when
   * the log could not be read (the latch then counts as set).
   */
  readonly seed: (history: readonly ICampaignEvent[] | null) => void;
}

/**
 * Build a gate that sends `sink` each offered event the viewer may see.
 *
 * - An event whose scope the viewer is not admitted to is withheld.
 * - A `CampaignSnapshotPublished` is sent only when
 *   `campaignBaselineReachesViewer` admits it. Its `withheldBefore` is true
 *   when `campaignViewerVisibleEvents` drops anything from the seeded log's
 *   events with a lower sequence (that function drops a fact only when it
 *   sets its latch), or when this gate has already withheld a frame.
 * - Every offered event, sent or withheld, is then passed to `settled`.
 *
 * A snapshot offered before `seed` has run waits, and every event offered
 * after it waits behind it; `seed` settles them in order. Other events do
 * not wait: only a snapshot's decision reads the latch.
 */
export function createCampaignViewerWireGate(
  viewer: ICampaignWireViewer,
  sink: (event: ICampaignEvent) => void,
  settled: (event: ICampaignEvent) => void,
): ICampaignViewerWireGate {
  const admits = (scope: CampaignEventScope): boolean =>
    campaignScopeAdmits(scope, viewer);
  // undefined until `seed` runs; null when the log could not be read.
  let history: readonly ICampaignEvent[] | null | undefined;
  let withheldHere = false;
  const waiting: ICampaignEvent[] = [];

  const withheldBefore = (sequence: number): boolean => {
    if (withheldHere || history === null || history === undefined) return true;
    const prior = history.filter((event) => event.sequence < sequence);
    return campaignViewerVisibleEvents(prior, admits).length < prior.length;
  };

  const decide = (event: ICampaignEvent): void => {
    if (!admits(event.scope)) {
      withheldHere = true;
    } else if (
      event.type === 'CampaignSnapshotPublished' &&
      !campaignBaselineReachesViewer(
        event,
        admits,
        withheldBefore(event.sequence),
      )
    ) {
      withheldHere = true;
    } else {
      sink(event);
    }
    settled(event);
  };

  return {
    offer: (event) => {
      if (
        waiting.length > 0 ||
        (history === undefined && event.type === 'CampaignSnapshotPublished')
      ) {
        waiting.push(event);
        return;
      }
      decide(event);
    },
    seed: (seeded) => {
      history = seeded;
      for (const event of waiting.splice(0)) decide(event);
    },
  };
}
