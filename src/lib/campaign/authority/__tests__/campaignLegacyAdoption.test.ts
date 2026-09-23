/**
 * Legacy campaign adoption (task 1.4, design D8; OD-mvp-hard-cutover).
 *
 * Pins: the offer is made only for a storage-rehydrated copy the server
 * does not hold (a campaign created this session is new, not legacy);
 * adoption appends the genesis snapshot under the `system` principal and
 * writes the journal-native marker, the same shape a create produces; a
 * retried adoption is idempotent rather than an error and never replaces
 * the marker (so a stamped first command survives it, and a marker from an
 * earlier shadowing import is left standing); an unprojectable campaign is
 * reported as a failure rather than as a completed adoption; and the hook
 * is inert while journal authority is off.
 */

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import {
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import {
  createJournalNativeMarker,
  importCampaignBaseline,
  recordFirstJournalAuthorityCommand,
} from '../campaignAuthorityMigration';
import {
  adoptLegacyCampaign,
  evaluateCampaignAdoptionOffer,
  maybeAdoptLegacyCampaign,
} from '../campaignLegacyAdoption';
import { authoritativeStateFromSerializedCampaign } from '../campaignSourceGenesis';

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

  it('adopts a browser copy as a journal-native campaign', async () => {
    const envelope = browserEnvelope(7);

    const result = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    expect(result.kind).toBe('adopted');
    if (result.kind !== 'adopted') throw new Error('unreachable');
    // The marker a create writes: journal state, no imported baseline.
    expect(result.marker).toEqual(
      createJournalNativeMarker(envelope.campaignId),
    );
    expect(markers).toEqual([result.marker]);
    expect(result.importedDigest).toBe(
      computeCampaignStateDigest(
        authoritativeStateFromSerializedCampaign(envelope),
      ),
    );
  });

  it('writes exactly one genesis event under the system principal', async () => {
    const envelope = browserEnvelope();

    await adoptLegacyCampaign(journal, markerIo, { envelope, importedAt: NOW });

    const store = new JournalCampaignEventStore(journal);
    const events = await store.getEvents(envelope.campaignId, 0);
    expect(events).toHaveLength(1);
    expect(events[0]?.sequence).toBe(0);
    expect(events[0]?.type).toBe('CampaignSnapshotPublished');
    expect(events[0]?.authorPlayerId).toBe('system');
  });

  it('is idempotent when the same campaign is adopted twice', async () => {
    const envelope = browserEnvelope();
    await adoptLegacyCampaign(journal, markerIo, { envelope, importedAt: NOW });

    const again = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    // The journal REPLAYS an identical genesis rather than refusing it, so
    // the recorded marker - not the append - is what makes a retry safe.
    expect(again.kind).toBe('already-journaled');
    // No second marker: a retry must not replace the recorded one.
    expect(markers).toHaveLength(1);
    const store = new JournalCampaignEventStore(journal);
    expect(await store.getEvents(envelope.campaignId, 0)).toHaveLength(1);
  });

  it('keeps a stamped first command when the adoption is retried', async () => {
    const envelope = browserEnvelope();
    await adoptLegacyCampaign(journal, markerIo, { envelope, importedAt: NOW });
    const adopted = markerIo.read(envelope.campaignId);
    if (adopted === null) throw new Error('unreachable');
    const stamped = recordFirstJournalAuthorityCommand(adopted, 'cmd-first');
    if (stamped.kind !== 'ok') throw new Error(stamped.kind);
    markerIo.write(stamped.marker);

    const again = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    // A fresh journal-native marker would reset the stamp to null.
    expect(again.kind).toBe('already-journaled');
    expect(markerIo.read(envelope.campaignId)).toEqual(stamped.marker);
  });

  it('leaves a marker from an earlier shadowing import standing', async () => {
    const envelope = browserEnvelope();
    const imported = await importCampaignBaseline(journal, {
      campaignId: envelope.campaignId,
      state: authoritativeStateFromSerializedCampaign(envelope),
      sourceSnapshotRevision: envelope.version,
      importedAt: NOW,
    });
    if (imported.kind !== 'imported') throw new Error(imported.kind);
    markerIo.write(imported.marker);

    const result = await adoptLegacyCampaign(journal, markerIo, {
      envelope,
      importedAt: NOW,
    });

    expect(result.kind).toBe('already-journaled');
    expect(markers).toEqual([imported.marker]);
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
