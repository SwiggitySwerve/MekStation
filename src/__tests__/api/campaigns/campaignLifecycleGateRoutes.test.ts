/**
 * S1b reader gate on adopt, redeem and commands (matrix row D) and the
 * conflict-path backstop on the item route (row B, race).
 *
 * @spec openspec/changes/add-contract-lifecycle-s1b/specs/mission-contracts/spec.md
 */
import type { ICampaignGrant } from '@/lib/campaign/grants/ICampaignGrantStore';

import { canonicalGrantTokenPayload } from '@/lib/campaign/grants/campaignGrantToken';
import { issueShareGrant } from '@/lib/campaign/grants/campaignShareService';
import adoptHandler from '@/pages/api/campaigns/[id]/adopt';
import commandsHandler from '@/pages/api/campaigns/[id]/commands';
import redeemHandler from '@/pages/api/campaigns/redeem';
import { bindCampaignSessionParticipant } from '@/services/campaignPersistence/CampaignSessionParticipantStore';
import { getSQLiteService } from '@/services/persistence/SQLiteService';
import { generateKeyPair, signData } from '@/services/vault/IdentityService';

import {
  bearerOf,
  mintIdentity,
  seatedCaller,
  useTempCampaignDatabase,
} from './campaignJournalEffectsFixture';
import {
  callGated,
  envelopeHolding,
  rowBytes,
  seedRow,
  storedContract,
} from './campaignLifecycleGateFixture';

const UNSUPPORTED = 'CAMPAIGN_LIFECYCLE_RULES_UNSUPPORTED';

async function callRedeem(
  body: Record<string, unknown>,
  reader?: string,
): ReturnType<typeof callGated> {
  return callGated(redeemHandler as never, 'POST', 'unused', { body, reader });
}

describe('S1b reader gate: adopt', () => {
  useTempCampaignDatabase('s1b-gate-adopt-');

  it('refuses an incoming v2 body before anything is created', async () => {
    const id = 's1b-adopt-new';
    const answer = await callGated(adoptHandler, 'POST', id, {
      body: { envelope: envelopeHolding(id, [storedContract('v2', 2)], 0) },
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({
      code: UNSUPPORTED,
      source: 'incoming',
    });
    expect(rowBytes(id)).toBeNull();
  });

  it('answers 426, not 409 with the record, when the server already holds a v2 row', async () => {
    const id = 's1b-adopt-held';
    seedRow(envelopeHolding(id, [storedContract('v2', 2)]));
    const before = rowBytes(id);
    const answer = await callGated(adoptHandler, 'POST', id, {
      body: { envelope: envelopeHolding(id, [], 0) },
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({ code: UNSUPPORTED, source: 'stored' });
    expect(answer.json).not.toHaveProperty('current');
    expect(rowBytes(id)).toEqual(before);
  });

  it('control: a covering reader still gets the ordinary 409 with the record', async () => {
    const id = 's1b-adopt-held2';
    seedRow(envelopeHolding(id, [storedContract('v2', 2)]));
    const answer = await callGated(adoptHandler, 'POST', id, {
      reader: '2',
      body: { envelope: envelopeHolding(id, [], 0) },
    });
    expect(answer.status).toBe(409);
    expect(answer.json).toHaveProperty('current');
  });

  it('control: a legacy adoption is untouched', async () => {
    const id = 's1b-adopt-legacy';
    const answer = await callGated(adoptHandler, 'POST', id, {
      body: { envelope: envelopeHolding(id, [storedContract('old')], 0) },
    });
    expect(answer.status).toBe(201);
  });

  it('keeps the 400 for a mismatched envelope ahead of the gate', async () => {
    const answer = await callGated(adoptHandler, 'POST', 'one-id', {
      body: {
        envelope: envelopeHolding('other', [storedContract('v2', 2)], 0),
      },
    });
    expect(answer.status).toBe(400);
  });
});

describe('S1b reader gate: commands', () => {
  useTempCampaignDatabase('s1b-gate-commands-');

  const ID = 's1b-commands';
  const commandBody = {
    commandId: 'cmd-1',
    // Refused later for naming an author; reaching that 400 proves the gate passed.
    authorPlayerId: 'forged',
    intent: { kind: 'SpendFunds', campaignId: ID, payload: {} },
  };

  beforeEach(() => {
    seedRow(envelopeHolding(ID, [storedContract('v2', 2)]));
  });

  it('answers an unauthenticated caller 401 first', async () => {
    const answer = await callGated(commandsHandler, 'POST', ID, {
      body: commandBody,
    });
    expect(answer.status).toBe(401);
  });

  it('answers a bearer with no seat 403 first', async () => {
    const stranger = await bearerOf(await mintIdentity('s1b-stranger'));
    const answer = await callGated(commandsHandler, 'POST', ID, {
      body: commandBody,
      wire: stranger.wire,
    });
    expect(answer.status).toBe(403);
  });

  it('refuses a seated caller with a too-old reader before the author complaint', async () => {
    const wire = await seatedCaller(ID);
    const answer = await callGated(commandsHandler, 'POST', ID, {
      body: commandBody,
      wire,
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({ code: UNSUPPORTED, source: 'stored' });
  });

  it('control: a covering reader reaches the route’s own complaints', async () => {
    const wire = await seatedCaller(ID);
    const answer = await callGated(commandsHandler, 'POST', ID, {
      body: commandBody,
      wire,
      reader: '2',
    });
    expect(answer.status).toBe(400);
    expect(answer.json).toMatchObject({ reason: 'author-not-accepted' });
  });
});

describe('S1b reader gate: redeem', () => {
  useTempCampaignDatabase('s1b-gate-redeem-');

  const ID = 's1b-redeem';
  let keys: Awaited<ReturnType<typeof generateKeyPair>>;

  beforeEach(async () => {
    keys = await generateKeyPair();
  });

  const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

  function issueGrant(): ICampaignGrant {
    seedRow(envelopeHolding(ID, []));
    bindCampaignSessionParticipant({
      campaignId: ID,
      sessionId: `session-${ID}`,
      participantId: 'gm-s1b',
      seat: 'gm',
      boundAt: '2026-08-23T00:00:00.000Z',
    });
    const issued = issueShareGrant(getSQLiteService().getDatabase(), {
      campaignId: ID,
      callerId: 'gm-s1b',
      participantId: 'guest-s1b',
      issuerPublicKey: b64(keys.publicKey),
      scopes: ['campaign'],
      issuedAt: '2026-08-23T00:00:00.000Z',
      expiresAt: '2026-12-31T00:00:00.000Z',
    });
    if (issued.kind !== 'ok') throw new Error('grant issue failed');
    // The consuming device does not hold the source row.
    getSQLiteService()
      .getDatabase()
      .prepare('DELETE FROM campaigns WHERE id = ?')
      .run(ID);
    return issued.value;
  }

  async function tokenFor(grant: ICampaignGrant) {
    const signature = await signData(
      new TextEncoder().encode(
        canonicalGrantTokenPayload({
          grantId: grant.grantId,
          campaignId: grant.campaignId,
          participantId: grant.participantId,
          scopes: grant.scopes,
          issuedAt: grant.issuedAt,
          expiresAt: grant.expiresAt,
        }),
      ),
      keys.privateKey,
    );
    return {
      grantId: grant.grantId,
      campaignId: grant.campaignId,
      participantId: grant.participantId,
      scopes: grant.scopes,
      issuedAt: grant.issuedAt,
      expiresAt: grant.expiresAt,
      publicKey: b64(keys.publicKey),
      signature: b64(signature),
    };
  }

  const v2Body = () => envelopeHolding(ID, [storedContract('v2', 2)]).body;

  it('refuses a verified share carrying v2 to a too-old reader and stores nothing', async () => {
    const token = await tokenFor(issueGrant());
    const answer = await callRedeem({
      token,
      sourceInstanceId: 'other-host',
      body: v2Body(),
    });
    expect(answer.status).toBe(426);
    expect(answer.json).toMatchObject({
      code: UNSUPPORTED,
      source: 'incoming',
    });
    expect(rowBytes(ID)).toBeNull();
  });

  it('answers a forged token 400 first, never 426', async () => {
    issueGrant();
    const answer = await callRedeem({
      token: { grantId: 'nope', campaignId: ID },
      sourceInstanceId: 'other-host',
      body: v2Body(),
    });
    expect(answer.status).toBe(400);
  });

  it('control: a covering reader redeems the same share', async () => {
    const token = await tokenFor(issueGrant());
    const answer = await callRedeem(
      { token, sourceInstanceId: 'other-host', body: v2Body() },
      '2',
    );
    expect(answer.status).toBe(201);
  });
});
