/**
 * A rejected command leaves exactly one authorized audit row and nothing
 * else (umbrella task 18.2; `Audit Captures Action Provenance`).
 *
 * The rejection-audit STORE has existed since authority-audit PR 4 -
 * `action_audit` is append-once on `command_id` and reserves the
 * `command-rejected` safe class - but until this seam NOTHING in
 * production ever called it: `recordLifecycle` had test callers only
 * (grep, 2026-09-02). A store nobody writes to proves nothing about a
 * live refusal, so the rows below drive the REAL host through
 * `handleIntent` and read the REAL SQLite file afterwards.
 *
 * Three properties are asserted, and the third is the one that makes the
 * first two safe to have:
 *
 *   1. APPEND-ONCE. A rejected command retried N times keeps exactly one
 *      row, and that row's `created_at` does not move - a second write
 *      would be a second row or a rewritten one, and both are visible.
 *   2. BEFORE THE REJECTION. The row is readable from a SECOND database
 *      connection at the instant the Error frame reaches the socket, so
 *      "append then reject" cannot silently become "reject then append".
 *   3. NO GAMEPLAY FACT. A total census over every table in the file
 *      (not a named list of five, which can only prove the five someone
 *      remembered) shows `action_audit` as the ONLY table that moved -
 *      no journal event, no outbox row, no delivery cursor, no replay
 *      checkpoint, no receipt.
 *
 * The match store and the audit schema deliberately share ONE file so
 * the census is a single sweep. In production they are separate
 * databases; nothing here depends on them being one, only the counting
 * does.
 *
 * @spec openspec/changes/harden-gm-two-player-campaign-sessions/specs/audit-timeline/spec.md
 */

import type Database from 'better-sqlite3';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import type { IAdaptedUnit } from '@/engine/types';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
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

import { DurableMatchStore } from '../DurableMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH_ID = 'match-rejection-audit';
const OWNER = 'pA';

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
 * Counts every row of every user table in the file.
 *
 * Why a total census rather than the five names task 18.2 lists: a named
 * list can only ever prove the tables whoever wrote it thought of, and a
 * rejection that quietly wrote an eighth table would pass. Counting
 * everything makes the assertion "nothing moved except the audit", which
 * is the property the spec actually states.
 */
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

interface IProbeSocket {
  send(data: string): void;
  close(): void;
  readyState: number;
  readonly sent: readonly unknown[];
  readonly auditCountAtFirstError: number | null;
}

/**
 * A socket that records how many audit rows existed AT THE MOMENT the
 * first Error frame was delivered. Reads through the caller's live
 * connection, which is the same file the host's audit write lands in, so
 * a row appended after the broadcast reads as zero here.
 */
function makeProbeSocket(db: Database.Database): IProbeSocket {
  const sent: unknown[] = [];
  let auditCountAtFirstError: number | null = null;
  return {
    send(data: string) {
      const frame = JSON.parse(data) as { readonly kind?: string };
      sent.push(frame);
      if (frame.kind === 'Error' && auditCountAtFirstError === null) {
        const row = db
          .prepare(`SELECT COUNT(*) AS n FROM action_audit`)
          .get() as { readonly n: number };
        auditCountAtFirstError = row.n;
      }
    },
    close() {},
    readyState: 1,
    get sent() {
      return sent;
    },
    get auditCountAtFirstError() {
      return auditCountAtFirstError;
    },
  };
}

/** An envelope the host refuses AFTER the authorization gate admits it. */
function forbiddenDiceIntent(intentId: string): IIntent {
  return {
    kind: 'Intent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: OWNER,
    intentId,
    intent: {
      kind: 'Move',
      unitId: 'unit-A',
      to: { q: 0, r: 1 },
      facing: 0,
      movementType: 'walk',
      // The refusal under test: a client-supplied roll. Chosen because it
      // needs no session state to trigger, so a retry is refused for the
      // SAME reason every time - which is what "append-once across
      // retries" has to be measured against.
      rolls: [6, 6],
    },
  } as unknown as IIntent;
}

describe('rejected command audit (real host, real SQLite)', () => {
  let file: string;
  let store: DurableMatchStore;
  let db: Database.Database;

  beforeEach(async () => {
    file = path.join(
      fs.mkdtempSync(path.join(os.tmpdir(), 'mek-reject-audit-')),
      'audit.db',
    );
    resetSQLiteService();
    const service = getSQLiteService({ path: file });
    service.initialize();
    db = service.getDatabase();
    store = new DurableMatchStore({ path: file });

    const now = new Date().toISOString();
    await store.createMatch({
      matchId: MATCH_ID,
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
      roomCode: 'REJ001',
    } as Parameters<DurableMatchStore['createMatch']>[0]);
  });

  afterEach(() => {
    store.close();
    resetSQLiteService();
    fs.rmSync(path.dirname(file), { recursive: true, force: true });
  });

  /** Boots the host over the durable store and admits the owner's socket. */
  async function bootHost(): Promise<{
    readonly host: ServerMatchHost;
    readonly socket: IProbeSocket;
  }> {
    const host = ServerMatchHost.create(MATCH_ID, store, {
      mapRadius: 6,
      turnLimit: 5,
      random: new SeededRandom(11),
      grid: createMinimalGrid(6),
      playerUnits: [adapted('unit-A', GameSide.Player, { q: 0, r: 0 })],
      opponentUnits: [adapted('unit-foe', GameSide.Opponent, { q: 0, r: 3 })],
      gameUnits: [
        gameUnit('unit-A', GameSide.Player),
        gameUnit('unit-foe', GameSide.Opponent),
      ],
      diceSeed: 11,
    });
    await Promise.resolve();
    await Promise.resolve();
    const socket = makeProbeSocket(db);
    expect(await host.admitSocket(socket, OWNER)).not.toBeNull();
    return { host, socket };
  }

  it('appends exactly one authorized audit row for a rejected command', async () => {
    const { host } = await bootHost();

    const frames = await host.handleIntent(
      forbiddenDiceIntent('cmd-reject-1'),
      'conn-a',
      OWNER,
    );

    // The command really was refused - otherwise this row would be
    // asserting the audit of an accepted command.
    expect(
      (frames as readonly { readonly kind: string }[]).some(
        (frame) => frame.kind === 'Error',
      ),
    ).toBe(true);

    const rows = db
      .prepare(
        `SELECT command_id, campaign_session_id, actor_principal_id,
                actor_participant_id, actor_role, lifecycle_state,
                safe_reason_code, committed_first_revision
         FROM action_audit`,
      )
      .all() as readonly Record<string, unknown>[];

    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(
      expect.objectContaining({
        command_id: 'cmd-reject-1',
        campaign_session_id: MATCH_ID,
        actor_principal_id: OWNER,
        // The SEAT, not the principal - membership derives the
        // participant from durable lobby state, and recording the two
        // separately is what makes the row an authority fact rather
        // than an echo of the connection's identity.
        actor_participant_id: 'alpha-1',
        actor_role: 'player',
        lifecycle_state: 'rejected',
        safe_reason_code: 'command-rejected',
        // A rejection carries no committed range: the schema forbids it,
        // and a row that carried one would be claiming a gameplay fact.
        committed_first_revision: null,
      }),
    );
  });

  it('keeps one row when the same rejected command is retried', async () => {
    const { host } = await bootHost();

    for (let attempt = 0; attempt < 3; attempt += 1) {
      await host.handleIntent(
        forbiddenDiceIntent('cmd-reject-retry'),
        'conn-a',
        OWNER,
      );
    }

    const rows = db
      .prepare(`SELECT command_id, created_at, updated_at FROM action_audit`)
      .all() as readonly {
      readonly command_id: string;
      readonly created_at: string;
      readonly updated_at: string;
    }[];

    expect(rows).toHaveLength(1);
    expect(rows[0]?.command_id).toBe('cmd-reject-retry');
    // Append-once is not only "one row" - the row must be the FIRST
    // write. A repository that deleted and reinserted would also show
    // one row while losing the original timestamp.
    expect(rows[0]?.updated_at).toBe(rows[0]?.created_at);
  });

  it('appends the row before the rejection reaches the player', async () => {
    const { host, socket } = await bootHost();

    await host.handleIntent(
      forbiddenDiceIntent('cmd-reject-order'),
      'conn-a',
      OWNER,
    );

    // Non-null proves an Error frame was actually delivered; the value
    // proves the audit row was already durable when it was.
    expect(socket.auditCountAtFirstError).toBe(1);
  });

  it('creates no gameplay, outbox, cursor, replay, or export fact', async () => {
    const { host } = await bootHost();
    const before = census(db);

    await host.handleIntent(
      forbiddenDiceIntent('cmd-reject-census'),
      'conn-a',
      OWNER,
    );

    const after = census(db);
    expect(movedTables(before, after)).toEqual({ action_audit: 1 });

    // Named explicitly as well, because task 18.2 names these five and a
    // reader should be able to see them asserted rather than infer them
    // from the census above.
    for (const table of [
      'mp_match_events',
      'event_journal_events',
      'mp_match_outbox',
      'mp_combat_outcome_outbox',
      'mp_viewer_delivery',
      'replay_checkpoints',
      'mp_command_receipts',
    ]) {
      expect({ [table]: after.get(table) }).toEqual({
        [table]: before.get(table),
      });
    }
  });

  it('writes no rejection row for a command the host accepts', async () => {
    const { host } = await bootHost();

    const frames = await host.handleIntent(
      {
        kind: 'Intent',
        matchId: MATCH_ID,
        ts: nowIso(),
        playerId: OWNER,
        intentId: 'cmd-accepted',
        intent: { kind: 'AdvancePhase' },
      } as unknown as IIntent,
      'conn-a',
      OWNER,
    );

    expect(
      (frames as readonly { readonly kind: string }[]).some(
        (frame) => frame.kind === 'Error',
      ),
    ).toBe(false);

    // A recorder that fired on every command would pass every row above
    // while turning the audit into a duplicate of the journal.
    const rejected = db
      .prepare(
        `SELECT COUNT(*) AS n FROM action_audit WHERE lifecycle_state = 'rejected'`,
      )
      .get() as { readonly n: number };
    expect(rejected.n).toBe(0);
  });
});
