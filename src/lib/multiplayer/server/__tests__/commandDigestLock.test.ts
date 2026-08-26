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
    // The DICE seed, which is a different knob from `random` above and
    // is the one initiative actually consumes. Without it the host
    // builds a `CryptoDiceRoller` - correct for a real match, where the
    // server is the sole source of randomness and replay reads the
    // rolls it STAMPED rather than re-deriving them, but fatal to a
    // digest lock, which needs the same command to land the same way
    // twice.
    diceSeed: 42,
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
 * `initiativeWinner` and `firstMover` ARE included, and the story of why
 * they once were not is worth keeping, because the original diagnosis
 * was wrong in a way that is easy to repeat.
 *
 * They were excluded because they flipped between runs, and that was
 * read as a product defect: "`rollInitiative` defaults its `diceRoller`
 * to `defaultD6Roller` (`Math.random`), and the seeded stream handed to
 * `ServerMatchHost.create` is not reaching it." Both halves were false.
 * `ServerMatchHostBootstrap` injects the roller into the session, and
 * `InteractiveSession.phases.ts` passes it into `rollInitiative` - so
 * the roller arrives. What the host builds WITHOUT a `diceSeed` is a
 * `CryptoDiceRoller`, not `Math.random`, and it is crypto BY DESIGN: on
 * a server-authoritative match the server is the sole source of
 * randomness, and replay reads back the rolls it stamped onto events
 * rather than re-deriving them from a seed.
 *
 * So the flipping was this test seeding the wrong thing. `random` is the
 * engine's general RNG; `diceSeed` is what initiative consumes. Measured
 * both ways before changing anything: without `diceSeed` the outcome
 * flips between exactly two values across 8 runs, with it 8 of 8 runs
 * are identical.
 *
 * The lesson the exclusion should have carried: a value that varies is
 * not automatically a defect, and "the seeded stream is not reaching it"
 * is a claim that has to be measured before it is written down.
 */
function postStateDigest(host: ServerMatchHost): string {
  const state = host.getSessionForTests().currentState;
  return digestReplayCheckpointState({
    status: state.status,
    turn: state.turn,
    phase: state.phase,
    activationIndex: state.activationIndex,
    initiativeWinner: state.initiativeWinner ?? null,
    firstMover: state.firstMover ?? null,
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
      'a9054322deb133195c878ba3f55a37a7067758360db1a392303014020f1af5b3',
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
