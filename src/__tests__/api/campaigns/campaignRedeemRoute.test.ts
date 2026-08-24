/**
 * /api/campaigns/redeem (task 2.2).
 *
 * The only endpoint that creates a `role: 'replica'` record, so it is
 * the only place the "commands execute only at the source" gate must
 * deliberately NOT apply to the incoming envelope - while still refusing
 * to overwrite a campaign this host actually sources.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D2)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body } from 'node-mocks-http';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';

import { canonicalGrantTokenPayload } from '@/lib/campaign/grants/campaignGrantToken';
import { issueShareGrant } from '@/lib/campaign/grants/campaignShareService';
import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import redeemHandler from '@/pages/api/campaigns/redeem';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair, signData } from '@/services/vault/IdentityService';

const CAMPAIGN_ID = 'campaign-to-redeem';
const SOURCE_INSTANCE = 'a-different-host-instance';

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

function envelope(campaignId: string): SerializedCampaign {
  return buildSerializedCampaign(
    { ...buildPopulatedCampaign(), id: campaignId },
    'device-test',
    1,
  );
}

/** Stores a campaign row with the given authority. */
function storeCampaign(
  campaignId: string,
  authority: SerializedCampaign['authority'],
): void {
  const record: SerializedCampaign = {
    ...envelope(campaignId),
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

async function call(body: Body): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method: 'POST',
    body,
  });
  await redeemHandler(req, res);
  return { status: res._getStatusCode(), json: res._getJSONData() };
}

describe('campaign redeem route', () => {
  let keys: { publicKey: Uint8Array; privateKey: Uint8Array };

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    keys = await generateKeyPair();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  /** Issues a grant on a temporarily-stored source campaign, then removes it. */
  function issueGrantFor(campaignId: string): ICampaignGrant {
    storeCampaign(campaignId, { role: 'source' });
    const issued = issueShareGrant(getSQLiteService().getDatabase(), {
      campaignId,
      participantId: 'participant-guest',
      issuerPublicKey: toBase64(keys.publicKey),
      scopes: ['campaign'],
      issuedAt: '2026-08-23T00:00:00.000Z',
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
    if (issued.kind !== 'ok') throw new Error('grant issue failed');
    // The consuming device does not hold the source campaign row.
    getSQLiteService()
      .getDatabase()
      .prepare('DELETE FROM campaigns WHERE id = ?')
      .run(campaignId);
    return issued.value;
  }

  async function tokenFor(grant: ICampaignGrant): Promise<unknown> {
    const payload = canonicalGrantTokenPayload({
      grantId: grant.grantId,
      campaignId: grant.campaignId,
      participantId: grant.participantId,
      scopes: grant.scopes,
      issuedAt: grant.issuedAt,
      expiresAt: grant.expiresAt,
    });
    const signature = await signData(
      new TextEncoder().encode(payload),
      keys.privateKey,
    );
    return {
      grantId: grant.grantId,
      campaignId: grant.campaignId,
      participantId: grant.participantId,
      scopes: grant.scopes,
      issuedAt: grant.issuedAt,
      expiresAt: grant.expiresAt,
      publicKey: toBase64(keys.publicKey),
      signature: toBase64(signature),
    };
  }

  it('stores a replica record carrying its provenance', async () => {
    const grant = issueGrantFor(CAMPAIGN_ID);
    const result = await call({
      token: await tokenFor(grant),
      sourceInstanceId: SOURCE_INSTANCE,
      body: envelope(CAMPAIGN_ID).body,
    });

    expect(result.status).toBe(201);
    const stored = result.json as SerializedCampaign;
    // The record knows what it is a copy OF - the whole point of D2.
    expect(stored.authority).toEqual({
      role: 'replica',
      sourceInstanceId: SOURCE_INSTANCE,
      grantId: grant.grantId,
      scopes: ['campaign'],
    });

    // And it actually persisted: a redeem that returned a replica but
    // stored nothing would leave the device unable to open the campaign.
    const row = getSQLiteService()
      .getDatabase()
      .prepare('SELECT payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as { payload: string } | undefined;
    expect(row).toBeDefined();
    expect(
      (JSON.parse(row?.payload ?? '{}') as SerializedCampaign).authority.role,
    ).toBe('replica');
  });

  it('refuses to redeem over a campaign this host sources', async () => {
    const grant = issueGrantFor(CAMPAIGN_ID);
    storeCampaign(CAMPAIGN_ID, { role: 'source' });

    const result = await call({
      token: await tokenFor(grant),
      sourceInstanceId: SOURCE_INSTANCE,
      body: envelope(CAMPAIGN_ID).body,
    });

    expect(result.status).toBe(409);
    // Local authority survives untouched.
    const row = getSQLiteService()
      .getDatabase()
      .prepare('SELECT payload FROM campaigns WHERE id = ?')
      .get(CAMPAIGN_ID) as { payload: string };
    expect((JSON.parse(row.payload) as SerializedCampaign).authority.role).toBe(
      'source',
    );
  });

  it('refuses a token whose scopes were widened in transit', async () => {
    const grant = issueGrantFor(CAMPAIGN_ID);
    const token = (await tokenFor(grant)) as Record<string, unknown>;

    const result = await call({
      token: { ...token, scopes: ['campaign', 'gm'] },
      sourceInstanceId: SOURCE_INSTANCE,
      body: envelope(CAMPAIGN_ID).body,
    });

    expect(result.status).toBe(400);
    expect(result.json).toMatchObject({ reason: 'bad-signature' });
    // Nothing was stored for a rejected share.
    expect(
      getSQLiteService()
        .getDatabase()
        .prepare('SELECT COUNT(*) AS c FROM campaigns WHERE id = ?')
        .get(CAMPAIGN_ID),
    ).toEqual({ c: 0 });
  });

  it('rejects a malformed body and a wrong method', async () => {
    expect((await call({ token: null })).status).toBe(400);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'GET',
    });
    await redeemHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
  });
});
