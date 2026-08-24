/**
 * The shadow-parity runner (task 5.7; 5.2's explicit non-claim, D10).
 *
 * 5.2 built the state machine and left the thing that drives it unbuilt,
 * so a campaign entering `shadowing` stayed there forever. These rows
 * pin what driving it means: a journal that replays to the SAME state
 * cuts over, one that does not blocks with both digests preserved and
 * the snapshot left authoritative.
 */

import type { ICampaignAuthoritativeState } from '@/types/campaign/CampaignSync';

import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import type { ICampaignJournalEnvelope } from '../../sync/JournalCampaignEventStore';
import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import { importCampaignBaseline } from '../campaignAuthorityMigration';
import { resolveCampaignAuthorityMode } from '../campaignAuthorityMode';
import { runCampaignShadowParity } from '../campaignShadowParityRunner';

const NOW = '3025-01-03T00:00:00.000Z';
const CAMPAIGN_ID = 'campaign-parity';

function stateWithBalance(balance: number): ICampaignAuthoritativeState {
  return { ...createEmptyCampaignState(CAMPAIGN_ID), balance };
}

describe('shadow parity runner', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let markers: ICampaignCutoverMarker[];

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    markers = [];
  });

  const writeMarker = (marker: ICampaignCutoverMarker): void => {
    markers.push(marker);
  };

  /** Imports a baseline so the campaign is genuinely `shadowing`. */
  async function shadowingMarker(
    balance: number,
  ): Promise<ICampaignCutoverMarker> {
    const result = await importCampaignBaseline(journal, {
      campaignId: CAMPAIGN_ID,
      state: stateWithBalance(balance),
      sourceSnapshotRevision: 4,
      importedAt: NOW,
    });
    if (result.kind !== 'imported') throw new Error(result.kind);
    return result.marker;
  }

  it('cuts a campaign over when the journal replays to the same state', async () => {
    const marker = await shadowingMarker(500_000);

    const outcome = await runCampaignShadowParity(
      { journal, writeMarker },
      { marker, snapshotProjection: stateWithBalance(500_000) },
    );

    expect(outcome.kind).toBe('cutover');
    if (outcome.kind !== 'cutover') return;
    expect(outcome.marker.state).toBe('journal');
    expect(markers).toEqual([outcome.marker]);
    // And the authority resolver now names the journal for it.
    expect(
      resolveCampaignAuthorityMode({
        marker: outcome.marker,
        journalHasStream: true,
      }),
    ).toEqual({ kind: 'journal' });
  });

  it('blocks on a mismatch and leaves the snapshot authoritative', async () => {
    const marker = await shadowingMarker(500_000);

    const outcome = await runCampaignShadowParity(
      { journal, writeMarker },
      // The snapshot says something the journal does not replay to.
      { marker, snapshotProjection: stateWithBalance(999_999) },
    );

    expect(outcome.kind).toBe('blocked');
    if (outcome.kind !== 'blocked') return;
    expect(outcome.marker.state).toBe('blocked');
    // Both digests preserved: a human needs to see WHICH two things
    // disagreed, not just that they did.
    expect(outcome.journalDigest).not.toBe(outcome.snapshotDigest);
    expect(outcome.marker.blocked?.journalDigest).toBe(outcome.journalDigest);
    expect(outcome.marker.blocked?.snapshotDigest).toBe(outcome.snapshotDigest);
    // A mismatch does NOT quietly cut over, and does not retry.
    expect(
      resolveCampaignAuthorityMode({
        marker: outcome.marker,
        journalHasStream: true,
      }).kind,
    ).toBe('blocked');
  });

  it('compares projections rather than anything cheaper', async () => {
    // A same-length, same-revision journal that replays to a DIFFERENT
    // state must still block. Count- or revision-based checks would pass
    // this, which is precisely the failure a cutover must not ship.
    const marker = await shadowingMarker(500_000);

    const outcome = await runCampaignShadowParity(
      { journal, writeMarker },
      { marker, snapshotProjection: stateWithBalance(500_001) },
    );

    expect(outcome.kind).toBe('blocked');
  });

  it('refuses to re-run parity on a campaign that already cut over', async () => {
    const marker = await shadowingMarker(500_000);
    const first = await runCampaignShadowParity(
      { journal, writeMarker },
      { marker, snapshotProjection: stateWithBalance(500_000) },
    );
    if (first.kind !== 'cutover') throw new Error('expected cutover');

    const again = await runCampaignShadowParity(
      { journal, writeMarker },
      { marker: first.marker, snapshotProjection: stateWithBalance(1) },
    );

    // Nothing maintains the snapshot after cutover, so a mismatch here
    // would be an artefact of the check rather than a fault in the
    // campaign - and blocking a healthy campaign on it would be worse
    // than not looking.
    expect(again).toEqual({ kind: 'not-shadowing', state: 'journal' });
    expect(markers).toHaveLength(1);
  });
});
