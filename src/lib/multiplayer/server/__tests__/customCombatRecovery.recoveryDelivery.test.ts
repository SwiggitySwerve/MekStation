/**
 * The RECOVERY STREAMS audience of `enable-saved-custom-unit-combat`
 * tasks line 6, which was inferred rather than asserted.
 *
 * Line 6 names four audiences: owners, opponents, spectators and
 * RECOVERY STREAMS. `customConstructionVisibility.test.ts` calls the fog
 * filter directly, and `customConstructionTransport.test.ts` drives a
 * host built by `ServerMatchHost.create` - its third channel is
 * `reconnect` on a LIVE host, not recovery. `MatchRecovery.ts` names
 * neither `fogOfWar` nor `redact`, so the recovery stream's redaction
 * rested on the transitive argument that a recovered host shares
 * `ServerMatchHostReplay`'s filter with a live one.
 *
 * This asserts it THROUGH the recovery path instead: the same three
 * viewers are served by a host that `recoverActiveMatches` rebuilt from
 * real durable SQLite after a cold reopen, with both saved designs
 * deleted from the mutable library first, and their deliveries are
 * compared against what the live host sent the same three viewers.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import {
  GameEventType,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import type { IMatchMeta } from '../IMatchStore';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { DurableMatchStore } from '../DurableMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { recoverActiveMatches } from '../MatchRecovery';
import { buildMatchHostBootstrapFromMeta } from '../matchUnitBootstrap';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

const AT = '3025-09-09T00:00:00.000Z';
const MATCH_ID = 'custom-combat-recovery-delivery';

type Viewer = 'owner' | 'opponent' | 'watcher';
const VIEWERS: readonly Viewer[] = ['owner', 'opponent', 'watcher'];

let dir = '';
let sqlitePath = '';
let matchDbPath = '';
let store: DurableMatchStore;

function libraryPayload(
  variant: string,
  leftArm: number,
): Record<string, unknown> {
  return {
    ...atlas,
    id: 'ignored-inner-id',
    variant,
    armor: {
      ...atlas.armor,
      allocation: { ...atlas.armor.allocation, LEFT_ARM: leftArm },
    },
  };
}

/** Persist one saved design and return the `custom-` reference it got. */
function persistCustomUnit(variant: string, leftArm: number): string {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant,
    data: libraryPayload(variant, leftArm),
    notes: 'recovery-delivery redaction fixture',
  });
  if (!created.success || !created.data) {
    throw new Error(
      `custom unit create failed: ${created.error?.message ?? 'unknown'}`,
    );
  }
  return created.data.id;
}

function createdPayload(events: readonly IGameEvent[]): IGameCreatedPayload {
  const created = events.find(
    (event) => event.type === GameEventType.GameCreated,
  );
  if (!created) {
    throw new Error('expected GameCreated in the persisted log');
  }
  return created.payload as IGameCreatedPayload;
}

function makeSocket(): IMatchSocket & { sent: IServerMessage[] } {
  const sent: IServerMessage[] = [];
  return {
    send: (data) => {
      sent.push(JSON.parse(data) as IServerMessage);
    },
    close: () => {},
    readyState: 1,
    sent,
  };
}

/**
 * Every `customUnitDefinition.id` anywhere in a delivered structure.
 * Same shape the live transport suite uses, so the two answers are
 * directly comparable rather than merely similar.
 */
function snapshotIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(snapshotIds);
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  const snapshot = record.customUnitDefinition as { id?: string } | undefined;
  return [
    ...(snapshot?.id ? [snapshot.id] : []),
    ...Object.entries(record)
      .filter(([key]) => key !== 'customUnitDefinition')
      .flatMap(([, child]) => snapshotIds(child)),
  ];
}

function matchMeta(ownerRef: string, opponentRef: string): IMatchMeta {
  const seats = addSpectatorSeat(
    defaultSeats('1v1').map((seat, index) => ({
      ...seat,
      occupant: {
        playerId: index === 0 ? 'owner' : 'opponent',
        displayName: index === 0 ? 'Owner' : 'Opponent',
      },
    })),
    { playerId: 'watcher', displayName: 'Watcher' },
  );
  return {
    matchId: MATCH_ID,
    hostPlayerId: 'owner',
    playerIds: ['owner', 'opponent'],
    sideAssignments: [
      { playerId: 'owner', side: 'player' },
      { playerId: 'opponent', side: 'opponent' },
    ],
    status: 'active',
    createdAt: AT,
    updatedAt: AT,
    config: { mapRadius: 4, turnLimit: 5, fogOfWar: true },
    layout: '1v1',
    seats,
    unitBootstrap: [
      {
        unitId: 'owner-unit',
        unitRef: ownerRef,
        side: 'player',
        pilotRef: 'owner-pilot',
        startHex: { q: -2, r: 0 },
      },
      {
        unitId: 'opponent-unit',
        unitRef: opponentRef,
        side: 'opponent',
        pilotRef: 'opponent-pilot',
        startHex: { q: 2, r: 0 },
      },
    ],
  };
}

/** What each audience actually receives on its join-replay stream. */
async function deliveredSnapshotIds(
  host: ServerMatchHost,
): Promise<Record<Viewer, string[]>> {
  const delivered = {} as Record<Viewer, string[]>;
  for (const viewer of VIEWERS) {
    const socket = makeSocket();
    expect(await host.admitSocket(socket, viewer)).not.toBeNull();
    await host.handleSessionJoin(socket, viewer, undefined);
    expect(socket.sent.some((message) => message.kind === 'ReplayEnd')).toBe(
      true,
    );
    delivered[viewer] = snapshotIds(socket.sent);
  }
  return delivered;
}

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), 'custom-combat-recovery-stream-'));
  sqlitePath = path.join(dir, 'mekstation.db');
  matchDbPath = path.join(dir, 'matches.db');
  resetUnitRepository();
  resetSQLiteService();
  getSQLiteService({ path: sqlitePath }).initialize();
  store = new DurableMatchStore({ path: matchDbPath });
});

afterEach(async () => {
  store.close();
  resetUnitRepository();
  resetSQLiteService();
  await rm(dir, { recursive: true, force: true, maxRetries: 3 });
});

describe('the recovery delivery stream redacts like the live one', () => {
  it('serves owner, opponent and spectator the same redaction after recovery', async () => {
    const ownerRef = persistCustomUnit('AS7-OWNER', 30);
    const opponentRef = persistCustomUnit('AS7-OPPONENT', 24);
    const meta = matchMeta(ownerRef, opponentRef);
    await store.createMatch(meta);

    const live = ServerMatchHost.create(
      MATCH_ID,
      store,
      await buildMatchHostBootstrapFromMeta(meta),
    );
    // `create` persists GameCreated on its own microtask chain.
    for (let attempt = 0; attempt < 50; attempt += 1) {
      if ((await store.getEvents(MATCH_ID)).length > 0) break;
      await Promise.resolve();
    }
    expect(
      snapshotIds(createdPayload(await store.getEvents(MATCH_ID))),
    ).toEqual([ownerRef, opponentRef]);

    // Captured, not yet asserted: the RECOVERED delivery is what this
    // row is about, so it is the one compared against the literal
    // first. Asserting the live host here instead would let a mutation
    // that removes the redaction die on the live path and never reach
    // the recovery claim - which is the inference this row replaces.
    const liveDelivery = await deliveredSnapshotIds(live);

    // Delete both designs: a recovery stream that reached the mutable
    // library rather than the recorded history would now serve nothing.
    expect(getUnitRepository().delete(ownerRef).success).toBe(true);
    expect(getUnitRepository().delete(opponentRef).success).toBe(true);

    // Cold reopen - nothing in an open handle may answer for this.
    store.close();
    resetUnitRepository();
    resetSQLiteService();
    getSQLiteService({ path: sqlitePath }).initialize();
    store = new DurableMatchStore({ path: matchDbPath });

    const recovered = await recoverActiveMatches(store);
    expect(recovered.failed).toEqual([]);
    const host = recovered.hosts.get(MATCH_ID);
    expect(host).toBeDefined();

    const recoveredDelivery = await deliveredSnapshotIds(host!);
    expect(recoveredDelivery).toEqual({
      owner: [ownerRef],
      opponent: [opponentRef],
      watcher: [],
    });
    // ... and that is exactly what the live host sent the same three.
    expect(recoveredDelivery).toEqual(liveDelivery);

    // Redaction is per-delivery, never destructive: the durable history
    // the recovered host replays from still carries both snapshots.
    expect(
      snapshotIds(createdPayload(await store.getEvents(MATCH_ID))),
    ).toEqual([ownerRef, opponentRef]);
  });
});
