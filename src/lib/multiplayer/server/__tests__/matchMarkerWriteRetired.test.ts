/**
 * S7-b of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.3, third
 * sub-prefix): the journal-authority command path stops writing the
 * `mp_journal_authority_started` marker.
 *
 * WHY THE WRITE GOES, AND NOT JUST THE READ. The previous commit made
 * the mirrored effective head the only thing recovery reads. A write
 * nobody reads is worse than dead code here: the marker is a durable,
 * write-once row on the match database that looks exactly like a second
 * answer to "has this stream started", and task 1.3's whole subject is
 * that there must be one. The write is also the only thing that can put
 * a NEW such row on disk, so retiring it is what makes the marker inert
 * going forward rather than merely ignored.
 *
 * WHERE THE WRITE LIVED. `commitJournalAuthorityCommand` computed a
 * one-time `IMatchJournalAuthorityStarted` on the first command of a
 * journal-authority match and handed it to the store inside the batch.
 * The `alreadyStarted` read beside it existed only to keep that write
 * to once, so it goes with it. Neither has any other caller.
 *
 * SCOPE. This slice retires the PRODUCTION writer. The batch field, the
 * store-level write, the table and the read port are a separate slice:
 * several suites still hand a marker to `appendCommandBatch` directly
 * to build pre-cutover fixtures, and pulling the shape out from under
 * them belongs with their migration, not here.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S3)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchCommandBatch } from '../matchCommandBatch';

import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  _setSkipPublishForTests,
} from '../matchJournalAuthority';
import { ServerMatchHost } from '../ServerMatchHost';

const AT = '2026-09-15T00:00:00.000Z';

function roster(): IGameUnit[] {
  return [
    {
      id: 'write-player',
      name: 'write-player',
      side: GameSide.Player,
      unitRef: 'write-player',
      pilotRef: 'write-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'write-opponent',
      name: 'write-opponent',
      side: GameSide.Opponent,
      unitRef: 'write-opponent',
      pilotRef: 'write-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function meta(matchId: string) {
  return {
    matchId,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' as const },
      { playerId: 'guest-player', side: 'opponent' as const },
    ],
    status: 'active' as const,
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5 },
  };
}

function advance(intentId: string, matchId: string): IIntent {
  return {
    kind: 'Intent',
    matchId,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

type AnyStore = DurableMatchStore | InMemoryMatchStore;

async function bootstrap(store: AnyStore, matchId: string): Promise<void> {
  const deadline = Date.now() + 2000;
  while ((await store.getEvents(matchId)).length < 2) {
    if (Date.now() > deadline) throw new Error('bootstrap events missing');
    await Promise.resolve();
  }
}

function createHost(store: AnyStore, matchId: string): ServerMatchHost {
  return ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: roster(),
    diceSeed: 42,
    journalAuthority: true,
  });
}

/** Count marker rows through a second connection, as an operator would. */
function markerRowCount(file: string): number {
  const db = new Database(file, { readonly: true });
  try {
    const row = db
      .prepare(`SELECT COUNT(*) AS n FROM mp_journal_authority_started`)
      .get() as { n: number };
    return row.n;
  } finally {
    db.close();
  }
}

/** Record every batch the host offers the store, without changing it. */
function spyOnBatches(store: AnyStore): IMatchCommandBatch[] {
  const seen: IMatchCommandBatch[] = [];
  const original = store.appendCommandBatch!.bind(store);
  store.appendCommandBatch = async (matchId, batch) => {
    seen.push(batch);
    return original(matchId, batch);
  };
  return seen;
}

let dir = '';

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'marker-write-retired-'));
  resetSQLiteService();
  _resetProcessShadowStatsForTests();
  _setSkipPublishForTests(false);
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _setSkipPublishForTests(false);
  _resetProcessShadowStatsForTests();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('the journal-authority command path writes no started marker', () => {
  // GREEN BEFORE AND AFTER, ON PURPOSE. Measured, not assumed: this row
  // already passed before the write was removed, because S7-a2's
  // create-path seed installs the effective head before the first
  // command, so `deriveMatchJournalAuthorityStartedHead` already
  // answered "started" and the one-time write was already skipped. The
  // marker's remaining reach was therefore exactly the stores with no
  // journal behind them - which is what rows 2 and 3 drive - and this
  // row is the guard that removing the write did not disturb the case
  // that was already correct.
  it('leaves the marker table empty after a real journalled command', async () => {
    getSQLiteService({ path: path.join(dir, 'mekstation.db') }).initialize();
    const store = new DurableMatchStore({
      path: path.join(dir, 'multiplayer-matches.db'),
      capabilityDb: () => getSQLiteService().getDatabase(),
    });
    try {
      _setCombatJournalAuthorityModeForTests('enabled');
      const matchId = 'marker-write-durable';
      await store.createMatch(meta(matchId));
      const host = createHost(store, matchId);
      await bootstrap(store, matchId);
      // Fixture guard: a host that was refused admission never reaches
      // the write this row is about, and would pass it vacuously.
      expect(host.isJournalAuthorityEnabled()).toBe(true);

      await host.handleIntent(advance('command-1', matchId));

      // Both halves matter: the read port answering null is the
      // contract, and an empty table read through a SECOND connection
      // is the disk fact behind it.
      expect(await store.getJournalAuthorityStarted(matchId)).toBeNull();
      expect(markerRowCount(path.join(dir, 'multiplayer-matches.db'))).toBe(0);
      // The command itself still committed - the retirement removes a
      // side write, not the command path.
      expect(
        await store.getCommandReceipt(matchId, 'command-1'),
      ).not.toBeNull();
    } finally {
      store.close();
    }
  });

  it('records no started fact on an in-memory store either', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const matchId = 'marker-write-memory';
    await store.createMatch(meta(matchId));
    const host = createHost(store, matchId);
    await bootstrap(store, matchId);
    expect(host.isJournalAuthorityEnabled()).toBe(true);

    await host.handleIntent(advance('command-1', matchId));

    expect(await store.getJournalAuthorityStarted(matchId)).toBeNull();
    expect(await store.getCommandReceipt(matchId, 'command-1')).not.toBeNull();
  });

  it('offers the store a batch with no started fact on it at all', async () => {
    // Sharper than reading the store back: a batch that carries the key
    // with an undefined value is still a batch shaped around a fact the
    // retirement says no longer exists, and only key presence sees it.
    const store = new InMemoryMatchStore({ quiet: true });
    const matchId = 'marker-write-batch-shape';
    await store.createMatch(meta(matchId));
    const host = createHost(store, matchId);
    await bootstrap(store, matchId);
    expect(host.isJournalAuthorityEnabled()).toBe(true);
    const batches = spyOnBatches(store);

    await host.handleIntent(advance('command-1', matchId));
    await host.handleIntent(advance('command-2', matchId));

    expect(batches.length).toBeGreaterThan(0);
    expect(batches.map((batch) => 'journalAuthorityStarted' in batch)).toEqual(
      batches.map(() => false),
    );
  });
});
