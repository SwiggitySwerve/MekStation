/**
 * A co-op battle's combat outcome survives the host's whole-campaign save
 * (roadmap unit U35g, owner decision OD-u35g-coop-outcome-rewrites-record;
 * FN-u35d-coop-outcome-roster-lost). Real SQLite on a temp file, the live
 * item route, and the co-op host over the store the production selector
 * builds, through the shared U35e fixture (no MEKSTATION_E2E_* key).
 *
 * The host's save after an outcome is the host's envelope at the version it
 * held before the outcome, then a GET and a PUT of the server record at its
 * own version (the host taking the server record after a 409, as U35f's
 * refresh does).
 *
 * - (o1) U35d's row: the host save carries its pre-battle roster.
 * - (o1c) U35d's row: the host save carries the damage.
 * - (o1s) U35d's row: a campaign created by the PUT route alone.
 * - (d) A destroyed unit is kept as a status change, not removed.
 * - (i) A duplicate receipt of the same outcome rewrites nothing.
 * - (o2u) U35d's row: a debit, then a save built before the host folded it.
 * - (t) A record rewrite that fails rolls the outcome and its receipt back.
 * - (a) A snapshot-authority campaign's record is untouched by an outcome.
 */

import type { ICoopBattleConsequences } from '@/lib/campaign/coop/reconcileCoopBattle';
import type { ICampaign } from '@/types/campaign/Campaign';
import type {
  ICampaignAuthoritativeState,
  ICampaignEvent,
} from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  callId,
  createJournalNative,
  disjointCampaign,
  envelopeOf,
  eventTypes,
  flushMeasurements,
  intentOf,
  openCoopHost,
  replayed,
  useTempCampaignDatabase,
} from '@/__tests__/api/campaigns/campaignJournalEffectsFixture';
import { applyAuthoritativeStateToGuestCampaign } from '@/lib/campaign/coop/campaignMirrorProjection';
import { reconcileCoopBattle } from '@/lib/campaign/coop/reconcileCoopBattle';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { deserializeCampaignBody } from '@/lib/campaign/persistence/serializeCampaign';
import {
  CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
  computeCampaignStateDigest,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  campaignRecordRow,
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { getSQLiteService } from '@/services/persistence/SQLiteService';

type Readiness = 'Ready' | 'Damaged' | 'Destroyed';
type RosterChanges = ICoopBattleConsequences['rosterChanges'];

const INJECTED = 'u35g injected record write failure';
const measurements: Record<string, unknown> = {
  constant: CAMPAIGN_JOURNAL_AUTHORITY_ENABLED,
};

/** unit-0 destroyed and unit-1 damaged, as deriveCoopBattleConsequences emits. */
const DESTROYED_AND_DAMAGED: RosterChanges = [
  { unitId: 'unit-0', designation: 'Unit 0', status: 'destroyed' },
  { unitId: 'unit-1', designation: 'Unit 1', status: 'damaged' },
];
const JOURNAL_ROSTER = { 'unit-0': 'destroyed', 'unit-1': 'damaged' };
const RECORD_ROSTER = { 'unit-0': 'Destroyed', 'unit-1': 'Damaged' };

/** Writes every measurement so far to U35E_ROWS_DIR/u35g-rows.json. */
function flush(): Promise<void> {
  return flushMeasurements('u35g-rows', measurements);
}

/** The ledger fields a row compares, with each roster unit's status. */
function journalOf(state: ICampaignAuthoritativeState) {
  return {
    balance: state.balance,
    salvagePool: state.salvagePool,
    roster: Object.fromEntries(
      Object.values(state.rosterUnits).map((unit) => [
        unit.unitId,
        unit.status,
      ]),
    ),
  };
}

/**
 * The saved record's version, balance, roster readiness and the force
 * holding each roster unit, or the read's kind when there is no record.
 */
function recordOf(campaignId: string) {
  const read = readCampaign(campaignId);
  if (read.kind !== 'ok') return { kind: read.kind };
  const body = read.record.body;
  return {
    version: read.record.version,
    balance: body.finances.balance,
    roster: Object.fromEntries(
      (body.rosterProjection?.units ?? []).map((unit) => [
        unit.unitId,
        unit.readiness,
      ]),
    ),
    forceOf: Object.fromEntries(
      body.forces.flatMap(([forceId, force]) =>
        force.unitIds.map((unitId) => [unitId, forceId]),
      ),
    ),
  };
}

/** The stored campaigns row exactly as written (version and payload). */
function rawRow(campaignId: string): unknown {
  return getSQLiteService()
    .getDatabase()
    .prepare('SELECT version, payload FROM campaigns WHERE id = ?')
    .get(campaignId);
}

/** How many combat-outcome inbox receipts the campaign has. */
function inboxReceipts(campaignId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      'SELECT COUNT(*) AS count FROM campaign_combat_outcome_inbox WHERE campaign_id = ?',
    )
    .get(campaignId) as { readonly count: number };
  return row.count;
}

/** The campaign the host browser holds: the saved record's body now. */
function heldCampaign(campaignId: string): ICampaign {
  const read = readCampaign(campaignId);
  if (read.kind !== 'ok') throw new Error(`no record ${read.kind}`);
  return deserializeCampaignBody(read.record.body);
}

/**
 * `campaign` serialized at `version` with its roster units at the given
 * readiness (what the host roster store's snapshot puts in the envelope).
 */
function envelopeAt(
  campaign: ICampaign,
  version: number,
  readiness: readonly Readiness[],
): SerializedCampaign {
  const forces = Array.from(campaign.forces.values());
  return buildSerializedCampaign(campaign, 'device-u35g', version, {
    campaignId: campaign.id,
    units: forces.map((_, index) => ({
      unitId: `unit-${index}`,
      unitRef: `catalog-ref-${index}`,
      unitSource: 'canonical' as const,
      unitName: `Unit ${index}`,
      chassisVariant: `V-${index}`,
      readiness: readiness[index] ?? 'Ready',
    })),
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
}

/** One co-op battle's consequences on `campaignId`. */
function consequencesOf(
  campaignId: string,
  matchId: string,
  fundsDelta: number,
  salvageValue: number,
  rosterChanges: RosterChanges,
): ICoopBattleConsequences {
  return {
    campaignId,
    matchId,
    outcomeVersion: 1,
    fundsDelta,
    fundsReason: `Co-op mission resolution (${matchId})`,
    salvageValue,
    rosterChanges,
  };
}

/** The committed RosterUnitChanged events as unit, change kind and status. */
function rosterChangesOf(events: readonly ICampaignEvent[]) {
  return events.flatMap((event) =>
    event.type === 'RosterUnitChanged'
      ? [
          {
            unitId: event.payload.unit.unitId,
            change: event.payload.change,
            status: event.payload.unit.status,
          },
        ]
      : [],
  );
}

type SaveEnvelope = (
  held: ICampaign,
  host: CampaignMatchHost,
  version: number,
) => SerializedCampaign;

/** The host fold of the live host state onto the held campaign. */
function hostFold(readiness: readonly Readiness[]): SaveEnvelope {
  return (held, host, version) =>
    envelopeAt(
      applyAuthoritativeStateToGuestCampaign(held, host.getState()),
      version,
      readiness,
    );
}

/**
 * Reconciles `consequences` on a co-op host over the campaign `create`
 * makes, then saves `save(held, host)` at the version the host held before
 * the outcome, then GETs and PUTs the server record at its own version,
 * then commits one more co-op SpendFunds and compares the journal's digest
 * with the live host's. Records what it read under `row`.
 */
async function outcomeRow(
  row: string,
  campaignId: string,
  consequences: ICoopBattleConsequences,
  save: SaveEnvelope,
  create: (id: string) => Promise<{
    readonly record: SerializedCampaign;
    readonly genesisBy: string;
  }> = createJournalNative,
) {
  const { record, genesisBy } = await create(campaignId);
  const held = heldCampaign(campaignId);
  const host = await openCoopHost(record);
  const outcome = await reconcileCoopBattle(host, consequences);
  const journalAfterOutcome = journalOf(await replayed(campaignId));
  const recordAfterOutcome = recordOf(campaignId);
  const stale = await callId('PUT', campaignId, {
    envelope: save(held, host, record.version + 1),
    baseVersion: record.version,
  });
  const server = (await callId('GET', campaignId))
    .json as unknown as SerializedCampaign;
  const current = await callId('PUT', campaignId, {
    envelope: { ...server, version: server.version + 1 },
    baseVersion: server.version,
  });
  const journalAfterSave = journalOf(await replayed(campaignId));
  const recordAfterSave = recordOf(campaignId);
  const spend = await host.applyHostIntent(
    intentOf(campaignId, `intent-${row}-spend`, 'SpendFunds', {
      amount: 1_000,
      reason: 'repairs',
    }),
  );
  const journalAfterNext = await replayed(campaignId);
  const measured = {
    genesisBy,
    createdVersion: record.version,
    outcomeOk: outcome.ok,
    outcomeError: outcome.error ?? null,
    rosterChanges: rosterChangesOf(outcome.events),
    journalAfterOutcome,
    hostAfterOutcome: journalOf(host.getState()),
    recordAfterOutcome,
    stalePutStatus: stale.status,
    currentPutStatus: current.status,
    journalAfterSave,
    recordAfterSave,
    nextCoopCommandOk: spend.ok,
    journalAgreesWithHost:
      computeCampaignStateDigest(journalAfterNext) ===
      computeCampaignStateDigest(host.getState()),
    eventTypes: eventTypes(campaignId),
  };
  measurements[row] = measured;
  await flush();
  return measured;
}

/** A campaign created by the PUT route alone, whatever the flag makes it. */
async function createThroughRouteOnly(campaignId: string) {
  const created = await callId('PUT', campaignId, {
    envelope: envelopeOf(disjointCampaign(campaignId), 0),
    baseVersion: 0,
  });
  if (created.status !== 200) throw new Error(`create ${created.status}`);
  return {
    record: created.json as unknown as SerializedCampaign,
    genesisBy: 'the PUT create alone',
  };
}

describe('U35g: a co-op combat outcome survives the host whole-campaign save', () => {
  useTempCampaignDatabase('u35g-rows-');

  it('(o1) the host save carries its pre-battle roster', async () => {
    const id = 'u35g-o1';
    const m = await outcomeRow(
      'o1',
      id,
      consequencesOf(id, 'battle-o1', 0, 50_000, DESTROYED_AND_DAMAGED),
      hostFold(['Ready', 'Ready']),
    );
    expect(m.outcomeOk).toBe(true);
    expect(m.journalAfterSave.roster).toEqual(JOURNAL_ROSTER);
    expect(m.journalAfterSave.salvagePool).toBe(50_000);
    expect(m.recordAfterSave).toMatchObject({ roster: RECORD_ROSTER });
    expect(m.journalAgreesWithHost).toBe(true);
  });

  it('(o1c) the host save carries the damage (readiness Destroyed, Damaged)', async () => {
    const id = 'u35g-o1c';
    const m = await outcomeRow(
      'o1c',
      id,
      consequencesOf(id, 'battle-o1c', 0, 50_000, DESTROYED_AND_DAMAGED),
      hostFold(['Destroyed', 'Damaged']),
    );
    expect(m.outcomeOk).toBe(true);
    expect(m.journalAfterSave.roster).toEqual(JOURNAL_ROSTER);
    expect(m.recordAfterSave).toMatchObject({ roster: RECORD_ROSTER });
    expect(m.journalAgreesWithHost).toBe(true);
  });

  it('(o1s) the outcome on a campaign created by the PUT route alone', async () => {
    const id = 'u35g-o1s';
    const m = await outcomeRow(
      'o1s',
      id,
      consequencesOf(id, 'battle-o1s', 0, 50_000, DESTROYED_AND_DAMAGED),
      hostFold(['Ready', 'Ready']),
      createThroughRouteOnly,
    );
    expect(m.outcomeOk).toBe(true);
    expect(m.journalAfterSave.roster).toEqual(JOURNAL_ROSTER);
  });

  it('(d) a destroyed unit is kept as a status change in the journal, the host and the record', async () => {
    const id = 'u35g-destroyed';
    const { record } = await createJournalNative(id);
    const host = await openCoopHost(record);
    const outcome = await reconcileCoopBattle(
      host,
      consequencesOf(id, 'battle-d', 0, 0, DESTROYED_AND_DAMAGED),
    );
    const journal = journalOf(await replayed(id));
    const saved = recordOf(id);
    measurements.d = {
      createdVersion: record.version,
      outcomeOk: outcome.ok,
      rosterChanges: rosterChangesOf(outcome.events),
      journal,
      host: journalOf(host.getState()),
      record: saved,
    };
    await flush();

    expect(rosterChangesOf(outcome.events)).toEqual([
      { unitId: 'unit-0', change: 'repaired', status: 'destroyed' },
      { unitId: 'unit-1', change: 'repaired', status: 'damaged' },
    ]);
    expect(journal.roster).toEqual(JOURNAL_ROSTER);
    expect(journalOf(host.getState()).roster).toEqual(JOURNAL_ROSTER);
    expect(saved).toMatchObject({
      version: record.version + 1,
      roster: RECORD_ROSTER,
    });
    expect(Object.keys((saved as { forceOf: object }).forceOf)).toContain(
      'unit-0',
    );
  });

  it('(i) a duplicate receipt of the same outcome rewrites nothing', async () => {
    const id = 'u35g-duplicate';
    const { record } = await createJournalNative(id);
    const host = await openCoopHost(record);
    const consequences = consequencesOf(
      id,
      'battle-i',
      0,
      50_000,
      DESTROYED_AND_DAMAGED,
    );
    const first = await reconcileCoopBattle(host, consequences);
    const rowAfterFirst = rawRow(id);
    const typesAfterFirst = eventTypes(id);
    const second = await reconcileCoopBattle(host, consequences);
    measurements.i = {
      createdVersion: record.version,
      firstOk: first.ok,
      firstEvents: first.events.length,
      versionAfterFirst: recordOf(id),
      secondOk: second.ok,
      secondEvents: second.events.length,
      typesAfterFirst,
      typesAfterSecond: eventTypes(id),
      rowUnchangedBySecond:
        JSON.stringify(rawRow(id)) === JSON.stringify(rowAfterFirst),
    };
    await flush();

    expect([first.ok, second.ok]).toEqual([true, true]);
    expect(recordOf(id)).toMatchObject({ version: record.version + 1 });
    expect(second.events).toEqual([]);
    expect(eventTypes(id)).toEqual(typesAfterFirst);
    expect(rawRow(id)).toEqual(rowAfterFirst);
  });

  it('(o2u) a debit, then a host save built before the host folded it', async () => {
    const id = 'u35g-o2u';
    const m = await outcomeRow(
      'o2u',
      id,
      consequencesOf(id, 'battle-o2u', -25_000, 0, []),
      (held, _host, version) => envelopeAt(held, version, ['Ready', 'Ready']),
    );
    expect(m.outcomeOk).toBe(true);
    expect(m.journalAfterOutcome.balance).toBe(355_000);
    expect(m.journalAfterSave.balance).toBe(355_000);
    expect(m.recordAfterSave).toMatchObject({ balance: 355_000 });
  });

  it('(t) a record rewrite that fails rolls the outcome and its inbox receipt back', async () => {
    const id = 'u35g-atomic';
    const { record } = await createJournalNative(id);
    const host = await openCoopHost(record);
    const typesBefore = eventTypes(id);
    const rowBefore = rawRow(id);
    const hostBefore = journalOf(host.getState());
    const consequences = consequencesOf(
      id,
      'battle-t',
      0,
      50_000,
      DESTROYED_AND_DAMAGED,
    );
    jest.spyOn(campaignRecordRow, 'write').mockImplementation(() => {
      throw new Error(INJECTED);
    });
    let failure: string | null = null;
    await reconcileCoopBattle(host, consequences).then(
      () => undefined,
      (error: unknown) => {
        failure = error instanceof Error ? error.message : String(error);
      },
    );
    jest.restoreAllMocks();
    const afterFailure = {
      failure,
      typesAfter: eventTypes(id),
      rowUnchanged: JSON.stringify(rawRow(id)) === JSON.stringify(rowBefore),
      receipts: inboxReceipts(id),
      host: journalOf(host.getState()),
    };
    const retry = await reconcileCoopBattle(host, consequences);
    measurements.t = {
      typesBefore,
      afterFailure,
      retryOk: retry.ok,
      recordAfterRetry: recordOf(id),
    };
    await flush();

    expect(afterFailure).toEqual({
      failure: INJECTED,
      typesAfter: typesBefore,
      rowUnchanged: true,
      receipts: 0,
      host: hostBefore,
    });
    expect(retry.ok).toBe(true);
    expect(recordOf(id)).toMatchObject({
      version: record.version + 1,
      roster: RECORD_ROSTER,
    });
  });

  it('(a) a snapshot-authority campaign keeps its record untouched by an outcome', async () => {
    const id = 'u35g-snapshot';
    const saved = saveCampaign(envelopeOf(disjointCampaign(id), 1), 0);
    if (saved.kind !== 'ok') throw new Error(saved.kind);
    const rowBefore = rawRow(id);
    const host = await openCoopHost(saved.record);
    const outcome = await reconcileCoopBattle(
      host,
      consequencesOf(id, 'battle-a', -25_000, 50_000, DESTROYED_AND_DAMAGED),
    );
    measurements.a = {
      outcomeOk: outcome.ok,
      rowUnchanged: JSON.stringify(rawRow(id)) === JSON.stringify(rowBefore),
      journal: journalOf(await replayed(id)),
    };
    await flush();

    expect(outcome.ok).toBe(true);
    expect(rawRow(id)).toEqual(rowBefore);
  });
});
