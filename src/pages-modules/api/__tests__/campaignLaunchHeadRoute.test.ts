/**
 * The head a launch is allowed to name has to come from the authority.
 *
 * Before this route existed, a browser had no way to learn which branch
 * and revision its campaign was on: no client-facing type carries a
 * branch id, and the two revision-shaped numbers a client does hold are
 * both the wrong number. `SerializedCampaign.version` is the campaigns
 * table's write counter, and the co-op snapshot's `revision` is a
 * campaign event SEQUENCE, which sits one below the journal revision.
 * Either would compile, pass a naive test, and compare two unrelated
 * counters forever.
 *
 * Every row here therefore builds a world where the write version and
 * the journal revision are DIFFERENT numbers, so a route that returns
 * the wrong one cannot pass.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';

import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import handler from '@/pages-modules/api/campaignLaunchHeadRoute';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const NOW = '3025-07-04T00:00:00.000Z';

interface IResult {
  statusCode: number;
  body: unknown;
  headers: Record<string, unknown>;
}

function mockReqRes(
  id: unknown,
  method = 'GET',
): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
  const result: IResult = { statusCode: 0, body: undefined, headers: {} };
  const req = {
    method,
    headers: {},
    query: { id },
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      result.body = payload;
      return this;
    },
    setHeader(name: string, value: unknown) {
      result.headers[name] = value;
      return this;
    },
    end() {
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

/**
 * Persist the campaign TWICE so its write version is 2, then append the
 * single genesis event so its journal revision is 1. Nothing downstream
 * can confuse the two after this.
 */
async function seedCampaignWithJournal(): Promise<{
  campaign: ICampaign;
  writeVersion: number;
  journalRevision: number;
}> {
  const campaign = buildPopulatedCampaign();
  const forces = Array.from(campaign.forces.values());
  const disjoint: ICampaign = {
    ...campaign,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
  const roster = {
    campaignId: disjoint.id,
    units: Array.from(disjoint.forces.values())
      .flatMap((force) => force.unitIds)
      .map((unitId, index) => ({
        unitId,
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
  };

  const first = saveCampaign(
    buildSerializedCampaign(disjoint, 'device-1', 0, roster),
    0,
  );
  expect(first.kind).toBe('ok');
  const second = saveCampaign(
    buildSerializedCampaign(disjoint, 'device-1', 1, roster),
    1,
  );
  expect(second.kind).toBe('ok');
  if (second.kind !== 'ok') throw new Error('seed failed');

  const db = getSQLiteService().getDatabase();
  const genesis = await appendCampaignGenesis(
    new SQLiteEventJournal(db, () => NOW),
    () => undefined,
    { envelope: second.record, occurredAt: NOW },
  );
  expect(genesis.kind).toBe('genesis-appended');
  new SQLiteEventHistoryBranchStore(db).backfillGenesisBranches();

  return {
    campaign: disjoint,
    writeVersion: second.record.version,
    journalRevision: 1,
  };
}

/** Persist a campaign with no genesis and no branch - the flag-off world. */
function seedCampaignWithoutJournal(): ICampaign {
  const campaign = buildPopulatedCampaign();
  const saved = saveCampaign(
    buildSerializedCampaign(campaign, 'device-1', 0),
    0,
  );
  expect(saved.kind).toBe('ok');
  return campaign;
}

describe('GET /api/campaigns/:id/head', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'launch-head-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'head.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('answers the effective branch and the JOURNAL revision', async () => {
    const seeded = await seedCampaignWithJournal();
    const { req, res, result } = mockReqRes(seeded.campaign.id);

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    const body = result.body as {
      kind: string;
      branchId: string;
      revision: number;
      effectiveGeneration: number;
    };
    expect(body.kind).toBe('head');
    // Read back from the store rather than compared to a literal: a
    // hard-coded 'root' would keep passing after an activation.
    const stored = new SQLiteEventHistoryBranchStore(
      getSQLiteService().getDatabase(),
    ).requireEffectiveHead({
      streamType: CAMPAIGN_STREAM_TYPE,
      streamId: seeded.campaign.id,
    });
    expect(body.branchId).toBe(stored.branchId);
    expect(body.effectiveGeneration).toBe(stored.effectiveGeneration);
    expect(body.revision).toBe(seeded.journalRevision);
  });

  it('does not answer with the campaign write version', async () => {
    const seeded = await seedCampaignWithJournal();
    const { req, res, result } = mockReqRes(seeded.campaign.id);

    await handler(req, res);

    // The whole point of the endpoint: these are different numbers and
    // the route owes the caller the journal one.
    expect(seeded.writeVersion).toBe(2);
    expect(seeded.journalRevision).toBe(1);
    expect(seeded.writeVersion).not.toBe(seeded.journalRevision);
    expect((result.body as { revision: number }).revision).toBe(
      seeded.journalRevision,
    );
    expect((result.body as { revision: number }).revision).not.toBe(
      seeded.writeVersion,
    );
  });

  it('answers no-authoritative-stream for a campaign with no journal yet', async () => {
    const campaign = seedCampaignWithoutJournal();
    const { req, res, result } = mockReqRes(campaign.id);

    await handler(req, res);

    // 200, not 404: the campaign exists and is launchable, it just has
    // no head to name while the cutover flag is off. The launch acts on
    // this by proceeding ungated, exactly as it does today.
    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ kind: 'no-authoritative-stream' });
  });

  it('never invents a branch for a stream that has no head', async () => {
    const campaign = seedCampaignWithoutJournal();
    const { req, res, result } = mockReqRes(campaign.id);

    await handler(req, res);

    expect(result.body).not.toHaveProperty('branchId');
    expect(JSON.stringify(result.body)).not.toContain('root');
  });

  it('answers revision 0 for a branch with nothing appended to it', async () => {
    const seeded = await seedCampaignWithJournal();
    // A branch whose stream has no head row sits at revision 0 - it
    // exists and nothing has been appended yet. That is the genesis
    // shape (and what a freshly created candidate branch will look like
    // once PR 2 can mint one); the correction-lease store already reads
    // a missing head row the same way, calling it "not an error and not
    // a missing head". Defaulting it to anything else would compare a
    // fabricated revision against a head of 0 and refuse a fresh
    // campaign's very first launch.
    getSQLiteService()
      .getDatabase()
      .prepare(
        `DELETE FROM event_journal_stream_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .run(CAMPAIGN_STREAM_TYPE, seeded.campaign.id);
    const { req, res, result } = mockReqRes(seeded.campaign.id);

    await handler(req, res);

    expect(result.statusCode).toBe(200);
    const body = result.body as { kind: string; revision: number };
    // Still a head - the branch is there. Only the revision is 0.
    expect(body.kind).toBe('head');
    expect(body.revision).toBe(0);
  });

  it('404s an unknown campaign', async () => {
    const { req, res, result } = mockReqRes('campaign-never-persisted');

    await handler(req, res);

    expect(result.statusCode).toBe(404);
  });

  it('rejects a missing id and a non-GET method', async () => {
    const missing = mockReqRes(undefined);
    await handler(missing.req, missing.res);
    expect(missing.result.statusCode).toBe(400);

    const seeded = await seedCampaignWithJournal();
    const posted = mockReqRes(seeded.campaign.id, 'POST');
    await handler(posted.req, posted.res);
    expect(posted.result.statusCode).toBe(405);
    expect(posted.result.headers.Allow).toEqual(['GET']);
  });
});
