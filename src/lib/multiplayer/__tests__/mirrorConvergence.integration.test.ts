/**
 * Mirror convergence integration test.
 *
 * Per `complete-multiplayer-game-surface` tasks 8.1 / 8.2:
 *   - 8.1: two simulated clients that receive the same broadcast `Event`
 *     stream converge to the same `IGameState` at every event boundary.
 *   - 8.2: a client that joins mid-match via a replay burst lands on a
 *     board identical to a continuously-connected client.
 *
 * The test drives a REAL authoritative `InteractiveSession` via a
 * `ServerMatchHost` so the event stream is the genuine server contract,
 * then rebuilds client mirrors from the host's broadcast log and asserts
 * convergence. No stubs — the engine reducer is the source of truth on
 * both ends (D2).
 *
 * @spec openspec/changes/complete-multiplayer-game-surface/specs/multiplayer-game-surface/spec.md
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InMemoryMatchStore } from '@/lib/multiplayer/server/InMemoryMatchStore';
import {
  ServerMatchHost,
  type IMatchSocket,
} from '@/lib/multiplayer/server/ServerMatchHost';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { nowIso, type IIntent } from '@/types/multiplayer/Protocol';

import { buildMirrorSession } from '../mirrorMatchSession';

// =============================================================================
// Test harness — a real ServerMatchHost + a recording socket.
// =============================================================================

interface IRecordingSocket extends IMatchSocket {
  readonly events: IGameEvent[];
}

/**
 * A mock socket that records every broadcast `Event` payload — this is
 * the exact stream a real client's `useMultiplayerSession` would feed
 * its mirror builder.
 */
function makeRecordingSocket(): IRecordingSocket {
  const events: IGameEvent[] = [];
  let closed = false;
  return {
    send(data: string) {
      const frame = JSON.parse(data) as {
        kind: string;
        event?: IGameEvent;
        events?: IGameEvent[];
      };
      if (frame.kind === 'Event' && frame.event) {
        events.push(frame.event);
      }
      if (frame.kind === 'ReplayChunk' && frame.events) {
        events.push(...frame.events);
      }
    },
    close() {
      closed = true;
    },
    get readyState() {
      return closed ? 3 : 1;
    },
    events,
  } as IRecordingSocket;
}

async function makeHost(): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const matchId = 'match-convergence';
  const now = nowIso();
  await store.createMatch({
    matchId,
    hostPlayerId: 'p1',
    playerIds: ['p1', 'p2'],
    sideAssignments: [
      { playerId: 'p1', side: 'player' },
      { playerId: 'p2', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  const host = ServerMatchHost.create(matchId, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [] as readonly IGameUnit[],
  });
  // Let persistInitialEvents drain.
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

function advancePhaseIntent(playerId: string): IIntent {
  return {
    kind: 'Intent',
    matchId: 'match-convergence',
    ts: nowIso(),
    playerId,
    intent: { kind: 'AdvancePhase' },
  };
}

// =============================================================================
// 8.1 — two clients converge
// =============================================================================

describe('mirror convergence — two clients (task 8.1)', () => {
  it('two clients fed the same broadcast stream converge at every boundary', async () => {
    const host = await makeHost();

    // Two clients attach and receive the join replay — this is the
    // initial board (GameCreated + GameStarted).
    const clientA = makeRecordingSocket();
    const clientB = makeRecordingSocket();
    host.attachSocket(clientA, 'p1');
    host.attachSocket(clientB, 'p2');
    await host.sendReplay(clientA, 0, 'p1');
    await host.sendReplay(clientB, 0, 'p2');

    // Drive a few phase-advance intents so the authoritative session
    // emits a real, non-trivial event stream both clients receive.
    for (let i = 0; i < 4; i += 1) {
      await host.handleIntent(advancePhaseIntent('p1'));
    }

    // Each client rebuilds its mirror from its own recorded stream.
    const mirrorA = buildMirrorSession(clientA.events);
    const mirrorB = buildMirrorSession(clientB.events);

    expect(mirrorA).not.toBeNull();
    expect(mirrorB).not.toBeNull();
    // Convergence: identical derived state, identical event count.
    expect(mirrorA?.currentState).toEqual(mirrorB?.currentState);
    expect(mirrorA?.events.length).toBe(mirrorB?.events.length);

    // Boundary check: replaying client A's stream prefix-by-prefix
    // produces the same state client B reaches at the same prefix.
    for (let n = 1; n <= clientA.events.length; n += 1) {
      const prefixA = buildMirrorSession(clientA.events.slice(0, n));
      const prefixB = buildMirrorSession(clientB.events.slice(0, n));
      expect(prefixA?.currentState).toEqual(prefixB?.currentState);
    }

    await host.closeMatch();
  });
});

// =============================================================================
// 8.2 — mid-match join via replay
// =============================================================================

describe('mirror convergence — mid-match join (task 8.2)', () => {
  it('a replay-joined client lands on the same board as a continuous client', async () => {
    const host = await makeHost();

    // A continuously-connected client attaches at match start.
    const continuous = makeRecordingSocket();
    host.attachSocket(continuous, 'p1');
    await host.sendReplay(continuous, 0, 'p1');

    // Match progresses while the second player is absent.
    for (let i = 0; i < 3; i += 1) {
      await host.handleIntent(advancePhaseIntent('p1'));
    }

    // The second player joins mid-match — the server streams the full
    // replay (every event so far) to the joining socket.
    const joiner = makeRecordingSocket();
    host.attachSocket(joiner, 'p2');
    await host.sendReplay(joiner, 0, 'p2');

    // More live events after the join — both clients receive them.
    for (let i = 0; i < 2; i += 1) {
      await host.handleIntent(advancePhaseIntent('p1'));
    }

    const continuousMirror = buildMirrorSession(continuous.events);
    const joinerMirror = buildMirrorSession(joiner.events);

    expect(joinerMirror).not.toBeNull();
    // The replay-then-live joiner lands on an identical board.
    expect(joinerMirror?.currentState).toEqual(continuousMirror?.currentState);
    // Both streams begin with the GameCreated seed.
    expect(joiner.events[0]?.type).toBe(GameEventType.GameCreated);

    await host.closeMatch();
  });
});
