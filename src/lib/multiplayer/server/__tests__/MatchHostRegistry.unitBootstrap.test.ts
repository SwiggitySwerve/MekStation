import { waitFor } from '@testing-library/react';
import { EventEmitter } from 'node:events';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import type { IGameCreatedPayload } from '@/types/gameplay';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { GameEventType, GameSide } from '@/types/gameplay';
import {
  type IIntent,
  type IServerMessage,
  nowIso,
} from '@/types/multiplayer/Protocol';

jest.mock('@/engine/adapters/CompendiumAdapter', () => {
  const gameplay = jest.requireActual('@/types/gameplay/GameSessionInterfaces');
  const hex = jest.requireActual('@/types/gameplay/HexGridInterfaces');
  return {
    adaptUnit: jest.fn(
      async (
        unitRef: string,
        options: {
          readonly side?: typeof gameplay.GameSide.Player;
          readonly position?: { readonly q: number; readonly r: number };
          readonly facing?: typeof hex.Facing.North;
        } = {},
      ) => ({
        id: unitRef,
        side: options.side ?? gameplay.GameSide.Player,
        position: options.position ?? { q: 0, r: 0 },
        facing: options.facing ?? hex.Facing.North,
        heat: 0,
        movementThisTurn: hex.MovementType.Stationary,
        hexesMovedThisTurn: 0,
        armor: { center_torso: 30 },
        structure: { center_torso: 20 },
        startingInternalStructure: { center_torso: 20 },
        destroyedLocations: [],
        destroyedEquipment: [],
        ammo: [],
        pilotWounds: 0,
        pilotConscious: true,
        destroyed: false,
        hasRetreated: false,
        hasEjected: false,
        lockState: gameplay.LockState.Pending,
        weapons: [],
        walkMP: 4,
        runMP: 6,
        jumpMP: 0,
        heatSinks: 10,
        heatSinkType: 'single',
        tonnage: unitRef === 'atlas-as7-d' ? 100 : 75,
      }),
    ),
  };
});

import type { IMatchMeta } from '../IMatchStore';

import { bindMultiplayerSocketConnection } from '../bindMultiplayerSocketConnection';
import { DurableMatchStore } from '../DurableMatchStore';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MatchHostRegistry } from '../MatchHostRegistry';
import { buildDefaultMatchUnitBootstrap } from '../matchUnitBootstrap';
import { ServerMatchHost } from '../ServerMatchHost';

function matchMeta(overrides: Partial<IMatchMeta> = {}): IMatchMeta {
  const now = '2026-06-26T00:00:00.000Z';
  return {
    matchId: 'unit-bootstrap-match',
    hostPlayerId: 'pid_host',
    playerIds: ['pid_host', 'pid_guest'],
    sideAssignments: [
      { playerId: 'pid_host', side: 'player' },
      { playerId: 'pid_guest', side: 'opponent' },
    ],
    status: 'lobby',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 6, turnLimit: 8, fogOfWar: true },
    layout: '1v1',
    unitBootstrap: buildDefaultMatchUnitBootstrap('1v1', 6),
    ...overrides,
  };
}

function axialDistance(coord: { readonly q: number; readonly r: number }) {
  return Math.max(
    Math.abs(coord.q),
    Math.abs(coord.r),
    Math.abs(coord.q + coord.r),
  );
}

async function flushInitialEventPersist(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('MatchHostRegistry unit bootstrap', () => {
  it('1v1 bootstrap seeds two playing units and none for a spectator host', () => {
    const bootstrap = buildDefaultMatchUnitBootstrap('1v1', 6);
    expect(bootstrap).toHaveLength(2);
    expect(bootstrap.map((entry) => entry.side)).toEqual([
      GameSide.Player,
      GameSide.Opponent,
    ]);
    expect(
      bootstrap.every((entry) => !entry.unitId.includes('spectator')),
    ).toBe(true);
  });

  it('keeps default start hexes inside the generated map radius', () => {
    const bootstrap = buildDefaultMatchUnitBootstrap('4v4', 1);

    expect(bootstrap).toHaveLength(8);
    expect(
      bootstrap.every(
        (entry) => entry.startHex && axialDistance(entry.startHex) <= 1,
      ),
    ).toBe(true);
  });

  it('boots REST-created matches with real catalog units instead of placeholders', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const meta = matchMeta();
    await store.createMatch(meta);

    const registry = new MatchHostRegistry({ store });
    const host = await registry.getOrCreate(meta.matchId);

    expect(host).not.toBeNull();
    await flushInitialEventPersist();
    const events = await store.getEvents(meta.matchId, 0);
    const created = events.find(
      (event) => event.type === GameEventType.GameCreated,
    );
    expect(created).toBeDefined();

    const payload = created!.payload as IGameCreatedPayload;
    expect(payload.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'player-1-atlas-as7-d',
          unitRef: 'atlas-as7-d',
          side: GameSide.Player,
        }),
        expect.objectContaining({
          id: 'opponent-1-marauder-mad-3r',
          unitRef: 'marauder-mad-3r',
          side: GameSide.Opponent,
        }),
      ]),
    );
    expect(payload.units).toHaveLength(2);
  });

  it('honors explicit stored unit bootstrap entries', async () => {
    const store = new InMemoryMatchStore({ quiet: true });
    const meta = matchMeta({
      matchId: 'custom-unit-bootstrap-match',
      unitBootstrap: [
        {
          unitId: 'host-custom-atlas',
          unitRef: 'atlas-as7-d',
          side: 'player',
          pilotRef: 'pilot-host-custom',
          gunnery: 3,
          piloting: 4,
          startHex: { q: -3, r: 0 },
        },
        {
          unitId: 'guest-custom-marauder',
          unitRef: 'marauder-mad-3r',
          side: 'opponent',
          pilotRef: 'pilot-guest-custom',
          gunnery: 4,
          piloting: 5,
          startHex: { q: 3, r: 0 },
        },
      ],
    });
    await store.createMatch(meta);

    const registry = new MatchHostRegistry({ store });
    const host = await registry.getOrCreate(meta.matchId);

    expect(host).not.toBeNull();
    await flushInitialEventPersist();
    const events = await store.getEvents(meta.matchId, 0);
    const created = events.find(
      (event) => event.type === GameEventType.GameCreated,
    );
    const payload = created!.payload as IGameCreatedPayload;
    expect(payload.units).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'host-custom-atlas',
          pilotRef: 'pilot-host-custom',
          gunnery: 3,
          piloting: 4,
        }),
        expect.objectContaining({
          id: 'guest-custom-marauder',
          pilotRef: 'pilot-guest-custom',
          gunnery: 4,
          piloting: 5,
        }),
      ]),
    );
  });
});

// MP-HOST-DEDUPE-1: the socket boundary and authority/store are real; only
// catalog adaptation (above) and the wire endpoint are test doubles.
class DedupeSocket extends EventEmitter {
  readonly sent: IServerMessage[] = [];
  readyState = 1;

  send(data: string): void {
    this.sent.push(JSON.parse(data) as IServerMessage);
  }

  close(): void {
    this.readyState = 3;
    this.emit('close');
  }
}

describe('MP-HOST-DEDUPE-1 concurrent first socket connections', () => {
  it('shares one authority and accepts later intents without a durable store conflict', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'mp-host-dedupe-'));
    const store = new DurableMatchStore({
      path: path.join(directory, 'matches.db'),
    });
    const registry = new MatchHostRegistry({ store });
    const createdHosts: ServerMatchHost[] = [];
    const create = ServerMatchHost.create;
    const createSpy = jest
      .spyOn(ServerMatchHost, 'create')
      .mockImplementation((...args) => {
        const host = create(...args);
        createdHosts.push(host);
        return host;
      });
    const sockets = [new DedupeSocket(), new DedupeSocket()];
    const meta = matchMeta({
      matchId: 'concurrent-first-sockets',
      config: { mapRadius: 6, turnLimit: 8, fogOfWar: false },
    });

    try {
      await store.createMatch(meta);
      jest.mocked(adaptUnit).mockClear();
      const readMeta = store.getMatchMeta.bind(store);
      let releaseFirst!: () => void;
      const gate = new Promise<void>((resolve) => {
        releaseFirst = resolve;
      });
      // Hold the first read after its empty registry lookup. Both bindings
      // start before release. A correct dedupe joins this pending creation;
      // it never needs a second store read to release the test barrier.
      jest.spyOn(store, 'getMatchMeta').mockImplementationOnce(async (id) => {
        await gate;
        return readMeta(id);
      });
      const connections = sockets.map((socket, index) =>
        bindMultiplayerSocketConnection({
          socket,
          matchId: meta.matchId,
          verifiedPlayerId: index === 0 ? 'pid_host' : 'pid_guest',
          connectionKey: `dedupe-${index}`,
          registry,
          diceSeed: 42,
        }),
      );
      releaseFirst();
      const [first, second] = await Promise.all(connections);
      expect(first).not.toBeNull();
      expect(second).not.toBeNull();
      const unitsAdapted = jest.mocked(adaptUnit).mock.calls.length;
      // Observe durable opening events before commands, without changing
      // connection concurrency or relying on a fixed microtask count.
      await waitFor(async () => {
        expect(await store.getEvents(meta.matchId, 0)).toHaveLength(2);
      });

      const advance = (playerId: string, intentId: string): IIntent => ({
        kind: 'Intent',
        matchId: meta.matchId,
        ts: nowIso(),
        playerId,
        intentId,
        intent: { kind: 'AdvancePhase' },
      });
      // Await real command completion, so the first durable commit precedes
      // the second command. Client *connections* above remain concurrent.
      const firstResult = await first!.host.handleIntent(
        advance('pid_host', 'dedupe-first'),
        first!.connectionKey,
        'pid_host',
      );
      const secondResult = await second!.host.handleIntent(
        advance('pid_guest', 'dedupe-second'),
        second!.connectionKey,
        'pid_guest',
      );
      const events = await store.getEvents(meta.matchId, 0);
      expect({
        hostsCreated: createdHosts.length,
        unitsAdapted,
        sameHost: first!.host === second!.host,
        registryHost: registry.get(meta.matchId) === first!.host,
        firstErrors: firstResult.filter((message) => message.kind === 'Error'),
        secondErrors: secondResult.filter(
          (message) => message.kind === 'Error',
        ),
        firstAccepted: firstResult.some((message) => message.kind === 'Event'),
        secondAccepted: secondResult.some(
          (message) => message.kind === 'Event',
        ),
      }).toEqual({
        hostsCreated: 1,
        unitsAdapted: 2,
        sameHost: true,
        registryHost: true,
        firstErrors: [],
        secondErrors: [],
        firstAccepted: true,
        secondAccepted: true,
      });
      expect(events.map((event) => event.sequence)).toEqual(
        events.map((_, index) => index),
      );
      expect(
        events.filter((event) => event.type === GameEventType.GameCreated),
      ).toHaveLength(1);
    } finally {
      // Close every constructed host, including the orphan exposed by RED.
      await Promise.all(createdHosts.map((host) => host.closeMatch()));
      sockets.forEach((socket) => socket.close());
      createSpy.mockRestore();
      store.close();
      await rm(directory, { recursive: true, force: true });
    }
  });
});
