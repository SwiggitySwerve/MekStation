/**
 * The authority decides whether a launch may proceed, and with whose forces.
 *
 * The browser has no SQLite and cannot be trusted to judge its own view,
 * so it sends the head it is holding and this route answers. Every row
 * proves one of the three answers the launch can act on: proceed with
 * owned forces, proceed ungated, or refuse with the current head and a
 * recovery action.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Scenario Materialization Uses Authoritative Owned Forces")
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaign } from '@/types/campaign/Campaign';

import {
  CAMPAIGN_CREATION_MISSION_ID,
  playerSlotPlaceholderId,
} from '@/lib/campaign/authority/campaignCreationCheckpoint';
import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import handler from '@/pages-modules/api/campaignLaunchAuthorityRoute';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const NOW = '3025-07-04T00:00:00.000Z';
const SESSION_ID = 'match-1';
const MISSION_ID = 'mission-1';

interface IResult {
  statusCode: number;
  body: unknown;
}

function post(
  id: unknown,
  body: unknown,
  method = 'POST',
): { req: NextApiRequest; res: NextApiResponse; result: IResult } {
  const result: IResult = { statusCode: 0, body: undefined };
  const req = {
    method,
    headers: {},
    query: { id },
    body,
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
    setHeader() {
      return this;
    },
    end() {
      return this;
    },
  } as unknown as NextApiResponse;
  return { req, res, result };
}

interface IWorld {
  readonly campaign: ICampaign;
  readonly forceIds: readonly string[];
  readonly branchId: string;
  readonly generation: number;
  readonly revision: number;
}

/** Campaign + genesis + backfilled branch + one claimed force per slot. */
async function buildWorld(options: { claim: boolean } = { claim: true }) {
  const base = buildPopulatedCampaign();
  const forces = Array.from(base.forces.values());
  const campaign: ICampaign = {
    ...base,
    forces: new Map(
      forces.map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
  const unitIds = Array.from(campaign.forces.values()).flatMap(
    (force) => force.unitIds,
  );
  const envelope = buildSerializedCampaign(campaign, 'device-1', 0, {
    campaignId: campaign.id,
    units: unitIds.map((unitId, index) => ({
      unitId,
      unitRef: `catalog-ref-${index}`,
      unitSource: 'canonical' as const,
      unitName: `Unit ${index}`,
      chassisVariant: `V-${index}`,
      pilotId: `pilot-${index}`,
      readiness: 'Ready' as const,
    })),
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  expect(saveCampaign(envelope, 0).kind).toBe('ok');

  const db = getSQLiteService().getDatabase();
  const genesis = await appendCampaignGenesis(
    new SQLiteEventJournal(db, () => NOW),
    () => undefined,
    { envelope, occurredAt: NOW },
  );
  expect(genesis.kind).toBe('genesis-appended');
  const store = new SQLiteEventHistoryBranchStore(db);
  store.backfillGenesisBranches();
  const head = store.requireEffectiveHead({
    streamType: CAMPAIGN_STREAM_TYPE,
    streamId: campaign.id,
  });

  const forceIds = Array.from(campaign.forces.keys()).sort((a, b) =>
    a.localeCompare(b),
  );
  if (options.claim) {
    forceIds.slice(0, 2).forEach((forceId, index) => {
      claimCampaignSessionForce({
        campaignId: campaign.id,
        sessionId: SESSION_ID,
        missionId: CAMPAIGN_CREATION_MISSION_ID,
        forceId,
        participantId: playerSlotPlaceholderId(index === 0 ? 1 : 2),
        claimedAt: NOW,
      });
    });
  }

  const world: IWorld = {
    campaign,
    forceIds,
    branchId: head.branchId,
    generation: head.effectiveGeneration,
    revision: 1,
  };
  return world;
}

function bodyFor(world: IWorld, overrides: Record<string, unknown> = {}) {
  return {
    expectedHead: {
      branchId: world.branchId,
      revision: world.revision,
      effectiveGeneration: world.generation,
    },
    missionId: MISSION_ID,
    ...overrides,
  };
}

describe('POST /api/campaigns/:id/launch-authority', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'launch-authority-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'authority.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('admits a current head with no session and resolves no forces', async () => {
    const world = await buildWorld();
    const { req, res, result } = post(world.campaign.id, bodyFor(world));

    handler(req, res);

    expect(result.statusCode).toBe(200);
    const body = result.body as { kind: string; head: { branchId: string } };
    // A single-player campaign has no session and therefore no claims;
    // gating it on owned forces would refuse every launch it makes.
    expect(body.kind).toBe('current');
    expect(body.head.branchId).toBe(world.branchId);
  });

  it('refuses a stale revision with the current head and a recovery action', async () => {
    const world = await buildWorld();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, {
        expectedHead: {
          branchId: world.branchId,
          revision: world.revision - 1,
          effectiveGeneration: world.generation,
        },
      }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      kind: 'refused',
      code: 'STALE_REVISION',
      resyncAction: 'resync-to-active-head',
    });
    expect(
      (result.body as { activeHead: { revision: number } }).activeHead.revision,
    ).toBe(world.revision);
  });

  it('refuses a branch the stream never had', async () => {
    const world = await buildWorld();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, {
        expectedHead: {
          branchId: 'branch-from-another-world',
          revision: world.revision,
          effectiveGeneration: world.generation,
        },
      }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ code: 'STALE_BRANCH' });
  });

  it('materializes both slots for a co-op session at a current head', async () => {
    const world = await buildWorld();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(200);
    const body = result.body as {
      kind: string;
      slots: { slot: number; forceId: string }[];
    };
    expect(body.kind).toBe('materialized');
    expect(body.slots.map((slot) => slot.slot)).toEqual([1, 2]);
    expect(body.slots[0]?.forceId).toBe(world.forceIds[0]);
    expect(body.slots[1]?.forceId).toBe(world.forceIds[1]);
  });

  it('refuses a co-op launch whose force another participant holds', async () => {
    const world = await buildWorld();
    claimCampaignSessionForce({
      campaignId: world.campaign.id,
      sessionId: SESSION_ID,
      missionId: MISSION_ID,
      forceId: world.forceIds[0] ?? '',
      participantId: 'pid_other_player',
      claimedAt: NOW,
    });
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({ code: 'STALE_OWNERSHIP' });
  });

  it('answers no-authoritative-stream for a campaign with no journal', async () => {
    const campaign = buildPopulatedCampaign();
    expect(
      saveCampaign(buildSerializedCampaign(campaign, 'device-1', 0), 0).kind,
    ).toBe('ok');
    const { req, res, result } = post(campaign.id, {
      expectedHead: { branchId: 'root', revision: 0, effectiveGeneration: 1 },
      missionId: MISSION_ID,
    });

    handler(req, res);

    expect(result.statusCode).toBe(200);
    expect(result.body).toEqual({ kind: 'no-authoritative-stream' });
  });

  it('404s an unknown campaign', async () => {
    const { req, res, result } = post('campaign-never-persisted', {
      expectedHead: { branchId: 'root', revision: 0, effectiveGeneration: 1 },
      missionId: MISSION_ID,
    });

    handler(req, res);

    expect(result.statusCode).toBe(404);
  });

  it.each([
    ['no body', undefined],
    ['no expected head', { missionId: MISSION_ID }],
    [
      'a stringly revision',
      {
        expectedHead: {
          branchId: 'root',
          revision: '1',
          effectiveGeneration: 1,
        },
        missionId: MISSION_ID,
      },
    ],
    [
      'no mission id',
      {
        expectedHead: {
          branchId: 'root',
          revision: 1,
          effectiveGeneration: 1,
        },
      },
    ],
  ])('400s a malformed body: %s', async (_label, body) => {
    const world = await buildWorld();
    const { req, res, result } = post(world.campaign.id, body);

    handler(req, res);

    expect(result.statusCode).toBe(400);
  });

  it('405s a non-POST method', async () => {
    const world = await buildWorld();
    const { req, res, result } = post(world.campaign.id, bodyFor(world), 'GET');

    handler(req, res);

    expect(result.statusCode).toBe(405);
  });
});
