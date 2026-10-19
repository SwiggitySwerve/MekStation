/**
 * MP-RECOVERY-UNITS-2: a real activated journal branch rebuilds without HTTP.
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/specs/multiplayer-server/spec.md
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { buildGmCombatRewindCommitDeps } from '@/pages-modules/api/rewindCommitDeps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GamePhase } from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';
import type { IRewindRebuildHost } from '../ServerMatchHostRewindRebuild';

import { DurableMatchStore } from '../DurableMatchStore';
import { commitGmCombatRewind } from '../history/GmCombatRewindCommit';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import { foldMatchSession } from '../MatchSessionProjector';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
  recoverServerInteractiveSession,
} from '../matchUnitBootstrap';
import { rebuildHostFromActivatedBranch } from '../ServerMatchHostRewindRebuild';

const ID = 'recovery2-live-rewind',
  AT = '2026-10-18T00:00:00.000Z';
let dir: string, store: DurableMatchStore;
const realFetch = global.fetch;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'mp-recovery2-live-'));
  resetSQLiteService();
  getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
  _setCombatJournalAuthorityModeForTests('enabled');
  global.fetch = (async (input) => {
    const url = new URL(String(input), 'http://localhost');
    const body = readFileSync(
      path.join(process.cwd(), 'public', decodeURIComponent(url.pathname)),
      'utf8',
    );
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(body) as unknown,
    } as Response;
  }) as typeof fetch;
});
afterEach(async () => {
  global.fetch = realFetch;
  resetCanonicalUnitService();
  _setCombatJournalAuthorityModeForTests(null);
  store.close();
  resetSQLiteService();
  if (!dir.startsWith(path.join(tmpdir(), 'mp-recovery2-live-')))
    throw new Error('Unexpected cleanup path');
  await rm(dir, { recursive: true, force: true });
});

it('rebuilds the activated prefix from disk and retains the journal random seed and reset protocol', async () => {
  const meta: IMatchMeta = {
    matchId: ID,
    hostPlayerId: 'host',
    playerIds: ['host', 'guest'],
    sideAssignments: [
      { playerId: 'host', side: 'player' },
      { playerId: 'guest', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 8 },
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 4),
  };
  const boot = await buildMatchHostBootstrapFromMeta(meta);
  const initial = new InteractiveSession(
    4,
    8,
    new SeededRandom(42),
    boot.grid,
    boot.playerUnits,
    boot.opponentUnits,
    boot.gameUnits,
  );
  for (
    let step = 0;
    step < 6 && initial.getState().phase !== GamePhase.Movement;
    step++
  )
    initial.advancePhase();
  expect(initial.getState().phase).toBe(GamePhase.Movement);
  const prefix = [...initial.getSession().events],
    targetRevision = prefix.length;
  initial.advancePhase();
  await store.createMatch(meta);
  expect(
    await store.appendCommandBatch(ID, {
      commandId: 'opening-log',
      actorId: 'host',
      expectedRevision: 0,
      events: initial.getSession().events,
    }),
  ).toMatchObject({ kind: 'committed' });
  const db = getSQLiteService().getDatabase(),
    branches = new SQLiteEventHistoryBranchStore(db),
    stream = matchStreamRef(ID);
  const head = readEffectiveStreamHead(db, branches, stream),
    effective = branches.readEffectiveHead(stream)!;
  const result = await commitGmCombatRewind(
    buildGmCombatRewindCommitDeps({
      store,
      meta,
      priorHeadRevision: head.revision,
      nowIso: () => AT,
    }),
    { actorId: 'host', role: 'gm', gameId: ID, ownedStateRefs: [`game:${ID}`] },
    {
      matchId: ID,
      targetRevision,
      expectedBranchId: head.branchId,
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: effective.effectiveGeneration,
      actor: 'host',
      reason: 'test activated prefix',
    },
  );
  expect(result.kind).toBe('committed');
  if (result.kind !== 'committed') throw new Error('Rewind fixture failed');

  resetCanonicalUnitService();
  const fetch = jest.fn(async () => {
    throw new Error('no HTTP listener');
  });
  global.fetch = fetch as unknown as typeof global.fetch;
  const order: string[] = [];
  let rebuilt: InteractiveSession | undefined;
  const host: IRewindRebuildHost = {
    matchId: ID,
    store,
    journalRandomSeed: 4242,
    journalDiceSeed: 7,
    nowIso: () => AT,
    replaceSession: (session) => {
      rebuilt = session;
      order.push('replace');
    },
    setServedBranchId: (branch) => {
      expect(branch).toBe(result.activatedBranchId);
      order.push('branch');
    },
    reseedDice: (seed) => {
      expect(seed).toBe(7);
      order.push('dice');
    },
    resetIntentWindow: (events) => {
      expect(events.map((e) => e.id)).toEqual(prefix.map((e) => e.id));
      order.push('intents');
    },
    resetBroadcastCursor: (seq) => {
      expect(seq).toBe(prefix.at(-1)!.sequence);
      order.push('cursor');
    },
    setRewindReplayCeiling: (seq) => {
      expect(seq).toBe(prefix.at(-1)!.sequence);
      order.push('ceiling');
    },
    discardViewerDeliveries: () => {
      order.push('discard');
    },
    markViewersForResync: (ids) => {
      expect(ids).toEqual(['host', 'guest']);
      order.push('resync');
    },
    replayToAttachedViewers: async () => {
      expect(rebuilt).toBeDefined();
      order.push('replay');
    },
  };
  await rebuildHostFromActivatedBranch(host, {
    branchId: result.activatedBranchId,
    effectiveRevision: targetRevision,
    effectiveGeneration: result.effectiveGeneration,
  });
  expect(fetch).not.toHaveBeenCalled();
  expect(rebuilt!.getSession().events.map((e) => e.id)).toEqual(
    prefix.map((e) => e.id),
  );
  expect(rebuilt!.getMovementCapability('player-1-atlas-as7-d')).not.toBeNull();
  expect(
    rebuilt!.getUnitWeapons('player-1-atlas-as7-d').length,
  ).toBeGreaterThan(0);
  expect(order).toEqual([
    'replace',
    'branch',
    'dice',
    'intents',
    'cursor',
    'ceiling',
    'discard',
    'resync',
    'replay',
  ]);
  const folded = foldMatchSession(ID, prefix),
    control = await recoverServerInteractiveSession({
      ...folded,
      config: { ...folded.config, seed: 4242 },
    });
  const shape = (events: readonly IGameEvent[]) =>
    events.map(({ type, payload }) => ({ type, payload }));
  for (let step = 0; step < 7; step++) {
    rebuilt!.advancePhase();
    control.advancePhase();
  }
  expect(shape(rebuilt!.getSession().events.slice(prefix.length))).toEqual(
    shape(control.getSession().events.slice(prefix.length)),
  );
});
