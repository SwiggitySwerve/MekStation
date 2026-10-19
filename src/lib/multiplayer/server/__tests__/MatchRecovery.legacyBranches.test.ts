/**
 * MP-RECOVERY-UNITS-2: real activated-branch boot and legacy custom definitions.
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/specs/multiplayer-server/spec.md
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */
import { readFileSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { readEffectiveStreamHead } from '@/lib/events/journal/EventHistoryEffectiveStreamHead';
import { SQLiteEventHistoryBranchStore } from '@/lib/events/journal/SQLiteEventHistoryBranchStore';
import { buildGmCombatRewindCommitDeps } from '@/pages-modules/api/rewindCommitDeps';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { resetCanonicalUnitService } from '@/services/units/CanonicalUnitService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import {
  GameEventType,
  GamePhase,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing } from '@/types/gameplay/HexGridInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import type { IMatchMeta } from '../IMatchStore';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { DurableMatchStore } from '../DurableMatchStore';
import { commitGmCombatRewind } from '../history/GmCombatRewindCommit';
import { matchStreamRef } from '../history/GmCombatRewindPreview';
import { _setCombatJournalAuthorityModeForTests } from '../matchJournalAuthority';
import {
  recoverActiveMatches,
  rebuildSessionFromEvents,
} from '../MatchRecovery';
import {
  buildDefaultMatchUnitBootstrap,
  buildMatchHostBootstrapFromMeta,
} from '../matchUnitBootstrap';

const AT = '2026-10-18T00:00:00.000Z';
let dir: string, store: DurableMatchStore;
const realFetch = global.fetch;

function meta(id: string, unitRef?: string): IMatchMeta {
  return {
    matchId: id,
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
    layout: '1v1',
    seats: defaultSeats('1v1').map((s, i) => ({
      ...s,
      occupant: { playerId: i === 0 ? 'host' : 'guest', displayName: 'Seat' },
      ready: true,
    })),
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 4).map((u) =>
      unitRef && u.side === 'player' ? { ...u, unitRef } : u,
    ),
  };
}

async function engineFor(m: IMatchMeta): Promise<InteractiveSession> {
  const boot = await buildMatchHostBootstrapFromMeta(m);
  let roll = 0;
  return new InteractiveSession(
    4,
    8,
    boot.random,
    boot.grid,
    boot.playerUnits,
    boot.opponentUnits,
    boot.gameUnits,
    {},
    () => [6, 6, 1, 1][roll++ % 4],
  );
}

async function writeLegacy(
  m: IMatchMeta,
  events: readonly IGameEvent[],
): Promise<void> {
  await store.createMatch(m);
  for (const e of events) await store.appendEvent(m.matchId, e);
}

function withoutSnapshot(events: readonly IGameEvent[]): IGameEvent[] {
  return events.map((e) => {
    if (e.type !== GameEventType.GameCreated) return e;
    const payload = e.payload as IGameCreatedPayload;
    return {
      ...e,
      payload: {
        ...payload,
        units: payload.units.map(
          ({ customUnitDefinition: _snapshot, ...unit }) => unit,
        ),
      },
    };
  });
}

function refuseHttp(): jest.Mock {
  resetCanonicalUnitService();
  const fetch = jest.fn(async () => {
    throw new Error('no HTTP listener');
  });
  global.fetch = fetch as unknown as typeof global.fetch;
  return fetch;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'mp-recovery2-legacy-'));
  resetUnitRepository();
  resetSQLiteService();
  getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
  _setCombatJournalAuthorityModeForTests('off');
  global.fetch = (async (input) => {
    const url = new URL(String(input), 'http://localhost');
    const data = readFileSync(
      path.join(process.cwd(), 'public', decodeURIComponent(url.pathname)),
      'utf8',
    );
    return {
      ok: true,
      status: 200,
      json: async () => JSON.parse(data) as unknown,
    } as Response;
  }) as typeof fetch;
});
afterEach(async () => {
  global.fetch = realFetch;
  resetCanonicalUnitService();
  _setCombatJournalAuthorityModeForTests(null);
  store.close();
  resetUnitRepository();
  resetSQLiteService();
  if (!dir.startsWith(path.join(tmpdir(), 'mp-recovery2-legacy-')))
    throw new Error('Unexpected cleanup path');
  await rm(dir, { recursive: true, force: true });
});

it('boots the real activated prefix with unit capabilities and preserves the missing-receipt fence', async () => {
  const m = meta('recovery2-rewound-boot'),
    engine = await engineFor(m);
  for (let i = 0; i < 6 && engine.getState().phase !== GamePhase.Movement; i++)
    engine.advancePhase();
  expect(engine.getState().phase).toBe(GamePhase.Movement);
  const prefix = [...engine.getSession().events],
    targetRevision = prefix.length;
  engine.advancePhase();
  _setCombatJournalAuthorityModeForTests('enabled');
  await store.createMatch(m);
  expect(
    await store.appendCommandBatch(m.matchId, {
      commandId: 'opening-log',
      actorId: 'host',
      expectedRevision: 0,
      events: engine.getSession().events,
    }),
  ).toMatchObject({ kind: 'committed' });
  const db = getSQLiteService().getDatabase(),
    branches = new SQLiteEventHistoryBranchStore(db),
    stream = matchStreamRef(m.matchId);
  const head = readEffectiveStreamHead(db, branches, stream),
    effective = branches.readEffectiveHead(stream)!;
  const result = await commitGmCombatRewind(
    buildGmCombatRewindCommitDeps({
      store,
      meta: m,
      priorHeadRevision: head.revision,
      nowIso: () => AT,
    }),
    {
      actorId: 'host',
      role: 'gm',
      gameId: m.matchId,
      ownedStateRefs: [`game:${m.matchId}`],
    },
    {
      matchId: m.matchId,
      targetRevision,
      expectedBranchId: head.branchId,
      expectedRevision: head.revision,
      expectedDigest: head.digest,
      expectedGeneration: effective.effectiveGeneration,
      actor: 'host',
      reason: 'boot fixture',
    },
  );
  expect(result.kind).toBe('committed');
  if (result.kind !== 'committed') throw new Error('Rewind fixture failed');
  store.close();
  resetUnitRepository();
  resetSQLiteService();
  getSQLiteService({ path: path.join(dir, 'journal.db') }).initialize();
  store = new DurableMatchStore({ path: path.join(dir, 'matches.db') });
  _setCombatJournalAuthorityModeForTests('off');
  const fetch = refuseHttp(),
    boot = await recoverActiveMatches(store);
  expect(boot.failed).toEqual([]);
  const host = boot.hosts.get(m.matchId)!;
  expect(host).toBeDefined();
  expect(host.servedBranchId()).toBe(result.activatedBranchId);
  expect(host.getSessionForTests().events.map((e) => e.id)).toEqual(
    prefix.map((e) => e.id),
  );
  expect(host.getSessionForTests().currentState.phase).toBe(GamePhase.Movement);
  const unitId = 'player-1-atlas-as7-d',
    from = host.getSessionForTests().currentState.units[unitId].position;
  const recoveredEngine = (host as unknown as { session: InteractiveSession })
    .session;
  expect(recoveredEngine.getMovementCapability(unitId)).not.toBeNull();
  expect(recoveredEngine.getUnitWeapons(unitId).length).toBeGreaterThan(0);
  // A crash immediately after branch activation has no matching command receipt.
  // Unit hydration must not bypass that separate, pre-existing rollback fence.
  const messages = await host.handleIntent({
    kind: 'Intent',
    matchId: m.matchId,
    playerId: 'host',
    ts: AT,
    intent: {
      kind: 'Move',
      unitId,
      to: { q: from.q, r: from.r - 1 },
      facing: Facing.North,
      movementType: 'walk',
    },
  });
  expect(messages).toEqual([
    expect.objectContaining({
      kind: 'Error',
      code: 'INTERNAL_ERROR',
      reason: 'rollback-reader-blocked:missing-journal-head',
    }),
  ]);
  expect(host.getSessionForTests().events.map((e) => e.id)).toEqual(
    prefix.map((e) => e.id),
  );
  expect(fetch).not.toHaveBeenCalled();
});

it('recovers a custom-ref without a recorded snapshot through the stored definition', async () => {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'Recovery2',
    data: { ...atlas, variant: 'Recovery2' },
  });
  expect(created.success).toBe(true);
  if (!created.success || !created.data)
    throw new Error('Custom fixture failed');
  const m = meta('recovery2-custom-present', created.data.id),
    engine = await engineFor(m);
  const events = withoutSnapshot(engine.getSession().events);
  await writeLegacy(m, events);
  const fetch = refuseHttp(),
    boot = await recoverActiveMatches(store);
  expect(boot.failed).toEqual([]);
  expect(boot.hosts.get(m.matchId)).toBeDefined();
  const rebuilt = await rebuildSessionFromEvents(m.matchId, events);
  expect(rebuilt.getMovementCapability('player-1-atlas-as7-d')).not.toBeNull();
  expect(rebuilt.getUnitWeapons('player-1-atlas-as7-d').length).toBeGreaterThan(
    0,
  );
  expect(fetch).not.toHaveBeenCalled();
});

it('fails only the missing-definition custom match instead of silently skipping it', async () => {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'Recovery2Missing',
    data: { ...atlas, variant: 'Recovery2Missing' },
  });
  if (!created.success || !created.data)
    throw new Error('Custom fixture failed');
  const bad = meta('recovery2-custom-missing', created.data.id),
    good = meta('recovery2-healthy');
  await writeLegacy(
    bad,
    withoutSnapshot((await engineFor(bad)).getSession().events),
  );
  await writeLegacy(good, (await engineFor(good)).getSession().events);
  expect(getUnitRepository().delete(created.data.id).success).toBe(true);
  const fetch = refuseHttp(),
    boot = await recoverActiveMatches(store);
  expect(boot.failed).toEqual([bad.matchId]);
  expect(boot.hosts.has(bad.matchId)).toBe(false);
  expect(boot.hosts.has(good.matchId)).toBe(true);
  expect(fetch).not.toHaveBeenCalled();
});
