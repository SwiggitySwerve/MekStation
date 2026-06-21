/**
 * Tests for `CampaignSyncSession` — campaign sync session lifecycle
 * (CO1, task 5.5).
 *
 * Covers: host open issues a room code; join receives a snapshot + the
 * full log; resync streams only the missing tail; large-gap resync
 * receives a fresh snapshot; host disconnect pauses the session.
 *
 * @spec openspec/changes/add-shared-campaign-state/specs/coop-campaign-sync/spec.md
 */

import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  CampaignSyncSession,
  RESYNC_SNAPSHOT_GAP,
} from '@/lib/multiplayer/server/CampaignSyncSession';
import { isValidRoomCode } from '@/lib/p2p/roomCodes';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';

const CAMPAIGN_ID = 'campaign-session';
const HOST_ID = 'host-player';

function newSession(balance = 600_000): {
  host: CampaignMatchHost;
  session: CampaignSyncSession;
} {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: HOST_ID,
    eventStore: new InMemoryCampaignEventStore(),
    initialState: { ...createEmptyCampaignState(CAMPAIGN_ID), balance },
  });
  return { host, session: new CampaignSyncSession(host) };
}

describe('CampaignSyncSession — host opens a shared campaign', () => {
  it('issues a valid 6-char room code excluding I/O/0/1', async () => {
    const { session } = newSession();
    const code = await session.open();
    expect(isValidRoomCode(code)).toBe(true);
    expect(code).toHaveLength(6);
    expect(code).not.toMatch(/[IO01]/);
  });

  it('adopts a server-issued room code for invite-backed co-op sessions', async () => {
    const { session } = newSession();
    const code = await session.open('abc-234');
    expect(code).toBe('ABC234');
    expect(session.getRoomCode()).toBe('ABC234');
  });

  it('open is idempotent — the same code is returned', async () => {
    const { session } = newSession();
    const first = await session.open();
    const second = await session.open();
    expect(first).toBe(second);
  });
});

describe('CampaignSyncSession — guest join', () => {
  it('delivers a CampaignSnapshotPublished baseline then the log', async () => {
    const { host, session } = newSession();
    const code = await session.open();
    // Commit a couple of log events before the guest joins.
    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'i1',
      payload: {},
    });

    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest(code, (e) => received.push(e));

    expect(result.ok).toBe(true);
    // The FIRST delivered event is a baseline snapshot.
    expect(result.delivered[0].type).toBe('CampaignSnapshotPublished');
    // The log (snapshot@0, day-advance@1) follows.
    const logTypes = result.delivered.slice(1).map((e) => e.type);
    expect(logTypes).toEqual([
      'CampaignSnapshotPublished',
      'CampaignDayAdvanced',
    ]);
    result.disconnect();
  });

  it('delivers live events committed after the join', async () => {
    const { host, session } = newSession();
    const code = await session.open();
    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest(code, (e) => received.push(e));
    received.length = 0;

    await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'live-1',
      payload: {},
    });
    expect(received.map((e) => e.type)).toEqual(['CampaignDayAdvanced']);
    result.disconnect();
  });

  it('rejects a join with a wrong room code', async () => {
    const { session } = newSession();
    await session.open();
    const received: ICampaignEvent[] = [];
    const result = await session.joinGuest('WRONGX', (e) => received.push(e));
    expect(result.ok).toBe(false);
    expect(received).toHaveLength(0);
  });
});

describe('CampaignSyncSession — guest resync', () => {
  it('streams only the missing tail after a brief disconnect', async () => {
    const { host, session } = newSession();
    await session.open();
    // Commit 4 day-advance events (sequences 1..4, snapshot is 0).
    for (let i = 0; i < 4; i++) {
      await host.handleIntent({
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: `seq-${i}`,
        payload: {},
      });
    }
    // The guest disconnected after sequence 2; reconnect from 2.
    const received: ICampaignEvent[] = [];
    const result = await session.resyncGuest(2, (e) => received.push(e));

    expect(result.ok).toBe(true);
    expect(result.snapshotted).toBe(false);
    // Only sequences 3 and 4 stream.
    expect(result.delivered.map((e) => e.sequence)).toEqual([3, 4]);
    result.disconnect();
  });

  it('a large-gap resync receives a fresh snapshot', async () => {
    const { host, session } = newSession();
    await session.open();
    // Commit enough events that a guest stuck at sequence 0 is past
    // the snapshot gap threshold.
    for (let i = 0; i < RESYNC_SNAPSHOT_GAP + 5; i++) {
      await host.handleIntent({
        kind: 'AdvanceDay',
        campaignId: CAMPAIGN_ID,
        intentId: `big-${i}`,
        payload: {},
      });
    }
    const received: ICampaignEvent[] = [];
    const result = await session.resyncGuest(0, (e) => received.push(e));

    expect(result.ok).toBe(true);
    expect(result.snapshotted).toBe(true);
    expect(result.delivered[0].type).toBe('CampaignSnapshotPublished');
    result.disconnect();
  });
});

describe('CampaignSyncSession — host disconnect', () => {
  it('pauses the session and closes the host', async () => {
    const { host, session } = newSession();
    await session.open();
    expect(session.isPaused()).toBe(false);

    session.hostDisconnected();

    expect(session.isPaused()).toBe(true);
    expect(host.isClosed()).toBe(true);
    expect(session.getRoomCode()).toBeNull();

    // An intent after disconnect is rejected — the session is frozen.
    const result = await host.handleIntent({
      kind: 'AdvanceDay',
      campaignId: CAMPAIGN_ID,
      intentId: 'after-disconnect',
      payload: {},
    });
    expect(result.ok).toBe(false);
  });
});
