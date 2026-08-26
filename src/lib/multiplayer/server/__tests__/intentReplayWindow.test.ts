/**
 * A replayed intent stays refused across a restart (umbrella task 1.3
 * `Stable Intent Identity Survives Retries`; harden-multiplayer-transport
 * design D7).
 *
 * `AcceptedIntentTracker` has its own unit tests, but the DEFENCE it
 * exists for had none: `DUPLICATE_INTENT` appeared nowhere outside
 * production code, and `ServerMatchHost.recover` — the factory that
 * rebuilds the replay window from the durable log on restart — was
 * reached by no test at all.
 *
 * That combination is the dangerous one. A replay window that silently
 * fails to rebuild reopens on every restart, and nothing in the suite
 * would have noticed, because the window's own unit tests keep passing
 * regardless of whether anything wires them up.
 */

import type { IServerMessage } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { InteractiveSession } from '@/engine/InteractiveSession';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';
import { hydrateGameSessionFromEvents } from '@/utils/gameplay/gameSession';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH_ID = 'match-intent-replay';

async function makeStore(): Promise<InMemoryMatchStore> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'host-player',
    playerIds: ['host-player'],
    sideAssignments: [{ playerId: 'host-player', side: 'player' }],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });
  return store;
}

/**
 * A unit on each side, so the match stays ACTIVE across the sequence.
 *
 * With an empty roster the engine ends the game on the first advance,
 * and every later command is now refused as `match-already-completed` -
 * which would make the restart control below assert nothing.
 */
function twoSidedRoster(): IGameUnit[] {
  return [
    {
      id: 'replay-player',
      name: 'replay-player',
      side: GameSide.Player,
      unitRef: 'replay-player',
      pilotRef: 'replay-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'replay-opponent',
      name: 'replay-opponent',
      side: GameSide.Opponent,
      unitRef: 'replay-opponent',
      pilotRef: 'replay-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function makeHost(store: InMemoryMatchStore): ServerMatchHost {
  return ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
  });
}

function intent(intentId: string): IIntent {
  return {
    kind: 'Intent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind: 'AdvancePhase' },
  } as unknown as IIntent;
}

function duplicateRefusals(
  messages: readonly IServerMessage[],
): readonly IServerMessage[] {
  return messages.filter(
    (message) =>
      message.kind === 'Error' && message.code === 'DUPLICATE_INTENT',
  );
}

/** Rebuilds the host the way a server restart does. */
async function restart(store: InMemoryMatchStore): Promise<ServerMatchHost> {
  const events = await store.getEvents(MATCH_ID, 0);
  const session = hydrateGameSessionFromEvents(MATCH_ID, [...events]);
  const interactive = await InteractiveSession.fromSessionAsync(session);
  return ServerMatchHost.recover(MATCH_ID, store, interactive);
}

describe('intent replay window', () => {
  it('refuses a replayed intent id and appends no event', async () => {
    const store = await makeStore();
    const host = makeHost(store);
    await Promise.resolve();
    await Promise.resolve();

    await host.handleIntent(intent('intent-1'));
    const afterFirst = (await store.getEvents(MATCH_ID, 0)).length;

    const replayed = await host.handleIntent(intent('intent-1'));

    expect(duplicateRefusals(replayed)).toHaveLength(1);
    expect((await store.getEvents(MATCH_ID, 0)).length).toBe(afterFirst);
  });

  it('keeps refusing it after a restart', async () => {
    // The property D7 actually needs. A window that lives only in
    // memory reopens every time the process does, and an attacker who
    // can wait out a restart is not meaningfully blocked at all.
    const store = await makeStore();
    const first = makeHost(store);
    await Promise.resolve();
    await Promise.resolve();
    await first.handleIntent(intent('intent-1'));
    const beforeRestart = (await store.getEvents(MATCH_ID, 0)).length;

    const recovered = await restart(store);
    const replayed = await recovered.handleIntent(intent('intent-1'));

    expect(duplicateRefusals(replayed)).toHaveLength(1);
    expect((await store.getEvents(MATCH_ID, 0)).length).toBe(beforeRestart);
  });

  it('still accepts a fresh intent id after a restart', async () => {
    // The control. Without it the row above would pass equally against
    // a recovered host that had stopped accepting anything — which is
    // a different bug wearing the same green tick.
    const store = await makeStore();
    const first = makeHost(store);
    await Promise.resolve();
    await Promise.resolve();
    await first.handleIntent(intent('intent-1'));
    const beforeRestart = (await store.getEvents(MATCH_ID, 0)).length;

    const recovered = await restart(store);
    const accepted = await recovered.handleIntent(intent('intent-2'));

    expect(duplicateRefusals(accepted)).toHaveLength(0);
    expect((await store.getEvents(MATCH_ID, 0)).length).toBeGreaterThan(
      beforeRestart,
    );
  });
});
