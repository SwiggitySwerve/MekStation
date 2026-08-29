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
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import type { IMatchMeta } from '../IMatchStore';

import { DurableMatchStore } from '../DurableMatchStore';
import * as matchJournalAuthority from '../matchJournalAuthority';
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
    const store = new DurableMatchStore({ path: target.file });
    try {
      matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
      const host = await createHost(store, matchId, true);
      matchJournalAuthority._setSkipPublishForTests(true);
      await host.handleIntent(advance('command-1', matchId));
      matchJournalAuthority._setSkipPublishForTests(false);
      const started = await store.getJournalAuthorityStarted(matchId);
      const firstReceipt = await store.getCommandReceipt(matchId, 'command-1');
      expect(started).not.toBeNull();
      expect(firstReceipt).not.toBeNull();

      const reopened = await recover(store, matchId);
      const beforeRevision = (await store.getEvents(matchId)).at(-1)?.sequence;
      expect(hostDigest(reopened)).toBe(firstReceipt?.expectedPostStateDigest);
      await reopened.handleIntent(advance('command-2', matchId));
      const secondReceipt = await store.getCommandReceipt(matchId, 'command-2');

      // Falsification: write started outside the first-batch transaction.
      expect(reopened.isJournalAuthorityEnabled()).toBe(true);
      expect(secondReceipt?.firstRevision).toBe((beforeRevision ?? -1) + 1);
      expect(secondReceipt?.lastRevision).toBe(
        (await store.getEvents(matchId)).at(-1)?.sequence,
      );
    } finally {
      store.close();
      removeDatabase(target.dir);
    }
  });

  it('proves post-command compatible rollback refolds the recorded head and subsequent commands round-trip', async () => {
    // event-store/spec.md, Combat Rollback Preserves Journal Authority:
    // Rollback occurs after a journal command.
    const matchId = 'post-command-compatible';
    const target = databaseFile('post-command-compatible');
    const store = new DurableMatchStore({ path: target.file });
    try {
      matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
      const host = await createHost(store, matchId, true);
      await host.handleIntent(advance('command-1', matchId));
      await host.handleIntent(advance('command-2', matchId));
      const head = {
        digest: hostDigest(host),
        revision: (await store.getEvents(matchId)).at(-1)?.sequence,
        generation: (await store.getJournalAuthorityStarted(matchId))?.head
          .effectiveGeneration,
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
        generation: (await store.getJournalAuthorityStarted(matchId))?.head
          .effectiveGeneration,
      }).not.toEqual(head);
      expect(roundTrip.some((message) => message.kind === 'Event')).toBe(true);
      expect(frames.sent.length).toBeGreaterThan(0);
    } finally {
      store.close();
      removeDatabase(target.dir);
    }
  });

  it.each([
    {
      name: 'unsupported effective generation',
      corrupt: (file: string, matchId: string) =>
        sql(
          file,
          'UPDATE mp_journal_authority_started SET effective_generation = 2 WHERE match_id = ?',
          matchId,
        ),
      reason: 'unsupported-effective-generation',
    },
    {
      name: 'refold digest mismatch',
      corrupt: (file: string, matchId: string) =>
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
      const store = new DurableMatchStore({ path: target.file });
      try {
        matchJournalAuthority._setCombatJournalAuthorityModeForTests('enabled');
        const host = await createHost(store, matchId, true);
        await host.handleIntent(advance('command-1', matchId));
        const legacyDigest = digestRetainedMatchHistory(
          await store.getEvents(matchId),
        );
        corrupt(target.file, matchId);
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
        store.close();
        removeDatabase(target.dir);
      }
    },
  );
});
