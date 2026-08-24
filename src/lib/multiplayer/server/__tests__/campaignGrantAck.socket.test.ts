/**
 * Acknowledgement over the live socket, and the resume it buys
 * (task 5.5, design D4/D5).
 *
 * The module tests pin the cursor's laws. These pin the wiring: that an
 * acknowledgement arriving on a real bound socket actually persists,
 * that a socket cannot move a cursor it never authenticated for, and
 * that a later join with NO cursor picks up from the stored one instead
 * of re-reading the stream from the beginning.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  EVENT_TS,
  PARTICIPANT_PLAYER,
  appendCampaignEvent,
  closeCampaignDeliveryHarness,
  fundsEvent,
  openCampaignDeliveryHarness,
} from '@/lib/campaign/delivery/__tests__/grantProjectionHarness';
import { readParticipantDeliveryCursor } from '@/lib/campaign/delivery/participantDeliveryCursor';

import { bindCampaignSyncConnection } from '../bindCampaignSyncConnection';
import {
  drain,
  harnessGrantChannel,
  issueSignedGrant,
  MATCH_ID,
  memoryHost,
  MockWireSocket,
  quietLogger,
  registryForHost,
} from './campaignGrantChannel.test-helpers';

const CAMPAIGN_ID = 'campaign-ack-socket';

/** Sequences delivered to one socket, in wire order. */
function deliveredSequences(socket: MockWireSocket): number[] {
  return socket.sent
    .filter(
      (
        message: IServerMessage,
      ): message is Extract<
        IServerMessage,
        { kind: 'CampaignGrantDelivery' }
      > => message.kind === 'CampaignGrantDelivery',
    )
    .flatMap((frame) => frame.items.map((item) => item.deliverySequence));
}

describe('campaign grant acknowledgement over the socket', () => {
  let harness: Awaited<ReturnType<typeof openCampaignDeliveryHarness>>;
  let host: ReturnType<typeof memoryHost>;

  beforeEach(async () => {
    harness = await openCampaignDeliveryHarness();
    host = memoryHost(CAMPAIGN_ID);
    for (let i = 0; i < 3; i += 1) {
      await appendCampaignEvent(
        harness,
        fundsEvent(CAMPAIGN_ID, i, 'campaign', `pay-${i}`),
      );
    }
  });

  afterEach(async () => {
    host.close();
    await closeCampaignDeliveryHarness(harness);
  });

  /** Binds a socket and joins it with the given grant token. */
  async function joinedSocket(
    grantId: string,
    token: unknown,
    cursor: { deliveryEpochId: string; afterSequence: number } | null = null,
  ): Promise<MockWireSocket> {
    const socket = new MockWireSocket();
    await bindCampaignSyncConnection({
      socket,
      matchId: MATCH_ID,
      verifiedPlayerId: PARTICIPANT_PLAYER,
      registry: registryForHost(host, MATCH_ID),
      logger: quietLogger,
      grantChannel: {
        ...harnessGrantChannel(harness),
        database: () => harness.db,
      },
    });
    socket.inbound({
      kind: 'CampaignGrantJoin',
      matchId: MATCH_ID,
      ts: EVENT_TS,
      playerId: PARTICIPANT_PLAYER,
      campaignId: CAMPAIGN_ID,
      grantId,
      token,
      cursor,
    });
    await drain(() => deliveredSequences(socket).length > 0);
    return socket;
  }

  function storedCursor(grantId: string) {
    return readParticipantDeliveryCursor(harness.db, {
      campaignId: CAMPAIGN_ID,
      grantId,
      participantId: PARTICIPANT_PLAYER,
    });
  }

  it('persists an acknowledgement from the socket that authenticated it', async () => {
    const { grant, token } = await issueSignedGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const socket = await joinedSocket(grant.grantId, token);
    const epoch = socket.sent.find(
      (message) => message.kind === 'CampaignGrantDelivery',
    );
    expect(epoch?.kind).toBe('CampaignGrantDelivery');
    if (epoch?.kind !== 'CampaignGrantDelivery') return;

    socket.inbound({
      kind: 'CampaignGrantAck',
      matchId: MATCH_ID,
      ts: EVENT_TS,
      playerId: PARTICIPANT_PLAYER,
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      deliveryEpochId: epoch.deliveryEpochId,
      ackedSequence: 2,
    });
    await drain(() => storedCursor(grant.grantId) !== null);

    expect(storedCursor(grant.grantId)?.ackedSequence).toBe(2);
  });

  it('refuses to move a cursor for a grant this socket never joined', async () => {
    const mine = await issueSignedGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const other = await issueSignedGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const socket = await joinedSocket(mine.grant.grantId, mine.token);
    // Vacuity guard: the refusal below means nothing unless this socket
    // really did join and really is delivering.
    expect(deliveredSequences(socket)).toEqual([1, 2, 3]);
    const frame = socket.sent.find(
      (message) => message.kind === 'CampaignGrantDelivery',
    );
    expect(frame?.kind).toBe('CampaignGrantDelivery');
    if (frame?.kind !== 'CampaignGrantDelivery') return;

    // A grant this participant genuinely holds - but NOT the one this
    // connection presented a token for. The socket proved one thing and
    // is claiming about another.
    socket.inbound({
      kind: 'CampaignGrantAck',
      matchId: MATCH_ID,
      ts: EVENT_TS,
      playerId: PARTICIPANT_PLAYER,
      campaignId: CAMPAIGN_ID,
      grantId: other.grant.grantId,
      deliveryEpochId: frame.deliveryEpochId,
      ackedSequence: 3,
    });
    await drain();

    expect(storedCursor(other.grant.grantId)).toBeNull();
    // And the socket is still up: a rejected cursor claim is not grounds
    // to drop a connection with a valid subscription.
    expect(socket.closes).toHaveLength(0);
  });

  it('resumes a later join from the stored cursor, with no cursor sent', async () => {
    const { grant, token } = await issueSignedGrant(harness, {
      campaignId: CAMPAIGN_ID,
      participantId: PARTICIPANT_PLAYER,
      scopes: ['campaign'],
    });
    const first = await joinedSocket(grant.grantId, token);
    expect(deliveredSequences(first)).toEqual([1, 2, 3]);
    const frame = first.sent.find(
      (message) => message.kind === 'CampaignGrantDelivery',
    );
    if (frame?.kind !== 'CampaignGrantDelivery') return;

    first.inbound({
      kind: 'CampaignGrantAck',
      matchId: MATCH_ID,
      ts: EVENT_TS,
      playerId: PARTICIPANT_PLAYER,
      campaignId: CAMPAIGN_ID,
      grantId: grant.grantId,
      deliveryEpochId: frame.deliveryEpochId,
      ackedSequence: 3,
    });
    await drain(() => storedCursor(grant.grantId)?.ackedSequence === 3);
    await appendCampaignEvent(
      harness,
      fundsEvent(CAMPAIGN_ID, 3, 'campaign', 'pay-3'),
    );

    // Reconnect knowing nothing. Before the durable cursor this replayed
    // the entire stream; now it starts where the participant actually
    // got to.
    const second = await joinedSocket(grant.grantId, token);

    expect(deliveredSequences(second)).toEqual([4]);
  });
});
