/**
 * Campaign source-instance genesis (task 1.1, journal half).
 *
 * Pins: the server-side projection derived from a stored envelope equals
 * the camp-01b-attested client wire builder's output for the same campaign
 * (the parity row — divergence between source and wire is a bug); the wire
 * builder's guard rules survive serialization (invalid source, missing
 * ref, absent/doubly-claimed force units); genesis appends exactly one
 * system-principal snapshot at sequence 0 with the state digest and writes
 * the journal-native marker; retries are idempotent; and the creation hook
 * is inert when the flag is off or the save was not a create.
 */

import type { SerializedCampaignRosterState } from '@/types/campaign/SerializedCampaign';

import { buildCampaignAuthoritativeState } from '@/lib/campaign/coop/campaignAuthoritativeState';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';

import type { ICampaignCutoverMarker } from '../campaignAuthorityMigration';

import {
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '../../sync/JournalCampaignEventStore';
import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
  maybeAppendCampaignGenesisOnCreate,
} from '../campaignSourceGenesis';

const NOW = '3025-01-03T00:00:00.000Z';

/**
 * The shared fixture gives both forces the same unitIds, which BOTH
 * builders reject as a double claim - re-map to disjoint memberships so
 * the campaign is force-valid for the parity and genesis rows.
 */
function disjointCampaign() {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  const remapped = new Map(
    forces.map((force, index) => [
      force.id,
      { ...force, unitIds: [`unit-${index}`] },
    ]),
  );
  return { ...campaign, forces: remapped };
}

function rosterProjection(
  campaignId: string,
  overrides: Partial<SerializedCampaignRosterState['units'][number]> = {},
): SerializedCampaignRosterState {
  const campaign = disjointCampaign();
  const unitIds = Array.from(campaign.forces.values()).flatMap(
    (force) => force.unitIds,
  );
  return {
    campaignId,
    units: unitIds.map((unitId, index) => ({
      unitId,
      unitRef: 'atlas-as7-d',
      unitName: `Unit ${index}`,
      chassisVariant: 'AS7-D',
      readiness: 'Ready',
      unitSource: 'canonical',
      ...overrides,
    })) as SerializedCampaignRosterState['units'],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  };
}

describe('authoritativeStateFromSerializedCampaign', () => {
  it('equals the client wire builder for the same campaign (parity row)', () => {
    const campaign = disjointCampaign();
    const projection = rosterProjection(campaign.id);
    const envelope = buildSerializedCampaign(
      campaign,
      'device-parity',
      1,
      projection,
    );

    expect(authoritativeStateFromSerializedCampaign(envelope)).toEqual(
      buildCampaignAuthoritativeState(campaign, projection.units),
    );
  });

  it('falls back to force-derived placeholder units exactly like the wire builder', () => {
    const campaign = disjointCampaign();
    const envelope = buildSerializedCampaign(campaign, 'device-parity', 1);

    expect(authoritativeStateFromSerializedCampaign(envelope)).toEqual(
      buildCampaignAuthoritativeState(campaign, []),
    );
  });

  it('keeps the wire builder guard rules across serialization', () => {
    const campaign = disjointCampaign();

    expect(() =>
      authoritativeStateFromSerializedCampaign(
        buildSerializedCampaign(
          campaign,
          'device-guards',
          1,
          rosterProjection(campaign.id, { unitSource: 'weird' as never }),
        ),
      ),
    ).toThrow('invalid roster source');

    expect(() =>
      authoritativeStateFromSerializedCampaign(
        buildSerializedCampaign(
          campaign,
          'device-guards',
          1,
          rosterProjection(campaign.id, { unitRef: undefined }),
        ),
      ),
    ).toThrow('missing a catalog reference');

    const emptyRoster: SerializedCampaignRosterState = {
      ...rosterProjection(campaign.id),
      units: [
        {
          unitId: 'unit-not-in-any-force',
          unitRef: 'atlas-as7-d',
          unitName: 'Orphan',
          chassisVariant: 'AS7-D',
          readiness: 'Ready',
          unitSource: 'canonical',
        },
      ] as SerializedCampaignRosterState['units'],
    };
    expect(() =>
      authoritativeStateFromSerializedCampaign(
        buildSerializedCampaign(campaign, 'device-guards', 1, emptyRoster),
      ),
    ).toThrow('references absent roster unit');
  });
});

describe('appendCampaignGenesis', () => {
  let journal: InMemoryEventJournal<ICampaignJournalEnvelope>;
  let markers: ICampaignCutoverMarker[];

  beforeEach(() => {
    journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(() => NOW);
    markers = [];
  });

  function envelope() {
    const campaign = disjointCampaign();
    return buildSerializedCampaign(
      campaign,
      'device-genesis',
      1,
      rosterProjection(campaign.id),
    );
  }

  it('appends one system-principal genesis snapshot and the journal-native marker', async () => {
    const stored = envelope();
    const result = await appendCampaignGenesis(
      journal,
      (marker) => markers.push(marker),
      { envelope: stored, occurredAt: NOW },
    );

    expect(result.kind).toBe('genesis-appended');
    if (result.kind !== 'genesis-appended') return;
    expect(markers).toHaveLength(1);
    expect(markers[0].campaignId).toBe(stored.campaignId);
    expect(markers[0].state).toBe('journal');
    expect(markers[0].importedBaseline).toBeNull();

    const store = new JournalCampaignEventStore(journal);
    const events = await store.getEvents(stored.campaignId);
    expect(events).toHaveLength(1);
    expect(events[0].sequence).toBe(0);
    expect(events[0].type).toBe('CampaignSnapshotPublished');
    expect(events[0].authorPlayerId).toBe('system');

    const rows = await journal.readStream({
      streamType: 'campaign',
      streamId: stored.campaignId,
      branchId: 'root',
      afterRevision: 0,
      limit: 5,
    });
    expect(rows[0].actorKind).toBe('system');
    expect(rows[0].payload.expectedPostStateDigest).toBe(result.stateDigest);
  });

  it('replays an identical retry idempotently and rejects a divergent one', async () => {
    const stored = envelope();
    const first = await appendCampaignGenesis(journal, (m) => markers.push(m), {
      envelope: stored,
      occurredAt: NOW,
    });
    // Identical retry: the journal's command-identity idempotency replays
    // the cached committed batch - same digest, nothing double-appended,
    // the marker upsert repeats harmlessly.
    const retry = await appendCampaignGenesis(journal, (m) => markers.push(m), {
      envelope: stored,
      occurredAt: NOW,
    });
    expect(first.kind).toBe('genesis-appended');
    expect(retry.kind).toBe('genesis-appended');
    if (first.kind !== 'genesis-appended' || retry.kind !== 'genesis-appended')
      return;
    expect(retry.stateDigest).toBe(first.stateDigest);
    expect(markers).toHaveLength(2);
    expect(markers[1]).toEqual(markers[0]);
    const store = new JournalCampaignEventStore(journal);
    expect(await store.getEvents(stored.campaignId)).toHaveLength(1);
    expect(await store.highestSequence(stored.campaignId)).toBe(0);

    // Divergent retry (same campaign, different content): typed
    // already-journaled, nothing appended, no marker written.
    const divergent = await appendCampaignGenesis(
      journal,
      (m) => markers.push(m),
      {
        envelope: {
          ...stored,
          body: {
            ...stored.body,
            finances: { ...stored.body.finances, balance: 1 },
          },
        },
        occurredAt: NOW,
      },
    );
    expect(divergent).toEqual({ kind: 'already-journaled' });
    expect(markers).toHaveLength(2);
    expect(await store.highestSequence(stored.campaignId)).toBe(0);
  });

  it('reports an invalid projection typed, appending and marking nothing', async () => {
    const campaign = disjointCampaign();
    const bad = buildSerializedCampaign(
      campaign,
      'device-bad',
      1,
      rosterProjection(campaign.id, { unitRef: undefined }),
    );
    const result = await appendCampaignGenesis(
      journal,
      (m) => markers.push(m),
      { envelope: bad, occurredAt: NOW },
    );

    expect(result.kind).toBe('invalid-campaign-projection');
    expect(markers).toHaveLength(0);
    const store = new JournalCampaignEventStore(journal);
    expect(await store.highestSequence(campaign.id)).toBe(-1);
  });
});

describe('maybeAppendCampaignGenesisOnCreate', () => {
  it('is inert when disabled or when the save was not a create', async () => {
    const journalFactory = jest.fn();
    for (const [enabled, created] of [
      [false, true],
      [false, false],
      [true, false],
    ] as const) {
      const result = await maybeAppendCampaignGenesisOnCreate({
        enabled,
        created,
        envelope: {} as never,
        occurredAt: NOW,
        journal: journalFactory,
        writeMarker: () => {
          throw new Error('must not write a marker');
        },
      });
      expect(result).toEqual({ kind: 'skipped' });
    }
    // The disabled path never even constructs a journal handle.
    expect(journalFactory).not.toHaveBeenCalled();
  });

  it('appends the genesis when enabled and created', async () => {
    const journal = new InMemoryEventJournal<ICampaignJournalEnvelope>(
      () => NOW,
    );
    const campaign = disjointCampaign();
    const stored = buildSerializedCampaign(
      campaign,
      'device-hook',
      1,
      rosterProjection(campaign.id),
    );
    const markers: ICampaignCutoverMarker[] = [];

    const result = await maybeAppendCampaignGenesisOnCreate({
      enabled: true,
      created: true,
      envelope: stored,
      occurredAt: NOW,
      journal: () => journal,
      writeMarker: (marker) => markers.push(marker),
    });

    expect(result.kind).toBe('genesis-appended');
    expect(markers).toHaveLength(1);
  });
});
