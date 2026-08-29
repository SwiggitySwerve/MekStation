/**
 * Umbrella 4.1 - one serialized executor per match.
 *
 * `Per-Session Command Execution Is Serialized`: accepted-intent
 * evaluation and commit run through one queue per match, while
 * unrelated sessions progress independently. The observable is a store
 * whose appendEvent parks on a gate: without the executor, a second
 * intent's work interleaves inside the first's append window; with it,
 * every trace entry of intent B follows intent A's completion.
 */

import type { IGameEvent } from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameSide, type IGameUnit } from '@/types/gameplay';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const ADVANCE: IIntent = {
  kind: 'Intent',
  matchId: 'match-serial',
  ts: new Date().toISOString(),
  playerId: 'p1',
  intent: { kind: 'AdvancePhase' },
};

class GatedStore extends InMemoryMatchStore {
  readonly trace: string[] = [];
  private gate: Promise<void> = Promise.resolve();
  private release: () => void = () => {};

  constructor() {
    super({ quiet: true });
    // appendEvent is an instance field on the parent, so the wrap
    // captures the parent's binding rather than a prototype method.
    const base = this.appendEvent;
    this.appendEvent = async (matchId: string, event: IGameEvent) => {
      this.trace.push(`append:start:${event.sequence}`);
      await this.gate;
      await base(matchId, event);
      this.trace.push(`append:end:${event.sequence}`);
    };
  }

  arm(): void {
    this.gate = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  open(): void {
    this.release();
  }
}

function roster(): IGameUnit[] {
  return [
    {
      id: 'ser-player',
      name: 'ser-player',
      side: GameSide.Player,
      unitRef: 'ser-player',
      pilotRef: 'ser-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'ser-opponent',
      name: 'ser-opponent',
      side: GameSide.Opponent,
      unitRef: 'ser-opponent',
      pilotRef: 'ser-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

async function makeHost(
  matchId: string,
  store: InMemoryMatchStore,
  playerIds: readonly string[] = ['p1'],
) {
  const now = new Date().toISOString();
  await store.createMatch({
    matchId,
    hostPlayerId: 'p1',
    playerIds: [...playerIds],
    sideAssignments: playerIds.map((playerId, index) => ({
      playerId,
      side: index === 0 ? 'player' : 'opponent',
    })),
    status: 'lobby',
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
    gameUnits: roster(),
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

describe('serialized intent executor (umbrella 4.1)', () => {
  it('a second intent runs only after the first completes', async () => {
    const store = new GatedStore();
    const host = await makeHost('match-serial', store);
    store.trace.length = 0;

    store.arm();
    const first = host.handleIntent({ ...ADVANCE, intentId: 'serial-a' });
    await waitUntil(() => store.trace.length > 0, 'first append parked');
    const second = host.handleIntent({ ...ADVANCE, intentId: 'serial-b' });
    // Give the second intent every chance to interleave into A's window.
    await new Promise((resolve) => setTimeout(resolve, 50));

    const parked = [...store.trace];
    store.open();
    await Promise.all([first, second]);

    // Falsification: bypass the executor chain in handleIntent and the
    // parked snapshot grows a second append:start while A is gated.
    expect(
      parked.filter((line) => line.startsWith('append:start')),
    ).toHaveLength(1);
    // Full trace: strictly A's append closed before B's opened.
    const firstEnd = store.trace.indexOf(
      'append:end:' + parkedSequence(parked),
    );
    const secondStart = store.trace.findIndex(
      (line, index) =>
        index > 0 && line.startsWith('append:start') && index > firstEnd,
    );
    expect(firstEnd).toBeGreaterThanOrEqual(0);
    expect(secondStart).toBeGreaterThan(firstEnd);
  });

  it('concurrent P1/P2 intents form deterministic non-interleaved batches', async () => {
    // Umbrella 4.3's core: two DIFFERENT players submit legal intents
    // concurrently; the executor establishes one order and neither
    // batch's store writes interleave with the other's.
    const store = new GatedStore();
    const host = await makeHost('match-p1p2', store, ['p1', 'p2']);
    store.trace.length = 0;

    store.arm();
    const one = host.handleIntent({
      ...ADVANCE,
      matchId: 'match-p1p2',
      playerId: 'p1',
      intentId: 'p1-advance',
    });
    await waitUntil(() => store.trace.length > 0, 'p1 append parked');
    const two = host.handleIntent({
      ...ADVANCE,
      matchId: 'match-p1p2',
      playerId: 'p2',
      intentId: 'p2-advance',
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    const parked = [...store.trace];
    store.open();
    await Promise.all([one, two]);

    // Falsification: remove the executor chain and P2's append opens
    // inside P1's gated window.
    expect(
      parked.filter((line) => line.startsWith('append:start')),
    ).toHaveLength(1);
    // Deterministic non-interleaved order BETWEEN commands: each command
    // appends a contiguous ascending block, so cross-command interleave
    // shows up as a descending pair of start sequences (a later command's
    // higher sequence opening while an earlier one still has lower
    // sequences pending). Within-command overlap is legitimate.
    const starts = store.trace
      .filter((line) => line.startsWith('append:start:'))
      .map((line) => Number(line.slice('append:start:'.length)));
    expect(starts.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < starts.length; i += 1) {
      expect(starts[i]).toBeGreaterThan(starts[i - 1]);
    }
  });

  it('a slow command in one match does not park another match', async () => {
    const slowStore = new GatedStore();
    const fastStore = new InMemoryMatchStore({ quiet: true });
    const slowHost = await makeHost('match-slow', slowStore);
    const fastHost = await makeHost('match-fast', fastStore);

    slowStore.arm();
    const slow = slowHost.handleIntent({
      ...ADVANCE,
      matchId: 'match-slow',
      intentId: 'slow-a',
    });
    await waitUntil(() => slowStore.trace.length > 0, 'slow append parked');

    // The unrelated session completes while the slow one is parked.
    const fast = await fastHost.handleIntent({
      ...ADVANCE,
      matchId: 'match-fast',
      intentId: 'fast-a',
    });
    expect(fast.some((frame) => frame.kind === 'Event')).toBe(true);

    slowStore.open();
    await slow;
  });
});

async function waitUntil(
  predicate: () => boolean,
  label: string,
): Promise<void> {
  for (let i = 0; i < 200; i += 1) {
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error(`waitUntil timed out: ${label}`);
}

function parkedSequence(parked: readonly string[]): string {
  const start = parked.find((line) => line.startsWith('append:start:'));
  if (!start) throw new Error('no parked append recorded');
  return start.slice('append:start:'.length);
}
