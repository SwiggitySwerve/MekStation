import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { deserialize, serialize } from 'node:v8';
import { v4 } from 'uuid';

import type {
  IGameSession,
  IGameState,
  IPSRTriggeredPayload,
  IPSRResolvedPayload,
} from '@/types/gameplay';

import { adaptUnitFromData } from '@/engine/adapters/CompendiumAdapter';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { persistInteractiveLaunchRecoveryLog } from '@/engine/InteractiveSession.persistence';
import { matchLogStorage } from '@/lib/p2p/matchLogStorage';
import { SeededD6Roller, SeededRandom } from '@/simulation/core';
import {
  FiringArc,
  GameEventType,
  GamePhase,
  GameSide,
  GameStatus,
  MovementType,
  PSRTrigger,
} from '@/types/gameplay';
import { TerrainType } from '@/types/gameplay/TerrainTypes';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';
import { deployPlacementsFor } from '@/utils/gameplay/gameState/initialization';
import { hexDistance, hexNeighbor } from '@/utils/gameplay/hexMath';

import { gateReplaySurfaceHistory } from '../ReplaySurfaceGate';
import { replayFidelityState } from './replayFidelityTestState';

jest.mock('uuid', () => ({ ...jest.requireActual('uuid'), v4: jest.fn() }));

const fixture = (suffix: string): Buffer =>
  readFileSync(
    path.join(
      __dirname,
      '../__fixtures__/legacy-psr-unfixed',
      `deep-swamp-continuation.${suffix}`,
    ),
  );
interface ICommandTrace {
  label: string;
  turn: number;
  phase: GamePhase;
  eventsBefore: number;
  eventsAfter: number;
  diceBefore: number;
  diceAfter: number;
}
interface IRollCapture {
  commands: ICommandTrace[];
  dice: { value: number; command: number }[];
  swamp: {
    sequence: number;
    roll: number;
    command: number;
    diceThroughCommand: number;
  };
}
const old = deserialize(fixture('v8')) as { session: IGameSession };
const oldRolls = JSON.parse(
  fixture('rolls.raw-json').toString(),
) as IRollCapture;
const oldStates = deserialize(fixture('command-states.v8')) as {
  eventCount: number;
  state: IGameState;
}[];

// The sole old/new STATE mapping. The independent journal ledger below checks
// its count; it neither edits turnEvents nor rewrites any other infinite field.
function mapPendingDeepSwamp(state: IGameState): {
  state: IGameState;
  count: number;
} {
  const mapped = deserialize(serialize(state)) as IGameState;
  let count = 0;
  for (const unit of Object.values(mapped.units)) {
    for (const psr of unit.pendingPSRs ?? []) {
      if (psr.fixedTargetNumber !== Infinity) continue;
      expect(psr.reasonCode).toBe(PSRTrigger.SwampBogDown);
      Reflect.deleteProperty(psr, 'fixedTargetNumber');
      Reflect.set(psr, 'automaticFailure', true);
      count++;
    }
  }
  return { state: mapped, count };
}

function journalPendingCount(eventCount: number): number {
  const pending: { unitId: string; reason: string }[] = [];
  for (const event of old.session.events.slice(0, eventCount)) {
    const trigger = event.payload as IPSRTriggeredPayload;
    const resolution = event.payload as IPSRResolvedPayload;
    if (
      event.type === GameEventType.PSRTriggered &&
      trigger.fixedTargetNumber === Infinity
    ) {
      expect(trigger.reasonCode).toBe(PSRTrigger.SwampBogDown);
      pending.push({
        unitId: trigger.unitId,
        reason: trigger.reason,
      });
    } else if (
      event.type === GameEventType.PSRResolved ||
      event.type === GameEventType.UnitStuck ||
      event.type === GameEventType.UnitFell
    ) {
      for (let index = pending.length - 1; index >= 0; index--) {
        if (
          pending[index].unitId === resolution.unitId &&
          (event.type !== GameEventType.PSRResolved ||
            pending[index].reason === resolution.reason)
        )
          pending.splice(index, 1);
      }
    }
  }
  return pending.length;
}

const originalClone = Object.getOwnPropertyDescriptor(
  globalThis,
  'structuredClone',
);
beforeAll(() => {
  Object.defineProperty(globalThis, 'structuredClone', {
    configurable: true,
    writable: true,
    value: <T>(value: T): T => deserialize(serialize(value)) as T,
  });
});
afterAll(() => {
  if (originalClone)
    Object.defineProperty(globalThis, 'structuredClone', originalClone);
  else Reflect.deleteProperty(globalThis, 'structuredClone');
});
afterEach(async () => {
  await matchLogStorage.flushPendingWrites();
  matchLogStorage.close();
  jest.useRealTimers();
});

it('checks the immutable old-writer continuation provenance and bytes', () => {
  const provenance = JSON.parse(fixture('provenance.json').toString()) as {
    mainSha: string;
    files: Record<string, { bytes: number; sha256: string }>;
  };
  expect(provenance.mainSha).toBe('c33afb8cb7eed3425eacee707648ff5203d75e6f');
  for (const [name, expected] of Object.entries(provenance.files)) {
    const bytes = fixture(name.replace('deep-swamp-continuation.', ''));
    expect(bytes.length).toBe(expected.bytes);
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(
      expected.sha256,
    );
  }
});

it('preserves all four interactive swamp draws, 38 later draws, and every later roll', async () => {
  matchLogStorage.close();
  Object.defineProperty(globalThis, 'indexedDB', {
    configurable: true,
    writable: true,
    value: new IDBFactory(),
  });
  jest.useFakeTimers({
    now: new Date(old.session.createdAt),
    doNotFake: [
      'performance',
      'setTimeout',
      'clearTimeout',
      'setImmediate',
      'clearImmediate',
      'nextTick',
      'queueMicrotask',
    ],
  });
  let nextId = -1;
  jest.mocked(v4 as () => string).mockImplementation(() => {
    if (nextId++ === -1) return old.session.id;
    const event = old.session.events[nextId - 1];
    if (!event) throw new Error('New writer created an extra event');
    jest.setSystemTime(new Date(event.timestamp));
    return event.id;
  });
  const adapted = [
    ['player-0', GameSide.Player, '2-star-league/standard/Atlas AS7-D.json'],
    [
      'opponent-1',
      GameSide.Opponent,
      '3-succession-wars/standard/Marauder MAD-3R.json',
    ],
  ].map(([id, side, design]) => ({
    ...adaptUnitFromData(
      JSON.parse(
        readFileSync(
          path.resolve('public/data/units/battlemechs', design),
          'utf8',
        ),
      ),
      { side: side as GameSide },
    ),
    id,
  }));
  const units = adapted.map((unit, index) => ({
    id: unit.id,
    name: unit.id,
    side: unit.side,
    unitRef: index === 0 ? 'atlas-as7-d' : 'marauder-mad-3r',
    pilotRef: 'Veteran',
    gunnery: 2,
    piloting: 5,
  }));
  const placement = deployPlacementsFor(units)[0];
  const destination = hexNeighbor(placement.position, placement.facing);
  const key = `${destination.q},${destination.r}`;
  const grid = createMinimalGrid(7);
  const hex = grid.hexes.get(key);
  if (!hex) throw new Error('Swamp destination missing');
  grid.hexes.set(key, {
    ...hex,
    terrain: JSON.stringify([{ type: TerrainType.Swamp, level: 2 }]),
  });
  const seeded = new SeededD6Roller(8);
  const dice: number[] = [];
  let command = -1;
  let mutated = false;
  const draw = (): number => {
    const value = seeded.rollD6();
    dice.push(value);
    return value;
  };
  const session = new InteractiveSession(
    7,
    30,
    new SeededRandom(8),
    grid,
    [adapted[0]],
    [adapted[1]],
    units,
    {},
    () => {
      // Test-only falsifier: advance the REAL source once extra at the swamp
      // End command. The ordinary fidelity assertions must fail, not adapt.
      if (
        process.env.D8_SWAMP_DRAW_MUTANT === 'duplicate' &&
        command === oldRolls.swamp.command &&
        !mutated
      ) {
        mutated = true;
        draw();
      }
      return draw();
    },
    [],
    ['elimination'],
    8,
  );
  await persistInteractiveLaunchRecoveryLog(session.getSession());
  for (const expected of oldRolls.commands) {
    command++;
    expect(session.getState().turn).toBe(expected.turn);
    expect(session.getState().phase).toBe(expected.phase);
    expect(session.getSession().events).toHaveLength(expected.eventsBefore);
    expect(dice).toHaveLength(expected.diceBefore);
    if (expected.label === 'walk into swamp level 2') {
      session.applyMovement(
        'player-0',
        destination,
        placement.facing,
        MovementType.Walk,
        [placement.position, destination],
      );
    } else if (expected.label.includes(' attacks ')) {
      const [, attackerId, targetId] =
        /: (.+) attacks (.+)$/.exec(expected.label) ?? [];
      const state = session.getState();
      const range = hexDistance(
        state.units[attackerId].position,
        state.units[targetId].position,
      );
      const weapons = session
        .getUnitWeapons(attackerId)
        .filter(
          (weapon) =>
            !weapon.destroyed &&
            weapon.longRange >= range &&
            (!weapon.mountingArc || weapon.mountingArc === FiringArc.Front),
        )
        .sort((a, b) => a.damage - b.damage || a.id.localeCompare(b.id))
        .slice(0, 2);
      session.applyAttack(
        attackerId,
        targetId,
        weapons.map((weapon) => weapon.id),
      );
    } else if (expected.label.startsWith('concede'))
      session.concede(GameSide.Player);
    else session.advancePhase();
    expect(dice).toHaveLength(expected.diceAfter);
    expect(dice).toEqual(
      oldRolls.dice.slice(0, expected.diceAfter).map((die) => die.value),
    );
    expect(session.getSession().events).toHaveLength(expected.eventsAfter);
    const mapped = mapPendingDeepSwamp(oldStates[command].state);
    expect(mapped.count).toBe(journalPendingCount(expected.eventsAfter));
    expect(
      isDeepStrictEqual(
        mapped.state,
        deserialize(serialize(session.getState())),
      ),
    ).toBe(true);
    await matchLogStorage.flushPendingWrites();
    const records = await matchLogStorage.getEventRecordsForMatch(
      session.getSession().id,
    );
    const loaded = gateReplaySurfaceHistory(
      records.map((row) => row.event),
      {
        surfaceId: 'deep-swamp-continuation',
        streamId: session.getSession().id,
        formatId: 'match-log-idb',
        formatVersion: 2,
      },
    );
    expect(loaded.kind === 'blocked' ? loaded.blockedEvents : []).toEqual([]);
    if (loaded.kind !== 'accepted')
      throw new Error('Production journal refused');
    expect(loaded.events).toHaveLength(expected.eventsAfter);
    expect(
      isDeepStrictEqual(
        replayFidelityState(
          hydrateGameSessionFromEvents(session.getSession().id, loaded.events)
            .currentState,
        ),
        replayFidelityState(session.getState()),
      ),
    ).toBe(true);
  }
  expect(oldRolls.commands[oldRolls.swamp.command]).toMatchObject({
    diceBefore: 4,
    diceAfter: 8,
  });
  expect(dice.slice(4, 8)).toEqual([4, 3, 5, 2]);
  expect(dice.slice(8)).toHaveLength(38);
  expect(dice.slice(8)).toEqual(oldRolls.dice.slice(8).map((die) => die.value));
  const events = session.getSession().events;
  expect(events).toHaveLength(80);
  expect(events[19].payload).toMatchObject({
    automaticFailure: true,
    passed: false,
    roll: 9,
  });
  expect(events[19].payload).not.toHaveProperty('targetNumber');
  // Full stored bytes: ONLY the two authorized target fields may change.
  let changedEvents = 0;
  const expectedBytes = `[${old.session.events
    .map((event) => {
      const line = JSON.stringify(event);
      if (
        event.type === GameEventType.PSRTriggered &&
        (event.payload as IPSRTriggeredPayload).fixedTargetNumber === Infinity
      ) {
        changedEvents++;
        return line.replace(
          '"fixedTargetNumber":null',
          '"automaticFailure":true',
        );
      }
      if (
        event.type === GameEventType.PSRResolved &&
        (event.payload as IPSRResolvedPayload).targetNumber === Infinity
      ) {
        changedEvents++;
        return line.replace('"targetNumber":null', '"automaticFailure":true');
      }
      return line;
    })
    .join(',')}]`;
  expect(changedEvents).toBe(2);
  expect(JSON.stringify(events)).toBe(expectedBytes);
  expect(session.getState().status).toBe(GameStatus.Completed);
});
