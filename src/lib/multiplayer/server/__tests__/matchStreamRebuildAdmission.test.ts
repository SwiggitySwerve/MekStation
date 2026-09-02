/**
 * The combat command path refuses while this match's history is being
 * rebuilt (add-authoritative-history-branches task 2.2 adoption; umbrella
 * 14.3).
 *
 * Everything here is real: a real `DurableMatchStore`, a real
 * `ServerMatchHost`, a real correction lease acquired through the shipped
 * store against a real migrated SQLite. The refusal is read off the
 * frames `handleIntent` actually broadcasts, the way
 * `hardenedTransport.test-helpers` reads `RATE_LIMITED` - a hand-rolled
 * stub could be made to answer anything, and what is under test is
 * whether the LIVE gate consults the lease at all.
 *
 * Three properties the rows exist to hold:
 *
 * - **The refusal appends nothing.** A rebuild that still let one command
 *   through would be rebuilding history that is still moving.
 * - **Lobby intents are unaffected.** Seat occupancy, readiness and
 *   launch are not engine-mutating and route out before every integrity
 *   gate; a rebuild that locked players out of their own seats would turn
 *   a correction into an outage.
 * - **The lease is read per STREAM.** Another match's rebuild is another
 *   match's business.
 *
 * @spec openspec/changes/add-authoritative-history-branches/specs/gm-combat-interventions/spec.md
 */

import type Database from 'better-sqlite3';

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { SQLiteEventHistoryCorrectionLeaseStore } from '@/lib/events/journal/SQLiteEventHistoryCorrectionLeaseStore';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { type IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats, type IMatchSeat } from '@/types/multiplayer/Lobby';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const HEAD_DIGEST = 'd'.repeat(64);
const HEAD_REVISION = 3;
const TTL_MS = 30_000;

describe('combat commands during a history rebuild', () => {
  let dir: string;
  let db: Database.Database;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'match-rebuild-'));
    resetSQLiteService();
    const service = getSQLiteService({ path: path.join(dir, 'history.db') });
    service.initialize();
    db = service.getDatabase();
    store = new DurableMatchStore({ path: ':memory:' });
  });

  afterEach(async () => {
    store.close();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  function branches(): SQLiteEventHistoryBranchStore {
    return new SQLiteEventHistoryBranchStore(db);
  }

  function leases(): SQLiteEventHistoryCorrectionLeaseStore {
    return new SQLiteEventHistoryCorrectionLeaseStore(db, branches());
  }

  /** Give this match stream a real journal head and its genesis branch. */
  function seedStream(matchId: string): void {
    db.prepare(
      `INSERT INTO event_journal_stream_heads
         (stream_type, stream_id, branch_id, stream_revision, event_digest)
       VALUES ('match', ?, 'root', ?, ?)`,
    ).run(matchId, HEAD_REVISION, HEAD_DIGEST);
    branches().backfillGenesisBranches();
  }

  /** Acquire the real correction lease a GM rewind holds. */
  function acquireLease(matchId: string): void {
    leases().acquireCorrectionLease({
      streamType: 'match',
      streamId: matchId,
      owner: 'host-1',
      actor: 'gm-1',
      reason: 'authorized rewind to turn 2',
      ttlMs: TTL_MS,
      expectedBranchId: 'root',
      expectedRevision: HEAD_REVISION,
      expectedDigest: HEAD_DIGEST,
      expectedGeneration: 1,
    });
  }

  function activeSeats(): IMatchSeat[] {
    return defaultSeats('1v1').map((seat) => {
      if (seat.slotId === 'alpha-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_host', displayName: 'Host' },
          ready: true,
        };
      }
      if (seat.slotId === 'bravo-1') {
        return {
          ...seat,
          occupant: { playerId: 'pid_opp', displayName: 'Opp' },
          ready: true,
        };
      }
      return seat;
    });
  }

  function activeMeta(matchId: string): IMatchMeta {
    const now = new Date().toISOString();
    return {
      matchId,
      hostPlayerId: 'pid_host',
      playerIds: ['pid_host', 'pid_opp'],
      sideAssignments: [
        { playerId: 'pid_host', side: 'player' },
        { playerId: 'pid_opp', side: 'opponent' },
      ],
      status: 'active',
      createdAt: now,
      updatedAt: now,
      config: { mapRadius: 4, turnLimit: 5 },
      layout: '1v1',
      seats: activeSeats(),
    };
  }

  async function makeHost(matchId: string): Promise<ServerMatchHost> {
    await store.createMatch(activeMeta(matchId));
    const host = ServerMatchHost.create(matchId, store, {
      mapRadius: 4,
      turnLimit: 5,
      random: new SeededRandom(1),
      grid: createMinimalGrid(4),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [] as readonly IGameUnit[],
    });
    // Flush the fire-and-forget initial-event persist.
    await Promise.resolve();
    await Promise.resolve();
    return host;
  }

  function advance(matchId: string, intentId: string): IIntent {
    return {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'AdvancePhase' },
      intentId,
    };
  }

  function unready(matchId: string): IIntent {
    return {
      kind: 'Intent',
      matchId,
      ts: nowIso(),
      playerId: 'pid_host',
      intent: { kind: 'SetReady', slotId: 'alpha-1', ready: false },
      intentId: 'lobby-1',
    };
  }

  it('refuses an engine-mutating intent with PROJECTION_REBUILDING and appends nothing', async () => {
    const matchId = 'rebuild-refuses';
    seedStream(matchId);
    const host = await makeHost(matchId);
    const before = (await store.getEvents(matchId)).length;

    acquireLease(matchId);
    const frames = await host.handleIntent(advance(matchId, 'during-1'));

    const refusal = frames.find(
      (frame) =>
        frame.kind === 'Error' && frame.code === 'PROJECTION_REBUILDING',
    );
    expect(refusal).toBeDefined();
    if (refusal?.kind === 'Error') {
      expect(refusal.intentId).toBe('during-1');
      // Retryable by construction: the stream reopens on expiry,
      // release, or activation, and the reason says so rather than
      // sending the client to resync against a head that is on its way
      // out.
      expect(refusal.reason).toBe('retry-after-rebuild');
      // Design D5 - the lease id, owner and epoch are authority facts,
      // not player-facing ones. Nothing that identifies the rebuild's
      // owner may ride out on the wire.
      expect(refusal.reason).not.toContain('host-1');
      expect(refusal.reason).not.toContain('gm-1');
    }
    // The refusal wrote nothing: this function reads, and never appends.
    expect((await store.getEvents(matchId)).length).toBe(before);
  });

  it('still accepts a lobby intent while the rebuild runs', async () => {
    const matchId = 'rebuild-lobby';
    seedStream(matchId);
    const host = await makeHost(matchId);
    acquireLease(matchId);

    const frames = await host.handleIntent(unready(matchId));

    // Seat readiness is not an engine-mutating command and routes out
    // before every integrity gate. A rebuild that refused it would lock
    // players out of their own lobby for the length of a correction.
    expect(frames.some((frame) => frame.kind === 'LobbyUpdated')).toBe(true);
    expect(
      frames.some(
        (frame) =>
          frame.kind === 'Error' && frame.code === 'PROJECTION_REBUILDING',
      ),
    ).toBe(false);
  });

  it('admits commands on a match whose own stream has no rebuild', async () => {
    const rebuilding = 'rebuild-elsewhere';
    const quiet = 'rebuild-quiet';
    seedStream(rebuilding);
    seedStream(quiet);
    const host = await makeHost(quiet);
    acquireLease(rebuilding);

    const frames = await host.handleIntent(advance(quiet, 'other-1'));

    // The lease is held on ANOTHER match's stream. A gate keyed on
    // anything coarser than the stream would stop every match in the
    // process the moment one GM started a rewind.
    expect(
      frames.some(
        (frame) =>
          frame.kind === 'Error' && frame.code === 'PROJECTION_REBUILDING',
      ),
    ).toBe(false);
    expect((await store.getEvents(quiet)).length).toBeGreaterThan(0);
  });

  it('admits commands on a store that cannot hold a lease at all', async () => {
    const matchId = 'rebuild-inmemory';
    seedStream(matchId);
    // A live lease on this very stream - but the host's store is the
    // in-memory one, which has no database and therefore no capability.
    acquireLease(matchId);
    const memory = new InMemoryMatchStore();
    await memory.createMatch(activeMeta(matchId));
    const host = ServerMatchHost.create(matchId, memory, {
      mapRadius: 4,
      turnLimit: 5,
      random: new SeededRandom(1),
      grid: createMinimalGrid(4),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [] as readonly IGameUnit[],
    });
    await Promise.resolve();
    await Promise.resolve();

    const frames = await host.handleIntent(advance(matchId, 'memory-1'));

    // Absent capability means "no rebuild here", never "rebuilding".
    // A guard that read it the other way round would make every
    // browser-hosted and unit-test match permanently uncommandable.
    expect(
      frames.some(
        (frame) =>
          frame.kind === 'Error' && frame.code === 'PROJECTION_REBUILDING',
      ),
    ).toBe(false);
    expect((await memory.getEvents(matchId)).length).toBeGreaterThan(0);
  });

  it('admits commands once the lease has lapsed', async () => {
    const matchId = 'rebuild-lapsed';
    seedStream(matchId);
    const host = await makeHost(matchId);
    acquireLease(matchId);

    // Expiry releases the stream BY THE CLOCK, with no reaper having to
    // run - so a host whose GM walked away is not blocked forever. The
    // row is left exactly as the store wrote it (the schema refuses a
    // shortened expiry anyway); only the clock moves.
    const realNow = Date.now;
    const lapsed = realNow() + TTL_MS + 1_000;
    let frames;
    try {
      (Date as unknown as { now: () => number }).now = () => lapsed;
      frames = await host.handleIntent(advance(matchId, 'after-1'));
    } finally {
      (Date as unknown as { now: () => number }).now = realNow;
    }

    expect(
      frames.some(
        (frame) =>
          frame.kind === 'Error' && frame.code === 'PROJECTION_REBUILDING',
      ),
    ).toBe(false);
    expect((await store.getEvents(matchId)).length).toBeGreaterThan(0);
  });
});
