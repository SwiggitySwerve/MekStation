/**
 * Wave 4 multiplayer foundation A — host-authoritative RNG determinism.
 *
 * Verifies the contract that a seeded host session and a guest mirror
 * consuming the host's events end up with byte-identical state. The
 * mechanism under test:
 *
 *   1. Host wraps a deterministic D6 source in `RollCapture` so every
 *      d6 the engine consumes during initiative resolution is recorded.
 *   2. The host stamps the captured rolls into the emitted event's
 *      payload via `embedRollsIntoEvent`.
 *   3. The guest extracts the rolls and pushes them into a
 *      `ReplayDiceRoller`.
 *   4. The guest applies the same event into a sibling session
 *      created with the same id / config / units. Derived state
 *      MUST be JSON-equal (byte-identical after JSON round-trip).
 *
 * @spec openspec/changes/add-p2p-game-session-sync/specs/multiplayer-sync/spec.md § 3
 */

import { SeededDiceRoller } from '@/lib/multiplayer/server/RollCapture';
import { RollCapture } from '@/lib/multiplayer/server/RollCapture';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import {
  GameEventType,
  GamePhase,
  GameSide,
  type IGameUnit,
  type IGameConfig,
  type IInitiativeRolledPayload,
} from '@/types/gameplay/GameSessionInterfaces';
import {
  appendEvent,
  createGameSession,
  rollInitiative,
  startGame,
} from '@/utils/gameplay/gameSession';

import {
  embedRollsIntoEvent,
  extractRollsFromEvent,
} from '../hostRollEmbedding';
import { createReplayDiceRoller } from '../replayDiceRoller';

const FIXED_TIMESTAMP = '2026-04-30T00:00:00.000Z';

function fixtureUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'host-0',
      name: 'Wasp WSP-1A',
      side: GameSide.Player,
      unitRef: 'wsp-1a',
      pilotRef: 'p-host',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'guest-0',
      name: 'Cicada CDA-2A',
      side: GameSide.Opponent,
      unitRef: 'cda-2a',
      pilotRef: 'p-guest',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

function fixtureConfig(): IGameConfig {
  return {
    mapRadius: 8,
    turnLimit: 30,
    victoryConditions: ['destroy_all'],
    optionalRules: [],
  };
}

describe('host-authoritative RNG determinism (replay roller)', () => {
  it('host events with embedded rolls produce identical guest state', () => {
    // -- Host setup ---------------------------------------------------
    const seededRoller = new SeededDiceRoller(new SeededRandom(0xc0ffee));
    const capture = new RollCapture(seededRoller);

    const hostSession0 = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-rng-1',
      createdAt: FIXED_TIMESTAMP,
    });
    const hostSession1 = startGame(hostSession0, GameSide.Player);
    // The default startGame leaves us in Initiative phase — exactly what
    // rollInitiative requires.
    expect(hostSession1.currentState.phase).toBe(GamePhase.Initiative);

    const hostSession2 = rollInitiative(
      hostSession1,
      undefined,
      capture.asD6Roller(),
    );
    const capturedRolls = capture.drain();

    // We rolled 2d6 per side → 4 d6 captured in consumption order.
    expect(capturedRolls).toHaveLength(4);
    for (const die of capturedRolls) {
      expect(die).toBeGreaterThanOrEqual(1);
      expect(die).toBeLessThanOrEqual(6);
    }

    // Stamp only the dice-bearing InitiativeRolled payload. The following
    // InitiativeOrderSet event remains a separate replayable turn-order fact.
    const initiativeRolledEvent = hostSession2.events.find(
      (event) => event.type === GameEventType.InitiativeRolled,
    );
    const initiativeOrderEvent = hostSession2.events.find(
      (event) => event.type === GameEventType.InitiativeOrderSet,
    );
    expect(initiativeRolledEvent).toBeDefined();
    expect(initiativeOrderEvent).toBeDefined();
    const broadcastEvent = embedRollsIntoEvent(
      initiativeRolledEvent!,
      capturedRolls,
    );

    // Sanity-check the embedding round-trips to extraction.
    expect(extractRollsFromEvent(broadcastEvent)).toEqual(capturedRolls);
    const initPayload = broadcastEvent.payload as IInitiativeRolledPayload;
    expect(initPayload.rolls).toEqual(capturedRolls);
    expect(initPayload.playerRoll).toBe(capturedRolls[0] + capturedRolls[1]);
    expect(initPayload.opponentRoll).toBe(capturedRolls[2] + capturedRolls[3]);

    // -- Guest setup --------------------------------------------------
    // Same id, same config, same units, same starting timestamp → the
    // guest's createGameSession produces a session that begins life
    // identical to the host's pre-rollInitiative state.
    const guestSession0 = createGameSession(fixtureConfig(), fixtureUnits(), {
      id: 'match-rng-1',
      createdAt: FIXED_TIMESTAMP,
    });
    const guestSession1 = startGame(guestSession0, GameSide.Player);

    // Guest replays by appending the host's broadcast events verbatim.
    const guestSession2 = appendEvent(
      appendEvent(guestSession1, broadcastEvent),
      initiativeOrderEvent!,
    );

    // -- Assertion: byte-identical derived state ---------------------
    // Compare the full currentState (ignoring updatedAt timestamps that
    // wall-clock differ between calls). A JSON round-trip catches any
    // hidden non-equal but structurally identical objects (e.g. Sets vs
    // Arrays) which would already be a problem.
    expect(JSON.stringify(guestSession2.currentState)).toBe(
      JSON.stringify(hostSession2.currentState),
    );

    // -- Assertion: the broadcast event survived round-trip into the
    // guest's event log unchanged. (The guest's earlier GameCreated /
    // GameStarted events were generated locally with their own UUIDs
    // and timestamps, which is fine — the spec property is "derived
    // state matches", not "every event id matches". Reconnect replay
    // streams the host's GameCreated/GameStarted events too, in which
    // case full event-list parity holds; that's covered by
    // gameSessionChannel.test.ts.)
    const guestInit = guestSession2.events.find(
      (event) => event.type === GameEventType.InitiativeRolled,
    );
    expect(guestInit).toEqual(broadcastEvent);
  });

  it('replay roller reproduces host rolls in consumption order', () => {
    // Independent check: a guest engine that DRIVES dice through the
    // replayDiceRoller (rather than reading them straight from the
    // event payload) emits the same sequence the host's RollCapture
    // recorded. Validates that the roller is itself deterministic
    // and FIFO per-event.
    const replay = createReplayDiceRoller();
    const eventId = 'evt-1';
    const recordedRolls = [3, 5, 2, 6];

    replay.pushEventRolls(eventId, recordedRolls);
    replay.setActiveEventId(eventId);

    const driver = replay.asD6Roller();
    const reproduced = [driver(), driver(), driver(), driver()];

    expect(reproduced).toEqual(recordedRolls);

    // Drained — peek returns []. hasEventRolls remains true.
    expect(replay.peekEventRolls(eventId)).toEqual([]);
    expect(replay.hasEventRolls(eventId)).toBe(true);

    // Calling once more throws — exhaustion is a hard error, not silent
    // re-roll. This is the property that catches host/guest engine drift.
    expect(() => driver()).toThrow(/exhausted/);
  });

  it('idempotent re-push allows reconnect replay; mismatched re-push throws', () => {
    const replay = createReplayDiceRoller();
    replay.pushEventRolls('evt-A', [1, 2, 3]);
    // Same rolls — fine (e.g. reconnect replay re-delivers the same event).
    expect(() => replay.pushEventRolls('evt-A', [1, 2, 3])).not.toThrow();
    // Different rolls — corruption signal.
    expect(() => replay.pushEventRolls('evt-A', [1, 2, 4])).toThrow(/mismatch/);
  });

  it('two host sessions with the same seed produce identical roll sequences', () => {
    // Locks the property the spec depends on: same `diceSeed` → same
    // roll trace. If this regresses, P2P reconnect replay would diverge.
    const a = new RollCapture(new SeededDiceRoller(new SeededRandom(42)));
    const b = new RollCapture(new SeededDiceRoller(new SeededRandom(42)));

    const driverA = a.asD6Roller();
    const driverB = b.asD6Roller();
    const sequenceA = Array.from({ length: 16 }, () => driverA());
    const sequenceB = Array.from({ length: 16 }, () => driverB());

    expect(sequenceA).toEqual(sequenceB);
  });
});
