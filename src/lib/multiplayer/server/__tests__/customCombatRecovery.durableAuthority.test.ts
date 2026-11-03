/**
 * Durable SQLite match-store recovery of recorded custom construction.
 *
 * Launch captures a server-validated snapshot into GameCreated, persists
 * it through DurableMatchStore, closes and reopens the match file, mutates
 * and deletes the mutable custom library, then recovers the active session
 * from the recorded history. In-memory recovery is not the proof here.
 *
 * @spec openspec/changes/enable-saved-custom-unit-combat/specs/custom-unit-combat/spec.md
 */

import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  getSQLiteService,
  resetSQLiteService,
} from '@/services/persistence/SQLiteService';
import { parseCustomCombatDefinition } from '@/services/units/customCombatDefinition';
import { readServerCustomCombatDefinition } from '@/services/units/serverCustomCombatDefinition';
import {
  getUnitRepository,
  resetUnitRepository,
} from '@/services/units/UnitRepository';
import {
  GameEventType,
  type IGameCreatedPayload,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import type { IMatchMeta } from '../IMatchStore';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { DurableMatchStore } from '../DurableMatchStore';
import {
  rebuildSessionFromEvents,
  recoverActiveMatches,
} from '../MatchRecovery';
import { buildMatchHostBootstrapFromMeta } from '../matchUnitBootstrap';

const MATCH_ID = 'custom-combat-durable-authority';
const AT = '3025-09-09T00:00:00.000Z';
const PLAYER_INSTANCE_ID = 'player-1-custom-atlas';
const OPPONENT_INSTANCE_ID = 'opponent-1-custom-atlas';

function libraryPayload(leftArm: number): Record<string, unknown> {
  return {
    ...atlas,
    id: 'ignored-inner-id',
    variant: 'Durable Pattern',
    armor: {
      ...atlas.armor,
      allocation: {
        ...atlas.armor.allocation,
        LEFT_ARM: leftArm,
      },
    },
  };
}

function persistCustomUnit(leftArm: number): string {
  const created = getUnitRepository().create({
    chassis: 'Atlas',
    variant: `AS7-DURABLE-${leftArm}`,
    data: libraryPayload(leftArm),
    notes: 'custom combat durable recovery fixture',
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
    config: { mapRadius: 6, turnLimit: 8 },
    unitBootstrap: [
      {
        unitId: PLAYER_INSTANCE_ID,
        unitRef,
        side: 'player',
        pilotRef: 'pilot-player',
        gunnery: 3,
        piloting: 4,
        startHex: { q: -2, r: 0 },
      },
      {
        unitId: OPPONENT_INSTANCE_ID,
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

async function persistLaunchedSession(
  store: DurableMatchStore,
  unitRef: string,
): Promise<readonly IGameEvent[]> {
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
  const events = session.getSession().events;
  await store.createMatch(matchMeta(unitRef));
  for (const event of events) {
    await store.appendEvent(MATCH_ID, event);
  }
  return events;
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

function customUnitFromPayload(
  payload: IGameCreatedPayload,
  instanceId: string,
) {
  const unit = payload.units.find((entry) => entry.id === instanceId);
  if (!unit || unit.customUnitDefinition?.unitType !== 'BattleMech') {
    throw new Error(`expected launched unit ${instanceId}`);
  }
  return { ...unit, customUnitDefinition: unit.customUnitDefinition };
}

describe('custom combat durable match recovery', () => {
  let dir: string;
  let matchPath: string;
  let store: DurableMatchStore;

  beforeEach(async () => {
    dir = await mkdtemp(path.join(tmpdir(), 'custom-combat-recovery-'));
    matchPath = path.join(dir, 'matches.db');
    resetSQLiteService();
    resetUnitRepository();
    getSQLiteService({ path: path.join(dir, 'units.db') }).initialize();
    store = new DurableMatchStore({ path: matchPath });
  });

  afterEach(async () => {
    store.close();
    resetUnitRepository();
    resetSQLiteService();
    await rm(dir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('recovers original construction after store reopen and library edit/delete', async () => {
    const unitRef = persistCustomUnit(30);
    const original = readServerCustomCombatDefinition(unitRef);
    if (original?.unitType !== 'BattleMech')
      throw new Error('Expected Mech construction');
    expect(original?.armor.allocation.LEFT_ARM).toBe(30);
    expect(original?.id).toBe(unitRef);

    const launchedEvents = await persistLaunchedSession(store, unitRef);
    const launchedPayload = createdPayload(launchedEvents);
    const launchedPlayer = customUnitFromPayload(
      launchedPayload,
      PLAYER_INSTANCE_ID,
    );
    expect(launchedPlayer.unitRef).toBe(unitRef);
    expect(launchedPlayer.id).toBe(PLAYER_INSTANCE_ID);
    expect(launchedPlayer.id).not.toBe(launchedPlayer.unitRef);
    expect(launchedPlayer.customUnitDefinition?.id).toBe(unitRef);
    expect(launchedPlayer.customUnitDefinition?.armor.allocation.LEFT_ARM).toBe(
      30,
    );
    expect(launchedPlayer.armorByLocation?.left_arm).toBe(30);

    const launchedSession = await rebuildSessionFromEvents(
      MATCH_ID,
      launchedEvents,
    );
    const launchedWeapons = launchedSession.getUnitWeapons(PLAYER_INSTANCE_ID);
    expect(launchedWeapons.length).toBeGreaterThan(0);

    const eventIds = launchedEvents.map((event) => event.id);
    const eventSequences = launchedEvents.map((event) => event.sequence);

    const mutated = getUnitRepository().update(unitRef, {
      data: libraryPayload(10),
      notes: 'library mutation after launch',
    });
    expect(mutated.success).toBe(true);
    const changed = readServerCustomCombatDefinition(unitRef);
    if (changed?.unitType !== 'BattleMech')
      throw new Error('Expected Mech construction');
    expect(changed.armor.allocation.LEFT_ARM).toBe(10);

    store.close();
    store = new DurableMatchStore({ path: matchPath });

    const recovered = await recoverActiveMatches(store);
    expect(recovered.failed).toEqual([]);
    const host = recovered.hosts.get(MATCH_ID);
    expect(host).toBeDefined();

    const recoveredSession = host!.getSessionForTests();
    const recoveredPlayer = recoveredSession.units.find(
      (unit) => unit.id === PLAYER_INSTANCE_ID,
    );
    if (recoveredPlayer?.customUnitDefinition?.unitType !== 'BattleMech')
      throw new Error('Expected recorded Mech construction');
    expect(
      recoveredPlayer?.customUnitDefinition?.armor.allocation.LEFT_ARM,
    ).toBe(30);
    expect(recoveredPlayer?.armorByLocation?.left_arm).toBe(30);
    expect(recoveredSession.events.map((event) => event.id)).toEqual(eventIds);
    expect(recoveredSession.events.map((event) => event.sequence)).toEqual(
      eventSequences,
    );

    const deleted = getUnitRepository().delete(unitRef);
    expect(deleted.success).toBe(true);
    expect(readServerCustomCombatDefinition(unitRef)).toBeNull();

    store.close();
    store = new DurableMatchStore({ path: matchPath });
    const recoveredAfterDelete = await recoverActiveMatches(store);
    expect(recoveredAfterDelete.failed).toEqual([]);
    expect(
      recoveredAfterDelete.hosts
        .get(MATCH_ID)
        ?.getSessionForTests()
        .events.map((event) => event.id),
    ).toEqual(eventIds);

    const rebuilt = await rebuildSessionFromEvents(
      MATCH_ID,
      await store.getEvents(MATCH_ID, 0),
    );
    const rebuiltPlayer = rebuilt
      .getSession()
      .units.find((unit) => unit.id === PLAYER_INSTANCE_ID);
    if (rebuiltPlayer?.customUnitDefinition?.unitType !== 'BattleMech')
      throw new Error('Expected recorded Mech construction');
    expect(rebuiltPlayer?.customUnitDefinition?.armor.allocation.LEFT_ARM).toBe(
      30,
    );
    expect(rebuilt.getMovementCapability(PLAYER_INSTANCE_ID)?.walkMP).toBe(3);
    expect(rebuilt.getUnitWeapons(PLAYER_INSTANCE_ID)).toEqual(launchedWeapons);

    await expect(
      buildMatchHostBootstrapFromMeta(matchMeta(unitRef)),
    ).rejects.toThrow(/unknown unitRef|missing|invalid|unsupported/i);
  });

  it('refuses recovery of a present invalid recorded snapshot', async () => {
    const unitRef = persistCustomUnit(34);
    const snapshot = parseCustomCombatDefinition(
      { ...atlas, id: unitRef },
      unitRef,
    );
    if (!snapshot || snapshot.unitType !== 'BattleMech') {
      throw new Error('expected a valid snapshot for the corrupt-history case');
    }

    const events = await persistLaunchedSession(store, unitRef);
    const payload = createdPayload(events);
    const player = customUnitFromPayload(payload, PLAYER_INSTANCE_ID);
    const corruptEvents = events.map((event) => {
      if (event.type !== GameEventType.GameCreated) {
        return event;
      }
      return {
        ...event,
        payload: {
          ...payload,
          units: payload.units.map((unit) =>
            unit.id === PLAYER_INSTANCE_ID
              ? {
                  ...player,
                  customUnitDefinition: {
                    ...snapshot,
                    engine: { ...snapshot.engine, extra: true },
                  },
                }
              : unit,
          ),
        },
      };
    });

    store.close();
    store = new DurableMatchStore({
      path: path.join(dir, 'invalid-snapshot-matches.db'),
    });
    await store.createMatch({
      ...matchMeta(unitRef),
      matchId: 'invalid-snapshot-match',
    });
    for (const event of corruptEvents) {
      await store.appendEvent('invalid-snapshot-match', {
        ...event,
        gameId: 'invalid-snapshot-match',
      });
    }

    const recovered = await recoverActiveMatches(store);
    expect(recovered.hosts.has('invalid-snapshot-match')).toBe(false);
    expect(recovered.failed).toContain('invalid-snapshot-match');
  });
});
