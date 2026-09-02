/**
 * /api/campaigns/[id]/replica-sync (design D6, needed by task 4.5;
 * caller authority for finding #30).
 *
 * The trigger that makes a consuming device actually go and connect.
 * Three refusals carry the meaning:
 *
 * - a SOURCE cannot be told to sync from somewhere else, because that
 *   would be asking the authority to take orders about its own campaign;
 * - a second start does not race the first into the same replica stream,
 *   since two diallers on one stream produce gaps and collisions that
 *   look like source faults rather than a local mistake;
 * - an UNNAMED caller is refused outright. This route dials a socket and
 *   writes what comes back into this device's campaign store, so before
 *   the gate below it was an unauthenticated outbound-connection
 *   primitive: the caller chose the destination, the credential
 *   presented, and the store written into.
 *
 * WHAT THE GATE CAN AND CANNOT REACH, honestly: `grantId` comes from the
 * stored authority and the presented grant token is bound to it, to the
 * campaign in the path, to its own expiry, and to the `playerId` the
 * caller claims. Its SIGNATURE is not checked here, because the pinned
 * issuer key lives in the source's grant row and a consuming device
 * holds no copy - see the route's own note for the fields redeem would
 * have to keep for that to become checkable.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { CampaignEventScope } from '@/types/campaign/CampaignSync';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IVaultIdentity } from '@/types/vault';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { resetReplicaSyncRegistryForTests } from '@/lib/campaign/replica/campaignReplicaSyncRegistry';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import syncHandler from '@/pages/api/campaigns/[id]/replica-sync';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const CAMPAIGN_ID = 'campaign-replica-sync';
const GRANT_ID = 'grant-upstream';
const PARTICIPANT_ID = 'participant-guest';

interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

async function mintHolder(): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: 'identity-replica-sync',
    displayName: 'Replica Sync',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

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

/**
 * A grant token in the shape the source issues. The signature is not
 * verifiable on a consuming device (see the header), so these carry
 * placeholder key material; every OTHER field is load-bearing here.
 */
function grantToken(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    grantId: GRANT_ID,
    campaignId: CAMPAIGN_ID,
    participantId: PARTICIPANT_ID,
    scopes: ['campaign'],
    issuedAt: '2026-08-23T00:00:00.000Z',
    expiresAt: '2099-01-01T00:00:00.000Z',
    publicKey: 'cGxhY2Vob2xkZXI=',
    signature: 'cGxhY2Vob2xkZXI=',
    ...overrides,
  };
}

function startBody(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    // Unroutable on purpose: starting must not depend on the source being
    // reachable, and the test must never open a real socket.
    sourceSocketUrl: 'ws://127.0.0.1:9/api/multiplayer/socket',
    matchId: 'match-1',
    playerId: PARTICIPANT_ID,
    token: grantToken(),
    ...overrides,
  };
}

async function call(
  method: RequestMethod,
  body?: Body,
  campaignId = CAMPAIGN_ID,
  wire?: string,
): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query: { id: campaignId },
    body,
    ...(wire ? { headers: { authorization: `Bearer ${wire}` } } : {}),
  });
  await syncHandler(req, res);
  return { status: res._getStatusCode(), json: res._getJSONData() };
}

describe('replica sync route', () => {
  let caller: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    resetReplicaSyncRegistryForTests();
    caller = await mintHolder();
  });

  afterEach(() => {
    resetReplicaSyncRegistryForTests();
    resetSQLiteService();
  });

  it('refuses every verb to an unnamed caller, and dials nothing', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);

    for (const attempt of [
      await call('GET'),
      await call('POST', startBody()),
      await call('DELETE'),
    ]) {
      expect(attempt.status).toBe(401);
    }

    // No dialler was registered by any of them: an authenticated status
    // read still reports the campaign as never having started.
    const status = await call('GET', undefined, CAMPAIGN_ID, caller.wire);
    expect(status.status).toBe(200);
    expect(status.json).toMatchObject({ status: 'disconnected' });
  });

  it('refuses a start whose token names a different grant', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const started = await call(
      'POST',
      startBody({ token: grantToken({ grantId: 'grant-somewhere-else' }) }),
      CAMPAIGN_ID,
      caller.wire,
    );

    // `grantId` comes from the stored authority, so a token for another
    // grant cannot be smuggled in beside it.
    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'grant-mismatch' });
  });

  it('refuses a start whose token names a different campaign', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const started = await call(
      'POST',
      startBody({ token: grantToken({ campaignId: 'campaign-elsewhere' }) }),
      CAMPAIGN_ID,
      caller.wire,
    );

    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'grant-mismatch' });
  });

  it('refuses a start whose grant token has expired', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const started = await call(
      'POST',
      startBody({
        token: grantToken({ expiresAt: '2020-01-01T00:00:00.000Z' }),
      }),
      CAMPAIGN_ID,
      caller.wire,
    );

    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'grant-expired' });
  });

  it('refuses a playerId that is not the grant token participant', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const started = await call(
      'POST',
      startBody({ playerId: 'someone-else' }),
      CAMPAIGN_ID,
      caller.wire,
    );

    // The dial presents a credential; the player it presents it as has
    // to be the one the credential names.
    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'participant-mismatch' });
  });

  it('refuses to sync a campaign this host sources', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    const started = await call('POST', startBody(), CAMPAIGN_ID, caller.wire);
    expect(started.status).toBe(403);
    expect(started.json).toMatchObject({ error: 'not-a-replica' });
  });

  it('404s a campaign this host does not have', async () => {
    expect(
      (await call('GET', undefined, 'campaign-absent', caller.wire)).status,
    ).toBe(404);
  });

  it('reports disconnected before any start', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    const status = await call('GET', undefined, CAMPAIGN_ID, caller.wire);
    expect(status.status).toBe(200);
    expect(status.json).toMatchObject({
      status: 'disconnected',
      // Record-derived, never read off the request.
      grantId: GRANT_ID,
    });
  });

  it('starts once and treats a second start as idempotent', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);

    const first = await call('POST', startBody(), CAMPAIGN_ID, caller.wire);
    // Accepted: dialling is in progress, not necessarily connected.
    expect(first.status).toBe(202);
    expect(first.json).toMatchObject({ grantId: GRANT_ID });

    const second = await call('POST', startBody(), CAMPAIGN_ID, caller.wire);
    // 200 rather than 202: it joined the dialler already running instead
    // of starting a second one racing it into the same stream.
    expect(second.status).toBe(200);

    const stopped = await call('DELETE', undefined, CAMPAIGN_ID, caller.wire);
    expect(stopped.status).toBe(200);
    expect(stopped.json).toMatchObject({ status: 'stopped' });
  });

  it('rejects a malformed start body and a wrong method', async () => {
    storeCampaign(CAMPAIGN_ID, replicaAuthority);
    expect(
      (await call('POST', { nope: true }, CAMPAIGN_ID, caller.wire)).status,
    ).toBe(400);
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: { id: CAMPAIGN_ID },
      headers: { authorization: `Bearer ${caller.wire}` },
    });
    await syncHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toContain('POST');
  });
});
