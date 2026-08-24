/**
 * The shadow-parity runner (task 5.7; 5.2's explicit non-claim, D10).
 *
 * 5.2 built the state machine and left the thing that DRIVES it unbuilt:
 * something has to replay the journal beside the live snapshot, compare
 * them, and either cut the campaign over or block it. Without that, a
 * campaign entering `shadowing` stayed there forever.
 *
 * The comparison is the whole safety story of the cutover, so it is done
 * on the projections rather than on anything cheaper. Comparing event
 * counts, or revisions, or "the journal has at least as much", would all
 * pass for a journal that replays to different STATE - which is exactly
 * the failure a cutover must not ship.
 *
 * A mismatch does not retry and does not warn. It blocks, preserving
 * both evidence digests, and leaves the snapshot authoritative: the
 * campaign keeps working on the log that is still correct while a human
 * finds out why the two disagree.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/event-store/spec.md
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';

import { replayCampaignEvents } from '../sync/applyCampaignEvent';
import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../sync/JournalCampaignEventStore';
import {
  advanceAfterShadowParity,
  evaluateShadowParity,
  type ICampaignCutoverMarker,
} from './campaignAuthorityMigration';

export type CampaignShadowParityOutcome =
  | {
      readonly kind: 'cutover';
      readonly marker: ICampaignCutoverMarker;
      readonly journalDigest: string;
    }
  | {
      readonly kind: 'blocked';
      readonly marker: ICampaignCutoverMarker;
      readonly journalDigest: string;
      readonly snapshotDigest: string;
    }
  | {
      readonly kind: 'not-shadowing';
      readonly state: ICampaignCutoverMarker['state'];
    };

export interface IRunCampaignShadowParityDeps {
  readonly journal: IEventJournal<ICampaignJournalEnvelope>;
  readonly writeMarker: (marker: ICampaignCutoverMarker) => void;
}

/**
 * Compares the journal replay against the live snapshot projection and
 * advances the marker on the answer.
 *
 * Only a `shadowing` campaign is a candidate. A campaign in any other
 * state is reported as such rather than nudged: re-running parity on a
 * campaign already cut over would compare a moving journal against a
 * snapshot nothing maintains any more, and a mismatch there would be an
 * artefact of the check, not a fault in the campaign.
 */
export async function runCampaignShadowParity(
  deps: IRunCampaignShadowParityDeps,
  input: {
    readonly marker: ICampaignCutoverMarker;
    readonly snapshotProjection: ICampaignAuthoritativeState;
  },
): Promise<CampaignShadowParityOutcome> {
  if (input.marker.state !== 'shadowing') {
    return { kind: 'not-shadowing', state: input.marker.state };
  }

  const store = new JournalCampaignEventStore(deps.journal);
  const events: readonly ICampaignEvent[] = await store.getEvents(
    input.marker.campaignId,
    0,
  );
  const journalProjection = replayCampaignEvents(
    input.marker.campaignId,
    events,
  );

  const parity = evaluateShadowParity(
    journalProjection,
    input.snapshotProjection,
  );
  const advanced = advanceAfterShadowParity(input.marker, parity);
  if (advanced.kind !== 'ok') {
    // The state machine refused the transition. Reporting the marker's
    // own state is more useful than inventing a parity verdict.
    return { kind: 'not-shadowing', state: input.marker.state };
  }

  deps.writeMarker(advanced.marker);
  if (advanced.marker.state === 'journal') {
    return {
      kind: 'cutover',
      marker: advanced.marker,
      journalDigest: parity.journalDigest,
    };
  }
  return {
    kind: 'blocked',
    marker: advanced.marker,
    journalDigest: parity.journalDigest,
    snapshotDigest: parity.snapshotDigest,
  };
}
