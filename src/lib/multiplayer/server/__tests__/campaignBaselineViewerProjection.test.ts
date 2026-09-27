/**
 * The legacy campaign baseline is a per-viewer projection (umbrella 12.1).
 *
 * The 11.1 scope boundary filters EVENTS, and the six-surface inventory
 * found the hole it leaves: `CampaignSyncSession.buildBaselineEvent`
 * serialized `host.buildSnapshotPayload()` - the FULL folded campaign
 * state - to every admitted viewer. A gm-scoped fact was withheld from a
 * player's live stream and then handed to them anyway, folded into the
 * baseline they hydrate from. `projectCampaignStreamForGrant` had already
 * reasoned this through for the grant arm (a stored full-state snapshot
 * REPLACES state wholesale, so a partially-scoped viewer must not receive
 * one); the legacy arm had not.
 *
 * Every row here drives the REAL host and the REAL session. The leak rows
 * were red before `buildBaselineEvent` consumed the shared per-viewer
 * projection contract.
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { ICampaignEventStore } from '@/lib/campaign/sync/ICampaignEventStore';
import type { UnsequencedCampaignEvent } from '@/lib/multiplayer/server/CampaignMatchHostIntent';
import type { ICampaignEvent } from '@/types/campaign/CampaignSync';

import { InMemoryCampaignEventStore } from '@/lib/campaign/sync/InMemoryCampaignEventStore';
import {
  appendCampaignCommandBatch,
  computeCampaignStateDigest,
  JournalCampaignEventStore,
  type ICampaignJournalEnvelope,
} from '@/lib/campaign/sync/JournalCampaignEventStore';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { CampaignMatchHost } from '@/lib/multiplayer/server/CampaignMatchHost';
import {
  CampaignSyncSession,
  RESYNC_SNAPSHOT_GAP,
} from '@/lib/multiplayer/server/CampaignSyncSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { createEmptyCampaignState } from '@/types/campaign/CampaignSync';
import { nowIso } from '@/types/multiplayer/Protocol';

const CAMPAIGN_ID = 'campaign-baseline-projection';
const GM_ID = 'gm-player';
const P1_ID = 'player-one';
const P2_ID = 'player-two';
const OPENING_BALANCE = 500_000;

/** A real host plus session, opened, with a shared genesis ledger. */
async function openSession(
  eventStore: ICampaignEventStore = new InMemoryCampaignEventStore(),
): Promise<{
  host: CampaignMatchHost;
  session: CampaignSyncSession;
  roomCode: string;
}> {
  const host = new CampaignMatchHost({
    campaignId: CAMPAIGN_ID,
    hostPlayerId: GM_ID,
    eventStore,
    initialState: {
      ...createEmptyCampaignState(CAMPAIGN_ID),
      balance: OPENING_BALANCE,
    },
  });
  const session = new CampaignSyncSession(host);
  await session.open();
  return { host, session, roomCode: session.getRoomCode() ?? '' };
}

/** A pilot the GM hires in secret - scope decides who may know. */
function hiddenPilot(
  scope: ICampaignEvent['scope'],
  pilotId: string,
): readonly UnsequencedCampaignEvent[] {
  return [
    {
      type: 'PilotHired',
      campaignId: CAMPAIGN_ID,
      ts: new Date().toISOString(),
      authorPlayerId: GM_ID,
      scope,
      payload: { pilot: { pilotId, name: 'Ghost' }, cost: 1 },
    },
  ];
}

/** A balance move stamped with the scope that decides who may see it. */
function scopedFunds(
  scope: ICampaignEvent['scope'],
  balance: number,
  reason: string,
): readonly UnsequencedCampaignEvent[] {
  return [
    {
      type: 'FundsChanged',
      campaignId: CAMPAIGN_ID,
      ts: new Date().toISOString(),
      authorPlayerId: GM_ID,
      scope,
      payload: { delta: balance - OPENING_BALANCE, reason, balance },
    },
  ];
}

/** The one baseline frame in a hydration stream. */
function baselineOf(
  delivered: readonly ICampaignEvent[],
): ICampaignEvent<'CampaignSnapshotPublished'> {
  const baseline = delivered.find(
    (event) => event.type === 'CampaignSnapshotPublished',
  );
  if (baseline === undefined) {
    throw new Error('hydration carried no baseline frame');
  }
  return baseline as ICampaignEvent<'CampaignSnapshotPublished'>;
}

describe('legacy campaign baseline - scope-withheld EFFECTS', () => {
  it('a gm-scoped hire is absent from the joining player baseline', async () => {
    const { host, session, roomCode } = await openSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));

    const seen: ICampaignEvent[] = [];
    const join = await session.joinGuest(
      roomCode,
      (event) => seen.push(event),
      P1_ID,
    );
    expect(join.ok).toBe(true);

    // The EVENT was already withheld by the 11.1 boundary. This is about
    // its EFFECT: the pilot must not ride the folded baseline either.
    expect(seen.some((event) => event.scope === 'gm')).toBe(false);
    expect(Object.keys(baselineOf(seen).payload.state.pilots)).not.toContain(
      'pilot-gm-only',
    );
  });

  it('a gm-scoped balance move is absent from the joining player baseline', async () => {
    const { host, session, roomCode } = await openSession();
    await host._commitEventsForTests(
      scopedFunds('gm', 499_999, 'gm-hidden-opportunity'),
    );

    const seen: ICampaignEvent[] = [];
    await session.joinGuest(roomCode, (event) => seen.push(event), P1_ID);

    // The player's ledger stops at the last fact they may see - the
    // shared genesis balance - not at the authority's private figure.
    expect(baselineOf(seen).payload.state.balance).toBe(OPENING_BALANCE);
  });

  it('a player-scoped hire reaches its own player and not the other', async () => {
    const { host, session, roomCode } = await openSession();
    await host._commitEventsForTests(
      hiddenPilot(`player:${P1_ID}`, 'pilot-p1-only'),
    );

    const p1Seen: ICampaignEvent[] = [];
    const p2Seen: ICampaignEvent[] = [];
    await session.joinGuest(roomCode, (event) => p1Seen.push(event), P1_ID);
    await session.joinGuest(roomCode, (event) => p2Seen.push(event), P2_ID);

    expect(Object.keys(baselineOf(p1Seen).payload.state.pilots)).toContain(
      'pilot-p1-only',
    );
    // Falsification: admit every player scope in the fold and this reds.
    expect(Object.keys(baselineOf(p2Seen).payload.state.pilots)).not.toContain(
      'pilot-p1-only',
    );
  });

  it('an unproven sink gets only campaign-scoped facts in its baseline', async () => {
    const { host, session, roomCode } = await openSession();
    await host._commitEventsForTests(
      hiddenPilot(`player:${P1_ID}`, 'pilot-p1-only'),
    );
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));

    const seen: ICampaignEvent[] = [];
    // No participantId: the caller could not prove who this is.
    await session.joinGuest(roomCode, (event) => seen.push(event));

    const pilots = Object.keys(baselineOf(seen).payload.state.pilots);
    expect(pilots).toHaveLength(0);
    // Fail-closed does not mean empty: the shared ledger still arrives.
    expect(baselineOf(seen).payload.state.balance).toBe(OPENING_BALANCE);
  });

  it('the large-gap resync baseline is projected for the same viewer', async () => {
    const { host, session, roomCode } = await openSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    // Push the reconnecting player far enough behind to take the
    // snapshot arm rather than the tail arm.
    for (let index = 0; index <= RESYNC_SNAPSHOT_GAP; index += 1) {
      await host._commitEventsForTests(
        scopedFunds('campaign', OPENING_BALANCE + index + 1, `shared-${index}`),
      );
    }
    expect(roomCode).not.toBe('');

    const seen: ICampaignEvent[] = [];
    const resync = await session.resyncGuest(
      0,
      (event) => seen.push(event),
      P1_ID,
    );
    expect(resync.snapshotted).toBe(true);
    // Falsification: fix only joinMember and this row stays red.
    expect(Object.keys(baselineOf(seen).payload.state.pilots)).not.toContain(
      'pilot-gm-only',
    );
  });
});

describe('cold recovery reaches the guarded path', () => {
  it('a rebuilt session projects the baseline despite a full-state seed', async () => {
    // Cold recovery serializes NOTHING itself: CampaignHostRegistry
    // (`register`, CampaignHostRegistry.ts:279-296) builds a fresh host
    // and a fresh CampaignSyncSession over the surviving log, and the
    // reconnecting client's baseline comes from `joinMember` on that
    // session - the path this slice guards. There is no projector to
    // give cold recovery; there is only the pin that it reaches ours.
    //
    // The seed is the trap worth pinning: rehydration passes the FULL
    // persisted state as `initialState` (registry `state: meta.
    // coopCampaign.state`), so the rebuilt host's cached state carries
    // the withheld hire. A baseline read from that cache would leak
    // after a restart even with the live path fixed.
    const store = new InMemoryCampaignEventStore();
    const first = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: GM_ID,
      eventStore: store,
      initialState: {
        ...createEmptyCampaignState(CAMPAIGN_ID),
        balance: OPENING_BALANCE,
      },
    });
    const firstSession = new CampaignSyncSession(first, { matchId: 'match-1' });
    const roomCode = await firstSession.open();
    await first._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));

    // The process restarts. The log survives; the host is rebuilt from
    // the persisted authoritative state, exactly as the registry does.
    const rebuilt = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: GM_ID,
      eventStore: store,
      initialState: first.getState(),
    });
    const rebuiltSession = new CampaignSyncSession(rebuilt, {
      matchId: 'match-1',
    });
    await rebuiltSession.open(roomCode);
    expect(Object.keys(rebuilt.getState().pilots)).toContain('pilot-gm-only');

    const seen: ICampaignEvent[] = [];
    const rejoin = await rebuiltSession.joinGuest(
      roomCode,
      (event) => seen.push(event),
      P1_ID,
    );
    expect(rejoin.ok).toBe(true);
    // Falsification: read the baseline from host.buildSnapshotPayload()
    // and this reds while every live row stays green.
    expect(Object.keys(baselineOf(seen).payload.state.pilots)).not.toContain(
      'pilot-gm-only',
    );
  });
});

describe('legacy campaign baseline - the authority keeps everything', () => {
  it('the GM baseline carries the gm-scoped fact', async () => {
    const { host, session } = await openSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));

    const seen: ICampaignEvent[] = [];
    const join = await session.joinMember((event) => seen.push(event), GM_ID);
    expect(join.ok).toBe(true);

    // Falsification: apply the restricted fold to the GM too and this
    // reds - the scope system holds facts back FROM players, never from
    // the authority.
    expect(Object.keys(baselineOf(seen).payload.state.pilots)).toContain(
      'pilot-gm-only',
    );
  });

  it('the GM baseline state equals the host authoritative state', async () => {
    const { host, session } = await openSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    await host._commitEventsForTests(
      scopedFunds('campaign', 400_000, 'shared-spend'),
    );
    await host._commitEventsForTests(
      hiddenPilot(`player:${P2_ID}`, 'pilot-p2-only'),
    );

    const seen: ICampaignEvent[] = [];
    await session.joinMember((event) => seen.push(event), GM_ID);

    // The parity anchor: projecting the whole log for a viewer entitled
    // to every scope reproduces the host's single source of truth. A
    // reducer drift or a dropped genesis snapshot reds this row.
    expect(baselineOf(seen).payload.state).toEqual(host.getState());
  });

  it('the baseline still names the match and the revision it is a baseline of', async () => {
    const { host, session, roomCode } = await openSession();
    const committed = await host._commitEventsForTests(
      scopedFunds('campaign', 400_000, 'shared-spend'),
    );
    const head = committed[committed.length - 1]?.sequence ?? 0;

    const seen: ICampaignEvent[] = [];
    await session.joinGuest(roomCode, (event) => seen.push(event), P1_ID);

    // The legacy client resumes by this number and the ack gate reads
    // it. Projecting the STATE must not disturb the framing fields; the
    // sequence deferral recorded in campaignWireScopeBoundary stands.
    const baseline = baselineOf(seen);
    expect(baseline.payload.revision).toBe(head);
    expect(baseline.sequence).toBe(-1);
  });
});

/**
 * U94: the small-gap resync tail and the live fan-out apply the baseline
 * law (campaignBaselineReachesViewer) to a stored full-state
 * `CampaignSnapshotPublished`, as the join and large-gap baselines above
 * already do. Real SQLite journal; the checkpoint is appended in the shape
 * the PUT route's `saveCampaignRecordThroughJournal` writes (system author,
 * scope campaign, the whole state, revision = its sequence), either
 * directly to the journal (U58 Lane A's probe: no live host adopts it) or
 * through `adoptSavedCheckpoint`, the live host's adoption of that save
 * (U96), which is the production publisher that reaches live sinks.
 *
 * Every row records the frames each viewer received (U94_FRAMES_OUT).
 */
describe('U94 - the small-gap tail and live fan-out obey the baseline law', () => {
  const PLANTED = 'pilot-leak-check';
  const observed: Record<string, unknown> = {};
  let dir: string;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'u94-tail-'));
    resetSQLiteService();
    getSQLiteService({ path: path.join(dir, 'u94.db') }).initialize();
  });

  afterEach(async () => {
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true });
  });

  afterAll(async () => {
    const out = process.env.U94_FRAMES_OUT;
    if (out) await writeFile(out, JSON.stringify(observed, null, 2));
  });

  function journal(): SQLiteEventJournal<ICampaignJournalEnvelope> {
    return new SQLiteEventJournal(getSQLiteService().getDatabase(), () =>
      nowIso(),
    );
  }

  /** A host and session over the real SQLite journal. */
  async function journalSession(): Promise<
    Awaited<ReturnType<typeof openSession>>
  > {
    return openSession(new JournalCampaignEventStore(journal()));
  }

  /**
   * Appends a record checkpoint the way the PUT route's
   * `saveCampaignRecordThroughJournal` does: a system-authored, campaign
   * scoped, full-state snapshot at the stream's next sequence. Its state is
   * the host's whole state (so it carries anything gm-scoped the host
   * folded) plus a planted gm-only pilot.
   */
  async function appendCheckpoint(
    host: CampaignMatchHost,
  ): Promise<ICampaignEvent<'CampaignSnapshotPublished'>> {
    const sequence = await host.getEventLog().nextSequence();
    const base = host.getState();
    const state = {
      ...base,
      pilots: {
        ...base.pilots,
        [PLANTED]: { pilotId: PLANTED, name: 'Leak Check' },
      },
    };
    const event = {
      sequence,
      campaignId: CAMPAIGN_ID,
      ts: nowIso(),
      authorPlayerId: 'system',
      type: 'CampaignSnapshotPublished',
      scope: 'campaign',
      payload: { state, revision: sequence },
    } as ICampaignEvent<'CampaignSnapshotPublished'>;
    const appended = await appendCampaignCommandBatch(journal(), {
      campaignId: CAMPAIGN_ID,
      commandId: `campaign-checkpoint:${CAMPAIGN_ID}:${sequence}`,
      events: [event],
      expectedPostStateDigest: computeCampaignStateDigest(state),
      principal: {
        actorKind: 'system',
        actorId: 'campaign-record-checkpoint',
        authorityType: 'campaign-source',
        authorityId: CAMPAIGN_ID,
      },
    });
    expect(appended.kind).toBe('committed');
    return event;
  }

  /** What one frame showed the viewer: enough to see a leak. */
  function frameOf(event: ICampaignEvent): Record<string, unknown> {
    return {
      type: event.type,
      sequence: event.sequence,
      scope: event.scope,
      authorPlayerId: event.authorPlayerId,
      ...(event.type === 'CampaignSnapshotPublished'
        ? {
            pilots: Object.keys(
              (event as ICampaignEvent<'CampaignSnapshotPublished'>).payload
                .state.pilots,
            ),
          }
        : {}),
      ...(event.type === 'FundsChanged'
        ? {
            balance: (event as ICampaignEvent<'FundsChanged'>).payload.balance,
          }
        : {}),
    };
  }

  function record(
    row: string,
    viewer: string,
    frames: readonly ICampaignEvent[],
  ): void {
    const entry = (observed[row] ?? {}) as Record<string, unknown>;
    entry[viewer] = frames.map(frameOf);
    observed[row] = entry;
  }

  /** Stored full-state snapshots in a frame list (not the -1 baseline). */
  function checkpointsIn(
    frames: readonly ICampaignEvent[],
  ): ICampaignEvent<'CampaignSnapshotPublished'>[] {
    return frames.filter(
      (event) =>
        event.type === 'CampaignSnapshotPublished' && event.sequence >= 0,
    ) as ICampaignEvent<'CampaignSnapshotPublished'>[];
  }

  function pilotsSeen(frames: readonly ICampaignEvent[]): string[] {
    return frames.flatMap((event) =>
      event.type === 'CampaignSnapshotPublished'
        ? Object.keys(
            (event as ICampaignEvent<'CampaignSnapshotPublished'>).payload.state
              .pilots,
          )
        : [],
    );
  }

  it('(R1) a restricted player resyncing a small gap does not receive a checkpoint committed after a gm-scoped fact', async () => {
    const { host, session } = await journalSession();
    const live: ICampaignEvent[] = [];
    const join = await session.joinMember((event) => live.push(event), P1_ID);
    expect(join.ok).toBe(true);
    const joinRevision = baselineOf(live).payload.revision ?? 0;

    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    const checkpoint = await appendCheckpoint(host);
    const after = await host._commitEventsForTests(
      scopedFunds('campaign', 450_000, 'shared-after-checkpoint'),
    );
    join.disconnect();

    const tail: ICampaignEvent[] = [];
    const resync = await session.resyncGuest(
      joinRevision,
      (event) => tail.push(event),
      P1_ID,
    );
    record('R1', 'player-one live', live);
    record('R1', 'player-one resync tail', tail);

    expect(resync.snapshotted).toBe(false);
    // U58 Lane A: the journal write never enters publish(), so the live
    // sink saw no checkpoint; the tail is where it leaked.
    expect(checkpointsIn(live)).toHaveLength(0);
    expect(checkpointsIn(tail)).toHaveLength(0);
    expect(pilotsSeen(tail)).not.toContain(PLANTED);
    expect(pilotsSeen(tail)).not.toContain('pilot-gm-only');
    // The events after it that their scope admits still arrive.
    expect(tail.map((event) => event.sequence)).toEqual([after[0]?.sequence]);
    expect(checkpoint.sequence).toBeLessThan(after[0]?.sequence ?? -1);
  });

  it('(R1b) the latch comes from the log before lastSeq when the tail starts after the withheld fact', async () => {
    const { host, session } = await journalSession();
    const hire = await host._commitEventsForTests(
      hiddenPilot('gm', 'pilot-gm-only'),
    );
    await appendCheckpoint(host);
    await host._commitEventsForTests(
      scopedFunds('campaign', 450_000, 'shared-after-checkpoint'),
    );

    const tail: ICampaignEvent[] = [];
    await session.resyncGuest(
      hire[0]?.sequence ?? 0,
      (event) => tail.push(event),
      P1_ID,
    );
    record('R1b', 'player-one resync tail', tail);

    expect(checkpointsIn(tail)).toHaveLength(0);
    expect(tail.map((event) => event.type)).toEqual(['FundsChanged']);
  });

  it('(R2) the GM resyncing the same small gap receives the checkpoint', async () => {
    const { host, session } = await journalSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    const checkpoint = await appendCheckpoint(host);

    const tail: ICampaignEvent[] = [];
    const resync = await session.resyncGuest(
      0,
      (event) => tail.push(event),
      GM_ID,
    );
    record('R2', 'gm resync tail', tail);

    expect(resync.snapshotted).toBe(false);
    expect(checkpointsIn(tail).map((event) => event.sequence)).toEqual([
      checkpoint.sequence,
    ]);
    expect(pilotsSeen(tail)).toEqual(
      expect.arrayContaining([PLANTED, 'pilot-gm-only']),
    );
  });

  it('(R4) a restricted player with nothing withheld before the checkpoint receives it through the tail', async () => {
    const { host, session } = await journalSession();
    await host._commitEventsForTests(
      scopedFunds('campaign', 450_000, 'shared-before-checkpoint'),
    );
    const checkpoint = await appendCheckpoint(host);

    const tail: ICampaignEvent[] = [];
    await session.resyncGuest(0, (event) => tail.push(event), P1_ID);
    record('R4', 'player-one resync tail', tail);

    expect(checkpointsIn(tail).map((event) => event.sequence)).toEqual([
      checkpoint.sequence,
    ]);
  });

  it('(R5) a session rebuilt over the surviving journal withholds the same checkpoint', async () => {
    const { host, session, roomCode } = await journalSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    await appendCheckpoint(host);
    session.hostDisconnected();

    const rebuilt = new CampaignMatchHost({
      campaignId: CAMPAIGN_ID,
      hostPlayerId: GM_ID,
      eventStore: new JournalCampaignEventStore(journal()),
      initialState: host.getState(),
    });
    const rebuiltSession = new CampaignSyncSession(rebuilt);
    await rebuiltSession.open(roomCode);

    const tail: ICampaignEvent[] = [];
    const resync = await rebuiltSession.resyncGuest(
      0,
      (event) => tail.push(event),
      P1_ID,
    );
    record('R5', 'player-one resync tail (rebuilt session)', tail);

    expect(resync.ok).toBe(true);
    expect(checkpointsIn(tail)).toHaveLength(0);
  });

  it('(R3) the live host adopting the save does not fan the checkpoint out to a joined restricted player after a withheld fact; the GM receives it', async () => {
    const { host, session } = await journalSession();
    const player: ICampaignEvent[] = [];
    const gm: ICampaignEvent[] = [];
    await session.joinMember((event) => player.push(event), P1_ID);
    await session.joinMember((event) => gm.push(event), GM_ID);

    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));
    const checkpoint = await host.adoptSavedCheckpoint(() =>
      appendCheckpoint(host),
    );
    await host._commitEventsForTests(
      scopedFunds('campaign', 450_000, 'shared-after-checkpoint'),
    );
    record('R3', 'player-one live', player);
    record('R3', 'gm live', gm);

    expect(checkpointsIn(player)).toHaveLength(0);
    expect(pilotsSeen(player)).not.toContain(PLANTED);
    expect(player.at(-1)?.type).toBe('FundsChanged');
    expect(checkpointsIn(gm).map((event) => event.sequence)).toEqual([
      checkpoint.sequence,
    ]);
  });

  it('(R3b) a sink attached after the withheld fact takes its latch from the log at attach', async () => {
    const { host, session } = await journalSession();
    await host._commitEventsForTests(hiddenPilot('gm', 'pilot-gm-only'));

    const player: ICampaignEvent[] = [];
    const detach = session.attachLiveParticipant(
      (event) => player.push(event),
      P1_ID,
    );
    await host.adoptSavedCheckpoint(() => appendCheckpoint(host));
    await host._commitEventsForTests(
      scopedFunds('campaign', 450_000, 'shared-after-checkpoint'),
    );
    detach();
    record('R3b', 'player-one live (attached after the hire)', player);

    expect(checkpointsIn(player)).toHaveLength(0);
    expect(player.map((event) => event.type)).toEqual(['FundsChanged']);
  });

  it('(R3c) a live restricted sink with nothing withheld before the checkpoint receives it', async () => {
    const { host, session } = await journalSession();
    const player: ICampaignEvent[] = [];
    const detach = session.attachLiveParticipant(
      (event) => player.push(event),
      P1_ID,
    );
    const checkpoint = await host.adoptSavedCheckpoint(() =>
      appendCheckpoint(host),
    );
    detach();
    record('R3c', 'player-one live', player);

    expect(checkpointsIn(player).map((event) => event.sequence)).toEqual([
      checkpoint.sequence,
    ]);
  });
});
