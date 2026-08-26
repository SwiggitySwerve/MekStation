/**
 * The command-to-event mapping and post-state digest, locked before the
 * engine/host boundary is refactored (adopt-combat-event-journal-authority
 * task 2.1; design D4 risk "decision extraction changes engine behavior").
 *
 * PR 2 of that change pulls a decision seam out of the host so a command
 * produces an ordered event batch WITHOUT advancing the live engine.
 * That refactor is only safe if there is something to compare against
 * afterwards, and "the tests still pass" is not that comparison — most
 * of the suite would pass equally against a command that produced the
 * right events in the wrong order, or the right state by a different
 * route.
 *
 * So this pins two things per command: the exact ordered event
 * signature, and a digest of the post-state.
 *
 * The digest is over `currentState` — the DERIVED state, which is what a
 * command changes — and deliberately excludes `gameId`, which identifies
 * the session rather than describing it and would otherwise make the
 * digest vary per run. `updatedAt` is excluded for the same reason: it
 * is a clock reading, not an outcome.
 */

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { digestReplayCheckpointState } from '@/lib/events/replay/ReplayCheckpointCompatibility';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { type IIntent, nowIso } from '@/types/multiplayer/Protocol';

import { InMemoryMatchStore } from '../InMemoryMatchStore';
import { ServerMatchHost } from '../ServerMatchHost';

const MATCH_ID = 'match-digest-lock';

async function makeHost(): Promise<ServerMatchHost> {
  const store = new InMemoryMatchStore({ quiet: true });
  const now = '2026-06-30T12:00:00.000Z';
  await store.createMatch({
    matchId: MATCH_ID,
    hostPlayerId: 'host-player',
    playerIds: ['host-player', 'guest-player'],
    sideAssignments: [
      { playerId: 'host-player', side: 'player' },
      { playerId: 'guest-player', side: 'opponent' },
    ],
    status: 'active',
    createdAt: now,
    updatedAt: now,
    config: { mapRadius: 4, turnLimit: 5 },
  });

  const host = ServerMatchHost.create(MATCH_ID, store, {
    mapRadius: 4,
    turnLimit: 5,
    // Seeded so the mapping is a property of the command, not of luck.
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: [],
  });
  await Promise.resolve();
  await Promise.resolve();
  return host;
}

function intent(intentId: string, kind: string): IIntent {
  return {
    kind: 'Intent',
    matchId: MATCH_ID,
    ts: nowIso(),
    playerId: 'host-player',
    intentId,
    intent: { kind },
  } as unknown as IIntent;
}

/** `sequence:type` per event, in order. The command-to-event lock. */
async function eventSignature(host: ServerMatchHost): Promise<string[]> {
  const events = await host.getEventsFromSeq(0);
  return events.map((event) => `${event.sequence}:${event.type}`);
}

/**
 * Digest of the DERIVED post-state.
 *
 * `gameId` is excluded because it identifies the session rather than
 * describing it, and including it would make this vary per run.
 *
 * `initiativeWinner` and `firstMover` are excluded for a WORSE reason,
 * recorded here rather than quietly worked around: on this path they are
 * NOT DETERMINISTIC. Measured while writing this lock - four runs of the
 * identical seeded setup produced `opponent`/`player` once and
 * `player`/`opponent` three times. `rollInitiative` defaults its
 * `diceRoller` to `defaultD6Roller` (`Math.random`), and the seeded
 * stream handed to `ServerMatchHost.create` is not reaching it. Locking
 * a value that flips would produce a flake, not a lock, so the two
 * fields sit outside the digest until that is fixed - filed separately.
 * Everything else here is stable, and the determinism row below is what
 * keeps that claim honest.
 */
function postStateDigest(host: ServerMatchHost): string {
  const state = host.getSessionForTests().currentState;
  return digestReplayCheckpointState({
    status: state.status,
    turn: state.turn,
    phase: state.phase,
    activationIndex: state.activationIndex,
    units: state.units,
  });
}

/** Drives the same commands every time, so two runs are comparable. */
async function driveCommands(host: ServerMatchHost): Promise<void> {
  await host.handleIntent(intent('lock-1', 'AdvancePhase'));
  await host.handleIntent(intent('lock-2', 'AdvancePhase'));
  await host.handleIntent(intent('lock-3', 'AdvancePhase'));
}

/**
 * OBSERVED WHILE LOCKING THIS, and deliberately locked AS IS rather than
 * fixed here: events 6 and 7 are phase advances that land AFTER
 * `game_ended` at 5. Probed directly - the game status is `completed`
 * after the first command, and the next `AdvancePhase` is still accepted
 * and still commits. Characterisation records what the system does; a
 * task about locking behaviour is the wrong place to change it. Filed
 * separately.
 */
describe('command-to-event and post-state digest lock', () => {
  it('produces the same events and post-state for the same commands', async () => {
    // Determinism FIRST. A golden digest that varies per run is not a
    // lock, it is a flake, and pinning one would be worse than pinning
    // nothing at all.
    const first = await makeHost();
    await driveCommands(first);
    const second = await makeHost();
    await driveCommands(second);

    expect(await eventSignature(second)).toEqual(await eventSignature(first));
    expect(postStateDigest(second)).toBe(postStateDigest(first));
  });

  it('locks the ordered event signature of the driven commands', async () => {
    const host = await makeHost();
    await driveCommands(host);

    // Written out rather than snapshotted on purpose. A snapshot can be
    // regenerated with `-u` and the change disappears into a file nobody
    // reads; a literal makes a behaviour change show up as a diff in the
    // test itself, which is the entire job of a lock.
    expect(await eventSignature(host)).toEqual([
      '0:game_created',
      '1:game_started',
      '2:initiative_rolled',
      '3:initiative_order_set',
      '4:phase_changed',
      '5:game_ended',
      '6:phase_changed',
      '7:phase_changed',
    ]);
  });

  it('locks the post-state digest of the driven commands', async () => {
    const host = await makeHost();
    await driveCommands(host);

    expect(postStateDigest(host)).toBe(
      'be5f4595cb31a7347b9286d3199af06873fc12ff2debfc8ba782fd41e8d0dd2c',
    );
  });

  it('moves the digest when the commands differ', async () => {
    // Sensitivity. A digest that ignored the command would agree with
    // any refactor, including one that broke it.
    const base = await makeHost();
    await driveCommands(base);
    const fewer = await makeHost();
    await fewer.handleIntent(intent('lock-1', 'AdvancePhase'));

    expect(postStateDigest(fewer)).not.toBe(postStateDigest(base));
  });
});
