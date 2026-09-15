/**
 * End-to-end rollback authority proof (adopt-combat-event-journal-authority
 * task 4.4). These rows use the production SQLite store and recovery entry;
 * corruption is deliberately written through a second SQLite connection.
 */

import Database from 'better-sqlite3';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { digestRetainedMatchHistory } from '@/lib/multiplayer/server/matchAuthorityBaseline';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
import { deriveMatchJournalAuthorityStartedHead } from '../matchJournalAuthorityStartedDerived';
import { recoverActiveMatches } from '../MatchRecovery';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';
import { digestCommandPostState } from '../ServerMatchHostDecision';

const FIXED_NOW = new Date('2026-08-29T12:00:00.000Z');

function roster(): readonly IGameUnit[] {
  return [
    {
      id: 'lock-player',
      name: 'lock-player',
      side: GameSide.Player,
      unitRef: 'lock-player',
      pilotRef: 'lock-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'lock-opponent',
      name: 'lock-opponent',
      side: GameSide.Opponent,
      unitRef: 'lock-opponent',
      pilotRef: 'lock-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function meta(matchId: string): IMatchMeta {
  return {
    matchId,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' },
      { playerId: 'guest-player', side: 'opponent' },
    ],
    status: 'active',
    createdAt: FIXED_NOW.toISOString(),
    updatedAt: FIXED_NOW.toISOString(),
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

function socket(): IMatchSocket & { readonly sent: string[] } {
  const sent: string[] = [];
  return {
    send(data: string) {
      sent.push(data);
    },
    close() {},
    readyState: 1,
    sent,
  };
}

function databaseFile(name: string): {
  readonly file: string;
  readonly dir: string;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-journal-'));
  return { dir, file: path.join(dir, `${name}.sqlite`) };
}

function removeDatabase(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

async function awaitBootstrap(
  store: DurableMatchStore,
  matchId: string,
): Promise<void> {
  const deadline = Date.now() + 1_000;
  while ((await store.getEvents(matchId)).length < 2) {
    if (Date.now() > deadline) {
      throw new Error('host bootstrap events did not persist');
    }
    await Promise.resolve();
  }
}

async function createHost(
  store: DurableMatchStore,
  matchId: string,
  journalAuthority: boolean,
): Promise<ServerMatchHost> {
  await store.createMatch(meta(matchId));
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    randomSeed: 42,
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: roster(),
    diceSeed: 42,
    journalAuthority,
  });
  await awaitBootstrap(store, matchId);
  return host;
}

async function recover(
  store: DurableMatchStore,
  matchId: string,
): Promise<ServerMatchHost> {
  const recovered = await recoverActiveMatches(store);
  expect(recovered.failed).toEqual([]);
  const host = recovered.hosts.get(matchId);
  if (host == null) throw new Error(`recovery omitted ${matchId}`);
  return host;
}

async function dump(
  store: DurableMatchStore,
  matchId: string,
): Promise<string> {
  return JSON.stringify({
    rows: await store.getEvents(matchId),
    receipts: [
      await store.getCommandReceipt(matchId, 'command-1'),
      await store.getCommandReceipt(matchId, 'command-2'),
      await store.getLastCommandReceipt(matchId),
    ],
    baseline: store.getJournalAuthorityBaseline(matchId),
    started: await store.getJournalAuthorityStarted(matchId),
    recovery: await store.getMatchMeta(matchId),
    deliveries: await store.listViewerDeliveryRecords(matchId),
  });
}

function sql(
  file: string,
  statement: string,
  ...params: readonly unknown[]
): void {
  const db = new Database(file);
  try {
    db.prepare(statement).run(...params);
  } finally {
    db.close();
  }
}

async function cloneDatabase(
  source: string,
  destination: string,
): Promise<void> {
  const db = new Database(source);
  try {
    db.exec(`VACUUM INTO '${destination.replaceAll("'", "''")}'`);
  } finally {
    db.close();
  }
}

function hostDigest(host: ServerMatchHost): string {
  return digestCommandPostState(host.getSessionForTests());
}

/**
 * A store whose match streams are REALLY journalled (task 1.3,
 * sub-prefix 3).
 *
 * The rows below that assert recovery keeps journal authority used to
 * read the `mp_journal_authority_started` marker, which a match
 * database records with no journal behind it at all. With the marker
 * retired, "started" is the mirrored effective head, so those rows need
 * the campaign capability database the branch port lives in and a mode
 * at which the mirror runs. The create path seeds the stream (S7-a2),
 * so the head is installed before the first command.
 *
 * The two pre-cutover rows keep their plain stores on purpose: a match
 * admitted with no capability database really has no journal, and
 * proving it still reads legacy is the point of those rows.
 */
function openJournalStore(file: string): {
  readonly store: DurableMatchStore;
  readonly campaignFile: string;
  readonly close: () => void;
} {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mekstation-capability-'));
  const campaignFile = path.join(dir, 'mekstation.db');
  resetSQLiteService();
  getSQLiteService({ path: campaignFile }).initialize();
  const store = new DurableMatchStore({
    path: file,
    capabilityDb: () => getSQLiteService().getDatabase(),
  });
  return {
    store,
    campaignFile,
    close: () => {
      store.close();
      resetSQLiteService();
      fs.rmSync(dir, { recursive: true, force: true });
    },
  };
}

/** Assert the fixture really journalled, so a silent stop fails loudly. */
function expectJournalled(store: DurableMatchStore, matchId: string): void {
  expect(deriveMatchJournalAuthorityStartedHead(store, matchId).kind).toBe(
    'started',
  );
}

/** The started head's effective generation, from the one source of it. */
function startedGeneration(
  store: DurableMatchStore,
  matchId: string,
): number | undefined {
  const derived = deriveMatchJournalAuthorityStartedHead(store, matchId);
  return derived.kind === 'started'
    ? derived.head.effectiveGeneration
    : undefined;
}

describe('journal-authority rollback proof', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(FIXED_NOW);
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._setSkipPublishForTests(false);
  });

  afterEach(() => {
    matchJournalAuthority._setCombatJournalAuthorityModeForTests(null);
    matchJournalAuthority._setSkipPublishForTests(false);
    jest.useRealTimers();
  });

  it('proves pre-cutover legacy reopen preserves events, receipts, and served frames', async () => {
    // event-store/spec.md, Combat Rollback Preserves Journal Authority:
    // Rollback occurs before the first journal command.
    const matchId = 'legacy-reopen';
    const controlFile = databaseFile('legacy-control');
    const restartFile = databaseFile('legacy-restart');
    const controlStore = new DurableMatchStore({ path: controlFile.file });
    let restartStore: DurableMatchStore | null = null;
    try {
      const control = await createHost(controlStore, matchId, false);
      await control.handleIntent(advance('command-1', matchId));
      await cloneDatabase(controlFile.file, restartFile.file);
      restartStore = new DurableMatchStore({ path: restartFile.file });
      const reopened = await recover(restartStore, matchId);
      const controlSocket = socket();
      const reopenedSocket = socket();
      await control.handleSessionJoin(controlSocket, 'host-player');
      await reopened.handleSessionJoin(reopenedSocket, 'host-player');

      // Falsification: make recovery select a non-legacy reader before cutover.
      expect(await dump(restartStore, matchId)).toBe(
        await dump(controlStore, matchId),
      );
      expect(reopenedSocket.sent).toEqual(controlSocket.sent);
      expect(reopened.isJournalAuthorityEnabled()).toBe(false);
    } finally {
      controlStore.close();
      restartStore?.close();
      removeDatabase(controlFile.dir);
      removeDatabase(restartFile.dir);
    }
  });

  it('proves baseline-only rollback compares every persisted baseline tuple field to the durable head', async () => {
    // event-store/spec.md, Combat Rollback Preserves Journal Authority:
    // Rollback occurs before the first journal command.
    const matchId = 'baseline-only';
    const target = databaseFile('baseline-only');
    const store = new DurableMatchStore({ path: target.file });
    try {
      matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
      const host = await createHost(store, matchId, true);
      expect(host.isJournalAuthorityEnabled()).toBe(true);
      const baseline = store.getJournalAuthorityBaseline(matchId);
      expect(baseline).not.toBeNull();
      const legacy = await recover(store, matchId);
      const legacyResponse = await legacy.handleIntent(
        advance('command-1', matchId),
      );
      expect(legacy.isJournalAuthorityEnabled()).toBe(false);
      expect(legacyResponse.some((message) => message.kind === 'Event')).toBe(
        true,
      );
      const cleanFacts = await dump(store, matchId);

      sql(
        target.file,
        'UPDATE mp_journal_authority_baseline SET digest = ? WHERE match_id = ?',
        'operator-corruption',
        matchId,
      );
      const before = await dump(store, matchId);
      const blocked = await recover(store, matchId);
      const response = await blocked.handleIntent(
        advance('command-1', matchId),
      );

      // Falsification: compare only revision, or allow a mismatched baseline.
      expect(response).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            kind: 'Error',
            reason: 'rollback-reader-blocked:baseline-head-mismatch',
          }),
        ]),
      );
      expect(await dump(store, matchId)).toBe(before);
      expect(cleanFacts).not.toBe(before);
    } finally {
      store.close();
      removeDatabase(target.dir);
    }
  });

  it('proves a crash after the first batch transaction recovers journal authority and appends contiguously', async () => {
    // event-store/spec.md, Combat Rollback Preserves Journal Authority:
    // Process stops after the first journal batch commits.
    const matchId = 'crash-first-batch';
    const target = databaseFile('crash-first-batch');
    const opened = openJournalStore(target.file);
    const store = opened.store;
    try {
      matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
      const host = await createHost(store, matchId, true);
      matchJournalAuthority._setSkipPublishForTests(true);
      await host.handleIntent(advance('command-1', matchId));
      matchJournalAuthority._setSkipPublishForTests(false);
      const firstReceipt = await store.getCommandReceipt(matchId, 'command-1');
      expectJournalled(store, matchId);
      expect(firstReceipt).not.toBeNull();

      const reopened = await recover(store, matchId);
      const beforeRevision = (await store.getEvents(matchId)).at(-1)?.sequence;
      expect(hostDigest(reopened)).toBe(firstReceipt?.expectedPostStateDigest);
      await reopened.handleIntent(advance('command-2', matchId));
      const secondReceipt = await store.getCommandReceipt(matchId, 'command-2');

      // Falsification: mirror the batch outside its own transaction.
      expect(reopened.isJournalAuthorityEnabled()).toBe(true);
      expect(secondReceipt?.firstRevision).toBe((beforeRevision ?? -1) + 1);
      expect(secondReceipt?.lastRevision).toBe(
        (await store.getEvents(matchId)).at(-1)?.sequence,
      );
    } finally {
      opened.close();
      removeDatabase(target.dir);
    }
  });

  it('proves post-command compatible rollback refolds the recorded head and subsequent commands round-trip', async () => {
    // event-store/spec.md, Combat Rollback Preserves Journal Authority:
    // Rollback occurs after a journal command.
    const matchId = 'post-command-compatible';
    const target = databaseFile('post-command-compatible');
    const opened = openJournalStore(target.file);
    const store = opened.store;
    try {
      matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
      const host = await createHost(store, matchId, true);
      await host.handleIntent(advance('command-1', matchId));
      await host.handleIntent(advance('command-2', matchId));
      expectJournalled(store, matchId);
      const head = {
        digest: hostDigest(host),
        revision: (await store.getEvents(matchId)).at(-1)?.sequence,
        generation: startedGeneration(store, matchId),
      };

      const reopened = await recover(store, matchId);
      const frames = socket();
      reopened.attachSocket(frames, 'host-player');
      const roundTrip = await reopened.handleIntent(
        advance('command-3', matchId),
      );

      // Falsification: select legacy after a started fact, or skip refold validation.
      expect(reopened.isJournalAuthorityEnabled()).toBe(true);
      expect({
        digest: hostDigest(reopened),
        revision: (await store.getEvents(matchId)).at(-1)?.sequence,
        generation: startedGeneration(store, matchId),
      }).not.toEqual(head);
      expect(roundTrip.some((message) => message.kind === 'Event')).toBe(true);
      expect(frames.sent.length).toBeGreaterThan(0);
    } finally {
      opened.close();
      removeDatabase(target.dir);
    }
  });

  it.each([
    {
      name: 'unsupported effective generation',
      // Corrupts the journal's OWN effective head now, not the retired
      // marker: after task 1.3's sub-prefix 3 the head is the only
      // place an effective generation for this stream comes from, so
      // that is the row an operator would have to corrupt to produce
      // this block. Written to the capability database, which is where
      // the branch tables live.
      corrupt: (_file: string, matchId: string, campaignFile: string) =>
        sql(
          campaignFile,
          `UPDATE event_history_effective_heads SET effective_generation = 2
           WHERE stream_type = 'match' AND stream_id = ?`,
          matchId,
        ),
      reason: 'unsupported-effective-generation',
    },
    {
      name: 'refold digest mismatch',
      corrupt: (file: string, matchId: string, _campaignFile: string) =>
        sql(
          file,
          `UPDATE mp_match_events
           SET event_json = json_set(event_json, '$.payload.toPhase', 'initiative')
           WHERE match_id = ? AND sequence = 4`,
          matchId,
        ),
      reason: 'digest-mismatch',
    },
  ])(
    'proves post-command incompatible rollback blocks %s without substitution or admission',
    async ({ corrupt, reason }) => {
      // event-store/spec.md, Combat Rollback Preserves Journal Authority:
      // Rollback occurs after a journal command.
      const matchId = `post-command-blocked-${reason}`;
      const target = databaseFile(`post-command-blocked-${reason}`);
      const opened = openJournalStore(target.file);
      const store = opened.store;
      try {
        matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
        const host = await createHost(store, matchId, true);
        await host.handleIntent(advance('command-1', matchId));
        expectJournalled(store, matchId);
        const legacyDigest = digestRetainedMatchHistory(
          await store.getEvents(matchId),
        );
        corrupt(target.file, matchId, opened.campaignFile);
        const before = await dump(store, matchId);
        const blocked = await recover(store, matchId);
        const servedDigest = hostDigest(blocked);
        const response = await blocked.handleIntent(
          advance('command-2', matchId),
        );

        // Falsification: fall back to the legacy projection or admit one command.
        expect(servedDigest).not.toBe(legacyDigest);
        expect(response).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              kind: 'Error',
              reason: `rollback-reader-blocked:${reason}`,
            }),
          ]),
        );
        expect(response.some((message) => message.kind === 'Event')).toBe(
          false,
        );
        expect(await dump(store, matchId)).toBe(before);
      } finally {
        opened.close();
        removeDatabase(target.dir);
      }
    },
  );
});
