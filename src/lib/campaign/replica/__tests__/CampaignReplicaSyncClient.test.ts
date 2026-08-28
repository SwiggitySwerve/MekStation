/**
 * The consuming device's sync client (design D6, needed by task 4.5).
 *
 * Proven here against a fake socket so the behaviour is pinned without
 * a live server; the two-process e2e then proves the same path over a
 * real one. What matters is not that it receives - it is what it does
 * when things are NOT clean:
 *
 * - it resumes from the stored cursor rather than re-backfilling, which
 *   is also what lets the source enforce exactly-once against it;
 * - a refused ingest ENDS the connection instead of skipping, because a
 *   gap means the local copy no longer matches the source and appending
 *   onto a diverged stream would bury that;
 * - it never writes anything but its own replica stream, so a fault
 *   here cannot travel upstream.
 *
 * @spec openspec/changes/design-campaign-authority-and-sync/design.md (D6)
 */

import type { IReplicaSyncSocket } from '../CampaignReplicaSyncClient';

import { CampaignReplicaSyncClient } from '../CampaignReplicaSyncClient';
import {
  closeCampaignReplicaHarness,
  openCampaignReplicaHarness,
  replicaFundsPage,
  type ICampaignReplicaHarness,
} from './replicaTestHarness';

const CAMPAIGN_ID = 'campaign-sync-client';
const GRANT_ID = 'grant-sync-client';
// Opaque epoch ids are 32 lowercase hex chars; the store enforces that
// shape, so a readable placeholder is not a valid epoch.
const EPOCH = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';

/** A socket the test drives by hand, recording what the client sent. */
class FakeSocket implements IReplicaSyncSocket {
  public readonly sent: string[] = [];
  public closed = false;
  private listeners = new Map<string, ((data?: unknown) => void)[]>();

  public send(data: string): void {
    this.sent.push(data);
  }

  public close(): void {
    this.closed = true;
  }

  public on(event: string, listener: (data?: unknown) => void): void {
    const list = this.listeners.get(event) ?? [];
    list.push(listener);
    this.listeners.set(event, list);
  }

  /** Fires a listener as the real socket would. */
  public emit(event: string, data?: unknown): void {
    for (const listener of this.listeners.get(event) ?? []) listener(data);
  }
}

/**
 * A delivery frame exactly as the grant channel puts it on the wire.
 * The schema is `.strict()`, so a frame missing `baseline` is not a
 * delivery at all - which is the point of validating rather than
 * casting.
 */
function deliveryFrame(startSequence: number, count: number): string {
  return JSON.stringify({
    kind: 'CampaignGrantDelivery',
    matchId: 'match-1',
    ts: '2026-08-23T00:00:00.000Z',
    campaignId: CAMPAIGN_ID,
    grantId: GRANT_ID,
    deliveryEpochId: EPOCH,
    baseline: { deliveryEpochId: EPOCH, effectiveGeneration: 1 },
    items: replicaFundsPage(CAMPAIGN_ID, startSequence, count),
  });
}

describe('CampaignReplicaSyncClient', () => {
  let harness: ICampaignReplicaHarness;

  beforeEach(async () => {
    harness = await openCampaignReplicaHarness();
  });

  afterEach(async () => {
    await closeCampaignReplicaHarness(harness);
  });

  function makeClient(
    socket: FakeSocket,
    onClosed?: (r: string | null) => void,
  ) {
    return new CampaignReplicaSyncClient({
      url: 'ws://source.invalid/socket',
      matchId: 'match-1',
      campaignId: CAMPAIGN_ID,
      grantId: GRANT_ID,
      playerId: 'participant-guest',
      token: { grantId: GRANT_ID } as never,
      store: harness.store,
      socketFactory: () => socket,
      nowIso: () => '2026-08-23T00:00:00.000Z',
      onClosed,
    });
  }

  /** Lets queued ingest promises settle. */
  async function settle(): Promise<void> {
    for (let i = 0; i < 40; i += 1) await Promise.resolve();
    await new Promise<void>((r) => setTimeout(r, 0));
  }

  it('joins with a null cursor when it holds nothing yet', async () => {
    const socket = new FakeSocket();
    const client = makeClient(socket);
    await client.connect();
    socket.emit('open');
    await settle();

    const join = JSON.parse(socket.sent[0] ?? '{}') as {
      kind: string;
      cursor: unknown;
    };
    expect(join.kind).toBe('CampaignGrantJoin');
    // Nothing stored, so nothing to resume from.
    expect(join.cursor).toBeNull();
    expect(client.status()).toBe('connected');
  });

  it('ingests a delivery and then resumes from the stored cursor', async () => {
    const socket = new FakeSocket();
    const client = makeClient(socket);
    await client.connect();
    socket.emit('open');
    await settle();
    socket.emit('message', deliveryFrame(1, 3));
    await settle();

    const state = await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID);
    expect(state.lastDeliverySequence).toBe(3);

    // A fresh connection resumes rather than re-backfilling from zero -
    // re-asking for everything is how a duplicate gets double-applied.
    const reconnect = new FakeSocket();
    const resumed = makeClient(reconnect);
    await resumed.connect();
    reconnect.emit('open');
    await settle();
    const join = JSON.parse(reconnect.sent[0] ?? '{}') as {
      cursor: { afterSequence: number } | null;
    };
    expect(join.cursor?.afterSequence).toBe(3);
  });

  it('ends the connection when an ingest is refused rather than skipping it', async () => {
    const socket = new FakeSocket();
    const closes: (string | null)[] = [];
    const client = makeClient(socket, (reason) => closes.push(reason));
    await client.connect();
    socket.emit('open');
    await settle();

    // Sequences 3..4 with nothing stored is a GAP: the replica would be
    // missing 1..2 and would not know it.
    socket.emit('message', deliveryFrame(3, 2));
    await settle();

    expect(socket.closed).toBe(true);
    expect(client.status()).toBe('disconnected');
    expect(closes).toEqual(['delivery-gap']);
    // Nothing was written: a diverged stream must not be appended onto.
    const state = await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID);
    expect(state.lastDeliverySequence).toBe(0);
  });

  it('ignores frames that are not deliveries for this campaign', async () => {
    const socket = new FakeSocket();
    const client = makeClient(socket);
    await client.connect();
    socket.emit('open');
    await settle();

    socket.emit('message', 'not json at all');
    socket.emit('message', JSON.stringify({ kind: 'Heartbeat' }));
    socket.emit(
      'message',
      JSON.stringify({
        ...JSON.parse(deliveryFrame(1, 1)),
        campaignId: 'someone-elses-campaign',
      }),
    );
    await settle();

    // None of those are ours; none of them ended the connection either.
    expect(socket.closed).toBe(false);
    const state = await harness.store.readReplicaState(CAMPAIGN_ID, GRANT_ID);
    expect(state.lastDeliverySequence).toBe(0);
  });
});
