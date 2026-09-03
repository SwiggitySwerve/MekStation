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

import type {
  EventHistoryBranchStatus,
  IEventHistoryBranch,
} from '@/lib/events/journal/EventHistoryBranchContract';
import type { ICampaignProgressionReaders } from '@/lib/multiplayer/server/CampaignProgressionGate';
import type { ICoordinatedCorrectionSaga } from '@/lib/multiplayer/server/history/CoordinatedOutcomeCorrectionSaga';
import type { ICampaign } from '@/types/campaign/Campaign';

import {
  CAMPAIGN_CREATION_MISSION_ID,
  playerSlotPlaceholderId,
} from '@/lib/campaign/authority/campaignCreationCheckpoint';
import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { materializeOwnedPlayerForces } from '@/lib/campaign/encounter/campaignOwnedForceMaterialization';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { CAMPAIGN_STREAM_TYPE } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { createDurableCampaignProgressionReaders } from '@/lib/multiplayer/server/campaignProgressionReaders.durable';
import handler from '@/pages-modules/api/campaignLaunchAuthorityRoute';
import {
  _setCampaignLaunchProgressionReadersForTests,
  CAMPAIGN_LAUNCH_NOT_CONVERGED,
  evaluateCampaignLaunchProgression,
} from '@/pages-modules/api/campaignLaunchProgressionGate';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

jest.mock('@/lib/campaign/encounter/campaignOwnedForceMaterialization', () => {
  const actual = jest.requireActual<
    typeof import('@/lib/campaign/encounter/campaignOwnedForceMaterialization')
  >('@/lib/campaign/encounter/campaignOwnedForceMaterialization');
  return {
    ...actual,
    materializeOwnedPlayerForces: jest.fn(actual.materializeOwnedPlayerForces),
  };
});

const NOW = '3025-07-04T00:00:00.000Z';
const SESSION_ID = 'match-1';
const MISSION_ID = 'mission-1';
const PLAYER_1 = 'player-1';
const PLAYER_2 = 'player-2';

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

/**
 * Bind the two tactical seats the convergence clause reads.
 * WHY: force claims are not the retained roster; a missing seat is
 * invisible to the gate and would make the behind row vacuously green.
 */
function bindPlayers(campaignId: string): void {
  bindCampaignSessionParticipant({
    campaignId,
    sessionId: SESSION_ID,
    participantId: PLAYER_1,
    seat: 'player',
    boundAt: NOW,
  });
  bindCampaignSessionParticipant({
    campaignId,
    sessionId: SESSION_ID,
    participantId: PLAYER_2,
    seat: 'player',
    boundAt: NOW,
  });
}

/**
 * Write one durable ack watermark. WHY: launch reads
 * campaign_participant_cursor, not the session map.
 */
function seedCursor(
  campaignId: string,
  participantId: string,
  ackedSequence: number,
): void {
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT INTO campaign_participant_cursor
         (campaign_id, grant_id, participant_id, delivery_epoch_id,
          acked_sequence, updated_at)
       VALUES (?, ?, ?, 'epoch-1', ?, ?)`,
    )
    .run(
      campaignId,
      `grant-${participantId}`,
      participantId,
      ackedSequence,
      NOW,
    );
}

/**
 * CampaignSyncSession.test.ts branch fixture, copied so this suite
 * can inject the same candidate head without opening a host.
 */
function branchRecord(
  campaignId: string,
  branchId: string,
  status: EventHistoryBranchStatus,
): IEventHistoryBranch {
  const isRoot = branchId === 'root';
  return {
    streamType: 'campaign',
    streamId: campaignId,
    branchId,
    parentBranchId: isRoot ? null : 'root',
    ancestorDepth: isRoot ? 0 : 1,
    baseRevision: isRoot ? 0 : 1,
    baseEventId: isRoot ? null : 'evt-1',
    baseDigest: 'digest',
    status,
    createdBy: 'gm',
    reason: 'test',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

/**
 * CampaignSyncSession.test.ts saga fixture at the named state.
 * WHY: the route must refuse correction-pending with the same key.
 */
function sagaRecord(
  state: ICoordinatedCorrectionSaga['state'],
): ICoordinatedCorrectionSaga {
  return {
    matchId: 'match-1',
    outcomeId: 'outcome-1',
    outcomeVersion: 2,
    targetRevision: 4,
    state,
    blockedReason: null,
    sourceRecordedAt: '2026-01-01T00:00:00.000Z',
    manifestSealedAt: '2026-01-01T00:00:01.000Z',
    targetRecordedAt:
      state === 'target-pending' || state === 'completed'
        ? '2026-01-01T00:00:02.000Z'
        : null,
    updatedAt: '2026-01-01T00:00:03.000Z',
    candidateBranchId: 'candidate-1',
  };
}

/**
 * In-memory progression readers, same shape as CampaignSyncSession.
 */
function readers(
  overrides: Partial<ICampaignProgressionReaders>,
): ICampaignProgressionReaders {
  return {
    readEffectiveHead: () => null,
    readBranch: () => null,
    readSagaForCampaign: () => null,
    readManifestVerdict: () => null,
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
    _setCampaignLaunchProgressionReadersForTests(undefined);
    jest.restoreAllMocks();
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

  it('refuses a launch when a retained participant is behind the head', async () => {
    const world = await buildWorld();
    bindPlayers(world.campaign.id);
    seedCursor(world.campaign.id, PLAYER_1, world.revision);
    const materialize = jest.mocked(materializeOwnedPlayerForces);
    materialize.mockClear();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      kind: 'refused',
      // Pinned to the literal, not the constant: the lifecycle state machine
      // matches this exact string to keep commands enabled on a refusal, so a
      // drift in the route's vocabulary must fail here rather than move both
      // sides of the comparison together.
      code: 'CAMPAIGN_NOT_CONVERGED',
      clause: 'participants-behind',
      behind: [{ participantId: PLAYER_2, acknowledgedRevision: 0 }],
      requiredRevision: world.revision,
    });
    expect((result.body as { reason: string }).reason).toContain(
      'participants-behind',
    );
    expect((result.body as { kind: string }).kind).not.toBe('materialized');
    expect(materialize).not.toHaveBeenCalled();
  });

  it('refuses a launch while the effective head is still a candidate', async () => {
    const world = await buildWorld();
    _setCampaignLaunchProgressionReadersForTests(
      readers({
        readEffectiveHead: () => ({
          streamType: 'campaign',
          streamId: world.campaign.id,
          branchId: 'candidate-1',
          effectiveGeneration: 1,
          installedAt: '2026-01-01T00:00:00.000Z',
        }),
        readBranch: () =>
          branchRecord(world.campaign.id, 'candidate-1', 'building'),
      }),
    );
    const materialize = jest.mocked(materializeOwnedPlayerForces);
    materialize.mockClear();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      kind: 'refused',
      code: CAMPAIGN_LAUNCH_NOT_CONVERGED,
      clause: 'branch-not-active',
      branchId: 'candidate-1',
      status: 'building',
    });
    expect((result.body as { reason: string }).reason).toContain(
      'branch-not-active',
    );
    expect(materialize).not.toHaveBeenCalled();
  });

  it('refuses a launch while a correction saga is still target-pending', async () => {
    const world = await buildWorld();
    const pending = sagaRecord('target-pending');
    _setCampaignLaunchProgressionReadersForTests(
      readers({ readSagaForCampaign: () => pending }),
    );
    const materialize = jest.mocked(materializeOwnedPlayerForces);
    materialize.mockClear();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      kind: 'refused',
      code: CAMPAIGN_LAUNCH_NOT_CONVERGED,
      clause: 'correction-pending',
      sagaKey: {
        matchId: pending.matchId,
        outcomeId: pending.outcomeId,
        outcomeVersion: pending.outcomeVersion,
      },
      state: 'target-pending',
    });
    expect((result.body as { reason: string }).reason).toContain(
      'correction-pending',
    );
    expect(materialize).not.toHaveBeenCalled();
  });

  it('proceeds when every clause is satisfied and every cursor is at the head', async () => {
    const world = await buildWorld();
    bindPlayers(world.campaign.id);
    seedCursor(world.campaign.id, PLAYER_1, world.revision);
    seedCursor(world.campaign.id, PLAYER_2, world.revision);
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    expect(result.statusCode).toBe(200);
    expect((result.body as { kind: string }).kind).toBe('materialized');
  });

  it('with SQLite uninitialized answers exactly what it answers today', async () => {
    resetSQLiteService();
    expect(getSQLiteService().isInitialized()).toBe(false);
    expect(
      evaluateCampaignLaunchProgression({
        campaignId: 'campaign-never-persisted',
        sessionId: SESSION_ID,
        requiredRevision: 1,
        readers: createDurableCampaignProgressionReaders(),
      }),
    ).toEqual({ ok: true, requiredRevision: 1 });
    const { req, res, result } = post('campaign-never-persisted', {
      expectedHead: { branchId: 'root', revision: 0, effectiveGeneration: 1 },
      missionId: MISSION_ID,
    });

    handler(req, res);

    expect(result.statusCode).toBe(404);
  });
});
