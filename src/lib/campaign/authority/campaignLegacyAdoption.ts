/**
 * Legacy campaign adoption (design-campaign-authority-and-sync task 1.4;
 * design D8; OD-mvp-hard-cutover).
 *
 * Real campaigns already live in browsers. When such a copy first meets a
 * server that has never heard of it, adoption makes this server its source
 * instance as a JOURNAL-NATIVE campaign: the same genesis the create path
 * appends (a `CampaignSnapshotPublished` of the copy's authoritative
 * projection at sequence 0 under the `system` principal) and a
 * journal-native cutover marker, so an adopted campaign resolves to journal
 * authority as soon as the adoption returns.
 *
 * Under OD-mvp-hard-cutover this replaces the earlier import into
 * `shadowing` under the `migration` principal, which recorded the imported
 * revision and digest and kept snapshot authority until an operator parity
 * run advanced the marker. That machinery only protected pre-cutover data.
 * The journal-native marker records no imported baseline, so D10's
 * snapshot rollback does not apply to an adopted campaign.
 *
 * The offer decision is pure and lives here too: only a copy the browser
 * REHYDRATED from storage is a legacy copy. A campaign created this
 * session that has simply not been saved yet is new, and new campaigns
 * belong on the ordinary create path.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import type { ICampaignCutoverMarker } from './campaignAuthorityMigration';

import { type ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import { appendCampaignGenesis } from './campaignSourceGenesis';

/** Server already holds this campaign — adoption is not what is needed. */
export const CAMPAIGN_ALREADY_ADOPTED_REASON = 'campaign-already-adopted';

/**
 * What the client should do with a browser copy whose server lookup just
 * came back. The rehydration mark is the browser's own honest report of
 * where the copy came from; it is never a claim about the server.
 */
export type CampaignAdoptionOffer =
  | { readonly kind: 'adoptable' }
  | { readonly kind: 'already-adopted' }
  | { readonly kind: 'no-legacy-copy' };

export interface ICampaignAdoptionOfferInput {
  /** The campaign the browser currently holds, if any. */
  readonly browserCampaignId: string | null;
  /** Id the campaign store marked as storage-rehydrated, if any. */
  readonly rehydratedCampaignId: string | null;
  /** What the server said about this id. */
  readonly serverLookup: 'found' | 'absent';
  /** The id being resolved (the route's campaign). */
  readonly campaignId: string;
}

/**
 * Decide whether a legacy adoption should be offered. Adoption is offered
 * only when all three hold: the browser is holding THIS campaign, that
 * copy arrived by storage rehydration, and the server does not have it.
 */
export function evaluateCampaignAdoptionOffer(
  input: ICampaignAdoptionOfferInput,
): CampaignAdoptionOffer {
  if (input.serverLookup === 'found') {
    return { kind: 'already-adopted' };
  }
  if (input.browserCampaignId !== input.campaignId) {
    return { kind: 'no-legacy-copy' };
  }
  // An in-session creation is new, not legacy: it has no prior history to
  // import and belongs on the create path's journal-native genesis.
  if (input.rehydratedCampaignId !== input.campaignId) {
    return { kind: 'no-legacy-copy' };
  }
  return { kind: 'adoptable' };
}

/**
 * Read and write access to the campaign's cutover marker. Adoption needs
 * BOTH: the journal replays an identical retried genesis rather than
 * refusing it, so without a read the second call would stamp a fresh
 * marker over the first and clear whatever was recorded on it since.
 */
export interface ICampaignMarkerIo {
  readonly read: (campaignId: string) => ICampaignCutoverMarker | null;
  readonly write: (marker: ICampaignCutoverMarker) => void;
}

export type CampaignAdoptionResult =
  | {
      readonly kind: 'adopted';
      readonly marker: ICampaignCutoverMarker;
      readonly importedDigest: string;
    }
  | { readonly kind: 'already-journaled' }
  | { readonly kind: 'invalid-campaign-projection'; readonly reason: string }
  | { readonly kind: 'skipped' };

/**
 * Adopt a browser-held campaign as this server's source instance through
 * `appendCampaignGenesis`: derive the authoritative projection from the
 * envelope (the same rules the wire builder uses), append it as the
 * genesis snapshot, and persist the journal-native marker. `importedDigest`
 * is the digest of that projection.
 *
 * A retried adoption is NOT an error. A marker already in `journal` state,
 * or one carrying an imported baseline (an earlier `shadowing` import or a
 * snapshot backfill), answers `already-journaled` before anything is
 * appended or written, so a retry never replaces the marker and never
 * clears a `firstJournalAuthorityCommandId` a later command stamped. With
 * no such marker, what `appendCampaignGenesis` answers is passed on:
 * `already-journaled` when its sequence or command-identity guard refuses
 * the append, `invalid-campaign-projection` when the projection or the
 * append is refused, and an identical replayed genesis writes the marker
 * and reports `adopted`.
 */
export async function adoptLegacyCampaign(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  markerIo: ICampaignMarkerIo,
  input: {
    readonly envelope: SerializedCampaign;
    readonly importedAt: string;
  },
): Promise<CampaignAdoptionResult> {
  const existing = markerIo.read(input.envelope.campaignId);
  if (
    existing !== null &&
    (existing.state === 'journal' || existing.importedBaseline !== null)
  ) {
    return { kind: 'already-journaled' };
  }

  const genesis = await appendCampaignGenesis(journal, markerIo.write, {
    envelope: input.envelope,
    occurredAt: input.importedAt,
  });
  if (genesis.kind !== 'genesis-appended') return genesis;
  return {
    kind: 'adopted',
    marker: genesis.marker,
    importedDigest: genesis.stateDigest,
  };
}

/**
 * The hook the adopt route awaits. Inert while journal authority is off —
 * the journal dependency is a lazy factory so the disabled path constructs
 * nothing, matching the creation genesis hook.
 */
export async function maybeAdoptLegacyCampaign(input: {
  readonly enabled: boolean;
  readonly envelope: SerializedCampaign;
  readonly importedAt: string;
  readonly journal: () => IEventJournal<ICampaignJournalEnvelope>;
  readonly markerIo: ICampaignMarkerIo;
}): Promise<CampaignAdoptionResult> {
  if (!input.enabled) {
    return { kind: 'skipped' };
  }
  return adoptLegacyCampaign(input.journal(), input.markerIo, {
    envelope: input.envelope,
    importedAt: input.importedAt,
  });
}
