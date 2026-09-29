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

import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { z } from 'zod';

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
import { acceptFixtureParticipation } from '@/lib/multiplayer/server/__tests__/coopMissionCreate.fixture';
import { openRouteFixture } from '@/lib/multiplayer/server/__tests__/coopMissionCreate.harness';
import { getCampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { createDurableCampaignProgressionReaders } from '@/lib/multiplayer/server/campaignProgressionReaders.durable';
import handler from '@/pages-modules/api/campaignLaunchAuthorityRoute';
import {
  _setCampaignLaunchProgressionReadersForTests,
  CAMPAIGN_LAUNCH_NOT_CONVERGED,
  evaluateCampaignLaunchProgression,
} from '@/pages-modules/api/campaignLaunchProgressionGate';
import {
  readCampaign,
  saveCampaign,
} from '@/services/campaignPersistence/CampaignPersistenceService';
import { claimCampaignSessionForce } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import {
  bindCampaignSessionParticipant,
  revokeCampaignSessionParticipant,
} from '@/services/campaignPersistence/CampaignSessionParticipantStore';
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

  it('answers 500 for a journaled campaign whose effective head is missing, never no-authoritative-stream', async () => {
    const world = await buildWorld();
    // Journal events and no effective head: a stream first appended
    // before the first append installed one, and never backfilled.
    getSQLiteService()
      .getDatabase()
      .prepare(
        `DELETE FROM event_history_effective_heads
          WHERE stream_type = ? AND stream_id = ?`,
      )
      .run(CAMPAIGN_STREAM_TYPE, world.campaign.id);
    const materialize = jest.mocked(materializeOwnedPlayerForces);
    materialize.mockClear();
    const { req, res, result } = post(
      world.campaign.id,
      bodyFor(world, { sessionId: SESSION_ID }),
    );

    handler(req, res);

    // OD-launch-head-gate: refused, not answered ungated.
    expect(result.statusCode).toBe(500);
    expect(result.body).toEqual({
      error: `Stream ${CAMPAIGN_STREAM_TYPE}/${world.campaign.id} has no effective branch`,
    });
    expect(materialize).not.toHaveBeenCalled();
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
    // Real members need accepted participation as well as converged cursors;
    // membership plus creation placeholders alone is the rejected cold case.
    const world = await signedWorld();
    try {
      const before = durablePreflightCensus();

      const result = callSignedPreflight(world);

      expect(result.statusCode).toBe(200);
      const body = signedResponse.parse(result.body);
      expect(body.slots.map((slot) => slot.ownerParticipantId).sort()).toEqual(
        [world.host.playerId, world.guest.playerId].sort(),
      );
      expect(durablePreflightCensus()).toEqual(before);
    } finally {
      await world.close();
    }
  });

  it.each([false, true])(
    'keeps legacy-only creation slots read-only with mission overrides=%s',
    async (override) => {
      const world = await buildWorld();
      // A signed member of another session is not this session's footprint.
      bindCampaignSessionParticipant({
        campaignId: world.campaign.id,
        sessionId: 'another-session',
        participantId: 'another-session-gm',
        seat: 'gm',
        boundAt: NOW,
      });
      const forces = world.forceIds.slice(0, 2);
      expect(forces).toHaveLength(2);
      if (override) {
        forces.reverse();
        forces.forEach((forceId, index) => {
          expect(
            claimCampaignSessionForce({
              campaignId: world.campaign.id,
              sessionId: SESSION_ID,
              missionId: MISSION_ID,
              forceId,
              participantId: playerSlotPlaceholderId(index === 0 ? 1 : 2),
              claimedAt: NOW,
            }).kind,
          ).toBe('claimed');
        });
      }
      const before = durablePreflightCensus();
      const request = post(
        world.campaign.id,
        bodyFor(world, { sessionId: SESSION_ID }),
      );

      handler(request.req, request.res);

      const after = durablePreflightCensus();
      captureClassifierEvidence(`legacy-${override}`, {
        before,
        after,
        result: request.result,
      });
      expect(after).toEqual(before);
      expect(request.result.statusCode).toBe(200);
      const body = signedResponse.parse(request.result.body);
      expect(body.head).toEqual(bodyFor(world).expectedHead);
      expect(
        body.slots.map(({ slot, forceId, ownerParticipantId }) => ({
          slot,
          forceId,
          ownerParticipantId,
        })),
      ).toEqual(
        forces.map((forceId, index) => ({
          slot: index + 1,
          forceId,
          ownerParticipantId: playerSlotPlaceholderId(index === 0 ? 1 : 2),
        })),
      );
    },
  );

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

const signedResponse = z.object({
  kind: z.literal('materialized'),
  head: z.object({
    branchId: z.string(),
    revision: z.number(),
    effectiveGeneration: z.number(),
  }),
  slots: z.array(
    z.object({
      slot: z.union([z.literal(1), z.literal(2)]),
      forceId: z.string(),
      ownerParticipantId: z.string(),
      units: z.array(
        z.object({
          reference: z.object({ unitId: z.string(), unitRef: z.string() }),
          pilotRef: z.string().optional(),
        }),
      ),
    }),
  ),
});

async function signedWorld(
  hostChoice: 'deploy' | 'command-hq' = 'deploy',
  guestChoice: 'deploy' | 'command-hq' = 'deploy',
) {
  const fixture = await openRouteFixture();
  try {
    let entry = fixture.entry;
    if (hostChoice === 'command-hq' || guestChoice === 'command-hq') {
      // Rebuild a real host with no accepted choices, then run the shipped
      // participation admission. A choice already accepted is immutable.
      const registry = getCampaignHostRegistry();
      registry.dispose(entry.matchId);
      const rebuilt = await registry.getOrCreate(entry.matchId);
      if (!rebuilt) throw new Error('Campaign host did not rebuild');
      entry = rebuilt;
      acceptFixtureParticipation(
        entry,
        fixture.contributors.map((row) => ({
          ...row,
          choice:
            row.playerId === fixture.host.playerId ? hostChoice : guestChoice,
        })),
      );
    }
    const mission = fixture.request.coopCampaign;
    for (const identity of [fixture.host, fixture.guest]) {
      seedCursor(
        mission.campaignId,
        identity.playerId,
        mission.expectedHead.revision,
      );
    }
    return { ...fixture, entry, mission };
  } catch (error) {
    await fixture.close();
    throw error;
  }
}

function callSignedPreflight(
  world: Awaited<ReturnType<typeof signedWorld>>,
  overrides: Record<string, unknown> = {},
) {
  const request = post(world.mission.campaignId, {
    missionId: world.mission.missionId,
    sessionId: world.mission.sessionId,
    expectedHead: world.mission.expectedHead,
    ...overrides,
  });
  handler(request.req, request.res);
  return request.result;
}

function durablePreflightCensus() {
  const db = getSQLiteService().getDatabase();
  return {
    changes: db.prepare('SELECT total_changes() AS n').get(),
    tables: Object.fromEntries(
      [
        'campaigns',
        'event_journal_events',
        'event_journal_batches',
        'campaign_session_force_claim',
        'campaign_session_participant',
        'campaign_participant_cursor',
      ].map((table) => [
        table,
        db
          .prepare(`SELECT * FROM ${table}`)
          .all()
          .map((row) => JSON.stringify(row))
          .sort(),
      ]),
    ),
    registrySize: getCampaignHostRegistry().size(),
  };
}

function captureClassifierEvidence(name: string, value: unknown) {
  const dir = process.env.P2A_EVIDENCE_DIR;
  if (!dir) return;
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    path.join(dir, `classifier-${name}.json`),
    JSON.stringify(value, null, 2),
    { flag: 'wx' },
  );
}

describe('launch preflight with real signed campaign claims (P2A)', () => {
  it.each([
    { host: 'missing', revoked: 'none', missionPlaceholders: false },
    { host: 'missing', revoked: 'guest', missionPlaceholders: false },
    { host: 'missing', revoked: 'host', missionPlaceholders: false },
    { host: 'missing', revoked: 'all', missionPlaceholders: false },
    { host: 'missing', revoked: 'none', missionPlaceholders: true },
    { host: 'closed', revoked: 'none', missionPlaceholders: false },
    { host: 'rebuilt', revoked: 'none', missionPlaceholders: false },
    { host: 'accepted', revoked: 'none', missionPlaceholders: false },
  ])(
    'refuses lost signed claims with host=$host revoked=$revoked missionPlaceholders=$missionPlaceholders',
    async ({ host, revoked, missionPlaceholders }) => {
      const world = await signedWorld();
      try {
        const db = getSQLiteService().getDatabase();
        const { campaignId, sessionId, missionId } = world.mission;
        const registry = getCampaignHostRegistry();
        if (host === 'closed') world.entry.host.close();
        if (host === 'missing' || host === 'rebuilt')
          registry.dispose(sessionId);
        if (host === 'rebuilt') {
          const entry = await registry.getOrCreate(sessionId);
          expect(entry?.getParticipationRecords(missionId)).toEqual([]);
        }
        expect(
          db
            .prepare(
              'DELETE FROM campaign_session_force_claim WHERE campaign_id = ? AND session_id = ? AND mission_id = ?',
            )
            .run(campaignId, sessionId, missionId).changes,
        ).toBe(2);
        const creationClaims = db
          .prepare(
            'SELECT force_id, participant_id FROM campaign_session_force_claim WHERE campaign_id = ? AND session_id = ? AND mission_id = ? ORDER BY force_id',
          )
          .all(campaignId, sessionId, CAMPAIGN_CREATION_MISSION_ID);
        expect(creationClaims).toEqual([
          {
            force_id: 'force-guest',
            participant_id: playerSlotPlaceholderId(1),
          },
          {
            force_id: 'force-host',
            participant_id: playerSlotPlaceholderId(2),
          },
        ]);
        if (missionPlaceholders) {
          ['force-guest', 'force-host'].forEach((forceId, index) => {
            expect(
              claimCampaignSessionForce({
                campaignId,
                sessionId,
                missionId,
                forceId,
                participantId: playerSlotPlaceholderId(index === 0 ? 1 : 2),
                claimedAt: NOW,
              }).kind,
            ).toBe('claimed');
          });
        }
        for (const [role, identity] of [
          ['host', world.host],
          ['guest', world.guest],
        ] as const) {
          if (revoked === 'all' || revoked === role) {
            expect(
              revokeCampaignSessionParticipant({
                campaignId,
                sessionId,
                participantId: identity.playerId,
                revokedAt: NOW,
              }),
            ).toBe(true);
          }
        }
        expect(
          db
            .prepare(
              'SELECT participant_id FROM campaign_session_participant WHERE campaign_id = ? AND session_id = ? ORDER BY participant_id',
            )
            .all(campaignId, sessionId),
        ).toEqual(
          [world.host.playerId, world.guest.playerId]
            .sort()
            .map((participant_id) => ({ participant_id })),
        );
        const before = {
          ...durablePreflightCensus(),
          multiplayer: world.census(),
        };
        expect(before.multiplayer).toEqual({
          matches: 1,
          events: 0,
          receipts: 0,
        });

        const result = callSignedPreflight(world);

        const after = {
          ...durablePreflightCensus(),
          multiplayer: world.census(),
        };
        captureClassifierEvidence(`${host}-${revoked}-${missionPlaceholders}`, {
          before,
          after,
          result,
        });
        expect(after).toEqual(before);
        expect(result.statusCode).toBe(409);
        expect(result.body).toMatchObject({
          kind: 'refused',
          code: 'STALE_OWNERSHIP',
          activeHead: world.mission.expectedHead,
        });
        expect(result.body).not.toHaveProperty('slots');
      } finally {
        await world.close();
      }
    },
  );
  it.each([
    { hostChoice: 'deploy' as const, placeholders: true },
    { hostChoice: 'deploy' as const, placeholders: false },
    { hostChoice: 'command-hq' as const, placeholders: true },
    { hostChoice: 'command-hq' as const, placeholders: false },
  ])(
    'admits $hostChoice / guest deploy with placeholders=$placeholders',
    async ({ hostChoice, placeholders }) => {
      const world = await signedWorld(hostChoice);
      try {
        if (!placeholders) {
          getSQLiteService()
            .getDatabase()
            .prepare(
              `DELETE FROM campaign_session_force_claim
           WHERE campaign_id = ? AND session_id = ? AND mission_id = ?`,
            )
            .run(
              world.mission.campaignId,
              world.mission.sessionId,
              CAMPAIGN_CREATION_MISSION_ID,
            );
        }
        const before = world.census();

        const result = callSignedPreflight(world);

        const after = world.census();
        expect(after).toEqual(before);
        const evidenceDir = process.env.P2A_EVIDENCE_DIR;
        if (evidenceDir) {
          mkdirSync(evidenceDir, { recursive: true });
          writeFileSync(
            path.join(evidenceDir, `${hostChoice}-${placeholders}.json`),
            JSON.stringify({ result, before, after }, null, 2),
            { flag: 'wx' },
          );
        }
        expect(result.statusCode).toBe(200);
        const body = signedResponse.parse(result.body);
        expect(body.head).toEqual(world.mission.expectedHead);
        const expected = [
          ...(hostChoice === 'deploy'
            ? [
                {
                  owner: world.host.playerId,
                  force: 'force-host',
                  unit: 'unit-host',
                  ref: 'atlas-as7-d',
                },
              ]
            : []),
          {
            owner: world.guest.playerId,
            force: 'force-guest',
            unit: 'unit-guest',
            ref: 'marauder-mad-3r',
          },
        ].sort((a, b) => a.owner.localeCompare(b.owner));
        expect(
          body.slots.map((slot) => ({
            slot: slot.slot,
            owner: slot.ownerParticipantId,
            force: slot.forceId,
            units: slot.units.map((unit) => ({
              id: unit.reference.unitId,
              ref: unit.reference.unitRef,
            })),
          })),
        ).toEqual(
          expected.map((row, index) => ({
            slot: index + 1,
            owner: row.owner,
            force: row.force,
            units: [{ id: row.unit, ref: row.ref }],
          })),
        );
      } finally {
        await world.close();
      }
    },
  );

  it('refuses zero deployed forces through real accepted HQ choices', async () => {
    const world = await signedWorld('command-hq', 'command-hq');
    try {
      const before = world.census();

      const result = callSignedPreflight(world);

      expect(result).toMatchObject({
        statusCode: 409,
        body: { kind: 'refused', code: 'UNOWNED_SLOT' },
      });
      expect(world.census()).toEqual(before);
    } finally {
      await world.close();
    }
  });

  it('keeps repeated reads and parallel caller requests side-effect free', async () => {
    const world = await signedWorld();
    try {
      const before = world.census();
      const db = getSQLiteService().getDatabase();
      const changes = db.prepare('SELECT total_changes() AS n').get();

      const results = await Promise.all([
        Promise.resolve().then(() => callSignedPreflight(world)),
        Promise.resolve().then(() => callSignedPreflight(world)),
      ]);

      for (const result of results) {
        expect(result.statusCode).toBe(200);
        const body = signedResponse.parse(result.body);
        expect(body.head).toEqual(world.mission.expectedHead);
        expect(
          body.slots.map((slot) => slot.ownerParticipantId).sort(),
        ).toEqual([world.host.playerId, world.guest.playerId].sort());
      }
      expect(world.census()).toEqual(before);
      expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(changes);
    } finally {
      await world.close();
    }
  });

  it('admits genuinely reaccepted participation after a cold registry rebuild', async () => {
    const world = await signedWorld();
    try {
      const registry = getCampaignHostRegistry();
      registry.dispose(world.entry.matchId);
      const rebuilt = await registry.getOrCreate(world.entry.matchId);
      if (!rebuilt) throw new Error('Missing rebuilt host');
      acceptFixtureParticipation(rebuilt, world.contributors);
      const before = world.census();

      const result = callSignedPreflight(world);

      expect(result.statusCode).toBe(200);
      expect(
        signedResponse
          .parse(result.body)
          .slots.map((slot) => slot.ownerParticipantId)
          .sort(),
      ).toEqual([world.host.playerId, world.guest.playerId].sort());
      expect(world.census()).toEqual(before);
    } finally {
      await world.close();
    }
  });

  const invalidStates: readonly {
    name: string;
    change: (
      world: Awaited<ReturnType<typeof signedWorld>>,
    ) => void | Promise<void>;
    code: string;
  }[] = [
    {
      name: 'missing registry',
      code: 'STALE_OWNERSHIP',
      change: (world) => getCampaignHostRegistry().dispose(world.entry.matchId),
    },
    {
      name: 'closed registry host',
      code: 'STALE_OWNERSHIP',
      change: (world) => world.entry.host.close(),
    },
    {
      name: 'cold host without accepted choices',
      code: 'STALE_OWNERSHIP',
      change: async (world) => {
        const registry = getCampaignHostRegistry();
        registry.dispose(world.entry.matchId);
        expect(await registry.getOrCreate(world.entry.matchId)).not.toBeNull();
      },
    },
    {
      name: 'missing durable claim',
      code: 'STALE_OWNERSHIP',
      change: (world) => {
        getSQLiteService()
          .getDatabase()
          .prepare(
            'DELETE FROM campaign_session_force_claim WHERE campaign_id = ? AND mission_id = ? AND participant_id = ?',
          )
          .run(
            world.mission.campaignId,
            world.mission.missionId,
            world.guest.playerId,
          );
      },
    },
    {
      name: 'conflicting durable claimant',
      code: 'STALE_OWNERSHIP',
      change: (world) => {
        getSQLiteService()
          .getDatabase()
          .prepare(
            'UPDATE campaign_session_force_claim SET participant_id = ? WHERE campaign_id = ? AND mission_id = ? AND participant_id = ?',
          )
          .run(
            'pid-foreign',
            world.mission.campaignId,
            world.mission.missionId,
            world.guest.playerId,
          );
      },
    },
    {
      name: 'extra unknown force claim',
      code: 'STALE_OWNERSHIP',
      change: (world) => {
        expect(
          claimCampaignSessionForce({
            campaignId: world.mission.campaignId,
            sessionId: world.mission.sessionId,
            missionId: world.mission.missionId,
            forceId: 'unknown-force',
            participantId: world.host.playerId,
            claimedAt: NOW,
          }).kind,
        ).toBe('claimed');
      },
    },
    {
      name: 'revoked contributor',
      code: 'STALE_OWNERSHIP',
      change: (world) => {
        expect(
          revokeCampaignSessionParticipant({
            campaignId: world.mission.campaignId,
            sessionId: world.mission.sessionId,
            participantId: world.guest.playerId,
            revokedAt: NOW,
          }),
        ).toBe(true);
      },
    },
    {
      name: 'nonmember contributor',
      code: 'STALE_OWNERSHIP',
      change: (world) => {
        getSQLiteService()
          .getDatabase()
          .prepare(
            'DELETE FROM campaign_session_participant WHERE campaign_id = ? AND session_id = ? AND participant_id = ?',
          )
          .run(
            world.mission.campaignId,
            world.mission.sessionId,
            world.guest.playerId,
          );
      },
    },
    {
      name: 'behind participant',
      code: 'CAMPAIGN_NOT_CONVERGED',
      change: (world) => {
        getSQLiteService()
          .getDatabase()
          .prepare(
            'DELETE FROM campaign_participant_cursor WHERE campaign_id = ? AND participant_id = ?',
          )
          .run(world.mission.campaignId, world.guest.playerId);
      },
    },
    {
      name: 'unresolved durable roster',
      code: 'UNRESOLVED_SLOT_UNIT',
      change: (world) => {
        const read = readCampaign(world.mission.campaignId);
        if (read.kind !== 'ok' || !read.record.body.rosterProjection)
          throw new Error('Missing persisted roster');
        const record = read.record;
        expect(
          saveCampaign(
            {
              ...record,
              body: {
                ...record.body,
                rosterProjection: {
                  ...read.record.body.rosterProjection,
                  units: [],
                },
              },
            },
            record.version,
          ).kind,
        ).toBe('ok');
      },
    },
  ];
  it.each(invalidStates)(
    'refuses $name without a write or legacy fallback',
    async ({ change, code }) => {
      const world = await signedWorld();
      try {
        await change(world);
        const before = world.census();
        const db = getSQLiteService().getDatabase();
        const changes = db.prepare('SELECT total_changes() AS n').get();
        const registrySize = getCampaignHostRegistry().size();

        const result = callSignedPreflight(world);

        expect(result).toMatchObject({
          statusCode: 409,
          body: { kind: 'refused', code },
        });
        expect(world.census()).toEqual(before);
        expect(db.prepare('SELECT total_changes() AS n').get()).toEqual(
          changes,
        );
        expect(getCampaignHostRegistry().size()).toBe(registrySize);
      } finally {
        await world.close();
      }
    },
  );

  it.each(['revision', 'branchId', 'effectiveGeneration'] as const)(
    'preserves the signed-session stale %s refusal',
    async (field) => {
      const world = await signedWorld();
      try {
        const expectedHead = {
          ...world.mission.expectedHead,
          [field]: field === 'branchId' ? 'foreign-branch' : 0,
        };
        const code = {
          revision: 'STALE_REVISION',
          branchId: 'STALE_BRANCH',
          effectiveGeneration: 'STALE_GENERATION',
        }[field];
        const before = world.census();

        const result = callSignedPreflight(world, { expectedHead });

        expect(result).toMatchObject({
          statusCode: 409,
          body: {
            kind: 'refused',
            code,
            activeHead: world.mission.expectedHead,
          },
        });
        expect(world.census()).toEqual(before);
      } finally {
        await world.close();
      }
    },
  );

  it.each(['ownerParticipantId', 'playerId', 'slot', 'contributions'])(
    'rejects browser-provided %s authority',
    async (field) => {
      const world = await signedWorld();
      try {
        const before = world.census();

        const result = callSignedPreflight(world, { [field]: 'forged-owner' });

        expect(result.statusCode).toBe(400);
        expect(world.census()).toEqual(before);
      } finally {
        await world.close();
      }
    },
  );

  it('refuses an unknown mission without adopting any creation placeholder', async () => {
    const world = await signedWorld();
    try {
      const before = world.census();

      const result = callSignedPreflight(world, {
        missionId: 'unknown-mission',
      });

      expect(result).toMatchObject({
        statusCode: 409,
        body: { kind: 'refused', code: 'STALE_OWNERSHIP' },
      });
      expect(world.census()).toEqual(before);
    } finally {
      await world.close();
    }
  });
});
