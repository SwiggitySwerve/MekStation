import './reconnectPersistence.integration.test-helpers';
import { randomUUID } from 'node:crypto';
import { unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { defaultSeats } from '@/types/multiplayer/Lobby';

import { DurableMatchStore } from '../DurableMatchStore';
import { addSpectatorSeat } from '../lobby/spectatorSeats';
import { recoverActiveMatches } from '../MatchRecovery';
import { ServerMatchHost } from '../ServerMatchHost';

it('persists spectator removal across SQLite reopen while retaining M-M12 viewer receipts', async () => {
  const path = join(tmpdir(), `m-h2-spectator-${randomUUID()}.sqlite`);
  let store = new DurableMatchStore({ path });
  const watcher = { playerId: 'watcher', displayName: 'Watcher' };
  const matchId = 'm-h2-durable';
  const ts = '2026-11-08T00:00:00.000Z';
  let recovered: ServerMatchHost | undefined;
  try {
    await store.createMatch({
      matchId,
      hostPlayerId: 'host',
      playerIds: ['host'],
      sideAssignments: [{ playerId: 'host', side: 'player' }],
      status: 'active',
      createdAt: ts,
      updatedAt: ts,
      config: { mapRadius: 4, turnLimit: 5, fogOfWar: false },
      seats: addSpectatorSeat(
        defaultSeats('1v1').map((seat) =>
          seat.slotId === 'alpha-1'
            ? {
                ...seat,
                occupant: { playerId: 'host', displayName: 'Host' },
              }
            : seat,
        ),
        watcher,
      ),
    });
    const host = ServerMatchHost.create(matchId, store, {
      mapRadius: 4,
      turnLimit: 5,
      random: new SeededRandom(1),
      grid: createMinimalGrid(4),
      playerUnits: [],
      opponentUnits: [],
      gameUnits: [],
    });
    await Promise.resolve();
    await Promise.resolve();
    const socket = { send(_data: string) {}, close() {}, readyState: 1 };
    expect(await host.admitSocket(socket, watcher.playerId)).not.toBeNull();
    await host.handleSessionJoin(socket, watcher.playerId);
    const issued = host.viewerIssued(watcher.playerId);
    expect(issued).toBeGreaterThan(0);
    await host.handleDeliveryAck(watcher.playerId, issued - 1);
    const rows = await store.listViewerDeliveryRecords(matchId);
    const ack = await store.getViewerDeliveryAcknowledgement(
      matchId,
      watcher.playerId,
    );
    host.detachSocket(socket);
    await host.handleIntent({
      kind: 'Intent',
      matchId,
      playerId: 'host',
      ts,
      intent: { kind: 'SetReady', slotId: 'missing', ready: true },
    });
    expect(
      (await store.getMatchMeta(matchId)).seats?.some(
        (seat) => seat.kind === 'spectator',
      ),
    ).toBe(false);
    expect(host.viewerIssued(watcher.playerId)).toBe(issued);
    expect(host.viewerUnacked(watcher.playerId)).toBe(0);
    store.close();
    store = new DurableMatchStore({ path });
    const result = await recoverActiveMatches(store);
    expect(result.failed).toEqual([]);
    recovered = result.hosts.get(matchId);
    expect(recovered).toBeDefined();
    expect(recovered?.viewerIssued(watcher.playerId)).toBe(issued);
    expect(recovered?.viewerUnacked(watcher.playerId)).toBe(0);
    expect(await store.listViewerDeliveryRecords(matchId)).toEqual(rows);
    expect(
      await store.getViewerDeliveryAcknowledgement(matchId, watcher.playerId),
    ).toEqual(ack);
    const meta = await store.getMatchMeta(matchId);
    expect(meta.seats?.some((seat) => seat.kind === 'spectator')).toBe(false);
    await store.updateMatchMeta(matchId, {
      seats: addSpectatorSeat(meta.seats ?? [], watcher),
    });
    expect(
      await recovered?.admitSocket(socket, watcher.playerId),
    ).not.toBeNull();
    await recovered?.handleSessionJoin(
      socket,
      watcher.playerId,
      undefined,
      matchId,
      issued - 1,
    );
    expect(recovered?.viewerIssued(watcher.playerId)).toBe(issued);
  } finally {
    await recovered?.closeMatch();
    store.close();
    unlinkSync(path);
  }
});
