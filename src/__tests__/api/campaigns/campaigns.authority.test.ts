/**
 * D2 command-gate and host-instance identity tests through the campaign
 * item API. Replica writes are typed refusals; source writes succeed;
 * instanceId survives a simulated process restart.
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type RequestMethod, type Body } from 'node-mocks-http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import {
  REPLICA_NOT_SOURCE_REFUSAL_REASON,
  UNKNOWN_AUTHORITY_ROLE_REASON,
} from '@/lib/campaign/authority/campaignAuthority';
import { getOrCreateHostInstanceId } from '@/lib/campaign/authority/campaignHostInstance';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import idHandler from '@/pages/api/campaigns/[id]';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

type Mocks = ReturnType<typeof createMocks<NextApiRequest, NextApiResponse>>;

/** Invoke the item route with the same contract as the persistence suite. */
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

/** Build a client envelope for the given campaign id. */
function envelopeFor(campaignId: string): SerializedCampaign {
  const campaign = { ...buildPopulatedCampaign(), id: campaignId };
  return buildSerializedCampaign(campaign, 'device-test', 1);
}

/** Read the stored payload JSON for a campaign row. */
function readStoredPayload(id: string): string {
  const row = getSQLiteService()
    .getDatabase()
    .prepare('SELECT payload FROM campaigns WHERE id = ?')
    .get(id) as { payload: string };
  return row.payload;
}

/** Overwrite a stored payload without going through saveCampaign. */
function writeStoredPayload(id: string, payload: string): void {
  getSQLiteService()
    .getDatabase()
    .prepare('UPDATE campaigns SET payload = ? WHERE id = ?')
    .run(payload, id);
}

describe('Campaign D2 authority API', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('refuses a mutation against a replica record and leaves payload unchanged', async () => {
    const created = await callId('PUT', 'camp-replica', {
      envelope: envelopeFor('camp-replica'),
      baseVersion: 0,
    });
    expect(created.res._getStatusCode()).toBe(200);
    const stored = JSON.parse(
      readStoredPayload('camp-replica'),
    ) as SerializedCampaign;
    const replica: SerializedCampaign = {
      ...stored,
      authority: {
        role: 'replica',
        sourceInstanceId: 'source-host-zzz',
        grantId: 'grant-zzz',
        scopes: ['campaign'],
      },
    };
    writeStoredPayload('camp-replica', JSON.stringify(replica));
    const before = readStoredPayload('camp-replica');

    const mutated = await callId('PUT', 'camp-replica', {
      envelope: envelopeFor('camp-replica'),
      baseVersion: stored.version,
    });
    expect(mutated.res._getStatusCode()).toBe(403);
    expect(mutated.res._getJSONData()).toEqual({
      error: 'replica instance cannot accept local mutation',
      kind: 'refused',
      reason: REPLICA_NOT_SOURCE_REFUSAL_REASON,
    });
    expect(readStoredPayload('camp-replica')).toBe(before);

    const conflict = await callId('PUT', 'camp-replica', {
      envelope: envelopeFor('camp-replica'),
      baseVersion: 0,
    });
    expect(conflict.res._getStatusCode()).not.toBe(409);
    expect(conflict.res._getJSONData()).toEqual(
      expect.objectContaining({ kind: 'refused' }),
    );
  });

  it('accepts the same mutation against a source record', async () => {
    await callId('PUT', 'camp-source', {
      envelope: envelopeFor('camp-source'),
      baseVersion: 0,
    });
    const first = (
      await callId('GET', 'camp-source')
    ).res._getJSONData() as SerializedCampaign;
    expect(first.authority).toEqual({ role: 'source' });
    expect(typeof first.instanceId).toBe('string');
    expect(first.instanceId.length).toBeGreaterThan(0);

    const second = await callId('PUT', 'camp-source', {
      envelope: envelopeFor('camp-source'),
      baseVersion: first.version,
    });
    expect(second.res._getStatusCode()).toBe(200);
    const saved = second.res._getJSONData() as SerializedCampaign;
    expect(saved.version).toBe(first.version + 1);
    expect(saved.instanceId).toBe(first.instanceId);
    expect(saved.authority).toEqual({ role: 'source' });
  });

  it('fails closed on an unknown stored role and does not treat it as source', async () => {
    await callId('PUT', 'camp-typo', {
      envelope: envelopeFor('camp-typo'),
      baseVersion: 0,
    });
    const stored = JSON.parse(
      readStoredPayload('camp-typo'),
    ) as SerializedCampaign;
    writeStoredPayload(
      'camp-typo',
      JSON.stringify({
        ...stored,
        schemaVersion: 2,
        authority: { role: 'typo' },
      }),
    );

    const get = await callId('GET', 'camp-typo');
    expect(get.res._getStatusCode()).toBe(422);
    expect(get.res._getJSONData()).toEqual({
      error: 'stored campaign authority is invalid',
      kind: 'failed',
      reason: UNKNOWN_AUTHORITY_ROLE_REASON,
    });

    const put = await callId('PUT', 'camp-typo', {
      envelope: envelopeFor('camp-typo'),
      baseVersion: stored.version,
    });
    expect(put.res._getStatusCode()).toBe(422);
    expect(put.res._getJSONData()).toEqual(
      expect.objectContaining({
        kind: 'failed',
        reason: UNKNOWN_AUTHORITY_ROLE_REASON,
      }),
    );
    const after = JSON.parse(readStoredPayload('camp-typo')) as {
      authority: { role: string };
    };
    expect(after.authority.role).toBe('typo');
  });

  it('keeps instanceId stable across writes', async () => {
    const first = await callId('PUT', 'camp-stable', {
      envelope: envelopeFor('camp-stable'),
      baseVersion: 0,
    });
    const a = first.res._getJSONData() as SerializedCampaign;
    const second = await callId('PUT', 'camp-stable', {
      envelope: envelopeFor('camp-stable'),
      baseVersion: a.version,
    });
    const b = second.res._getJSONData() as SerializedCampaign;
    expect(b.instanceId).toBe(a.instanceId);
    expect(getOrCreateHostInstanceId()).toBe(a.instanceId);
  });
});

describe('Campaign host instanceId restart stability', () => {
  it('returns the same instanceId after a simulated restart against the same file', async () => {
    const dir = await mkdtemp(path.join(tmpdir(), 'campaign-host-id-'));
    const dbPath = path.join(dir, 'host.db');
    try {
      resetSQLiteService();
      getSQLiteService({ path: dbPath }).initialize();
      const first = getOrCreateHostInstanceId();
      await callId('PUT', 'camp-restart', {
        envelope: envelopeFor('camp-restart'),
        baseVersion: 0,
      });
      const saved = (
        await callId('GET', 'camp-restart')
      ).res._getJSONData() as SerializedCampaign;
      expect(saved.instanceId).toBe(first);

      resetSQLiteService();
      getSQLiteService({ path: dbPath }).initialize();
      const second = getOrCreateHostInstanceId();
      expect(second).toBe(first);
      const reloaded = (
        await callId('GET', 'camp-restart')
      ).res._getJSONData() as SerializedCampaign;
      expect(reloaded.instanceId).toBe(first);
    } finally {
      resetSQLiteService();
      await rm(dir, { recursive: true, force: true, maxRetries: 3 });
    }
  });
});
