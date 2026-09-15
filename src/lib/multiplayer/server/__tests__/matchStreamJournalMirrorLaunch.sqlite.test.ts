/**
 * S7-a1 of `adopt-combat-journal-cutover-and-gm-rewind` (task 1.7
 * preparation): the mirror must be able to represent a REAL match
 * launch.
 *
 * WHAT WAS MEASURED. The R2.combat residual lane's incidental finding
 * F1 (`evidence/r2-combat-residual-rows-local-20260915.json`) called
 * `mirrorMatchBatchToJournal` with the in-memory events of a real
 * `buildMatchHostBootstrapFromMeta` launch and got
 * `JCS cannot represent undefined`: a live launch log carries
 * own-enumerable properties whose value is `undefined`
 * (`game_created.actorId`, `payload.config.seed`, and each unit's
 * `movementMode` / `initiativeEquipment` / `c3Equipment`), and
 * `EventJournalCanonicalizer`'s `default:` arm refuses any `typeof`
 * outside {boolean, number, string, object}.
 *
 * WHY IT MATTERS RATHER THAN BEING COSMETIC. `DurableMatchStore`
 * persists an event as `JSON.stringify(event)` and reads it back with
 * `JSON.parse` — so the store's own durable form of a launch event is
 * already the event MINUS its undefined properties. The mirror is the
 * only reader that sees the in-memory form, and it is the one that
 * refuses it. At mode 'shadow' every match's launch batch would miss
 * the mirror and bump the counter S6 consults before any promotion.
 *
 * WHAT THIS SUITE PINS. That a real launch batch mirrors; that its
 * mirrored payload is identical to the store's round-tripped form (so
 * the mirrored digest describes what the store persists); that the
 * tripwire stays clean for it; and that a genuinely non-representable
 * value is STILL refused typed rather than smuggled through.
 *
 * Real boundary only, as S1/S5/S6 did: temp-file SQLite opened the way
 * production opens it.
 *
 * @spec openspec/changes/adopt-combat-journal-cutover-and-gm-rewind/design.md (S1, S6)
 */

import Database from 'better-sqlite3';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InteractiveSession } from '@/engine/InteractiveSession';
import { EventJournalCanonicalizationError } from '@/lib/events/journal/EventJournalCanonicalizer';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import { type IGameEvent } from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { DurableMatchStore } from '../DurableMatchStore';
import { storeExpectedRevision } from '../matchCommitJournalHead';
import {
  _resetProcessShadowStatsForTests,
  _setCombatJournalAuthorityModeForTests,
  getProcessShadowMismatchCount,
} from '../matchJournalAuthority';
import { mirrorMatchBatchToJournal } from '../MatchStreamJournalMirror';
import { buildMatchHostBootstrapFromMeta } from '../matchUnitBootstrap';

const MATCH_ID = 'match-launch-mirror';
const AT = '3025-09-15T00:00:00.000Z';
const MAP_RADIUS = 4;

/**
 * The unit the launch is built from, persisted through the production
 * repository exactly as the R2.combat residual lane's fixture does —
 * the catalog refs the default bootstrap uses are not resolvable in a
 * jest process, and F1 was measured on this path.
 */
function persistCustomUnit(): string {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: 'AS7-LAUNCH-MIRROR',
    data: { ...atlas, id: 'ignored-inner-id', variant: 'Launch Mirror' },
    notes: 'launch mirror fixture',
  });
  if (!created.success || !created.data) {
    throw new Error(
      `custom unit create failed: ${created.error?.message ?? 'unknown'}`,
    );
  }
  return created.data.id;
}

function matchMeta(unitRef: string): IMatchMeta {
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: MAP_RADIUS, turnLimit: 5 },
    unitBootstrap: [
      {
        unitId: 'player-1-launch',
        unitRef,
        side: 'player',
        pilotRef: 'pilot-player',
        gunnery: 3,
        piloting: 4,
        startHex: { q: -2, r: 0 },
      },
      {
        unitId: 'opponent-1-launch',
        unitRef,
        side: 'opponent',
        pilotRef: 'pilot-opponent',
        gunnery: 4,
        piloting: 5,
        startHex: { q: 2, r: 0 },
      },
    ],
  };
}

/** The production launch log: the events a real `InteractiveSession`
 * emits at construction, through the production bootstrap builder. */
async function launchEvents(): Promise<readonly IGameEvent[]> {
  const bootstrap = await buildMatchHostBootstrapFromMeta(matchMeta(unitRef));
  const session = new InteractiveSession(
    bootstrap.mapRadius,
    bootstrap.turnLimit,
    bootstrap.random,
    bootstrap.grid,
    bootstrap.playerUnits,
    bootstrap.opponentUnits,
    bootstrap.gameUnits,
  );
  return session.getSession().events;
}

/** Every own-enumerable path in `value` whose value is `undefined`. */
function undefinedPaths(value: unknown, prefix = ''): readonly string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) =>
      undefinedPaths(item, `${prefix}[${index}]`),
    );
  }
  if (value === null || typeof value !== 'object') return [];
  return Object.keys(value).flatMap((key) => {
    const child = (value as Record<string, unknown>)[key];
    const here = prefix === '' ? key : `${prefix}.${key}`;
    return child === undefined ? [here] : undefinedPaths(child, here);
  });
}

let sqliteDir = '';
let campaignPath = '';
let unitRef = '';
let store: DurableMatchStore | undefined;

function primary(): Database.Database {
  return getSQLiteService().getDatabase();
}

function mirroredPayloads(): readonly { matchEvent: IGameEvent }[] {
  const db = new Database(campaignPath, { fileMustExist: true });
  try {
    const rows = db
      .prepare(
        `SELECT payload_json AS payloadJson
           FROM event_journal_events
          WHERE stream_type = 'match' AND stream_id = ?
          ORDER BY commit_position`,
      )
      .all(MATCH_ID) as readonly { payloadJson: string }[];
    return rows.map(
      (row) => JSON.parse(row.payloadJson) as { matchEvent: IGameEvent },
    );
  } finally {
    db.close();
  }
}

beforeEach(async () => {
  sqliteDir = await mkdtemp(path.join(tmpdir(), 'match-launch-mirror-'));
  campaignPath = path.join(sqliteDir, 'mekstation.db');
  resetSQLiteService();
  resetUnitRepository();
  getSQLiteService({ path: campaignPath }).initialize();
  // 'shadow', never 'enabled': this slice mirrors, it does not cut over.
  _setCombatJournalAuthorityModeForTests('shadow');
  _resetProcessShadowStatsForTests();
  unitRef = persistCustomUnit();
  store = new DurableMatchStore({
    path: path.join(sqliteDir, 'multiplayer-matches.db'),
    capabilityDb: primary,
  });
  await store.createMatch(matchMeta(unitRef));
});

afterEach(async () => {
  _setCombatJournalAuthorityModeForTests(null);
  _resetProcessShadowStatsForTests();
  store?.close();
  store = undefined;
  resetUnitRepository();
  resetSQLiteService();
  await rm(sqliteDir, { recursive: true, force: true });
});

describe('the mirror can represent a real match launch', () => {
  it('the launch log really does carry explicitly-undefined properties', async () => {
    // The fixture guard: if a later change stops emitting these, the
    // rows below would pass for a reason that has nothing to do with
    // the defect they exist to pin.
    const paths = undefinedPaths(await launchEvents());

    expect(paths).toContain('[0].actorId');
    expect(paths).toContain('[0].payload.config.seed');
    expect(
      paths.filter((entry) => entry.endsWith('.movementMode')),
    ).toHaveLength(2);
    expect(paths.length).toBeGreaterThanOrEqual(9);
  });

  it('mirrors a real launch batch without throwing and lands every event', async () => {
    const events = await launchEvents();

    const mirrored = await mirrorMatchBatchToJournal(primary(), {
      matchId: MATCH_ID,
      commandId: `create:${MATCH_ID}`,
      actorId: 'p1',
      expected: storeExpectedRevision(0),
      events,
    });

    expect(mirrored).toEqual({ kind: 'mirrored' });
    expect(mirroredPayloads()).toHaveLength(events.length);
  });

  it('mirrors the event in exactly the form the store persists', async () => {
    const events = await launchEvents();

    await mirrorMatchBatchToJournal(primary(), {
      matchId: MATCH_ID,
      commandId: `create:${MATCH_ID}`,
      actorId: 'p1',
      expected: storeExpectedRevision(0),
      events,
    });

    // `DurableMatchStore` writes `JSON.stringify(event)` and reads it
    // back with `JSON.parse`, so this IS the store's durable form. The
    // digest is taken over the same material, which is what lets a
    // journal head and a store-derived head describe one history.
    expect(mirroredPayloads().map((payload) => payload.matchEvent)).toEqual(
      events.map((event) => JSON.parse(JSON.stringify(event)) as IGameEvent),
    );
  });

  it('keeps the shadow mismatch counter clean for a committed launch batch', async () => {
    const events = await launchEvents();

    const committed = await store!.appendCommandBatch!(MATCH_ID, {
      commandId: `create:${MATCH_ID}`,
      actorId: 'p1',
      expectedRevision: 0,
      events,
      expectedPostStateDigest: 'launch-digest',
    });

    expect(committed.kind).toBe('committed');
    // F1's latency claim: the throw never failed the command, it landed
    // on the tripwire S6 consults before any promotion.
    expect(getProcessShadowMismatchCount()).toBe(0);
  });

  it('still refuses a genuinely non-representable value, typed', async () => {
    const [first, ...rest] = await launchEvents();
    // A FUNCTION, deliberately: `JSON.stringify` drops it in silence
    // exactly as it drops an undefined, so any fix that round-trips the
    // batch through JSON would smuggle this one through instead of
    // refusing it. Dropping only `undefined` keeps the refusal.
    const poisoned = {
      ...first,
      payload: { ...(first.payload as object), corrupt: () => 1 },
    } as unknown as IGameEvent;

    await expect(
      mirrorMatchBatchToJournal(primary(), {
        matchId: MATCH_ID,
        commandId: `create:${MATCH_ID}`,
        actorId: 'p1',
        expected: storeExpectedRevision(0),
        events: [poisoned, ...rest],
      }),
    ).rejects.toThrow(EventJournalCanonicalizationError);
    expect(mirroredPayloads()).toHaveLength(0);
  });
});
