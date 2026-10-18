import type {
  IEventMessage,
  IServerMessage,
} from '@/types/multiplayer/Protocol';

import { adaptUnit } from '@/engine/adapters/CompendiumAdapter';
import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GameSide, type IGameUnit } from '@/types/gameplay';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import atlas from '../../../../../public/data/units/battlemechs/2-star-league/standard/Atlas AS7-D.json';
import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { ServerMatchHost, type IMatchSocket } from '../ServerMatchHost';

// B14 seam: this suite pins the existing per-viewer fog filter beneath the
// B14 refusal. Production has no per-viewer reveal projection and refuses.
jest.mock('@/lib/multiplayer/server/fogMatchAdmission', () => ({
  ...jest.requireActual<
    typeof import('@/lib/multiplayer/server/fogMatchAdmission')
  >('@/lib/multiplayer/server/fogMatchAdmission'),
  noPerViewerRevealProjection: () => false,
  matchLacksRevealProjection: async () => false,
}));

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

it('keeps custom construction private through live, replay, and reconnect publication', async () => {
  const matchId = 'custom-transport';
  const store = new InMemoryMatchStore({ quiet: true });
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
  await store.createMatch({
    matchId,
    hostPlayerId: 'owner',
    playerIds: ['owner', 'opponent'],
    sideAssignments: [
      { playerId: 'owner', side: 'player' },
      { playerId: 'opponent', side: 'opponent' },
    ],
    status: 'active',
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
    config: { mapRadius: 4, turnLimit: 5, fogOfWar: true },
    layout: '1v1',
    seats,
  });
  const sides = [GameSide.Player, GameSide.Opponent];
  const references = ['custom-owner', 'custom-opponent'];
  const units: IGameUnit[] = references.map((unitRef, index) => ({
    id: `instance-${index}`,
    name: unitRef,
    side: sides[index],
    unitRef,
    pilotRef: 'default',
    gunnery: 4,
    piloting: 5,
  }));
  const adapted = await Promise.all(
    references.map(async (id, index) => {
      const unit = await adaptUnit(id, { side: sides[index] }, () => ({
        ...atlas,
        id,
      }));
      if (!unit) throw new Error('Custom fixture did not adapt');
      return { ...unit, id: units[index].id };
    }),
  );
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(12),
    grid: createMinimalGrid(4),
    playerUnits: [adapted[0]],
    opponentUnits: [adapted[1]],
    gameUnits: units,
  });
  await Promise.resolve();
  await Promise.resolve();
  const created = (await store.getEvents(matchId)).find(
    (event) => event.type === GameEventType.GameCreated,
  );
  expect(created).toBeDefined();
  expect(snapshotIds(created)).toEqual(references);
  const sockets = new Map<string, ReturnType<typeof makeSocket>>();
  for (const viewer of ['owner', 'opponent', 'watcher']) {
    const socket = makeSocket();
    expect(await host.admitSocket(socket, viewer)).not.toBeNull();
    sockets.set(viewer, socket);
  }
  await (
    host as unknown as { broadcastEvent(message: IEventMessage): Promise<void> }
  ).broadcastEvent({
    kind: 'Event',
    matchId,
    ts: '2026-09-09T00:00:00.000Z',
    event: created!,
  });
  for (const [viewer, socket] of Array.from(sockets.entries())) {
    const expected = viewer === 'watcher' ? [] : [`custom-${viewer}`];
    expect(socket.sent.some((message) => message.kind === 'Event')).toBe(true);
    expect(snapshotIds(socket.sent)).toEqual(expected);
    socket.sent.length = 0;
    await host.sendReplay(socket, 0, viewer);
    expect(socket.sent.some((message) => message.kind === 'ReplayEnd')).toBe(
      true,
    );
    expect(snapshotIds(socket.sent)).toEqual(expected);
    socket.sent.length = 0;
    await host.handleSessionJoin(socket, viewer, undefined);
    expect(socket.sent.some((message) => message.kind === 'ReplayEnd')).toBe(
      true,
    );
    expect(snapshotIds(socket.sent)).toEqual(expected);
  }
  expect(snapshotIds((await store.getEvents(matchId))[0])).toEqual(references);
});
