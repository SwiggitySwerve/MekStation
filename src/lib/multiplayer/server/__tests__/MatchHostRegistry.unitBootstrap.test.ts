import type { IGameCreatedPayload } from '@/types/gameplay';

import { GameEventType, GameSide } from '@/types/gameplay';

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

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { MatchHostRegistry } from '../MatchHostRegistry';
import { buildDefaultMatchUnitBootstrap } from '../matchUnitBootstrap';

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
