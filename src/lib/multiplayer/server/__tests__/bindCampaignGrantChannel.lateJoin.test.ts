/**
 * Late join and exactly-once reconnect (task 4.4).
 *
 * Two properties a shared campaign lives or dies by:
 *
 * - A participant who joins on "day 40" must receive the scoped history
 *   from day one. Sharing a campaign that only shows what happens after
 *   you arrive is not sharing the campaign.
 * - A reconnect must be EXACTLY once by sequence. A duplicate silently
 *   double-applies whatever the event did; a gap silently loses it. Both
 *   corrupt the replica while looking perfectly healthy from outside,
 *   which is what makes this worth pinning rather than assuming.
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
  memoryHost,
  quietLogger,
  registryForHost,
} from './campaignGrantChannel.test-helpers';

/** Long enough that a late joiner is genuinely catching up, not tailing. */
const HISTORY_LENGTH = 40;

describe('late join and exactly-once reconnect', () => {
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

  /** Every delivered item across every delivery frame on a socket. */
  function deliveredItems(
    socket: MockWireSocket,
  ): readonly { deliverySequence: number; event: { payload: unknown } }[] {
    return framesOf(socket, 'CampaignGrantDelivery').flatMap(
      (frame) => frame.items,
    ) as readonly {
      deliverySequence: number;
      event: { payload: unknown };
    }[];
  }

  it('backfills the whole scoped history to a late joiner, then resumes exactly once', async () => {
    const campaignId = 'campaign-late-join';
    const player = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });

    // A long in-scope history, interleaved with out-of-scope events so
    // the backfill is genuinely scoped rather than simply everything.
    for (let i = 0; i < HISTORY_LENGTH; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(campaignId, i * 2, 'campaign', `DAY-${i}`),
      );
      await appendCampaignEvent(
        harness,
        fundsEvent(campaignId, i * 2 + 1, 'gm', `GM-ONLY-${i}`),
      );
    }

    const first = await bindGrantSocket(campaignId);
    first.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    await drain(() => deliveredItems(first).length >= HISTORY_LENGTH);

    const backfilled = deliveredItems(first);
    // Day one is present, not just the recent tail.
    expect(JSON.stringify(backfilled)).toContain('DAY-0');
    expect(backfilled).toHaveLength(HISTORY_LENGTH);
    // Contiguous from 1 with no renumbering and no gaps for the
    // withheld gm events between them.
    expect(backfilled.map((item) => item.deliverySequence)).toEqual(
      Array.from({ length: HISTORY_LENGTH }, (_, i) => i + 1),
    );
    expect(JSON.stringify(backfilled)).not.toContain('GM-ONLY-');

    // Reconnect from the last sequence the replica actually stored.
    const lastSequence =
      backfilled[backfilled.length - 1]?.deliverySequence ?? 0;
    expect(lastSequence).toBe(HISTORY_LENGTH);

    const second = await bindGrantSocket(campaignId);
    second.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: {
          deliveryEpochId: framesOf(first, 'CampaignGrantDelivery')[0]
            ?.deliveryEpochId as string,
          afterSequence: lastSequence,
        },
      }),
    );
    await drain();

    // Nothing new had been committed, so an exactly-once resume delivers
    // NOTHING. A duplicate here would silently re-apply 40 events.
    expect(deliveredItems(second)).toHaveLength(0);

    // Now one new in-scope event: it must arrive exactly once, and as
    // the NEXT sequence - no gap, no restart at 1.
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, HISTORY_LENGTH * 2, 'campaign', 'AFTER-RESUME'),
    );
    live.wake();
    await drain(() => deliveredItems(second).length > 0);

    const resumed = deliveredItems(second);
    expect(resumed).toHaveLength(1);
    expect(resumed[0]?.deliverySequence).toBe(lastSequence + 1);
    expect(JSON.stringify(resumed)).toContain('AFTER-RESUME');
  });
});
