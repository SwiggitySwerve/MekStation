/**
 * /api/campaigns/[id]/grants route (task 2.2; caller authority added for
 * finding #21).
 *
 * Two jobs, both pinned here:
 *
 * 1. Keep the share service's refusals DISTINCT on the wire. A share
 *    surface that cannot tell "you do not own this campaign" from "there
 *    is no such campaign" from "your request was malformed" leaves the
 *    user guessing - the same conflation task 1.5 removed from the
 *    neighbouring campaign routes.
 * 2. Refuse a caller who is not the campaign's GM. Before that gate this
 *    route was fully unauthenticated: any client that knew a campaign id
 *    could read every grantee's principal id (measured in Chromium by
 *    `e2e/authority-privacy-three-context.spec.ts`), issue itself a
 *    grant, or revoke another participant's access.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import type { NextApiRequest, NextApiResponse } from 'next';

import { createMocks, type Body, type RequestMethod } from 'node-mocks-http';

import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';
import type { SerializedCampaign } from '@/types/campaign/SerializedCampaign';
import type { IPlayerTokenScope } from '@/types/multiplayer/Player';
import type { IVaultIdentity } from '@/types/vault';

import { buildPopulatedCampaign } from '@/lib/campaign/persistence/__tests__/campaignFixture';
import { buildSerializedCampaign } from '@/lib/campaign/persistence/campaignEnvelope';
import { issuePlayerToken } from '@/lib/multiplayer/client/issuePlayerToken';
import grantsHandler from '@/pages/api/campaigns/[id]/grants';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { generateKeyPair } from '@/services/vault/IdentityService';
import { encodeTokenForWire } from '@/types/multiplayer/Player';

const CAMPAIGN_ID = 'campaign-grants-route';
const PUBLIC_KEY = 'dGVzdC1wdWJsaWMta2V5LWJhc2U2NA==';
const EXPIRES_AT = '2026-12-31T00:00:00.000Z';
const SCOPED_CAMPAIGN_ID = 'campaign-grants-scoped';
const SCOPED_MATCH_ID = 'match-grants-scoped';
/** Earlier than the default seat time, so ordering cannot do the refusing. */
const PLAYER_BOUND_AT = '2026-08-22T00:00:00.000Z';

/** One self-issued bearer token plus the principal it names. */
interface IHolder {
  readonly playerId: string;
  readonly wire: string;
}

/** Mints a real signed token, optionally bound to a session scope. */
async function mintHolder(scope?: IPlayerTokenScope): Promise<IHolder> {
  const keys = await generateKeyPair();
  const identity: IVaultIdentity = {
    id: 'identity-grants-route',
    displayName: 'Grants Route',
    publicKey: Buffer.from(keys.publicKey).toString('base64'),
    privateKey: Buffer.from(keys.privateKey).toString('base64'),
    friendCode: 'AAAA-BBBB-CCCC-DDDD',
    createdAt: '2026-08-23T00:00:00.000Z',
  };
  const token = await issuePlayerToken(identity, scope ? { scope } : undefined);
  return { playerId: token.playerId, wire: encodeTokenForWire(token) };
}

/** Writes a campaign row carrying the given D2 authority. */
function storeCampaign(
  campaignId: string,
  authority: SerializedCampaign['authority'],
  coopMatchId?: string,
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
    body: coopMatchId
      ? {
          ...base.body,
          coopSession: {
            mode: 'host',
            roomCode: 'ROOM01',
            matchId: coopMatchId,
          },
        }
      : base.body,
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

/** Seats one durable participant on the campaign's co-op session. */
function seat(
  campaignId: string,
  participantId: string,
  role: 'gm' | 'player',
  boundAt = '2026-08-23T00:00:00.000Z',
): void {
  bindCampaignSessionParticipant({
    campaignId,
    sessionId: `session-${campaignId}`,
    participantId,
    seat: role,
    boundAt,
  });
}

async function call(
  method: RequestMethod,
  query: Record<string, string>,
  body?: Body,
  wire?: string,
): Promise<{ status: number; json: unknown }> {
  const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
    method,
    query,
    body,
    ...(wire ? { headers: { authorization: `Bearer ${wire}` } } : {}),
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
  let gm: IHolder;

  beforeEach(async () => {
    resetSQLiteService();
    getSQLiteService({ path: ':memory:' }).initialize();
    gm = await mintHolder();
  });

  afterEach(() => {
    resetSQLiteService();
  });

  it('issues, lists, and revokes a grant on an owned campaign', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    seat(CAMPAIGN_ID, gm.playerId, 'gm');

    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody, gm.wire);
    expect(issued.status).toBe(201);
    const grant = issued.json as ICampaignGrant;
    expect(grant.scopes).toEqual(['campaign']);
    // The public key is pinned at issue; the private half never travels.
    expect(grant.issuerPublicKey).toBe(PUBLIC_KEY);

    const listed = await call('GET', { id: CAMPAIGN_ID }, undefined, gm.wire);
    expect(listed.status).toBe(200);
    expect((listed.json as ICampaignGrant[]).map((g) => g.grantId)).toEqual([
      grant.grantId,
    ]);

    const revoked = await call(
      'DELETE',
      { id: CAMPAIGN_ID, grantId: grant.grantId },
      undefined,
      gm.wire,
    );
    expect(revoked.status).toBe(200);
    expect((revoked.json as ICampaignGrant).revokedAt).toEqual(
      expect.any(String),
    );

    // Revoked grants stay listed so the owner can tell "never shared"
    // from "shared and withdrawn".
    const after = await call('GET', { id: CAMPAIGN_ID }, undefined, gm.wire);
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
    seat(CAMPAIGN_ID, gm.playerId, 'gm');

    const replica = await call('POST', { id: CAMPAIGN_ID }, issueBody, gm.wire);
    const absent = await call(
      'POST',
      { id: 'campaign-absent' },
      issueBody,
      gm.wire,
    );
    const malformed = await call(
      'POST',
      { id: CAMPAIGN_ID },
      { nope: true },
      gm.wire,
    );

    // A replica cannot share: authority refusal, not a conflict, so a
    // client retrying with fresher state would not loop.
    expect(replica.status).toBe(403);
    expect(absent.status).toBe(404);
    expect(malformed.status).toBe(400);
    expect(
      new Set([replica.status, absent.status, malformed.status]).size,
    ).toBe(3);

    // The refused issue wrote nothing.
    const listed = await call('GET', { id: CAMPAIGN_ID }, undefined, gm.wire);
    expect(listed.status).toBe(403);
  });

  it('refuses a revoke that names another campaign, without withdrawing it', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    storeCampaign('campaign-other', { role: 'source' });
    seat(CAMPAIGN_ID, gm.playerId, 'gm');
    seat('campaign-other', gm.playerId, 'gm');
    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody, gm.wire);
    const grant = issued.json as ICampaignGrant;

    const crossed = await call(
      'DELETE',
      { id: 'campaign-other', grantId: grant.grantId },
      undefined,
      gm.wire,
    );
    expect(crossed.status).toBe(400);

    // Still active: ownership is checked before the write.
    const listed = await call('GET', { id: CAMPAIGN_ID }, undefined, gm.wire);
    expect((listed.json as ICampaignGrant[])[0]?.revokedAt ?? null).toBeNull();
  });

  it('rejects an unsupported method with an Allow header', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    seat(CAMPAIGN_ID, gm.playerId, 'gm');
    const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
      method: 'PATCH',
      query: { id: CAMPAIGN_ID },
      headers: { authorization: `Bearer ${gm.wire}` },
    });
    await grantsHandler(req, res);
    expect(res._getStatusCode()).toBe(405);
    expect(res.getHeader('Allow')).toContain('POST');
  });

  it('refuses every verb without a token - the roster is the private material', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    seat(CAMPAIGN_ID, gm.playerId, 'gm');
    await call('POST', { id: CAMPAIGN_ID }, issueBody, gm.wire);

    const listed = await call('GET', { id: CAMPAIGN_ID });
    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody);
    const revoked = await call('DELETE', {
      id: CAMPAIGN_ID,
      grantId: 'any-grant',
    });
    for (const answer of [listed, issued, revoked]) {
      expect(answer.status).toBe(401);
    }
    // Fail closed means no fragment rides out on the refusal either.
    expect(JSON.stringify(listed.json)).not.toContain('participant-guest');
  });

  it('refuses a seated PLAYER every verb - finding #21 at the route', async () => {
    storeCampaign(CAMPAIGN_ID, { role: 'source' });
    seat(CAMPAIGN_ID, gm.playerId, 'gm');
    const player = await mintHolder();
    seat(CAMPAIGN_ID, player.playerId, 'player');
    const issued = await call('POST', { id: CAMPAIGN_ID }, issueBody, gm.wire);
    const grant = issued.json as ICampaignGrant;

    const listed = await call(
      'GET',
      { id: CAMPAIGN_ID },
      undefined,
      player.wire,
    );
    expect(listed.status).toBe(403);
    // The opponent's principal id is what the browser was rendering.
    expect(JSON.stringify(listed.json)).not.toContain('participant-guest');

    const selfIssued = await call(
      'POST',
      { id: CAMPAIGN_ID },
      issueBody,
      player.wire,
    );
    expect(selfIssued.status).toBe(403);

    const stolen = await call(
      'DELETE',
      { id: CAMPAIGN_ID, grantId: grant.grantId },
      undefined,
      player.wire,
    );
    expect(stolen.status).toBe(403);

    // The GM's own view proves the refused DELETE withdrew nothing.
    const after = await call('GET', { id: CAMPAIGN_ID }, undefined, gm.wire);
    expect((after.json as ICampaignGrant[])[0]?.revokedAt ?? null).toBeNull();
  });

  it('refuses a scoped, seated PLAYER every verb - the finding #21 population', async () => {
    storeCampaign(SCOPED_CAMPAIGN_ID, { role: 'source' }, SCOPED_MATCH_ID);
    const scoped = { kind: 'campaign-session', id: SCOPED_MATCH_ID } as const;
    const sessionGm = await mintHolder(scoped);
    const player = await mintHolder(scoped);
    // The player is bound BEFORE the GM so that a seat filter which let
    // a player through would resolve to THIS row: `bound_at` ordering
    // must not be what refuses them.
    seat(SCOPED_CAMPAIGN_ID, player.playerId, 'player', PLAYER_BOUND_AT);
    seat(SCOPED_CAMPAIGN_ID, sessionGm.playerId, 'gm');

    const issued = await call(
      'POST',
      { id: SCOPED_CAMPAIGN_ID },
      issueBody,
      sessionGm.wire,
    );
    expect(issued.status).toBe(201);
    const grant = issued.json as ICampaignGrant;

    // A real co-op guest: live seat, valid signature, token minted for
    // THIS campaign's own session. Authentication succeeds and
    // authorization is what refuses them - 403, never 401.
    const listed = await call(
      'GET',
      { id: SCOPED_CAMPAIGN_ID },
      undefined,
      player.wire,
    );
    expect(listed.status).toBe(403);
    expect(listed.json).toMatchObject({ reason: 'not-campaign-gm' });
    expect(JSON.stringify(listed.json)).not.toContain('participant-guest');
    expect(JSON.stringify(listed.json)).not.toContain(grant.grantId);

    const selfIssued = await call(
      'POST',
      { id: SCOPED_CAMPAIGN_ID },
      issueBody,
      player.wire,
    );
    expect(selfIssued.status).toBe(403);

    const stolen = await call(
      'DELETE',
      { id: SCOPED_CAMPAIGN_ID, grantId: grant.grantId },
      undefined,
      player.wire,
    );
    expect(stolen.status).toBe(403);

    // The roster the GM sees is untouched by all three refusals.
    const after = await call(
      'GET',
      { id: SCOPED_CAMPAIGN_ID },
      undefined,
      sessionGm.wire,
    );
    expect(after.status).toBe(200);
    const roster = after.json as ICampaignGrant[];
    expect(roster.map((entry) => entry.grantId)).toEqual([grant.grantId]);
    expect(roster[0]?.revokedAt ?? null).toBeNull();
  });

  it('binds a scoped token to the campaign OWN session, not one the caller names', async () => {
    storeCampaign(SCOPED_CAMPAIGN_ID, { role: 'source' }, SCOPED_MATCH_ID);
    const right = await mintHolder({
      kind: 'campaign-session',
      id: SCOPED_MATCH_ID,
    });
    const wrong = await mintHolder({
      kind: 'campaign-session',
      id: 'match-somewhere-else',
    });
    seat(SCOPED_CAMPAIGN_ID, right.playerId, 'gm');
    seat(SCOPED_CAMPAIGN_ID, wrong.playerId, 'gm');

    const accepted = await call(
      'GET',
      { id: SCOPED_CAMPAIGN_ID },
      undefined,
      right.wire,
    );
    expect(accepted.status).toBe(200);

    // Seated as a GM and holding a valid signature, but the token was
    // minted for another session: the scope comes from the campaign's
    // own record, so it cannot be satisfied by naming a different one.
    const refused = await call(
      'GET',
      { id: SCOPED_CAMPAIGN_ID },
      undefined,
      wrong.wire,
    );
    expect(refused.status).toBe(401);
  });
});
