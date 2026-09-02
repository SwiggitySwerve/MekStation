/**
 * A live-path rejection is visible to the GM, redacted for players, and
 * invisible to everything else - across retries (umbrella task 18.4).
 *
 * WHAT IS ALREADY PROVEN, and therefore cited rather than re-authored:
 * `ViewerHistoryService.test.ts` "hides other principals and committed
 * revisions from a player; gm sees both" already seeds a REJECTED row
 * and pins the redaction - player rows carry exactly
 * `VIEWER_PLAYER_TIMELINE_KEYS`, a non-actor player sees
 * `actorPrincipalId: null`, and only the safe class survives; the GM
 * arm sees both principals and both revision ranges. #1505 added the
 * GM/P1/P2 timeline-export digest parity. None of that is repeated
 * here.
 *
 * WHAT WAS MISSING, and is what this file adds: every one of those rows
 * seeds the audit repository DIRECTLY. Nothing connected the row a REAL
 * refused command produces on the live host (#1514) to the viewer
 * surfaces that render it. A redaction proven only against hand-built
 * rows is a proof about the mapper, not about the system - the live
 * path could write a row those rows never anticipated and no test
 * would notice.
 *
 * So the audit rows here are produced by driving `handleIntent` on a
 * real `ServerMatchHost` over a real `DurableMatchStore`, and read back
 * through a real `ViewerHistoryService` over the same SQLite file.
 *
 * HONEST FRAMING: these rows are PINS, not red-first regressions. The
 * behaviour they describe holds on arrival - 18.4 is a verification
 * task, not an implementation one. What makes them non-vacuous is (a)
 * the positive control in the sweep, which fails if the scanner stops
 * scanning, and (b) the mutation matrix, which turns each row red on a
 * plausible defect.
 *
 * NON-CLAIM: the GM viewer is minted by a test membership source.
 * `MatchSeatMembershipSource` - the only membership source a match host
 * has - returns `role: 'player'` for every seat and can never mint a
 * GM (verified by reading it). A production GM membership for a
 * standalone match does not exist yet; the GM arm therefore proves the
 * PROJECTION, not that a match can currently seat a GM.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/gm-authority-redaction/spec.md
 */

import type Database from 'better-sqlite3';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SQLiteActionAuditRepository } from '@/lib/events/audit/SQLiteActionAuditRepository';
import { InMemoryEventJournal } from '@/lib/events/journal/InMemoryEventJournal';
import { SQLitePrivateRecordRepository } from '@/lib/events/privacy/SQLitePrivateRecordRepository';
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
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

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
    expect(await host.admitSocket(socket, OWNER)).not.toBeNull();

    const source = new FixtureMembershipSource();
    source.set(PLAYER_A_ROW);
    source.set(PLAYER_B_ROW);
    source.set(GM_ROW);
    const registry = new ViewerAudienceProjectorRegistry();
    registry.register({
      projectorVersion: 1,
      streamType: STREAM_TYPE,
      decisions: [],
    });
    history = new ViewerHistoryService({
      resolver: new AuthorizedViewerResolver(source),
      projection: new ViewerProjectionService({
        journal: new InMemoryEventJournal(() => RECORDED_AT),
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

  it('shows the GM the live rejection and redacts it for both players', async () => {
    await host.handleIntent(refusedIntent('cmd-live-reject'), 'conn-a', OWNER);

    const gm = await timelineFor(GM_ROW.principalId);
    const actor = await timelineFor(PLAYER_A_ROW.principalId);
    const other = await timelineFor(PLAYER_B_ROW.principalId);

    // One live-produced rejection, seen by all three - the redaction is
    // about FIELDS, not about hiding that a command was refused.
    for (const rows of [gm, actor, other]) {
      expect(rows).toHaveLength(1);
      expect(rows[0]?.commandId).toBe('cmd-live-reject');
      expect(rows[0]?.lifecycleState).toBe('rejected');
      expect(rows[0]?.safeReasonCode).toBe('command-rejected');
    }

    // GM: full actor identity.
    expect(gm[0]?.actorPrincipalId).toBe(OWNER);

    // Actor: their own row, so their own principal is theirs to see.
    expect(actor[0]?.actorPrincipalId).toBe(OWNER);

    // The OTHER player learns a command was refused and nothing about
    // who refused it. This is the field the mutation matrix attacks.
    expect(other[0]?.actorPrincipalId).toBeNull();
    expect(JSON.stringify(other)).not.toContain(OWNER);

    // Strict allowlist on both player arms: a new key on the mapper
    // cannot reach a player without failing here.
    for (const rows of [actor, other]) {
      expect(Object.keys(rows[0] ?? {})).toEqual([
        ...VIEWER_PLAYER_TIMELINE_KEYS,
      ]);
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
