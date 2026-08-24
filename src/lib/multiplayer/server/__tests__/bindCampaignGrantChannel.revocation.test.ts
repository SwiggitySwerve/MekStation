/**
 * Revocation stops delivery at the boundary (task 4.3).
 *
 * The auth suite proves a revoked grant cannot JOIN. That is the easy
 * half. The half that matters to an owner who has just withdrawn access
 * is the ALREADY-CONNECTED socket: revoking means little if a session
 * opened a moment earlier keeps streaming campaign events until the
 * holder happens to disconnect.
 *
 * "At the boundary" is the load-bearing phrase - the check has to sit at
 * the delivery edge, because that is what decides what leaves the
 * process, not merely in a membership lookup some other path consults.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-replication/spec.md
 */

import {
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  openCampaignDeliveryHarness,
  PARTICIPANT_PLAYER,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';

import {
  MATCH_ID,
  ManualLiveSource,
  MockWireSocket,
  drain,
  framesOf,
  grantJoinEnvelope,
  harnessGrantChannel,
  issueSignedGrant,
  leakScan,
  memoryHost,
  quietLogger,
  registryForHost,
} from './campaignGrantChannel.test-helpers';

const BEFORE_REVOKE = 'VISIBLE-BEFORE-REVOKE';
const AFTER_REVOKE = 'MUST-NOT-ARRIVE-AFTER-REVOKE';
const REVOKED_AT = '2026-08-23T12:00:00.000Z';

describe('grant revocation stops delivery at the boundary', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
  let live: ManualLiveSource;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    live = new ManualLiveSource();
    quietLogger.error.mockClear();
    quietLogger.warn.mockClear();
  });

  afterEach(async () => {
    await closeCampaignDeliveryHarness(harness);
  });

  async function bindGrantSocket(campaignId: string): Promise<MockWireSocket> {
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry: registryForHost(memoryHost(campaignId), MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: PARTICIPANT_PLAYER,
      logger: quietLogger,
      grantChannel: harnessGrantChannel(harness),
      grantLiveSource: live,
    });
    return socket;
  }

  it('stops streaming to an already-connected socket once the grant is revoked', async () => {
    const campaignId = 'campaign-live-revoke';
    const player = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const socket = await bindGrantSocket(campaignId);

    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    await drain(() => socket.sent.length > 0);
    const afterJoin = socket.sent.length;

    // A live event BEFORE revocation proves the pipe is genuinely open,
    // so later silence means "revoked" rather than "never worked".
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 0, 'campaign', BEFORE_REVOKE),
    );
    live.wake();
    await drain(() => socket.sent.length > afterJoin);
    expect(
      framesOf(socket, 'CampaignGrantDelivery').flatMap((f) => f.items).length,
    ).toBeGreaterThan(0);
    expect(JSON.stringify(socket.sent)).toContain(BEFORE_REVOKE);

    // The owner withdraws access on an OPEN session.
    harness.grantStore.revokeGrant(player.grant.grantId, REVOKED_AT);
    const afterRevoke = socket.sent.length;

    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 1, 'campaign', AFTER_REVOKE),
    );
    live.wake();
    // Settle rather than wait for growth: the correct outcome is that
    // nothing new arrives, so a wait-for-growth predicate would burn its
    // deadline and then pass for the wrong reason.
    await drain();

    // This event is squarely in scope for the grant - only revocation
    // withholds it - so its absence IS the assertion.
    expect(leakScan(socket.sent, AFTER_REVOKE)).toEqual([]);
    expect(JSON.stringify(socket.sent.slice(afterRevoke))).not.toContain(
      AFTER_REVOKE,
    );
  });

  it('control: without the revoke, that same second event does arrive', async () => {
    // Without this, the test above could pass for the wrong reason - a
    // pipeline that delivers only once per connection would look exactly
    // like revocation working. This is the same scenario minus the
    // revoke, so the ONLY difference is the withdrawal itself.
    const campaignId = 'campaign-live-revoke-control';
    const player = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const socket = await bindGrantSocket(campaignId);

    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    await drain(() => socket.sent.length > 0);
    const afterJoin = socket.sent.length;

    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 0, 'campaign', BEFORE_REVOKE),
    );
    live.wake();
    await drain(() => socket.sent.length > afterJoin);
    const afterFirst = socket.sent.length;

    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 1, 'campaign', AFTER_REVOKE),
    );
    live.wake();
    await drain(() => socket.sent.length > afterFirst);

    // Same marker, same position in the sequence, no revoke: it arrives.
    expect(JSON.stringify(socket.sent)).toContain(AFTER_REVOKE);
  });
});
