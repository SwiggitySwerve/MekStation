/**
 * The journal owns the campaign record's transaction (roadmap unit U35b,
 * under OD-mvp-hard-cutover). Real SQLite on a temp file, the live item
 * route through node-mocks-http, and no MEKSTATION_E2E_* key in the
 * environment.
 *
 * - (g3) An accepted whole-envelope PUT on a journal-native campaign
 *   appends a CampaignSnapshotPublished checkpoint of the stored record, so
 *   the journal replays to the record the PUT acknowledged.
 * - (f3) A create whose genesis projection is refused answers 500 and
 *   leaves no row, no event and no marker behind it.
 * - (atomic) A failure injected inside the journal writer's extension,
 *   after the row write, leaves neither the row change nor the append.
 * - (pins) A failed row write appends nothing, so the journal is never
 *   ahead of the record either; a stale PUT appends nothing; a
 *   journal-native PUT whose envelope cannot be projected is refused with
 *   nothing written; a create under journal authority still appends the
 *   genesis and the journal-native marker, and over a stream that already
 *   exists keeps the row with no marker, as before; a campaign with no
 *   marker saves exactly as before, with no journal write at all.
 *
 * Seams, all test-scoped: a journal-native campaign is seeded through the
 * genesis seam (appendCampaignGenesis plus the marker) after a route create,
 * so the checkpoint rows do not depend on the journal flag. The route's
 * create switch, isCampaignJournalAuthorityEnabled, is replaced in this
 * suite's module registry by a jest.fn that answers false unless a create
 * row sets it; the production flag is untouched. The
 * failure is injected by wrapping the writer's extension so it throws after
 * the extension returns, still inside the writer's transaction.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { campaignStreamRef } from '@/lib/campaign/authority/campaignLaunchHead';
import {
  appendCampaignGenesis,
  authoritativeStateFromSerializedCampaign,
} from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { replayCampaignEvents } from '@/lib/campaign/sync/applyCampaignEvent';
import {
  CAMPAIGN_STREAM_TYPE,
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { SQLiteEventJournalWriter } from '@/lib/events/journal/SQLiteEventJournalWriter';
import idHandler from '@/pages/api/campaigns/[id]';
import {
  readCampaignMigrationMarker,
  writeCampaignMigrationMarker,
} from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { readCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const mockCreateSwitch = jest.fn(() => false);

// The route reads its create switch from this module; only that export is
// replaced, and only in this suite. Every other export stays the real one.
jest.mock('@/lib/campaign/sync/campaignJournalAuthorityEnabled', () => ({
  ...jest.requireActual('@/lib/campaign/sync/campaignJournalAuthorityEnabled'),
  isCampaignJournalAuthorityEnabled: () => mockCreateSwitch(),
}));

type Mocks = ReturnType<typeof createMocks<NextApiRequest, NextApiResponse>>;

const NOW = '3025-07-04T00:00:00.000Z';
const INJECTED = 'u35b injected failure after the row write';

/** Invokes the live item route and resolves once the handler returns. */
function callId(
  method: RequestMethod,
  id: string,
  body?: Body,
): Promise<Mocks> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id },
    body,
  });
  return idHandler(req, res).then(() => ({ req, res }));
}

/**
 * An envelope the genesis projection accepts: each force gets one unit of
 * its own (the shared fixture's forces double-claim unit ids) and the
 * roster projection names those units with a catalog ref.
 */
function envelopeFor(campaignId: string, version: number): SerializedCampaign {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  return buildSerializedCampaign(
    {
      ...campaign,
      id: campaignId,
      forces: new Map(
        forces.map((force, index) => [
          force.id,
          { ...force, unitIds: [`unit-${index}`] },
        ]),
      ),
    },
    'device-u35b',
    version,
    {
      campaignId,
      units: forces.map((_, index) => ({
        unitId: `unit-${index}`,
        unitRef: `catalog-ref-${index}`,
        unitSource: 'canonical' as const,
        unitName: `Unit ${index}`,
        chassisVariant: `V-${index}`,
        readiness: 'Ready' as const,
      })),
      pilots: [],
      missions: [],
      activeMissionId: null,
      missionCount: 0,
    },
  );
}

/**
 * An envelope the genesis projection refuses: the shared fixture's forces
 * both claim the same two units, and the projection rejects a unit that is
 * in more than one force.
 */
function refusedEnvelopeFor(campaignId: string): SerializedCampaign {
  return buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: campaignId },
    'device-u35b',
    1,
  );
}

/** The ordinary single-player save: a later date and a changed balance. */
function editedEnvelope(record: SerializedCampaign): SerializedCampaign {
  const next = envelopeFor(record.campaignId, record.version);
  return {
    ...next,
    body: {
      ...next.body,
      currentDate: '3025-08-04T00:00:00.000Z',
      finances: {
        ...next.body.finances,
        balance: record.body.finances.balance + 12_345,
      },
    },
  };
}

/** A journal over the test database, stamping every batch with NOW. */
function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
  return new SQLiteEventJournal(getSQLiteService().getDatabase(), () => NOW);
}

/** Counts the campaign stream's committed journal events, optionally by type. */
function eventCount(campaignId: string, eventType?: string): number {
  const db = getSQLiteService().getDatabase();
  const row = (
    eventType === undefined
      ? db
          .prepare(
            `SELECT COUNT(*) AS count FROM event_journal_events
              WHERE stream_type = ? AND stream_id = ?`,
          )
          .get(CAMPAIGN_STREAM_TYPE, campaignId)
      : db
          .prepare(
            `SELECT COUNT(*) AS count FROM event_journal_events
              WHERE stream_type = ? AND stream_id = ? AND event_type = ?`,
          )
          .get(CAMPAIGN_STREAM_TYPE, campaignId, eventType)
  ) as { readonly count: number };
  return row.count;
}

/** Counts effective event_history_branches rows of the campaign stream. */
function effectiveBranchRows(campaignId: string): number {
  const row = getSQLiteService()
    .getDatabase()
    .prepare(
      `SELECT COUNT(*) AS count FROM event_history_branches
        WHERE stream_type = ? AND stream_id = ? AND status = 'effective'`,
    )
    .get(CAMPAIGN_STREAM_TYPE, campaignId) as { readonly count: number };
  return row.count;
}

/** The campaign stream's effective head revision (0 for no stream). */
function headRevision(campaignId: string): number {
  const db = getSQLiteService().getDatabase();
  return readEffectiveStreamHead(
    db,
    new SQLiteEventHistoryBranchStore(db),
    campaignStreamRef(campaignId),
  ).revision;
}

/** The stored record, or a thrown error naming what the read returned. */
function storedRecord(campaignId: string): SerializedCampaign {
  const read = readCampaign(campaignId);
  if (read.kind !== 'ok') throw new Error(`campaign read ${read.kind}`);
  return read.record;
}

/**
 * Creates the campaign through the live item route with the create switch
 * off, then makes it journal-native through the genesis seam, so the row
 * does not depend on the journal flag.
 */
async function createJournalNativeCampaign(
  campaignId: string,
): Promise<SerializedCampaign> {
  const created = await callId('PUT', campaignId, {
    envelope: envelopeFor(campaignId, 0),
    baseVersion: 0,
  });
  expect(created.res._getStatusCode()).toBe(200);
  const record = created.res._getJSONData() as SerializedCampaign;
  const genesis = await appendCampaignGenesis(
    journal(),
    writeCampaignMigrationMarker,
    { envelope: record, occurredAt: NOW },
  );
  expect(genesis.kind).toBe('genesis-appended');
  return record;
}

/**
 * Wraps the writer's prepared extension so it throws AFTER the extension
 * returns (after the row write and the append), still inside the
 * transaction the writer owns.
 */
function injectFailureAfterExtension(): jest.SpyInstance {
  const original = SQLiteEventJournalWriter.prototype
    .appendPreparedWithExtension as (...args: unknown[]) => Promise<unknown>;
  return jest
    .spyOn(SQLiteEventJournalWriter.prototype, 'appendPreparedWithExtension')
    .mockImplementation(function (
      this: SQLiteEventJournalWriter,
      prepare: unknown,
      extend: unknown,
    ) {
      const wrapped = (...args: unknown[]): never => {
        (extend as (...inner: unknown[]) => unknown)(...args);
        throw new Error(INJECTED);
      };
      return original.call(this, prepare, wrapped) as never;
    } as never);
}

describe('U35b the journal owns the campaign record transaction', () => {
  let dir: string;

  beforeEach(async () => {
    for (const key of Object.keys(process.env)) {
      if (key.startsWith('MEKSTATION_E2E_')) delete process.env[key];
    }
    mockCreateSwitch.mockReturnValue(false);
    dir = await mkdtemp(path.join(tmpdir(), 'u35b-record-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'u35b.db') }).initialize();
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('(g3) a whole-envelope PUT on a journal-native campaign appends a checkpoint of the stored record', async () => {
    const id = 'u35b-g3';
    const created = await createJournalNativeCampaign(id);
    const revisionBefore = headRevision(id);

    const saved = await callId('PUT', id, {
      envelope: editedEnvelope(created),
      baseVersion: created.version,
    });

    expect(saved.res._getStatusCode()).toBe(200);
    const record = storedRecord(id);
    expect(record.version).toBe(created.version + 1);
    const events = await new JournalCampaignEventStore(journal()).getEvents(
      id,
      0,
    );
    const replayed = replayCampaignEvents(id, events);
    // The journal is not left behind the record the PUT acknowledged.
    expect(replayed.balance).toBe(record.body.finances.balance);
    expect(computeCampaignStateDigest(replayed)).toBe(
      computeCampaignStateDigest(
        authoritativeStateFromSerializedCampaign(record),
      ),
    );
    expect(headRevision(id)).toBe(revisionBefore + 1);
    expect(events.at(-1)).toMatchObject({
      sequence: revisionBefore,
      type: 'CampaignSnapshotPublished',
      authorPlayerId: 'system',
      scope: 'campaign',
      payload: { revision: revisionBefore },
    });
  });

  it('(f3) a create whose genesis projection is refused answers 500 and leaves no row', async () => {
    const id = 'u35b-f3';
    mockCreateSwitch.mockReturnValue(true);

    const put = await callId('PUT', id, {
      envelope: refusedEnvelopeFor(id),
      baseVersion: 0,
    });

    expect(put.res._getStatusCode()).toBe(500);
    expect((put.res._getJSONData() as { error: string }).error).toMatch(
      /^campaign genesis failed: /,
    );
    // The refusal leaves nothing behind it: a retry at baseVersion 0 is a
    // create again, not a 409 against a row the client was told failed.
    expect(readCampaign(id).kind).toBe('not_found');
    expect(eventCount(id)).toBe(0);
    expect(readCampaignMigrationMarker(id).kind).toBe('not_found');
  });

  it('(atomic) a failure injected after the row write of a journal-native PUT leaves neither the row change nor the append', async () => {
    const id = 'u35b-atomic-put';
    const created = await createJournalNativeCampaign(id);
    const revisionBefore = headRevision(id);
    const eventsBefore = eventCount(id);
    const injected = injectFailureAfterExtension();

    const put = await callId('PUT', id, {
      envelope: editedEnvelope(created),
      baseVersion: created.version,
    });

    const record = storedRecord(id);
    expect(record.version).toBe(created.version);
    expect(record.body.finances.balance).toBe(created.body.finances.balance);
    expect(eventCount(id)).toBe(eventsBefore);
    expect(headRevision(id)).toBe(revisionBefore);
    expect(put.res._getStatusCode()).toBe(500);
    expect(injected).toHaveBeenCalledTimes(1);
  });

  it('(atomic) a failure injected after the row write of a create leaves no row, no event and no marker', async () => {
    const id = 'u35b-atomic-create';
    mockCreateSwitch.mockReturnValue(true);
    const injected = injectFailureAfterExtension();

    const put = await callId('PUT', id, {
      envelope: envelopeFor(id, 0),
      baseVersion: 0,
    });

    expect(readCampaign(id).kind).toBe('not_found');
    expect(eventCount(id)).toBe(0);
    expect(readCampaignMigrationMarker(id).kind).toBe('not_found');
    expect(put.res._getStatusCode()).toBe(500);
    expect(injected).toHaveBeenCalledTimes(1);
  });

  it('(pin) a failed row write on a journal-native PUT leaves no append either', async () => {
    const id = 'u35b-row-write-fails';
    const created = await createJournalNativeCampaign(id);
    const revisionBefore = headRevision(id);
    // INSERT OR REPLACE fires BEFORE INSERT; the trigger fails that write.
    getSQLiteService()
      .getDatabase()
      .exec(
        `CREATE TRIGGER u35b_fail_row_write BEFORE INSERT ON campaigns
         BEGIN SELECT RAISE(ABORT, 'u35b injected row-write failure'); END`,
      );

    const put = await callId('PUT', id, {
      envelope: editedEnvelope(created),
      baseVersion: created.version,
    });

    // The journal is never ahead of the record either: the append and the
    // row write stand or fall together.
    expect(headRevision(id)).toBe(revisionBefore);
    expect(storedRecord(id).version).toBe(created.version);
    expect(put.res._getStatusCode()).toBe(500);
  });

  it('(pin) a stale whole-envelope PUT on a journal-native campaign answers 409 and appends nothing', async () => {
    const id = 'u35b-stale';
    const created = await createJournalNativeCampaign(id);
    const first = await callId('PUT', id, {
      envelope: editedEnvelope(created),
      baseVersion: created.version,
    });
    expect(first.res._getStatusCode()).toBe(200);
    const eventsAfterFirst = eventCount(id);

    // The same save retried at the version it was built against.
    const retried = await callId('PUT', id, {
      envelope: editedEnvelope(created),
      baseVersion: created.version,
    });

    expect(retried.res._getStatusCode()).toBe(409);
    expect(eventCount(id)).toBe(eventsAfterFirst);
    expect(storedRecord(id).version).toBe(created.version + 1);
  });

  it('(pin) a journal-native PUT whose envelope the projection refuses answers 500 with nothing written', async () => {
    const id = 'u35b-refused-put';
    const created = await createJournalNativeCampaign(id);
    const eventsBefore = eventCount(id);

    const put = await callId('PUT', id, {
      envelope: { ...refusedEnvelopeFor(id), version: created.version },
      baseVersion: created.version,
    });

    expect(storedRecord(id).version).toBe(created.version);
    expect(eventCount(id)).toBe(eventsBefore);
    expect(put.res._getStatusCode()).toBe(500);
    expect((put.res._getJSONData() as { error: string }).error).toMatch(
      /^campaign checkpoint failed: /,
    );
  });

  it('(pin) a create under journal authority appends the genesis and writes the journal-native marker', async () => {
    const id = 'u35b-create';
    mockCreateSwitch.mockReturnValue(true);

    const put = await callId('PUT', id, {
      envelope: envelopeFor(id, 0),
      baseVersion: 0,
    });

    expect(put.res._getStatusCode()).toBe(200);
    expect(storedRecord(id).version).toBe(1);
    expect(eventCount(id)).toBe(1);
    expect(eventCount(id, 'CampaignSnapshotPublished')).toBe(1);
    expect(effectiveBranchRows(id)).toBe(1);
    const marker = readCampaignMigrationMarker(id);
    expect(marker.kind === 'ok' ? marker.marker.state : marker.kind).toBe(
      'journal',
    );
  });

  it('(pin) a create under journal authority over a stream that already exists keeps the row and writes no marker', async () => {
    const id = 'u35b-create-over-stream';
    // A stream with no marker: snapshot authority, but the genesis at
    // sequence 0 is already taken.
    const seeded = await appendCampaignGenesis(journal(), () => undefined, {
      envelope: envelopeFor(id, 1),
      occurredAt: NOW,
    });
    expect(seeded.kind).toBe('genesis-appended');
    mockCreateSwitch.mockReturnValue(true);

    const put = await callId('PUT', id, {
      envelope: envelopeFor(id, 0),
      baseVersion: 0,
    });

    // The outcome such a create had before the one transaction existed.
    expect(put.res._getStatusCode()).toBe(200);
    expect(storedRecord(id).version).toBe(1);
    expect(eventCount(id)).toBe(1);
    expect(readCampaignMigrationMarker(id).kind).toBe('not_found');
  });

  it('(pin) a campaign with no marker saves exactly as before, with no journal write', async () => {
    const id = 'u35b-snapshot';
    const created = await callId('PUT', id, {
      envelope: envelopeFor(id, 0),
      baseVersion: 0,
    });
    expect(created.res._getStatusCode()).toBe(200);
    const record = created.res._getJSONData() as SerializedCampaign;

    const saved = await callId('PUT', id, {
      envelope: editedEnvelope(record),
      baseVersion: record.version,
    });

    expect(saved.res._getStatusCode()).toBe(200);
    expect(storedRecord(id).version).toBe(2);
    expect(storedRecord(id).body.finances.balance).toBe(
      record.body.finances.balance + 12_345,
    );
    expect(eventCount(id)).toBe(0);
    expect(readCampaignMigrationMarker(id).kind).toBe('not_found');
  });
});
