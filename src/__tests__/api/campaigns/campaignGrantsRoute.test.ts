/**
 * /api/campaigns/[id]/grants route (task 2.2).
 *
 * The route's job is to keep the share service's refusals DISTINCT on
 * the wire. A share surface that cannot tell "you do not own this
 * campaign" from "there is no such campaign" from "your request was
 * malformed" leaves the user guessing - the same conflation task 1.5
 * removed from the neighbouring campaign routes.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import grantsHandler from '@/pages/api/campaigns/[id]/grants';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';

const CAMPAIGN_ID = 'campaign-grants-route';
const PUBLIC_KEY = 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==';
const EXPIRES_AT = '2026-12-31T00:00:00.000Z';

/** Writes a campaign row carrying the given D2 authority. */
function storeCampaign(
  campaignId: string,
  authority: SerializedCampaign['authority'],
): void {
  const base = buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: campaignId },
    'device-test',
    1,
  );
  const record: SerializedCampaign = {
    ...base,
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

async function call(
  method: RequestMethod,
  query: Record<string, string>,
  body?: Body,
): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query,
    body,
  });
  await grantsHandler(req, res);
  return { status: res._getStatusCode(), json: res._getJSONData() };
}

const issueBody = {
  participantId: 'participant-guest',
  issuerPublicKey: PUBLIC_KEY,
  scopes: ['campaign'],
  expiresAt: EXPIRES_AT,
};

describe('campaign grants route', () => {
  beforeEach(() => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('issues, lists, and revokes a grant on an owned campaign', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });

    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody);
    expect(issued.status).toBe(201);
    const grant = issued.json as ICampaignGrant;
    expect(grant.scopes).toEqual(['campaign']);
    // The public key is pinned at issue; the private half never travels.
    expect(grant.issuerPublicKey).toBe(PUBLIC_KEY);

    const listed = await call('GET', { id: CAMPAIGN_ID });
    expect(listed.status).toBe(200);
    expect((listed.json as ICampaignGrant[]).map((g) => g.grantId)).toEqual([
      grant.grantId,
    ]);

    const revoked = await call('DELETE', {
      id: CAMPAIGN_ID,
      grantId: grant.grantId,
    });
    expect(revoked.status).toBe(200);
    expect((revoked.json as ICampaignGrant).revokedAt).toEqual(
      expect.any(String),
    );

    // Revoked grants stay listed so the owner can tell "never shared"
    // from "shared and withdrawn".
    const after = await call('GET', { id: CAMPAIGN_ID });
    expect((after.json as ICampaignGrant[])[0]?.revokedAt).toEqual(
      expect.any(String),
    );
  });

  it('keeps not-owned, not-found, and malformed distinguishable', async () => {
    storeCampaign(CAMPAIGN_ID, {
      role: 'replica',
      sourceInstanceId: 'other-host',
      grantId: 'grant-upstream',
      scopes: ['campaign'],
    });

    const replica = await call('POST', { id: CAMPAIGN_ID }, issueBody);
    const absent = await call('POST', { id: 'campaign-absent' }, issueBody);
    const malformed = await call('POST', { id: CAMPAIGN_ID }, { nope: true });

    // A replica cannot share: authority refusal, not a conflict, so a
    // client retrying with fresher state would not loop.
    expect(replica.status).toBe(403);
    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(400);
    expect(
      new Set([replica.status, absent.status, malformed.status]).size,
    ).toBe(3);

    // The refused issue wrote nothing.
    const listed = await call('GET', { id: CAMPAIGN_ID });
    expect(listed.status).toBe(403);
  });

  it('refuses a revoke that names another campaign, without withdrawing it', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    storeCampaign('campaign-other', { role: 'source' });
    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody);
    const grant = issued.json as ICampaignGrant;

    const crossed = await call('DELETE', {
      id: 'campaign-other',
      grantId: grant.grantId,
    });
    expect(crossed.status).toBe(400);

    // Still active: ownership is checked before the write.
    const listed = await call('GET', { id: CAMPAIGN_ID });
    expect((listed.json as ICampaignGrant[])[0]?.revokedAt ?? null).toBeNull();
  });

  it('rejects an unsupported method with an Allow header', async () => {
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: { id: CAMPAIGN_ID },
    });
    await grantsHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toContain('POST');
  });
});
