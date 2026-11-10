/**
 * Sender-only rejection history across real-host SQLite viewer surfaces.
 * GM membership is test-minted: this verifies projection, not campaign seating.
 * @spec openspec/changes/fix-mp-refusals-sender-only/specs/audit-timeline/spec.md
 */
import type Database from 'better-sqlite3';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { SQLiteEventJournal } from '@/lib/events/journal/SQLiteEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
import { connect, type IClientWebSocket } from '@/lib/multiplayer/client';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  Facing,
  GameSide,
  LockState,
  MovementType,
  type IGameUnit,
} from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';
import {
  type IIntent,
  type IServerMessage,
  RECONNECT_INITIAL_MS,
  nowIso,
} from '@/types/multiplayer/Protocol';

import type {
  IMembershipRecord,
  IMembershipSource,
} from '../../authorization/AuthorizedViewer';

import { leakScan } from '../../__tests__/campaignGrantChannel.test-helpers';
import { AuthorizedViewerResolver } from '../../authorization/AuthorizedViewer';
import { SQLiteDeliveryEpochStore } from '../../delivery/SQLiteDeliveryEpochStore';
import { DurableMatchStore } from '../../DurableMatchStore';
import { ViewerAudienceProjectorRegistry } from '../../projection/ViewerAudienceProjector';
import { ViewerProjectionService } from '../../projection/ViewerProjectionService';
import { ServerMatchHost } from '../../ServerMatchHost';
import { ViewerHistoryService } from '../ViewerHistoryService';
import { VIEWER_PLAYER_TIMELINE_KEYS } from '../ViewerHistoryTypes';

/**
 * The host's `campaignSessionId` IS its matchId (MatchSeatMembership-
 * Source), and the audit row is written with the viewer's session, so
 * the membership fixtures below must name the same id or the timeline
 * gate would refuse the very rows under test.
 */
const SESSION_ID = 'match-rejection-surfaces';
const STREAM_TYPE = 'rejection-surfaces';
const OWNER = 'pA';
const RECORDED_AT = '2026-09-02T00:00:00.000Z';
const PRIVATE_PAYLOAD_MARKER = 'GM-PRIVATE-REJECTION-DETAIL';

const PLAYER_A_ROW: IMembershipRecord = {
  principalId: OWNER,
  principalKind: 'human',
  campaignId: 'campaign-rejection-surfaces',
  campaignSessionId: SESSION_ID,
  matchId: SESSION_ID,
  participantId: 'alpha-1',
  role: 'player',
  ownedForceIds: ['force-a'],
  membershipRevision: 7,
  active: true,
};

const PLAYER_B_ROW: IMembershipRecord = {
  ...PLAYER_A_ROW,
  principalId: 'pB',
  participantId: 'bravo-1',
  ownedForceIds: ['force-b'],
};

const GM_ROW: IMembershipRecord = {
  ...PLAYER_A_ROW,
  principalId: 'gm-1',
  participantId: 'participant-gm',
  role: 'gm',
  ownedForceIds: ['force-gm'],
};

/** Test membership source; see the GM NON-CLAIM in the header. */
class FixtureMembershipSource implements IMembershipSource {
  private readonly rows = new Map<string, IMembershipRecord>();

  /** Records a membership row under its principal/session pair. */
  public set(row: IMembershipRecord): void {
    this.rows.set(
      JSON.stringify([row.principalId, row.campaignSessionId]),
      row,
    );
  }

  /** Returns the row for the principal/session pair, or null. */
  public async lookupMembership(
    principalId: string,
    campaignSessionId: string,
  ): Promise<IMembershipRecord | null> {
    return (
      this.rows.get(JSON.stringify([principalId, campaignSessionId])) ?? null
    );
  }

  /** Session epoch; constant because no test here revokes membership. */
  public async currentMembershipRevision(): Promise<number> {
    return PLAYER_A_ROW.membershipRevision;
  }
}

/** One deployable mech, shaped the way the engine adapter expects. */
function adapted(
  id: string,
  side: GameSide,
  position: { q: number; r: number },
): IAdaptedUnit {
  return {
    id,
    side,
    position,
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  } as unknown as IAdaptedUnit;
}

/** Roster entry matching an adapted unit. */
function gameUnit(id: string, side: GameSide): IGameUnit {
  return {
    id,
    name: id,
    side,
    unitRef: id,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  };
}

/**
 * Replaces each replay frame's own transmission clock with a constant.
 *
 * The envelope `ts` is stamped as the frame LEAVES the host, so it
 * differs between any two `sendReplay` calls whether or not anything
 * changed - comparing it would make the retry proof fail for a reason
 * that has nothing to do with the retry. Every match fact is left
 * alone and still compared: event ids, payloads, the events' own
 * `timestamp`, `deliverySequences`, and `totalEvents`.
 */
function withoutSendClock(frames: readonly unknown[]): readonly unknown[] {
  return frames.map((frame) => {
    if (typeof frame !== 'object' || frame === null) return frame;
    return { ...(frame as Record<string, unknown>), ts: 'SEND-CLOCK' };
  });
}

/** A socket that keeps every frame the host sent it. */
function makeSocket() {
  const sent: unknown[] = [];
  return {
    send(data: string) {
      sent.push(JSON.parse(data));
    },
    close() {},
    readyState: 1,
    sent,
  };
}

/** An envelope the host refuses AFTER the authorization gate admits it. */
function refusedIntent(intentId: string): IIntent {
  return {
    kind: 'Intent',
    matchId: SESSION_ID,
    ts: nowIso(),
    playerId: OWNER,
    intentId,
    intent: {
      kind: 'Move',
      unitId: 'unit-A',
      to: { q: 0, r: 1 },
      facing: 0,
      movementType: 'walk',
      rolls: [6, 6],
    },
  } as unknown as IIntent;
}

/** Counts every row of every user table in the file. */
function census(db: Database.Database): ReadonlyMap<string, number> {
  const tables = db
    .prepare(
      `SELECT name FROM sqlite_master
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    )
    .all() as readonly { readonly name: string }[];
  const counts = new Map<string, number>();
  for (const { name } of tables) {
    const row = db.prepare(`SELECT COUNT(*) AS n FROM "${name}"`).get() as {
      readonly n: number;
    };
    counts.set(name, row.n);
  }
  return counts;
}

/** Table names whose count differs between two censuses, with deltas. */
function movedTables(
  before: ReadonlyMap<string, number>,
  after: ReadonlyMap<string, number>,
): Record<string, number> {
  const moved: Record<string, number> = {};
  after.forEach((count, name) => {
    const previous = before.get(name) ?? 0;
    if (count !== previous) moved[name] = count - previous;
  });
  return moved;
}

describe('live-path rejection across viewer surfaces', () => {
  let dir: string;
  let dbPath: string;
  let store: DurableMatchStore;
  let db: Database.Database;
  let host: ServerMatchHost;
  let history: ViewerHistoryService;
  let journal: SQLiteEventJournal;
  let socket: ReturnType<typeof makeSocket>;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mek-reject-surfaces-'));
    dbPath = path.join(dir, 'surfaces.db');
    resetSQLiteService();
    getSQLiteService({ path: dbPath }).initialize();
    db = getSQLiteService().getDatabase();
    store = new DurableMatchStore({ path: dbPath });

    const now = RECORDED_AT;
    await store.createMatch({
      matchId: SESSION_ID,
      hostPlayerId: OWNER,
      playerIds: [OWNER, 'pB'],
      sideAssignments: [
        { playerId: OWNER, side: 'player' },
        { playerId: 'pB', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 6, turnLimit: 5 },
      layout: '1v1',
      seats: defaultSeats('1v1').map((seat) => {
        if (seat.slotId === 'alpha-1')
          return { ...seat, occupant: { playerId: OWNER, displayName: 'A' } };
        if (seat.slotId === 'bravo-1')
          return { ...seat, occupant: { playerId: 'pB', displayName: 'B' } };
        return seat;
      }),
      roomCode: 'SURF01',
    } as Parameters<DurableMatchStore['createMatch']>[0]);

    host = ServerMatchHost.create(SESSION_ID, store, {
      mapRadius: 6,
      turnLimit: 5,
      random: new SeededRandom(13),
      grid: createMinimalGrid(6),
      playerUnits: [adapted('unit-A', GameSide.Player, { q: 0, r: 0 })],
      opponentUnits: [adapted('unit-foe', GameSide.Opponent, { q: 0, r: 3 })],
      gameUnits: [
        gameUnit('unit-A', GameSide.Player),
        gameUnit('unit-foe', GameSide.Opponent),
      ],
      diceSeed: 13,
    });
    await Promise.resolve();
    await Promise.resolve();
    socket = makeSocket();
    expect(await host.admitSocket(socket, OWNER, 'conn-a')).not.toBeNull();

    const source = new FixtureMembershipSource();
    source.set(PLAYER_A_ROW);
    source.set(PLAYER_B_ROW);
    source.set(GM_ROW);
    const registry = new ViewerAudienceProjectorRegistry();
    registry.register({
      projectorVersion: 1,
      streamType: STREAM_TYPE,
      decisions: [
        {
          eventType: 'committed-control',
          decision: {
            kind: 'public',
            project(payload) {
              if (typeof payload !== 'string')
                throw new Error('expected committed event id');
              return payload;
            },
          },
        },
      ],
    });
    journal = new SQLiteEventJournal(db, () => RECORDED_AT);
    history = new ViewerHistoryService({
      resolver: new AuthorizedViewerResolver(source),
      projection: new ViewerProjectionService({
        journal,
        registry,
      }),
      epochStore: new SQLiteDeliveryEpochStore(db, () => RECORDED_AT),
      auditRepo: new SQLiteActionAuditRepository(db),
      privateRepo: new SQLitePrivateRecordRepository(db),
    });
  });

  afterEach(() => {
    store.close();
    resetSQLiteService();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  /** Reads one viewer's timeline for the session under test. */
  function timelineFor(principalId: string) {
    return history.readTimeline(principalId, SESSION_ID, {
      campaignSessionId: SESSION_ID,
    });
  }

  it("keeps another player's later reconnect baseline and full export free of the refusal", async () => {
    const before = makeSocket();
    await host.handleSessionJoin(before, PLAYER_B_ROW.principalId);
    expect(before.sent).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'ReplayStart' }),
        expect.objectContaining({ kind: 'ReplayChunk' }),
        expect.objectContaining({ kind: 'ReplayEnd' }),
        expect.objectContaining({ kind: 'LobbyUpdated' }),
      ]),
    );
    const beforeExport = await history.exportForViewer(
      PLAYER_B_ROW.principalId,
      SESSION_ID,
      {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
      },
    );
    await host.handleIntent(
      refusedIntent('cmd-later-baseline'),
      'conn-a',
      OWNER,
    );
    const later = makeSocket();
    await host.handleSessionJoin(later, PLAYER_B_ROW.principalId);
    expect(withoutSendClock(later.sent)).toEqual(withoutSendClock(before.sent));
    expect(JSON.stringify(later.sent)).not.toContain('cmd-later-baseline');
    expect(JSON.stringify(later.sent)).not.toContain('command-rejected');
    const laterExport = await history.exportForViewer(
      PLAYER_B_ROW.principalId,
      SESSION_ID,
      {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
      },
    );
    expect(laterExport).toEqual(beforeExport);
    expect(JSON.stringify(laterExport)).not.toContain('cmd-later-baseline');
    expect(JSON.stringify(laterExport)).not.toContain('command-rejected');
    const durable = new SQLiteActionAuditRepository(db).readBySession(
      SESSION_ID,
    );
    expect(durable).toEqual([
      expect.objectContaining({
        commandId: 'cmd-later-baseline',
        lifecycleState: 'rejected',
      }),
    ]);
    expect(
      (
        await history.exportForViewer(OWNER, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
        })
      ).timeline,
    ).toEqual([expect.objectContaining({ commandId: 'cmd-later-baseline' })]);
  });

  it('preserves committed events and accepted timeline rows for every viewer after a refusal', async () => {
    const accepted = await host.handleIntent(
      {
        kind: 'Intent',
        matchId: SESSION_ID,
        ts: nowIso(),
        playerId: OWNER,
        intentId: 'cmd-public-accepted',
        intent: { kind: 'AdvancePhase' },
      },
      'conn-a',
      OWNER,
    );
    expect(accepted).toEqual(
      expect.arrayContaining([expect.objectContaining({ kind: 'Event' })]),
    );
    const committed = await store.getEvents(SESSION_ID, 0);
    expect(committed.length).toBeGreaterThan(0);
    const controlEvent = committed[0];
    if (!controlEvent) throw new Error('missing committed control');
    // This fixture's history projector publishes the real host event identity as a public control.
    const append = await journal.append({
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      expectedBranchId: 'root',
      expectedRevision: 0,
      commandId: 'cmd-public-history',
      principal: {
        actorKind: 'system',
        actorId: 'history-test',
        authorityType: 'match',
        authorityId: SESSION_ID,
      },
      events: [
        {
          eventId: 'committed-history-control',
          eventType: 'committed-control',
          eventVersion: 1,
          correlationId: 'cmd-public-accepted',
          causationEventIds: [],
          occurredAt: RECORDED_AT,
          payload: controlEvent.id,
          entityRefs: [],
        },
      ],
    });
    expect(append.kind).toBe('committed');
    // The legacy host has no accepted-audit writer; seed provenance for the real committed prefix.
    new SQLiteActionAuditRepository(db).recordLifecycle({
      campaignSessionId: SESSION_ID,
      matchId: SESSION_ID,
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      commandId: 'cmd-public-accepted',
      commandDigest: 'c'.repeat(64),
      actor: {
        principalId: OWNER,
        participantId: PLAYER_A_ROW.participantId,
        role: 'player',
      },
      correlationId: 'cmd-public-accepted',
      createdAt: RECORDED_AT,
      lifecycleState: 'accepted',
      safeReasonCode: null,
      committedFirstRevision: 1,
      committedLastRevision: committed.length,
      committedEventCount: committed.length,
    });
    const viewers = [OWNER, PLAYER_B_ROW.principalId, GM_ROW.principalId];
    const before = await Promise.all(
      viewers.map(async (principal) => ({
        timeline: await timelineFor(principal),
        exported: await history.exportForViewer(principal, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
        }),
      })),
    );
    const replayBefore = await Promise.all(
      [OWNER, PLAYER_B_ROW.principalId].map(async (principal) => {
        const replay = makeSocket();
        await host.sendReplay(replay, 0, principal);
        return withoutSendClock(replay.sent);
      }),
    );
    await host.handleIntent(refusedIntent('cmd-after-commit'), 'conn-a', OWNER);
    expect(await store.getEvents(SESSION_ID, 0)).toEqual(committed);
    for (const [index, principal] of viewers.entries()) {
      const timeline = await timelineFor(principal);
      const exported = await history.exportForViewer(principal, SESSION_ID, {
        streamType: STREAM_TYPE,
        streamId: SESSION_ID,
      });
      expect(
        timeline.filter((row) => row.lifecycleState === 'accepted'),
      ).toEqual(before[index]?.timeline);
      expect(exported.stream).toEqual(before[index]?.exported.stream);
      expect(exported.stream.facts).toEqual([
        {
          factType: 'committed-control',
          sequenceHint: 1,
          payload: controlEvent.id,
        },
      ]);
      expect(
        exported.timeline.filter((row) => row.lifecycleState === 'accepted'),
      ).toEqual(before[index]?.exported.timeline);
      expect(
        timeline.find((row) => row.commandId === 'cmd-public-accepted'),
      ).toBeDefined();
      if (principal !== OWNER)
        expect(exported).toEqual(before[index]?.exported);
    }
    for (const [index, principal] of [
      OWNER,
      PLAYER_B_ROW.principalId,
    ].entries()) {
      const replay = makeSocket();
      await host.sendReplay(replay, 0, principal);
      expect(withoutSendClock(replay.sent)).toEqual(replayBefore[index]);
    }
  });

  it('retries an already audited rejection on the replacement key and settles the sender', async () => {
    jest.useFakeTimers();
    const bridges: {
      client: IClientWebSocket;
      server: ReturnType<typeof makeSocket>;
      intents: IIntent[];
    }[] = [];
    const client = connect(
      'ws://test/refusal',
      SESSION_ID,
      { playerId: OWNER, token: 'test' },
      {
        socketFactory: () => {
          const intents: IIntent[] = [];
          const transport: IClientWebSocket = {
            readyState: 1,
            onopen: null,
            onmessage: null,
            onerror: null,
            onclose: null,
            send(raw) {
              const frame = JSON.parse(raw) as IIntent;
              if (frame.kind === 'Intent') intents.push(frame);
            },
            close() {
              transport.readyState = 3;
              transport.onclose?.({});
            },
          };
          const server = makeSocket();
          const send = server.send.bind(server);
          server.send = (raw: string) => {
            send(raw);
            transport.onmessage?.({ data: raw });
          };
          bridges.push({ client: transport, server, intents });
          return transport;
        },
      },
    );
    const errors: unknown[] = [];
    client.on('error', (error) => errors.push(error));
    const other = makeSocket();
    const spectator = makeSocket();
    try {
      const meta = await store.getMatchMeta(SESSION_ID);
      await store.updateMatchMeta(SESSION_ID, {
        seats: [
          ...(meta.seats ?? []),
          {
            slotId: 'spectator-1',
            side: 'spectator',
            seatNumber: 1,
            kind: 'spectator',
            ready: false,
            occupant: { playerId: 'watch', displayName: 'Watcher' },
          },
        ],
      });
      expect(
        await host.admitSocket(other, PLAYER_B_ROW.principalId, 'other-key'),
      ).not.toBeNull();
      expect(
        await host.admitSocket(spectator, 'watch', 'watch-key'),
      ).not.toBeNull();
      const first = bridges[0];
      if (!first) throw new Error('missing original client socket');
      expect(
        await host.admitSocket(first.server, OWNER, 'dead-key'),
      ).not.toBeNull();
      first.client.onopen?.({});
      await host.handleSessionJoin(first.server, OWNER);
      expect(client.isReady()).toBe(true);
      first.server.sent.length = 0;
      client.send({
        kind: 'Move',
        unitId: 'missing-private-unit',
        to: { q: 0, r: 1 },
        facing: 0,
        movementType: 'walk',
      });
      const original = first.intents[0];
      if (!original) throw new Error('missing submitted intent');
      expect(client.lifecycle().pendingIntentCount).toBe(1);
      // Queue the real host command, then release its key before its refusal can be delivered.
      const firstAttempt = host.handleIntent(original, 'dead-key', OWNER);
      first.client.close();
      host.releaseConnection('dead-key');
      host.detachSocket(first.server);
      jest.advanceTimersByTime(RECONNECT_INITIAL_MS * 2);
      const replacement = bridges[1];
      if (!replacement) throw new Error('client did not reconnect');
      expect(
        await host.admitSocket(replacement.server, OWNER, 'new-key'),
      ).not.toBeNull();
      replacement.client.onopen?.({});
      const firstReply = await firstAttempt;
      expect(firstReply).toEqual([
        expect.objectContaining({
          kind: 'Error',
          code: 'INVALID_INTENT',
          intentId: original.intentId,
          reason: 'Intent could not be applied.',
        }),
      ]);
      const audit = new SQLiteActionAuditRepository(db);
      const rejected = audit.readBySession(SESSION_ID);
      expect(rejected).toEqual([
        expect.objectContaining({
          commandId: original.intentId,
          lifecycleState: 'rejected',
        }),
      ]);
      for (const observer of [
        socket,
        first.server,
        replacement.server,
        other,
        spectator,
      ])
        expect(observer.sent).toEqual([]);
      expect(errors).toEqual([]);
      expect(client.lifecycle().pendingIntentCount).toBe(1);
      await host.handleSessionJoin(replacement.server, OWNER);
      expect(replacement.server.sent).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ kind: 'ReplayEnd' }),
        ]),
      );
      // ReplayEnd must retry the same already-audited identity, never mint a new one.
      expect(replacement.intents).toEqual([original]);
      const retry = replacement.intents[0];
      if (!retry)
        throw new Error('ReplayEnd did not resend the pending intent');
      const retryReply = await host.handleIntent(retry, 'new-key', OWNER);
      expect(retryReply).toEqual(
        firstReply.map((frame) =>
          expect.objectContaining({
            kind: frame.kind,
            ...(frame.kind === 'Error'
              ? {
                  code: frame.code,
                  reason: frame.reason,
                  intentId: frame.intentId,
                }
              : {}),
          }),
        ),
      );
      expect(
        (replacement.server.sent as IServerMessage[]).filter(
          (frame) => frame.kind === 'Error',
        ),
      ).toEqual(retryReply);
      expect(audit.readBySession(SESSION_ID)).toEqual(rejected);
      expect(client.lifecycle().pendingIntentCount).toBe(0);
      expect(client.isReady()).toBe(true);
      expect(errors).toEqual([
        expect.objectContaining({
          code: 'INVALID_INTENT',
          reason: 'Intent could not be applied.',
        }),
      ]);
      for (const observer of [socket, first.server, other, spectator])
        expect(observer.sent).toEqual([]);
    } finally {
      client.close();
      jest.useRealTimers();
    }
  });

  it('shows the live rejected row only to its sender, including the GM rule', async () => {
    await host.handleIntent(refusedIntent('cmd-live-reject'), 'conn-a', OWNER);
    const actor = await timelineFor(OWNER);
    expect(actor).toEqual([
      expect.objectContaining({
        commandId: 'cmd-live-reject',
        lifecycleState: 'rejected',
        safeReasonCode: 'command-rejected',
        actorPrincipalId: OWNER,
      }),
    ]);
    expect(Object.keys(actor[0] ?? {})).toEqual([
      ...VIEWER_PLAYER_TIMELINE_KEYS,
    ]);
    expect(await timelineFor(PLAYER_B_ROW.principalId)).toEqual([]);
    expect(await timelineFor(GM_ROW.principalId)).toEqual([]);
  });

  it('allows the GM to read their own rejected row in both surfaces', async () => {
    new SQLiteActionAuditRepository(db).recordLifecycle({
      campaignSessionId: SESSION_ID,
      matchId: SESSION_ID,
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      commandId: 'cmd-gm-own-reject',
      commandDigest: 'a'.repeat(64),
      actor: {
        principalId: GM_ROW.principalId,
        participantId: GM_ROW.participantId,
        role: 'gm',
      },
      correlationId: 'cmd-gm-own-reject',
      createdAt: RECORDED_AT,
      lifecycleState: 'rejected',
      safeReasonCode: 'command-rejected',
      committedFirstRevision: null,
      committedLastRevision: null,
      committedEventCount: null,
    });
    const own = await timelineFor(GM_ROW.principalId);
    expect(own).toEqual([
      expect.objectContaining({
        commandId: 'cmd-gm-own-reject',
        actorPrincipalId: GM_ROW.principalId,
      }),
    ]);
    expect(
      (
        await history.exportForViewer(GM_ROW.principalId, SESSION_ID, {
          streamType: STREAM_TYPE,
          streamId: SESSION_ID,
        })
      ).timeline,
    ).toEqual(own);
    for (const principal of [OWNER, PLAYER_B_ROW.principalId]) {
      expect(await timelineFor(principal)).toEqual([]);
      expect(
        JSON.stringify(
          await history.exportForViewer(principal, SESSION_ID, {
            streamType: STREAM_TYPE,
            streamId: SESSION_ID,
          }),
        ),
      ).not.toContain('cmd-gm-own-reject');
    }
  });

  it('gives each viewer an export whose timeline is its own timeline', async () => {
    await host.handleIntent(refusedIntent('cmd-live-export'), 'conn-a', OWNER);

    for (const row of [GM_ROW, PLAYER_A_ROW, PLAYER_B_ROW]) {
      const timeline = await timelineFor(row.principalId);
      const exported = await history.exportForViewer(
        row.principalId,
        SESSION_ID,
        { streamType: STREAM_TYPE, streamId: SESSION_ID },
      );
      // Same projection, not two that happen to agree: the digest is
      // computed from the export's own rows through the shared
      // function the timeline caller uses.
      expect(exported.timeline).toEqual(timeline);
      if (row.principalId === OWNER) {
        expect(exported.timeline).toEqual([
          expect.objectContaining({ commandId: 'cmd-live-export' }),
        ]);
      } else {
        expect(exported.timeline).toEqual([]);
        expect(JSON.stringify(exported)).not.toContain('cmd-live-export');
        expect(JSON.stringify(exported)).not.toContain('command-rejected');
      }
      expect(exported.privateRecords).toEqual([]);
    }
  });

  /**
   * Keys a PLAYER surface forbids on top of the shared base.
   *
   * Not base keys, deliberately: the GM's timeline and export carry the
   * committed revision range legitimately, so a base that banned them
   * would be wrong for the GM arm and for the wire surfaces the same
   * scanner guards. This is the same mechanism a snapshot uses to add
   * `revision` at its own call site.
   */
  const PLAYER_ONLY_KEYS = ['committedFirstRevision', 'committedLastRevision'];

  it('leaks no private field or hidden identifier to either player', async () => {
    // A real private record, through the real private store, so the
    // marker the sweep hunts for is one the system actually holds
    // rather than a string invented by the test.
    const privateRepo = new SQLitePrivateRecordRepository(db);
    const created = privateRepo.createPrivateRecord({
      campaignSessionId: SESSION_ID,
      commandId: 'cmd-live-scan',
      recordKind: 'rejection-detail',
      payload: PRIVATE_PAYLOAD_MARKER,
      retentionClass: 'session',
      createdAt: RECORDED_AT,
    });

    await host.handleIntent(refusedIntent('cmd-live-scan'), 'conn-a', OWNER);

    const markers = [PRIVATE_PAYLOAD_MARKER, created.opaqueRef];

    for (const row of [PLAYER_A_ROW, PLAYER_B_ROW]) {
      const timeline = await timelineFor(row.principalId);
      const exported = await history.exportForViewer(
        row.principalId,
        SESSION_ID,
        { streamType: STREAM_TYPE, streamId: SESSION_ID },
      );
      const replaySocket = makeSocket();
      await host.sendReplay(replaySocket, 0, row.principalId);

      // Every surface a player can reach: the audit timeline, the
      // export envelope, the replay stream, and the live frames this
      // player's socket already received.
      expect(leakScan(timeline, markers, PLAYER_ONLY_KEYS)).toEqual([]);
      expect(leakScan(exported, markers, PLAYER_ONLY_KEYS)).toEqual([]);
      expect(leakScan(replaySocket.sent, markers, PLAYER_ONLY_KEYS)).toEqual(
        [],
      );
      expect(leakScan(socket.sent, markers, PLAYER_ONLY_KEYS)).toEqual([]);
    }
  });

  it('proves the sweep is not vacuous on its own vocabulary', async () => {
    await host.handleIntent(refusedIntent('cmd-live-control'), 'conn-a', OWNER);

    // POSITIVE CONTROL 1 - a hand-built object carrying exactly what the
    // sweep hunts. A scanner that stopped scanning would return [] here
    // and every negative row above would pass while proving nothing.
    const leaky = {
      opaque_ref: 'ref-should-never-ship',
      committedFirstRevision: 3,
      nested: [{ command_digest: 'd', secret: PRIVATE_PAYLOAD_MARKER }],
    };
    expect(leakScan(leaky, [PRIVATE_PAYLOAD_MARKER], PLAYER_ONLY_KEYS)).toEqual(
      expect.arrayContaining([
        'withheld-payload-marker',
        'opaque_ref',
        'command_digest',
        'committedFirstRevision',
      ]),
    );

    new SQLiteActionAuditRepository(db).recordLifecycle({
      campaignSessionId: SESSION_ID,
      matchId: SESSION_ID,
      streamType: STREAM_TYPE,
      streamId: SESSION_ID,
      commandId: 'cmd-gm-scan',
      commandDigest: 'b'.repeat(64),
      actor: {
        principalId: GM_ROW.principalId,
        participantId: GM_ROW.participantId,
        role: 'gm',
      },
      correlationId: 'cmd-gm-scan',
      createdAt: RECORDED_AT,
      lifecycleState: 'rejected',
      safeReasonCode: 'command-rejected',
      committedFirstRevision: null,
      committedLastRevision: null,
      committedEventCount: null,
    });
    // POSITIVE CONTROL 2 - the GM's real export trips the PLAYER key
    // list. This is what makes PLAYER_ONLY_KEYS a live discriminator
    // rather than a list of keys nothing ever carries: the same scan
    // that is empty for both players is non-empty for the GM.
    const gmExport = await history.exportForViewer(
      GM_ROW.principalId,
      SESSION_ID,
      { streamType: STREAM_TYPE, streamId: SESSION_ID },
    );
    expect(leakScan(gmExport, [], PLAYER_ONLY_KEYS)).toEqual(
      expect.arrayContaining(['committedFirstRevision']),
    );
    // ...and the GM export is still clean against the SHARED base,
    // which no viewer of any role may carry.
    expect(leakScan(gmExport, [])).toEqual([]);
  });

  it('keeps one row and every player surface byte-identical across retries', async () => {
    await host.handleIntent(refusedIntent('cmd-live-retry'), 'conn-a', OWNER);

    /** Every surface a player can reach, as comparable bytes. */
    async function surfaces(): Promise<string> {
      const perViewer: unknown[] = [];
      for (const row of [GM_ROW, PLAYER_A_ROW, PLAYER_B_ROW]) {
        perViewer.push({
          principalId: row.principalId,
          timeline: await timelineFor(row.principalId),
          export: await history.exportForViewer(row.principalId, SESSION_ID, {
            streamType: STREAM_TYPE,
            streamId: SESSION_ID,
          }),
        });
      }
      const replaySocket = makeSocket();
      await host.sendReplay(replaySocket, 0, OWNER);
      return JSON.stringify({
        perViewer,
        replay: withoutSendClock(replaySocket.sent),
        journalHead: (await store.getEvents(SESSION_ID, 0)).length,
        effectiveHeads: (
          db
            .prepare(`SELECT COUNT(*) AS n FROM event_history_effective_heads`)
            .get() as { readonly n: number }
        ).n,
      });
    }

    const before = await surfaces();
    const censusBefore = census(db);

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await host.handleIntent(refusedIntent('cmd-live-retry'), 'conn-a', OWNER);
    }

    // Three more refusals of the SAME command: one row, unchanged.
    expect(await surfaces()).toBe(before);
    expect(movedTables(censusBefore, census(db))).toEqual({});

    const rows = db
      .prepare(`SELECT command_id, created_at, updated_at FROM action_audit`)
      .all() as readonly {
      readonly command_id: string;
      readonly created_at: string;
      readonly updated_at: string;
    }[];
    expect(rows).toHaveLength(1);
    expect(rows[0]?.updated_at).toBe(rows[0]?.created_at);
  });
});
