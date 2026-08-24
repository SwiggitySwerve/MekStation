/**
 * A downstream failure never reaches the source (task 4.2).
 *
 * The user's requirement is one-way data flow: the source broadcasts to
 * consuming devices, and those devices are strictly downstream. That is
 * only true if a consumer behaving badly - a socket that throws on
 * every send, a replica that cannot ingest - cannot corrupt, stall, or
 * roll back the authoritative stream.
 *
 * This is the property that makes sharing safe to offer at all: without
 * it, handing someone a grant would hand them a way to damage your
 * campaign.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/specs/campaign-authority/spec.md
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
  grantJoinEnvelope,
  harnessGrantChannel,
  issueSignedGrant,
  memoryHost,
  quietLogger,
  registryForHost,
} from './campaignGrantChannel.test-helpers';

const FIRST = 'SOURCE-EVENT-ONE';
const SECOND = 'SOURCE-EVENT-TWO';

/** A socket whose every send throws, standing in for a broken consumer. */
class HostileSocket extends MockWireSocket {
  public sendAttempts = 0;

  public override send(data: string): void {
    this.sendAttempts += 1;
    void data;
    throw new Error('downstream socket is broken');
  }
}

describe('downstream failure isolation', () => {
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

  it('keeps the authoritative stream intact when a consumer socket throws on every send', async () => {
    const campaignId = 'campaign-hostile-consumer';
    const player = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });

    const socket = new HostileSocket();
    await bindCampaignSyncConnection({
      socket,
      registry: registryForHost(memoryHost(campaignId), MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: PARTICIPANT_PLAYER,
      logger: quietLogger,
      grantChannel: harnessGrantChannel(harness),
      grantLiveSource: live,
    });

    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    await drain();

    // The source keeps committing while the consumer is failing.
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 0, 'campaign', FIRST),
    );
    live.wake();
    await drain();
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 1, 'campaign', SECOND),
    );
    live.wake();
    await drain();

    // The consumer really did fail, repeatedly - otherwise this proves
    // nothing about failures.
    expect(socket.sendAttempts).toBeGreaterThan(0);

    // The authoritative stream is complete and correctly ordered: the
    // downstream explosion neither dropped an append nor rolled one
    // back nor stalled the writer.
    const stored = await harness.journal.readStream({
      streamType: 'campaign',
      streamId: campaignId,
      branchId: 'root',
      afterRevision: 0,
      limit: 100,
    });
    const reasons = stored.map(
      (row) =>
        (
          row.payload as {
            campaignEvent?: { payload?: { reason?: string } };
          }
        ).campaignEvent?.payload?.reason,
    );
    expect(reasons).toEqual([FIRST, SECOND]);

    // And a HEALTHY consumer joining afterwards still receives the full
    // scoped history - the stream was never damaged, only undelivered.
    const healthy = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket: healthy,
      registry: registryForHost(memoryHost(campaignId), MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: PARTICIPANT_PLAYER,
      logger: quietLogger,
      grantChannel: harnessGrantChannel(harness),
      grantLiveSource: live,
    });
    healthy.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    await drain(() => healthy.sent.length > 0);

    const wire = JSON.stringify(healthy.sent);
    expect(wire).toContain(FIRST);
    expect(wire).toContain(SECOND);
  });
});
