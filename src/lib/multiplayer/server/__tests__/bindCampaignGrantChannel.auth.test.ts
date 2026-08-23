/**
 * Grant-channel token gate and protocol shape (task 3.3).
 */

import type { ICampaignGrantChannelDeps } from '@/lib/multiplayer/server/handleCampaignGrantJoin';

import {
  BrokenCampaignGrantStore,
  PARTICIPANT_PLAYER,
  REVOKED_AT,
  closeCampaignDeliveryHarness,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import {
  GRANT_CHANNEL_AUTH_ERROR_CODE,
  GRANT_CHANNEL_INFRA_ERROR_CODE,
  grantTokenFailureFrame,
} from '@/lib/campaign/delivery/campaignGrantChannelAuth';
import { canonicalizeGrantScopes } from '@/lib/campaign/grants/campaignGrantGuards';
import { signCampaignGrantToken } from '@/lib/campaign/grants/campaignGrantToken';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { generateKeyPair, toBase64 } from '@/services/vault/IdentityService';
import {
  CampaignGrantDeliverySchema,
  CampaignGrantJoinSchema,
  CampaignGrantRebaselineSchema,
  ClientMessageSchema,
  ServerMessageSchema,
  nowIso,
} from '@/types/multiplayer/Protocol';

import {
  MATCH_ID,
  ManualLiveSource,
  MockWireSocket,
  drain,
  grantJoinEnvelope,
  harnessGrantChannel,
  issueSignedGrant,
  memoryHost,
  quietLogger,
  registryForHost,
} from './campaignGrantChannel.test-helpers';

describe('grant channel protocol', () => {
  it('parses CampaignGrantJoin through the shared client envelope', () => {
    const env = {
      kind: 'CampaignGrantJoin' as const,
      matchId: MATCH_ID,
      ts: nowIso(),
      playerId: PARTICIPANT_PLAYER,
      campaignId: 'campaign-1',
      grantId: 'a'.repeat(32),
      token: { not: 'verified-here' },
      cursor: null,
    };
    expect(CampaignGrantJoinSchema.safeParse(env).success).toBe(true);
    expect(ClientMessageSchema.safeParse(env).success).toBe(true);
  });

  it('rejects journal fields and source sequence on delivery frames', () => {
    const baseline = {
      deliveryEpochId: 'a'.repeat(32),
      effectiveGeneration: 0,
    };
    const event = {
      type: 'FundsChanged' as const,
      campaignId: 'c',
      ts: nowIso(),
      authorPlayerId: 'host',
      scope: 'campaign' as const,
      payload: { delta: 0, reason: 'ok', balance: 1 },
    };
    const clean = {
      kind: 'CampaignGrantDelivery' as const,
      matchId: MATCH_ID,
      ts: nowIso(),
      campaignId: 'c',
      grantId: 'a'.repeat(32),
      deliveryEpochId: baseline.deliveryEpochId,
      baseline,
      items: [{ deliverySequence: 1, event }],
    };
    expect(CampaignGrantDeliverySchema.safeParse(clean).success).toBe(true);
    expect(ServerMessageSchema.safeParse(clean).success).toBe(true);
    expect(
      CampaignGrantDeliverySchema.safeParse({
        ...clean,
        items: [{ deliverySequence: 1, event: { ...event, sequence: 9 } }],
      }).success,
    ).toBe(false);
    expect(
      CampaignGrantDeliverySchema.safeParse({
        ...clean,
        eventDigest: 'abc',
      }).success,
    ).toBe(false);
    const rebaseline = {
      kind: 'CampaignGrantRebaseline' as const,
      matchId: MATCH_ID,
      ts: nowIso(),
      campaignId: 'c',
      grantId: 'a'.repeat(32),
      baseline,
    };
    expect(CampaignGrantRebaselineSchema.safeParse(rebaseline).success).toBe(
      true,
    );
    expect(
      CampaignGrantRebaselineSchema.safeParse({
        ...rebaseline,
        items: [],
      }).success,
    ).toBe(false);
  });

  it('uses distinct codes for auth refusal versus store infrastructure', () => {
    expect(GRANT_CHANNEL_AUTH_ERROR_CODE).toBe('AUTH_REJECTED');
    expect(GRANT_CHANNEL_INFRA_ERROR_CODE).toBe('INTERNAL_ERROR');
    expect(GRANT_CHANNEL_AUTH_ERROR_CODE).not.toBe(
      GRANT_CHANNEL_INFRA_ERROR_CODE,
    );
    expect(grantTokenFailureFrame('revoked').code).toBe(
      GRANT_CHANNEL_AUTH_ERROR_CODE,
    );
    expect(grantTokenFailureFrame('store-unavailable').code).toBe(
      GRANT_CHANNEL_INFRA_ERROR_CODE,
    );
  });
});

describe('grant channel token gate', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    quietLogger.error.mockClear();
    quietLogger.warn.mockClear();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  /** Binds a replica socket with optional grant-channel overrides. */
  async function bindSocket(
    campaignId: string,
    playerId: string,
    grantChannel: ICampaignGrantChannelDeps | null = harnessGrantChannel(
      harness,
    ),
  ): Promise<MockWireSocket> {
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry: registryForHost(memoryHost(campaignId), MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: playerId,
      logger: quietLogger,
      grantChannel,
      grantLiveSource: new ManualLiveSource(),
    });
    return socket;
  }

  it('maps each failure reason to a typed frame and keeps infra off AUTH_REJECTED', async () => {
    const campaignId = 'campaign-token-gate';
    const issued = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const { grant, token } = issued;

    const malformed = await bindSocket(campaignId, PARTICIPANT_PLAYER);
    malformed.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: { not: 'a-grant-token' },
        cursor: null,
      }),
    );
    await drain(() => malformed.sent.length > 0);
    expect(malformed.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-malformed',
      }),
    );

    const expired = await bindSocket(campaignId, PARTICIPANT_PLAYER, {
      ...harnessGrantChannel(harness),
      nowMs: () => Date.parse('2026-08-22T20:00:00.000Z'),
    });
    expired.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: null,
      }),
    );
    await drain(() => expired.sent.length > 0);
    expect(expired.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-expired',
      }),
    );

    const attacker = await generateKeyPair();
    const forged = await signCampaignGrantToken(grant, {
      publicKey: token.publicKey,
      privateKey: toBase64(attacker.privateKey),
    });
    const badSig = await bindSocket(campaignId, PARTICIPANT_PLAYER);
    badSig.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: forged,
        cursor: null,
      }),
    );
    await drain(() => badSig.sent.length > 0);
    expect(badSig.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-bad-signature',
      }),
    );

    const unknown = await bindSocket(campaignId, PARTICIPANT_PLAYER);
    unknown.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: { ...token, grantId: 'c'.repeat(32) },
        cursor: null,
      }),
    );
    await drain(() => unknown.sent.length > 0);
    expect(unknown.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-unknown-grant',
      }),
    );

    harness.grantStore.revokeGrant(grant.grantId, REVOKED_AT);
    const revoked = await bindSocket(campaignId, PARTICIPANT_PLAYER);
    revoked.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: null,
      }),
    );
    await drain(() => revoked.sent.length > 0);
    expect(revoked.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-revoked',
      }),
    );

    const second = await issueSignedGrant(harness, {
      campaignId,
      participantId: 'participant-scope',
      scopes: ['campaign'],
    });
    const widened = await signCampaignGrantToken(
      {
        ...second.grant,
        scopes: canonicalizeGrantScopes(['campaign', 'gm']),
      },
      second.signer,
    );
    const scopeSocket = await bindSocket(campaignId, 'participant-scope');
    scopeSocket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: second.grant.grantId,
        playerId: 'participant-scope',
        token: widened,
        cursor: null,
      }),
    );
    await drain(() => scopeSocket.sent.length > 0);
    expect(scopeSocket.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-token-scope-mismatch',
      }),
    );

    const broken = await bindSocket(campaignId, PARTICIPANT_PLAYER, {
      projectDeps: {
        ...harness.deps,
        grantStore: new BrokenCampaignGrantStore(),
      },
      nowMs: () => Date.parse('2026-08-22T16:30:00.000Z'),
      nowIso: () => '2026-08-22T16:30:00.000Z',
    });
    broken.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: second.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: second.token,
        cursor: null,
      }),
    );
    await drain(() => broken.sent.length > 0);
    expect(broken.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'INTERNAL_ERROR',
        reason: 'grant-store-unavailable',
      }),
    );
    const brokenCode = broken.sent.find((m) => m.kind === 'Error')?.code;
    expect(brokenCode).toBe('INTERNAL_ERROR');
    expect(brokenCode).not.toBe('AUTH_REJECTED');

    const mismatch = await bindSocket(campaignId, 'participant-scope');
    mismatch.inbound(
      grantJoinEnvelope({
        campaignId: 'campaign-other',
        grantId: second.grant.grantId,
        playerId: 'participant-scope',
        token: second.token,
        cursor: null,
      }),
    );
    await drain(() => mismatch.sent.length > 0);
    expect(mismatch.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'AUTH_REJECTED',
        reason: 'grant-campaign-mismatch',
      }),
    );

    const unavailable = await bindSocket(campaignId, PARTICIPANT_PLAYER, null);
    unavailable.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: null,
      }),
    );
    await drain(() => unavailable.sent.length > 0);
    expect(unavailable.sent).toContainEqual(
      expect.objectContaining({
        kind: 'Error',
        code: 'INTERNAL_ERROR',
        reason: 'grant-channel-unavailable',
      }),
    );
  });
});
