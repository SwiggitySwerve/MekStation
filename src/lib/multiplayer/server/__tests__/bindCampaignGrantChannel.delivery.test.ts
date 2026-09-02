/**
 * Grant-channel backfill, scoped live fan-out, stale rebaseline, and D7.
 */

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';

import {
  PARTICIPANT_GM,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  appendScopeScript,
  closeCampaignDeliveryHarness,
  fundsEvent,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { createGmGrantScopes } from '@/lib/campaign/grants/campaignGrantGuards';
import { JournalCampaignEventStore } from '@/lib/campaign/sync/JournalCampaignEventStore';
import { bindCampaignSyncConnection } from '@/lib/multiplayer/server/bindCampaignSyncConnection';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

import {
  MATCH_ID,
  ManualLiveSource,
  MockWireSocket,
  VISIBLE_ONE,
  VISIBLE_TWO,
  WITHHELD_GM_SECRET,
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

describe('grant channel delivery', () => {
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

  /** Binds one replica socket using the shared manual live source. */
  async function bindGrantSocket(
    campaignId: string,
    playerId: string,
  ): Promise<MockWireSocket> {
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry: registryForHost(memoryHost(campaignId), MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: playerId,
      logger: quietLogger,
      grantChannel: harnessGrantChannel(harness),
      grantLiveSource: live,
    });
    return socket;
  }

  it('delivers contiguous sequences from 1 on a null cursor and pages without renumbering', async () => {
    const campaignId = 'campaign-backfill';
    const { grant, token } = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendScopeScript(harness, campaignId, [
      { scope: 'campaign', reason: VISIBLE_ONE },
      { scope: 'gm', reason: WITHHELD_GM_SECRET },
      { scope: 'campaign', reason: VISIBLE_TWO },
    ]);

    const socket = await bindGrantSocket(campaignId, PARTICIPANT_PLAYER);
    const __before1 = socket.sent.length;
    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: null,
      }),
    );
    await drain(() => socket.sent.length > __before1);

    const delivery = framesOf(socket, 'CampaignGrantDelivery');
    expect(delivery).toHaveLength(1);
    expect(
      delivery[0]?.items.map(function (row) {
        return row.deliverySequence;
      }),
    ).toEqual([1, 2]);
    expect(
      delivery[0]?.items.map(function (row) {
        return row.event.payload;
      }),
    ).toEqual([
      { delta: 0, reason: VISIBLE_ONE, balance: 1 },
      { delta: 0, reason: VISIBLE_TWO, balance: 1 },
    ]);
    expect(leakScan(socket.sent, [WITHHELD_GM_SECRET])).toEqual([]);

    const resume = await bindGrantSocket(campaignId, PARTICIPANT_PLAYER);
    const __before2 = resume.sent.length;
    resume.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: {
          deliveryEpochId: delivery[0]!.deliveryEpochId,
          afterSequence: 1,
        },
      }),
    );
    await drain(() => resume.sent.length > __before2);
    const paged = framesOf(resume, 'CampaignGrantDelivery');
    expect(paged[0]?.items.map((row) => row.deliverySequence)).toEqual([2]);
    expect(paged[0]?.items[0]?.event.payload).toEqual({
      delta: 0,
      reason: VISIBLE_TWO,
      balance: 1,
    });
  });

  it('withholds gm live events from the campaign grant and keeps sequences contiguous', async () => {
    const campaignId = 'campaign-live-scope';
    const player = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const gm = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_GM,
      scopes: createGmGrantScopes(),
    });

    const campaignSocket = await bindGrantSocket(
      campaignId,
      PARTICIPANT_PLAYER,
    );
    const gmSocket = await bindGrantSocket(campaignId, PARTICIPANT_GM);
    campaignSocket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: player.grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token: player.token,
        cursor: null,
      }),
    );
    const __before3 = gmSocket.sent.length;
    const __before4 = gmSocket.sent.length;
    const __before5 = gmSocket.sent.length;
    const __before6 = gmSocket.sent.length;
    gmSocket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: gm.grant.grantId,
        playerId: PARTICIPANT_GM,
        token: gm.token,
        cursor: null,
      }),
    );
    await drain(() => gmSocket.sent.length > __before3);
    campaignSocket.sent.length = 0;
    gmSocket.sent.length = 0;

    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 0, 'campaign', VISIBLE_ONE),
    );
    live.wake();
    await drain(() => gmSocket.sent.length > __before4);
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 1, 'gm', WITHHELD_GM_SECRET),
    );
    live.wake();
    await drain(() => gmSocket.sent.length > __before5);
    await appendCampaignEvent(
      harness,
      fundsEvent(campaignId, 2, 'campaign', VISIBLE_TWO),
    );
    live.wake();
    await drain(() => gmSocket.sent.length > __before6);

    const campaignItems = framesOf(
      campaignSocket,
      'CampaignGrantDelivery',
    ).flatMap((frame) => frame.items);
    const gmItems = framesOf(gmSocket, 'CampaignGrantDelivery').flatMap(
      (frame) => frame.items,
    );
    expect(campaignItems.map((row) => row.deliverySequence)).toEqual([1, 2]);
    expect(campaignItems.map((row) => row.event.payload)).toEqual([
      { delta: 0, reason: VISIBLE_ONE, balance: 1 },
      { delta: 0, reason: VISIBLE_TWO, balance: 1 },
    ]);
    expect(gmItems.map((row) => row.deliverySequence)).toEqual([1, 2, 3]);
    expect(gmItems.map((row) => row.event.scope)).toEqual([
      'campaign',
      'gm',
      'campaign',
    ]);
    expect(leakScan(campaignSocket.sent, [WITHHELD_GM_SECRET])).toEqual([]);
    expect(leakScan(gmSocket.sent, ['not-a-withheld-marker'])).toEqual([]);
    expect(JSON.stringify(gmSocket.sent)).toContain(WITHHELD_GM_SECRET);
    expect(framesOf(campaignSocket, 'CampaignEvent')).toHaveLength(0);
    expect(
      campaignSocket.sent.filter((frame) => frame.kind === 'Heartbeat'),
    ).toHaveLength(0);
  });

  it('sends a rebaseline with no events and accepts a follow-up join', async () => {
    const campaignId = 'campaign-stale';
    const { grant, token } = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    await appendScopeScript(harness, campaignId, [
      { scope: 'campaign', reason: VISIBLE_ONE },
    ]);
    const socket = await bindGrantSocket(campaignId, PARTICIPANT_PLAYER);
    const __before7 = socket.sent.length;
    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: {
          deliveryEpochId: 'f'.repeat(32),
          afterSequence: 0,
        },
      }),
    );
    await drain(() => socket.sent.length > __before7);
    const rebaseline = framesOf(socket, 'CampaignGrantRebaseline');
    expect(rebaseline).toHaveLength(1);
    expect(rebaseline[0]?.baseline.deliveryEpochId).toMatch(/^[0-9a-f]{32}$/);
    expect('items' in (rebaseline[0] ?? {})).toBe(false);
    expect('events' in (rebaseline[0] ?? {})).toBe(false);
    expect(framesOf(socket, 'CampaignGrantDelivery')).toHaveLength(0);
    expect(socket.readyState).toBe(1);

    const __before8 = socket.sent.length;
    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: {
          deliveryEpochId: rebaseline[0]!.baseline.deliveryEpochId,
          afterSequence: 0,
        },
      }),
    );
    await drain(() => socket.sent.length > __before8);
    const follow = framesOf(socket, 'CampaignGrantDelivery');
    expect(follow.length).toBeGreaterThanOrEqual(1);
    expect(follow[follow.length - 1]?.items[0]?.deliverySequence).toBe(1);
  });

  it('delivers nothing when a commit append fails', async () => {
    const campaignId = 'campaign-d7';
    const { grant, token } = await issueSignedGrant(harness, {
      campaignId,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const journalStore = new JournalCampaignEventStore(harness.journal);
    const failing: ICampaignEventStore & { failNext: boolean } = {
      failNext: false,
      appendCommandBatch: async (id, input) => {
        if (failing.failNext) {
          throw new Error('forced-append-failure');
        }
        return journalStore.appendCommandBatch(id, input);
      },
      appendEvent: (id, event) => journalStore.appendEvent(id, event),
      getEvents: (id, from) => journalStore.getEvents(id, from),
      highestSequence: (id) => journalStore.highestSequence(id),
    };
    const host = new CampaignMatchHost({
      campaignId,
      hostPlayerId: 'pid_host',
      eventStore: failing,
      initialState: createEmptyCampaignState(campaignId),
    });
    let fanoutCount = 0;
    const previousSubscribe = host.subscribe;
    host.subscribe = (subscriber) =>
      previousSubscribe((event) => {
        fanoutCount += 1;
        subscriber(event);
      });
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      registry: registryForHost(host, MATCH_ID),
      matchId: MATCH_ID,
      verifiedPlayerId: PARTICIPANT_PLAYER,
      logger: quietLogger,
      grantChannel: harnessGrantChannel(harness),
    });
    const __before9 = socket.sent.length;
    const __before10 = socket.sent.length;
    socket.inbound(
      grantJoinEnvelope({
        campaignId,
        grantId: grant.grantId,
        playerId: PARTICIPANT_PLAYER,
        token,
        cursor: null,
      }),
    );
    await drain(() => socket.sent.length > __before9);
    const before = socket.sent.length;
    failing.failNext = true;
    await expect(
      host.applyHostIntent({
        kind: 'AdvanceDay',
        campaignId,
        intentId: 'day-fail',
        payload: { days: 1 },
      }),
    ).rejects.toThrow('forced-append-failure');
    await drain(() => socket.sent.length > __before10);
    expect(fanoutCount).toBe(0);
    expect(socket.sent.length).toBe(before);
    expect(
      framesOf(socket, 'CampaignGrantDelivery').flatMap((frame) => frame.items),
    ).toEqual([]);
    expect(framesOf(socket, 'CampaignEvent')).toHaveLength(0);
    expect(JSON.stringify(socket.sent)).not.toContain('day-fail');
  });
});
