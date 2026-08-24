/**
 * Legacy campaign adoption (design-campaign-authority-and-sync task 1.4;
 * design D8, amended into D10's migration-state machinery).
 *
 * Real campaigns already live in browsers. When such a copy first meets a
 * server that has never heard of it, the server must record what actually
 * happened: a campaign with unknown prior history was IMPORTED at some
 * revision, not born here at revision 0.
 *
 * That distinction is load-bearing rather than cosmetic. A journal-native
 * marker (`importedBaseline: null`) asserts the campaign's whole history
 * is in this journal, and the D10 rollback law reads exactly that field to
 * decide whether snapshot authority may be restored — so a browser copy
 * stamped journal-native would carry a false provenance claim AND lose its
 * route back. Adoption therefore goes through `importCampaignBaseline`
 * under the `migration` principal, which records the imported revision and
 * the digest of the state that came in, and lands in `shadowing` where
 * parity is still owed.
 *
 * The offer decision is pure and lives here too: only a copy the browser
 * REHYDRATED from storage is a legacy copy. A campaign created this
 * session that has simply not been saved yet is new, and new campaigns
 * belong on the ordinary create path with a journal-native genesis.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D8, D10)
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-persistence/spec.md
 */

import type { IEventJournal } from '@/lib/events/journal/EventJournalContract';
import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { type ICampaignJournalEnvelope } from '../sync/JournalCampaignEventStore';
import {
  importCampaignBaseline,
  type ICampaignCutoverMarker,
} from './campaignAuthorityMigration';
import { authoritativeStateFromSerializedCampaign } from './campaignSourceGenesis';

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
 * BOTH: the journal replays an identical retried command rather than
 * refusing it, so without a read the second call would happily stamp a
 * fresh marker over the first and rewrite when the import happened.
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
 * Import a browser-held campaign as this server's source instance: derive
 * the authoritative projection from the stored envelope (the same rules
 * the wire builder uses), append it as an explicit baseline carrying its
 * digest, and persist the resulting `shadowing` marker.
 *
 * A retried adoption is NOT an error. The journal replays an identical
 * command rather than refusing it, so the recorded marker - not the
 * append - is what says the campaign is already adopted, and the answer
 * is `already-journaled` with the original provenance left standing.
 */
export async function adoptLegacyCampaign(
  journal: IEventJournal<ICampaignJournalEnvelope>,
  markerIo: ICampaignMarkerIo,
  input: {
    readonly envelope: SerializedCampaign;
    readonly importedAt: string;
  },
): Promise<CampaignAdoptionResult> {
  // Already adopted: the recorded baseline is the truth about when this
  // campaign came in, and a retry has no better information than the
  // original did.
  const existing = markerIo.read(input.envelope.campaignId);
  if (existing !== null && existing.importedBaseline !== null) {
    return { kind: 'already-journaled' };
  }

  let state: ICampaignAuthoritativeState;
  try {
    state = authoritativeStateFromSerializedCampaign(input.envelope);
  } catch (error) {
    return {
      kind: 'invalid-campaign-projection',
      reason: error instanceof Error ? error.message : 'projection failed',
    };
  }

  const result = await importCampaignBaseline(journal, {
    campaignId: input.envelope.campaignId,
    state,
    // The revision the imported copy carried. The browser copy's history
    // is not in this journal, and the marker records that rather than
    // pretending the import started from nothing.
    sourceSnapshotRevision: input.envelope.version,
    importedAt: input.importedAt,
  });
  if (result.kind === 'imported') {
    markerIo.write(result.marker);
    return {
      kind: 'adopted',
      marker: result.marker,
      importedDigest:
        result.marker.importedBaseline?.sourceSnapshotDigest ?? '',
    };
  }
  // 5.2's import reports a rejected append as `stream-not-empty` with a
  // sentinel sequence. Passing that on as "already journaled" would tell
  // the caller their campaign is safely imported when nothing committed,
  // so the sentinel is surfaced as the failure it is.
  if (result.kind === 'stream-not-empty' && result.highestSequence < 0) {
    return {
      kind: 'invalid-campaign-projection',
      reason: 'journal append rejected the baseline batch',
    };
  }
  return { kind: 'already-journaled' };
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
