/**
 * Legacy campaign adoption (task 1.4, design D8 + D10).
 *
 * Pins: the offer is made only for a storage-rehydrated copy the server
 * does not hold (a campaign created this session is new, not legacy);
 * adoption imports under the `migration` principal and lands in
 * `shadowing` with the imported revision and digest recorded — the
 * provenance distinction that separates it from a journal-native create;
 * a retried adoption is idempotent rather than an error; a rejected append
 * is reported as a failure rather than as a completed import; and the hook
 * is inert while journal authority is off.
 */

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import { createJournalNativeMarker } from '../campaignAuthorityMigration';
import {
  adoptLegacyCampaign,
  evaluateCampaignAdoptionOffer,
  maybeAdoptLegacyCampaign,
} from '../campaignLegacyAdoption';

const NOW = '3025-01-03T00:00:00.000Z';

/**
 * The shared fixture gives both forces the same unitIds, which the
 * projection rejects as a double claim — re-map to disjoint memberships.
 */
function adoptableCampaign() {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  return {
    ...campaign,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
}

/** A browser copy that has been played for a while: version 7. */
function browserEnvelope(version = 7) {
  return buildSerializedCampaign(adoptableCampaign(), 'device-legacy', version);
}

describe('evaluateCampaignAdoptionOffer', () => {
  const base = {
    campaignId: 'campaign-a',
    browserCampaignId: 'campaign-a',
    rehydratedCampaignId: 'campaign-a',
    serverLookup: 'absent' as const,
  };

  it('offers adoption for a rehydrated copy the server does not hold', () => {
    expect(evaluateCampaignAdoptionOffer(base)).toEqual({ kind: 'adoptable' });
  });

  it('does not offer adoption when the server already holds the campaign', () => {
    expect(
      evaluateCampaignAdoptionOffer({ ...base, serverLookup: 'found' }),
    ).toEqual({ kind: 'already-adopted' });
  });

  it('treats an in-session creation as new rather than legacy', () => {
    // No rehydration mark: this campaign was made this session and has no
    // prior history to import. Offering adoption would route a brand-new
    // campaign away from its journal-native genesis.
    expect(
      evaluateCampaignAdoptionOffer({ ...base, rehydratedCampaignId: null }),
    ).toEqual({ kind: 'no-legacy-copy' });
  });

  it('ignores a rehydrated copy of some other campaign', () => {
    expect(
      evaluateCampaignAdoptionOffer({
        ...base,
        browserCampaignId: 'campaign-b',
        rehydratedCampaignId: 'campaign-b',
      }),
    ).toEqual({ kind: 'no-legacy-copy' });
  });
});

describe('adoptLegacyCampaign', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let markers: ICampaignCutoverMarker[];

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    markers = [];
  });

  // A real marker store: the last write is what a later read sees, which
  // is exactly the state a retried adoption has to reckon with.
  const markerIo = {
    read: (campaignId: string): ICampaignCutoverMarker | null =>
      markers.findLast((marker) => marker.campaignId === campaignId) ?? null,
    write: (marker: ICampaignCutoverMarker): void => {
      markers.push(marker);
    },
  };

  it('records the import honestly instead of claiming a native genesis', async () => {
    const envelope = browserEnvelope(7);

    const result = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    expect(result.kind).toBe('adopted');
    if (result.kind !== 'adopted') throw new Error('unreachable');
    // Parity is still owed: the import is not yet proven equal to the
    // projection the journal replays.
    expect(result.marker.state).toBe('shadowing');
    expect(result.marker.importedBaseline).not.toBeNull();
    expect(result.marker.importedBaseline?.sourceSnapshotRevision).toBe(7);
    expect(result.marker.importedBaseline?.sourceSnapshotDigest).toBe(
      result.importedDigest,
    );
    expect(result.importedDigest).not.toBe('');
    expect(markers).toEqual([result.marker]);

    // The regression this whole path exists to prevent: a browser copy
    // stamped journal-native would assert its entire history lives in this
    // journal, and D10's rollback law reads exactly that field.
    const native = createJournalNativeMarker(envelope.campaignId);
    expect(native.importedBaseline).toBeNull();
    expect(result.marker).not.toEqual(native);
  });

  it('writes exactly one baseline event under the migration principal', async () => {
    const envelope = browserEnvelope();

    await adoptLegacyCampaign(journal, markerIo, { envelope, importedAt: NOW });

    const store = new JournalCampaignEventStore(journal);
    const events = await store.getEvents(envelope.campaignId, 0);
    expect(events).toHaveLength(1);
    expect(events[0]?.sequence).toBe(0);
    expect(events[0]?.type).toBe('CampaignSnapshotPublished');
    expect(events[0]?.authorPlayerId).toBe('migration');
  });

  it('is idempotent when the same campaign is adopted twice', async () => {
    const envelope = browserEnvelope();
    await adoptLegacyCampaign(journal, markerIo, { envelope, importedAt: NOW });

    const again = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    // The journal REPLAYS an identical command rather than refusing it, so
    // the recorded marker - not the append - is what makes a retry safe.
    // Without that read the second call would restamp the marker with a
    // later import time and quietly rewrite the campaign's provenance.
    expect(again.kind).toBe('already-journaled');
    // No second marker: a retry must not rewrite the recorded provenance.
    expect(markers).toHaveLength(1);
    const store = new JournalCampaignEventStore(journal);
    expect(await store.getEvents(envelope.campaignId, 0)).toHaveLength(1);
  });

  it('reports an unprojectable campaign as a failure, not an import', async () => {
    const campaign = adoptableCampaign();
    const forces = Array.from(campaign.forces.values());
    // Both forces claim the same unit — the projection rejects it.
    const collided = {
      ...campaign,
      forces: new Map(
        forces.map((force) => [force.id, { ...force, unitIds: ['unit-0'] }]),
      ),
    };
    const envelope = buildSerializedCampaign(collided, 'device-legacy', 3);

    const result = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    expect(result.kind).toBe('invalid-campaign-projection');
    expect(markers).toHaveLength(0);
    const store = new JournalCampaignEventStore(journal);
    expect(await store.getEvents(envelope.campaignId, 0)).toHaveLength(0);
  });
});

describe('maybeAdoptLegacyCampaign', () => {
  it('constructs no journal at all while journal authority is off', async () => {
    const journal = jest.fn(() => {
      throw new Error('journal must not be constructed when disabled');
    });

    const result = await maybeAdoptLegacyCampaign({
      enabled: false,
      envelope: browserEnvelope(),
      importedAt: NOW,
      journal: journal as never,
      markerIo: {
        read: () => {
          throw new Error('no marker read while disabled');
        },
        write: () => {
          throw new Error('no marker write while disabled');
        },
      },
    });

    expect(result).toEqual({ kind: 'skipped' });
    expect(journal).not.toHaveBeenCalled();
  });
});
