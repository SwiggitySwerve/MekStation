/**
 * The guards around U35e's record rewrite and checkpoint carry-forward
 * (roadmap unit U35e, owner decision OD-u35d-server-and-host-fix).
 *
 * - (g) A genesis carries nothing from the journal: a campaign created next
 *   to another campaign whose journal holds a hired pilot starts with no
 *   pilots, and its genesis is exactly its record's projection.
 * - (n) A campaign with a journal stream and no saved record commits its
 *   co-op commands and gains no record.
 * - (a) A campaign on snapshot authority (no journal-native marker) keeps
 *   its record untouched by a co-op command, as before.
 * - (t) A record rewrite that fails rolls the command's append back: the
 *   rewrite and the append are one transaction.
 * - (i) The same command appended twice by two store instances commits once
 *   and rewrites the record once.
 *
 * Seeding and the database are in the shared fixture.
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { saveCampaignRecordThroughJournal } from '@/lib/campaign/authority/campaignRecordJournalSave';
import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
} from '@/lib/campaign/authority/campaignSourceGenesis';
import { applyCampaignEvent } from '@/lib/campaign/sync/applyCampaignEvent';
import { freezeCampaignEvent } from '@/lib/campaign/sync/campaignEventScope';
import { computeCampaignStateDigest } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { validateCampaignIntent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import { selectCampaignEventStore } from '@/lib/multiplayer/server/getCampaignEventStore';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import {
  campaignRecordRow,
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';

import {
  createJournalNative,
  disjointCampaign,
  envelopeOf,
  eventTypes,
  fixtureContract,
  fixtureOffer,
  flushMeasurements,
  intentOf,
  journal,
  ledgerOf,
  marketOf,
  NOW,
  openCoopHost,
  replayed,
  storedRow,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';

const INJECTED = 'u35e injected record write failure';
const measurements: Record<string, unknown> = {};

describe('U35e record rewrite and checkpoint guards', () => {
  useTempCampaignDatabase('u35e-guards-');

  it('(g) a genesis carries no journal state, even beside a campaign whose journal holds a pilot', async () => {
    const other = await createJournalNative('u35e-g-other');
    const host = await openCoopHost(
      other.record,
      marketOf([fixtureOffer('offer-g', 'Elsewhere')]),
    );
    const hire = await host.applyHostIntent(
      intentOf('u35e-g-other', 'intent-g', 'HireOffer', { offerId: 'offer-g' }),
    );
    const id = 'u35e-g';
    const genesis = await saveCampaignRecordThroughJournal(journal(), {
      purpose: 'genesis',
      envelope: envelopeOf(disjointCampaign(id), 0),
      baseVersion: 0,
      hostInstanceId: getOrCreateHostInstanceId(),
      occurredAt: NOW,
    });
    const created = readCampaign(id);
    const state = await replayed(id);
    measurements.g = {
      hireOk: hire.ok,
      genesisKind: genesis.kind,
      ledger: ledgerOf(state),
      eventTypes: eventTypes(id),
    };
    await flushMeasurements('guards', measurements);

    expect(hire.ok).toBe(true);
    expect(genesis.kind).toBe('ok');
    expect(created.kind).toBe('ok');
    if (created.kind !== 'ok') return;
    expect(eventTypes(id)).toEqual(['CampaignSnapshotPublished']);
    expect(Object.keys(state.pilots)).toEqual([]);
    expect(computeCampaignStateDigest(state)).toBe(
      computeCampaignStateDigest(
        authoritativeStateFromSerializedCampaign(created.record),
      ),
    );
  });

  it('(n) a journal stream with no saved record commits co-op commands and gains no record', async () => {
    const id = 'u35e-stream-only';
    const envelope = envelopeOf(disjointCampaign(id), 1);
    const genesis = await appendCampaignGenesis(
      journal(),
      writeCampaignMigrationMarker,
      { envelope, occurredAt: NOW },
    );
    const host = await openCoopHost(envelope);
    const spend = await host.applyHostIntent(
      intentOf(id, 'intent-n', 'SpendFunds', { amount: 1_000, reason: 'n' }),
    );
    measurements.n = {
      genesisKind: genesis.kind,
      spendOk: spend.ok,
      readKind: readCampaign(id).kind,
      ledger: ledgerOf(await replayed(id)),
    };
    await flushMeasurements('guards', measurements);

    expect(genesis.kind).toBe('genesis-appended');
    expect(spend.ok).toBe(true);
    expect(readCampaign(id).kind).toBe('not_found');
    expect((await replayed(id)).balance).toBe(
      envelope.body.finances.balance - 1_000,
    );
  });

  it('(a) a snapshot-authority campaign keeps its record untouched by a co-op command', async () => {
    const id = 'u35e-snapshot';
    const saved = saveCampaign(envelopeOf(disjointCampaign(id), 1), 0);
    if (saved.kind !== 'ok') throw new Error(saved.kind);
    const before = storedRow(id);
    const host = await openCoopHost(saved.record);
    const spend = await host.applyHostIntent(
      intentOf(id, 'intent-a', 'SpendFunds', { amount: 1_000, reason: 'a' }),
    );
    measurements.a = {
      spendOk: spend.ok,
      rowBefore: before,
      rowAfter: storedRow(id),
      ledger: ledgerOf(await replayed(id)),
    };
    await flushMeasurements('guards', measurements);

    expect(spend.ok).toBe(true);
    expect(storedRow(id)).toEqual(before);
  });

  // K14b PR3: the co-op door used to leave a hired offer and an accepted
  // contract on the saved market, so the host's page kept offering them.
  // The record rewrite that follows a co-op command now drops every offer
  // the journal has consumed, and keeps a decline only beside its offer.
  it('(m) a co-op hire and acceptance leave the saved markets without the consumed offers', async () => {
    const id = 'u35e-market';
    const recruits = [
      fixtureOffer('offer-m', 'Hired Here'),
      fixtureOffer('offer-keep', 'Still Offered'),
    ];
    const contracts = [
      fixtureContract('contract-m'),
      fixtureContract('contract-keep'),
    ];
    const { record } = await createJournalNative(id, {
      personnelMarket: recruits,
      contractMarket: {
        offers: contracts,
        declinedOfferIds: ['contract-keep', 'contract-long-gone'],
      },
    });
    const host = await openCoopHost(record, marketOf(recruits, contracts));

    const hire = await host.applyHostIntent(
      intentOf(id, 'intent-m-hire', 'HireOffer', { offerId: 'offer-m' }),
    );
    const accept = await host.applyHostIntent(
      intentOf(id, 'intent-m-accept', 'AcceptContract', {
        contract: {
          contractId: 'contract-m',
          name: 'x',
          employerFactionId: 'x',
        },
      }),
    );
    const read = readCampaign(id);
    if (read.kind !== 'ok') throw new Error(read.kind);
    const body = read.record.body;
    measurements.m = {
      hireOk: hire.ok,
      acceptOk: accept.ok,
      personnel: body.personnelMarket?.map((one) => one.id),
      contracts: body.contractMarket?.offers.map((one) => one.id),
      declined: body.contractMarket?.declinedOfferIds,
    };
    await flushMeasurements('guards', measurements);

    expect([hire.ok, accept.ok]).toEqual([true, true]);
    expect(body.personnelMarket?.map((one) => one.id)).toEqual(['offer-keep']);
    expect(body.contractMarket?.offers.map((one) => one.id)).toEqual([
      'contract-keep',
    ]);
    expect(body.contractMarket?.declinedOfferIds).toEqual(['contract-keep']);
  });

  it('(t) a record rewrite that fails rolls the co-op command append back', async () => {
    const id = 'u35e-atomic';
    const { record } = await createJournalNative(id);
    const host = await openCoopHost(
      record,
      marketOf([fixtureOffer('offer-t', 'Rolled Back')]),
    );
    const typesBefore = eventTypes(id);
    const rowBefore = storedRow(id);
    jest.spyOn(campaignRecordRow, 'write').mockImplementation(() => {
      throw new Error(INJECTED);
    });
    const hire = host.applyHostIntent(
      intentOf(id, 'intent-t', 'HireOffer', { offerId: 'offer-t' }),
    );
    let failure: string | null = null;
    await hire.then(
      () => undefined,
      (error: unknown) => {
        failure = error instanceof Error ? error.message : String(error);
      },
    );
    jest.restoreAllMocks();
    measurements.t = {
      failure,
      typesBefore,
      typesAfter: eventTypes(id),
      rowBefore,
      rowAfter: storedRow(id),
      hostPilots: Object.keys(host.getState().pilots),
    };
    await flushMeasurements('guards', measurements);

    expect(failure).toBe(INJECTED);
    expect(eventTypes(id)).toEqual(typesBefore);
    expect(storedRow(id)).toEqual(rowBefore);
    expect(Object.keys(host.getState().pilots)).toEqual([]);
  });

  it('(i) the same command appended by two store instances commits once and rewrites the record once', async () => {
    const id = 'u35e-replay';
    const { record } = await createJournalNative(id);
    const prior = await replayed(id);
    const validation = validateCampaignIntent(
      intentOf(id, 'intent-i', 'SpendFunds', { amount: 1_000, reason: 'i' }),
      prior,
      'host',
      NOW,
    );
    if (!validation.ok) throw new Error(validation.reason);
    const sequence = eventTypes(id).length;
    const events = validation.events.map((event, index) =>
      freezeCampaignEvent({ ...event, sequence: sequence + index }),
    ) as readonly ICampaignEvent[];
    const input = {
      commandId: 'u35e-replayed-command',
      intentFingerprint: 'fingerprint-i',
      events,
      expectedPostStateDigest: computeCampaignStateDigest(
        events.reduce(applyCampaignEvent, prior),
      ),
      expectedRevision: sequence,
    };
    const first = selectCampaignEventStore().store;
    const second = selectCampaignEventStore().store;
    const results = await Promise.all([
      first.appendCommandBatch!(id, input),
      second.appendCommandBatch!(id, input),
    ]);
    measurements.i = {
      kinds: results.map((result) => result.kind),
      createdVersion: record.version,
      rowAfter: storedRow(id),
      eventTypes: eventTypes(id),
    };
    await flushMeasurements('guards', measurements);

    expect(results.map((result) => result.kind)).toEqual([
      'committed',
      'committed',
    ]);
    expect(eventTypes(id).filter((type) => type === 'FundsChanged')).toEqual([
      'FundsChanged',
    ]);
    expect(storedRow(id).version).toBe(record.version + 1);
  });
});
