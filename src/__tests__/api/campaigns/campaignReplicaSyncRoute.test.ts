/**
 * /api/campaigns/[id]/replica-sync (design D6, needed by task 4.5).
 *
 * The trigger that makes a consuming device actually go and connect.
 * Two refusals carry the meaning:
 *
 * - a SOURCE cannot be told to sync from somewhere else, because that
 *   would be asking the authority to take orders about its own campaign;
 * - a second start does not race the first into the same replica stream,
 *   since two diallers on one stream produce gaps and collisions that
 *   look like source faults rather than a local mistake.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { CampaignEventScope } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { resetReplicaSyncRegistryForTests } from '@/lib/campaign/replica/campaignReplicaSyncRegistry';
import syncHandler from '@/pages/api/campaigns/[id]/replica-sync';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-replica-sync';
const GRANT_ID = 'grant-upstream';

/** Stores a campaign row with the given D2 authority. */
function storeCampaign(
  campaignId: string,
  authority: SerializedCampaign['authority'],
): void {
  const record: SerializedCampaign = {
    ...buildSerializedCampaign(
      { ...buildPopulatedCampaign(), id: campaignId },
      'device-test',
      1,
    ),
    instanceId: 'local-host',
    authority,
  };
  getSQLiteService()
    .getDatabase()
    .prepare(
      `INSERT OR REPLACE INTO campaigns
         (id, version, schema_version, name, faction_id, campaign_date,
          balance, origin_device_id, saved_at, payload)
       VALUES (?, 1, 2, ?, 'mercenary', '3025-01-01T00:00:00.000Z',
               0, 'device-test', '2026-08-23T00:00:00.000Z', ?)`,
    )
    .run(campaignId, campaignId, JSON.stringify(record));
}

const replicaAuthority = {
  role: 'replica' as const,
  sourceInstanceId: 'source-host',
  grantId: GRANT_ID,
  scopes: ['campaign'] as readonly CampaignEventScope[],
};

const startBody = {
  // Unroutable on purpose: starting must not depend on the source being
  // reachable, and the test must never open a real socket.
  sourceSocketUrl: 'ws://127.0.0.1:9/api/multiplayer/socket',
  matchId: 'match-1',
  playerId: 'participant-guest',
  token: { grantId: GRANT_ID },
};

async function call(
  method: RequestMethod,
  body?: Body,
  campaignId = CAMPAIGN_ID,
): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id: campaignId },
    body,
  });
  await syncHandler(req, res);
  return { status: res._getStatusCode(), json: res._getJSONData() };
}

describe('replica sync route', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    resetReplicaSyncRegistryForTests();
  });

  afterEach(() => {
    resetReplicaSyncRegistryForTests();
    resetSQLiteService();
  });

  it('refuses to sync a campaign this host sources', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    const started = await call('POST', startBody);
    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'not-a-replica' });
  });

  it('404s a campaign this host does not have', async () => {
    expect((await call('GET', undefined, 'campaign-absent')).status).toBe(404);
  });

  it('reports disconnected before any start', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const status = await call('GET');
    expect(status.status).toBe(200);
    expect(status.json).toMatchObject({
      status: 'disconnected',
      grantId: GRANT_ID,
    });
  });

  it('starts once and treats a second start as idempotent', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);

    const first = await call('POST', startBody);
    // Accepted: dialling is in progress, not necessarily connected.
    expect(first.status).toBe(202);

    const second = await call('POST', startBody);
    // 200 rather than 202: it joined the dialler already running instead
    // of starting a second one racing it into the same stream.
    expect(second.status).toBe(200);

    const stopped = await call('DELETE');
    expect(stopped.status).toBe(200);
    expect(stopped.json).toMatchObject({ status: 'stopped' });
  });

  it('rejects a malformed start body and a wrong method', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    expect((await call('POST', { nope: true })).status).toBe(400);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: { id: CAMPAIGN_ID },
    });
    await syncHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toContain('POST');
  });
});
