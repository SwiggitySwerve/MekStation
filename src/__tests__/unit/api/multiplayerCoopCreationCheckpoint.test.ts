/**
 * Campaign creation must not acknowledge before its authority commits.
 *
 * Co-op host creation already persists the campaign server-side before
 * the match POST (#1254) and the PUT route already awaits the genesis
 * hook before the create ack (#1263). What it does NOT do is commit the
 * GM's seat, the two tactical player-slot placeholders, or force
 * ownership - those are written when a socket connects, which is after
 * the lobby has already told the GM the campaign exists. A restart
 * between the 201 and the first socket leaves a campaign nobody is
 * durably the GM of.
 *
 * These rows read the durable stores directly after the create call
 * returns, so they can only pass if the commit happened BEFORE the
 * acknowledgement.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/campaign-management/spec.md
 *   ("Campaign Creation Has an Awaited Authority Checkpoint")
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IMatchMeta } from '@/lib/multiplayer/server/IMatchStore';

import {
  CAMPAIGN_CREATION_MISSION_ID,
  playerSlotPlaceholderId,
} from '@/lib/campaign/authority/campaignCreationCheckpoint';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { _resetCampaignHostRegistry } from '@/lib/multiplayer/server/CampaignHostRegistry';
import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import handler from '@/pages/api/multiplayer/matches';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
import { readCampaignSessionForceHolder } from '@/services/campaignPersistence/CampaignSessionForceClaimStore';
import { activeCampaignSessionMembership } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

jest.mock('@/lib/multiplayer/server/auth', () => ({
  authenticateRequest: jest.fn().mockResolvedValue({
    ok: true,
    playerId: 'pid_host',
    publicKey: 'host-public-key',
    token: {
      playerId: 'pid_host',
      issuedAt: '2026-08-29T00:00:00.000Z',
      expiresAt: '2026-08-29T01:00:00.000Z',
      publicKey: 'host-public-key',
      signature: 'host-signature',
    },
  }),
}));

interface ICreateMatchResponse {
  readonly matchId: string;
  readonly roomCode?: string;
  readonly meta: IMatchMeta;
}

interface IErrorResponse {
  readonly error: string;
}

type ResponseBody = ICreateMatchResponse | IErrorResponse;

interface IHarness {
  readonly req: NextApiRequest;
  readonly res: NextApiResponse<ResponseBody>;
  readonly result: { statusCode: number; body: ResponseBody | undefined };
}

/** Minimal Next request/response pair, matching the sibling route suites. */
function mockReqRes(body: unknown): IHarness {
  const result: { statusCode: number; body: ResponseBody | undefined } = {
    statusCode: 0,
    body: undefined,
  };
  const req = {
    method: 'POST',
    headers: { host: 'test.local' },
    query: {},
    body,
  } as unknown as NextApiRequest;
  const res = {
    status(code: number) {
      result.statusCode = code;
      return this;
    },
    json(payload: ResponseBody) {
      result.body = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse<ResponseBody>;
  return { req, res, result };
}

/**
 * Persist a campaign the way the co-op host flow does before it POSTs
 * the match, and hand back the campaign id plus its force ids in the
 * same stable order the checkpoint assigns slots in.
 */
function persistHostCampaign(): {
  campaignId: string;
  forceIds: readonly string[];
} {
  const campaign = buildPopulatedCampaign();
  const envelope = buildSerializedCampaign(campaign, 'device-1', 0, {
    campaignId: campaign.id,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  const saved = saveCampaign(envelope, 0);
  expect(saved.kind).toBe('ok');
  return {
    campaignId: campaign.id,
    forceIds: Array.from(campaign.forces.keys()).sort((left, right) =>
      left.localeCompare(right),
    ),
  };
}

function coopCreateBody(campaignId: string): unknown {
  return {
    config: { mapRadius: 8, turnLimit: 20, fogOfWar: false },
    layout: '1v1',
    hostSeatKind: 'spectator',
    displayName: 'Host',
    coopCampaign: {
      campaignId,
      state: createEmptyCampaignState(campaignId),
      arbitrationMode: 'host-review',
    },
  };
}

function createdMatchId(harness: IHarness): string {
  expect(harness.result.statusCode).toBe(201);
  const body = harness.result.body;
  if (!body || 'error' in body) {
    throw new Error(`Expected a created match, got ${JSON.stringify(body)}`);
  }
  return body.matchId;
}

describe('co-op campaign creation authority checkpoint', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'coop-create-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'creation.db') }).initialize();
    _resetDefaultMatchStore();
    _resetCampaignHostRegistry();
  });

  afterEach(async () => {
    _resetCampaignHostRegistry();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('has bound the GM seat durably by the time creation is acknowledged', async () => {
    const { campaignId } = persistHostCampaign();
    const harness = mockReqRes(coopCreateBody(campaignId));

    await handler(harness.req, harness.res);
    const matchId = createdMatchId(harness);

    const membership = activeCampaignSessionMembership(
      campaignId,
      matchId,
      'pid_host',
    );
    expect(membership).not.toBeNull();
    expect(membership?.seat).toBe('gm');
  });

  it('has committed player-slot force ownership by the time creation is acknowledged', async () => {
    const { campaignId, forceIds } = persistHostCampaign();
    const harness = mockReqRes(coopCreateBody(campaignId));

    await handler(harness.req, harness.res);
    const matchId = createdMatchId(harness);

    const slotOneHolder = readCampaignSessionForceHolder({
      campaignId,
      sessionId: matchId,
      missionId: CAMPAIGN_CREATION_MISSION_ID,
      forceId: forceIds[0] ?? '',
    });
    const slotTwoHolder = readCampaignSessionForceHolder({
      campaignId,
      sessionId: matchId,
      missionId: CAMPAIGN_CREATION_MISSION_ID,
      forceId: forceIds[1] ?? '',
    });
    expect(slotOneHolder).toBe(playerSlotPlaceholderId(1));
    expect(slotTwoHolder).toBe(playerSlotPlaceholderId(2));
  });

  it('leaves both human seats empty and seats the GM as a spectator', async () => {
    const { campaignId } = persistHostCampaign();
    const harness = mockReqRes(coopCreateBody(campaignId));

    await handler(harness.req, harness.res);
    expect(harness.result.statusCode).toBe(201);
    const body = harness.result.body;
    if (!body || 'error' in body) {
      throw new Error(`Expected a created match, got ${JSON.stringify(body)}`);
    }

    const seats = body.meta.seats ?? [];
    const humans = seats.filter((seat) => seat.kind === 'human');
    const spectator = seats.find((seat) => seat.kind === 'spectator');
    expect(humans).toHaveLength(2);
    expect(humans.every((seat) => seat.occupant === null)).toBe(true);
    expect(spectator?.occupant?.playerId).toBe('pid_host');
    expect(spectator?.slotId).toBe('spectator-1');
    expect(body.meta.unitBootstrap).toHaveLength(2);
    expect(
      (body.meta.unitBootstrap ?? []).every(
        (entry) => entry.side === 'player' || entry.side === 'opponent',
      ),
    ).toBe(true);
  });

  it('seats the GM as a spectator when a co-op body names no host seat kind', async () => {
    // The panel sends the kind explicitly; an older or hand-built client
    // that omits it must still land the GM outside the human seats.
    const { campaignId } = persistHostCampaign();
    const body = coopCreateBody(campaignId) as Record<string, unknown>;
    delete body.hostSeatKind;
    const harness = mockReqRes(body);

    await handler(harness.req, harness.res);
    expect(harness.result.statusCode).toBe(201);
    const created = harness.result.body;
    if (!created || 'error' in created) {
      throw new Error(
        `Expected a created match, got ${JSON.stringify(created)}`,
      );
    }

    const seats = created.meta.seats ?? [];
    const humans = seats.filter((seat) => seat.kind === 'human');
    const spectator = seats.find((seat) => seat.kind === 'spectator');
    expect(humans.every((seat) => seat.occupant === null)).toBe(true);
    expect(spectator?.occupant?.playerId).toBe('pid_host');
  });

  it('refuses creation when the authoritative campaign record is absent', async () => {
    const harness = mockReqRes(coopCreateBody('campaign-never-persisted'));

    await handler(harness.req, harness.res);

    expect(harness.result.statusCode).toBe(500);
    expect(
      activeCampaignSessionMembership(
        'campaign-never-persisted',
        'any-session',
        'pid_host',
      ),
    ).toBeNull();
  });
});
