/**
 * Starting a co-op session on a campaign that holds a contract above the
 * reader level is refused, with a named reason, until S6 (S1b answer 3).
 *
 * The co-op sync path has no version gate, and the guest and host would fold
 * the contract with the legacy rules, so the start itself fails closed. The
 * check reads the stored campaign (the co-op `state` is a roster projection and
 * carries no contracts) and runs before any match, seat or host is created.
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { _resetRateLimitBucketsForTests } from '@/lib/api/security';
import { appendCampaignGenesis } from '@/lib/campaign/authority/campaignSourceGenesis';
import { stagedContract } from '@/lib/campaign/contracts/__tests__/contractCompletion.fixtures';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import {
  _resetCampaignHostRegistry,
  getCampaignHostRegistry,
} from '@/lib/multiplayer/server/CampaignHostRegistry';
import { _resetDefaultMatchStore } from '@/lib/multiplayer/server/getDefaultMatchStore';
import handler from '@/pages/api/multiplayer/matches';
import { writeCampaignMigrationMarker } from '@/services/campaignPersistence/CampaignMigrationMarkerStore';
import { saveCampaign } from '@/services/campaignPersistence/CampaignPersistenceService';
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

interface IResult {
  statusCode: number;
  body: Record<string, unknown> | undefined;
}

function call(body: unknown): Promise<IResult> {
  const result: IResult = { statusCode: 0, body: undefined };
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
    json(payload: Record<string, unknown>) {
      result.body = payload;
      return this;
    },
    setHeader() {
      return this;
    },
  } as unknown as NextApiResponse;
  return Promise.resolve(handler(req, res)).then(() => result);
}

const GENESIS_AT = '2026-08-29T00:00:00.000Z';

/**
 * Persist a host campaign the way the co-op host flow does. `genesis` seeds the
 * journal marker the creation checkpoint needs, which only a start that is
 * allowed to proceed will read.
 */
async function persistCampaign(
  contractVersion: unknown,
  genesis = false,
): Promise<string> {
  const base = buildPopulatedCampaign();
  const campaign = {
    ...base,
    forces: new Map(
      Array.from(base.forces.values()).map((force, index) => [
        force.id,
        { ...force, unitIds: [`unit-${index}`] },
      ]),
    ),
  };
  const envelope = buildSerializedCampaign(campaign, 'device-1', 0, {
    campaignId: campaign.id,
    units: [],
    pilots: [],
    missions: [],
    activeMissionId: null,
    missionCount: 0,
  });
  if (contractVersion !== undefined) {
    const contract: Record<string, unknown> = {
      ...JSON.parse(JSON.stringify(stagedContract())),
      lifecycleRulesVersion: contractVersion,
    };
    (envelope.body as unknown as { missions: unknown[] }).missions = [
      ...envelope.body.missions,
      [String(contract.id), contract],
    ];
  }
  expect(saveCampaign(envelope, 0).kind).toBe('ok');
  if (genesis) {
    const appended = await appendCampaignGenesis(
      new SQLiteEventJournal(
        getSQLiteService().getDatabase(),
        () => GENESIS_AT,
      ),
      writeCampaignMigrationMarker,
      { envelope, occurredAt: GENESIS_AT },
    );
    expect(appended.kind).toBe('genesis-appended');
  }
  return campaign.id;
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

describe('co-op session start on a campaign holding contract rules above the reader', () => {
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'coop-lifecycle-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'coop.db') }).initialize();
    _resetDefaultMatchStore();
    _resetCampaignHostRegistry();
    _resetRateLimitBucketsForTests();
  });

  afterEach(async () => {
    _resetCampaignHostRegistry();
    _resetDefaultMatchStore();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('refuses the start with a named reason and creates no host', async () => {
    const campaignId = await persistCampaign(2);
    const result = await call(coopCreateBody(campaignId));
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      code: 'CAMPAIGN_COOP_LIFECYCLE_BLOCKED',
      reason: 'contract-rules-not-supported-in-coop',
    });
    expect(String(result.body?.error)).toMatch(/co-op/i);
    expect(getCampaignHostRegistry().liveEntryFor(campaignId)).toBeNull();
  });

  it('refuses a campaign whose contract version is unreadable', async () => {
    const campaignId = await persistCampaign('two');
    const result = await call(coopCreateBody(campaignId));
    expect(result.statusCode).toBe(409);
    expect(result.body).toMatchObject({
      code: 'CAMPAIGN_COOP_LIFECYCLE_BLOCKED',
    });
  });

  it('control: a campaign with no such contract starts as before', async () => {
    const campaignId = await persistCampaign(undefined, true);
    const result = await call(coopCreateBody(campaignId));
    expect(result.statusCode).toBe(201);
  });

  it('control: an explicit version 1 contract starts as before', async () => {
    const campaignId = await persistCampaign(1, true);
    const result = await call(coopCreateBody(campaignId));
    expect(result.statusCode).toBe(201);
  });
});
