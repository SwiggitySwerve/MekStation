/**
 * Server-side composition of per-campaign authority (task 5.7).
 *
 * Reads the durable marker and asks the journal whether this campaign
 * actually has a stream, then hands both to the pure resolver. Kept
 * separate from that resolver so the decision stays testable without a
 * database, and so the ONE place that decides authority cannot acquire a
 * second, subtly different implementation.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D10)
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';

import type { ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import type { ICampaignCutoverMarker } from './campaignAuthorityMigration';

import { JournalCampaignEventStore } from '../sync/JournalCampaignEventStore';
import {
  resolveCampaignAuthorityMode,
  type CampaignAuthorityMode,
} from './campaignAuthorityMode';

/** The marker store's read result, narrowed to what authority needs. */
export type CampaignMarkerRead =
  | { readonly kind: 'ok'; readonly marker: ICampaignCutoverMarker }
  | { readonly kind: 'not_found' }
  | { readonly kind: 'corrupt'; readonly campaignId: string };

export interface IResolveCampaignAuthorityDeps {
  readonly readMarker: (campaignId: string) => CampaignMarkerRead;
  readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
}

/**
 * Resolves authority for one campaign against the live stores.
 *
 * The journal is consulted ONLY for a campaign the marker says is on
 * journal authority. Every other state has its answer from the marker
 * alone, and a stream probe for them would be a database read per
 * request that changes nothing.
 */
export async function resolveCampaignAuthorityFromStores(
  deps: IResolveCampaignAuthorityDeps,
  campaignId: string,
): Promise<CampaignAuthorityMode> {
  const read = deps.readMarker(campaignId);
  if (read.kind === 'corrupt') {
    return resolveCampaignAuthorityMode({
      marker: null,
      markerUnreadable: true,
      journalHasStream: false,
    });
  }
  if (read.kind === 'not_found') {
    return resolveCampaignAuthorityMode({
      marker: null,
      journalHasStream: false,
    });
  }
  if (read.marker.state !== 'journal') {
    return resolveCampaignAuthorityMode({
      marker: read.marker,
      journalHasStream: false,
    });
  }

  let journalHasStream = false;
  try {
    const store = new JournalCampaignEventStore(deps.journal());
    journalHasStream = (await store.highestSequence(campaignId)) >= 0;
  } catch {
    // An unreadable journal for a journal-authority campaign is the same
    // situation as a missing one: what must NOT happen is quietly serving
    // the snapshot instead, which the resolver refuses either way.
    journalHasStream = false;
  }
  return resolveCampaignAuthorityMode({
    marker: read.marker,
    journalHasStream,
  });
}
