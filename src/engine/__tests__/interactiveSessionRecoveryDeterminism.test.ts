/**
 * `add-sp-combat-determinism` task 2.3 — recovery-determinism proof for
 * design D4's proof obligation (spec scenario: "Identical rehydrations
 * produce identical continuations").
 *
 * D4's contract is deliberately narrow: recovery re-seeds from position
 * zero, it does NOT continue the interrupted dice stream. The invariant
 * that contract creates is "two identical rehydrations of one persisted
 * seeded session, driven identically, produce identical normalized
 * continuation streams" — NOT that a recovered run matches what an
 * uninterrupted run would have produced (that's explicitly out of
 * scope, D4 rationale). Seed *survival* (the persist -> hydrate round
 * trip covered by `InteractiveSession.seedRoundTrip.test.ts`, R2) and
 * fresh-session same-seed determinism (task 3.1, not yet landed) do NOT
 * exercise the recovery seam this change modifies — this suite does.
 *
 * Per repo history (instant-defeat recovery-collision bug, PR #1019):
 * "jest passing while live fails means the test skipped the route-mount
 * recovery path." This suite therefore goes through the SAME factory
 * chain the live route mounts — `hydrateRecoverableSessionFromMatchLog`
 * -> `fromSessionAsync`, composed exactly as `recoverInteractiveSession`
 * does it (`InteractiveSession.ts`) — and never hand-builds a session
 * object to feed `fromSessionAsync` directly.
 *
 * No golden values: per design D6, the assertion is run-to-run equality
 * of the two recovered continuations only. A divergence here means the
 * re-seed wiring in task 2.1 is incomplete (a recovery-path RNG
 * consumer not re-seeded from `config.seed`) — the fix is in the
 * wiring, never in loosening this comparison.
 */

import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

// Recovery's `fromSessionAsync` re-derives adapted units via
// `adaptUnit` (`CompendiumAdapter`). Mocked so the test is deterministic
// and doesn't depend on the on-disk catalog — same pattern as
// `InteractiveSession.recovery.test.ts` / `useGameplayStore.recover.test.ts`.
jest.mock('../adapters/CompendiumAdapter', () => {
  const mockAdaptUnit = jest.fn();
  return {
    adaptUnit: mockAdaptUnit,
    __mockAdaptUnit: mockAdaptUnit,
  };
});

if (typeof globalThis.structuredClone === 'undefined') {
  Object.defineProperty(globalThis, 'structuredClone', {
    value: <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T,
    writable: true,
    configurable: true,
  });
}

import type { IWeapon } from '@/simulation/ai/types';

import { MatchLogStorage } from '@/lib/p2p/matchLogStorage';
import {
  GameSide,
  LockState,
  type IGameEvent,
  type IGameUnit,
} from '@/types/gameplay/GameSessionInterfaces';
import { Facing, MovementType } from '@/types/gameplay/HexGridInterfaces';

import type { IAdaptedUnit } from '../types';

import { GameEngine } from '../GameEngine';
import {
  InteractiveSession,
  recoverInteractiveSession,
} from '../InteractiveSession';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const adapterModule = require('../adapters/CompendiumAdapter') as {
  __mockAdaptUnit: jest.Mock;
};
const mockAdaptUnit = adapterModule.__mockAdaptUnit;

const SEED = 335577;
const MAP_RADIUS = 6;
const TURN_LIMIT = 3;
// Initiative -> Movement -> WeaponAttack: enough phase-advances to
// leave the source session mid-battle (movement + weapon declarations
// on the log) without letting a 3-turn-limit battle finish before it's
// persisted.
const SOURCE_DRIVE_ITERATIONS = 3;
// 6 phases/turn * TURN_LIMIT, plus generous headroom so a legitimately
// slow-to-resolve battle isn't mistaken for a hung driver.
const CONTINUATION_SAFETY_BOUND = 60;

function installFreshIndexedDB(): void {
  Object.defineProperty(globalThis, 'indexedDB', {
    value: new IDBFactory(),
    writable: true,
    configurable: true,
  });
}

function makeWeapon(id: string): IWeapon {
  return {
    id,
    name: 'Medium Laser',
    shortRange: 3,
    mediumRange: 6,
    longRange: 9,
    damage: 5,
    heat: 3,
    minRange: 0,
    ammoPerTon: -1,
    destroyed: false,
  };
}

function makeAdaptedUnit(id: string, side: GameSide): IAdaptedUnit {
  return {
    id,
    side,
    position: side === GameSide.Player ? { q: 0, r: -3 } : { q: 0, r: 3 },
    facing: side === GameSide.Player ? Facing.North : Facing.South,
    heat: 0,
    movementThisTurn: MovementType.Stationary,
    hexesMovedThisTurn: 0,
    armor: {
      head: 9,
      center_torso: 31,
      left_torso: 22,
      right_torso: 22,
      left_arm: 17,
      right_arm: 17,
      left_leg: 21,
      right_leg: 21,
    },
    structure: {
      head: 3,
      center_torso: 21,
      left_torso: 14,
      right_torso: 14,
      left_arm: 11,
      right_arm: 11,
      left_leg: 14,
      right_leg: 14,
    },
    destroyedLocations: [],
    destroyedEquipment: [],
    ammo: {},
    pilotWounds: 0,
    pilotConscious: true,
    destroyed: false,
    lockState: LockState.Pending,
    weapons: [makeWeapon(`${id}-medium-laser`)],
    walkMP: 4,
    runMP: 6,
    jumpMP: 0,
  };
}

function makeGameUnits(): readonly IGameUnit[] {
  return [
    {
      id: 'player-1',
      name: 'Atlas',
      side: GameSide.Player,
      unitRef: 'player-1',
      pilotRef: 'pilot-player',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'opponent-1',
      name: 'Marauder',
      side: GameSide.Opponent,
      unitRef: 'opponent-1',
      pilotRef: 'pilot-opponent',
      gunnery: 4,
      piloting: 5,
    },
  ];
}

/**
 * Drive `iterations` phase-advances, having the bot AI act for BOTH
 * sides ahead of each advance. Phase-aware (`runInteractiveSessionAITurn`
 * no-ops outside Movement / WeaponAttack / PhysicalAttack), so calling
 * it for a phase with nothing to declare is harmless. Using this same
 * driver both to build the source session's pre-persist history and to
 * continue each recovered session means no unit is ever asked to
 * re-declare an action within a phase it already committed to.
 */
function driveInteractiveSessionPhases(
  session: InteractiveSession,
  iterations: number,
): void {
  for (let i = 0; i < iterations; i++) {
    session.runAITurn(GameSide.Player);
    session.runAITurn(GameSide.Opponent);
    session.advancePhase();
  }
}

/** Drive to completion (bounded) — the "identical continuation sequences" the D4 proof obligation requires. */
function driveInteractiveSessionToCompletion(
  session: InteractiveSession,
): void {
  let iterations = 0;
  while (!session.isGameOver() && iterations < CONTINUATION_SAFETY_BOUND) {
    session.runAITurn(GameSide.Player);
    session.runAITurn(GameSide.Opponent);
    session.advancePhase();
    iterations += 1;
  }
  if (iterations >= CONTINUATION_SAFETY_BOUND) {
    throw new Error(
      'driveInteractiveSessionToCompletion exceeded its safety bound — ' +
        'the session never reached game-over. Raise the bound only after ' +
        'confirming this is a legitimately slow battle, not a hung driver.',
    );
  }
}

/**
 * Strip the two non-deterministic top-level event fields — `id`
 * (uuidv4, per-run random) and `timestamp` (wall-clock) — before
 * comparison. Every other field (gameId, sequence, turn, phase, type,
 * actorId, visibility, side, payload) is in scope for the equality
 * check; none of `IGameEndedPayload` / the resolver payloads embed a
 * wall-clock or generated-id field of their own (verified this
 * session), so no deeper normalization is needed for this suite's
 * fixture. Mirrors the sibling normalizer in
 * `replay-determinism.integration.test.ts`.
 */
function normalizeEventsForComparison(
  events: readonly IGameEvent[],
): readonly unknown[] {
  return events.map(({ id: _id, timestamp: _timestamp, ...rest }) => rest);
}

describe('InteractiveSession recover-twice determinism (add-sp-combat-determinism D4, task 2.3)', () => {
  let storage: MatchLogStorage;

  beforeEach(() => {
    installFreshIndexedDB();
    storage = new MatchLogStorage({
      dbName: 'recovery-determinism-test',
      now: () => '2026-07-10T00:00:00.000Z',
    });
    mockAdaptUnit.mockReset();
    mockAdaptUnit.mockImplementation(
      async (
        unitRef: string,
        options: { side: GameSide } = { side: GameSide.Player },
      ) => makeAdaptedUnit(unitRef, options.side),
    );
  });

  afterEach(() => {
    storage.close();
  });

  it('two rehydrations of one persisted seeded session, driven identically through the live factory chain, produce identical normalized continuations', async () => {
    const engine = new GameEngine({
      seed: SEED,
      mapRadius: MAP_RADIUS,
      turnLimit: TURN_LIMIT,
    });
    const source = engine.createInteractiveSession(
      [makeAdaptedUnit('player-1', GameSide.Player)],
      [makeAdaptedUnit('opponent-1', GameSide.Opponent)],
      makeGameUnits(),
    );

    // Drive partway — recovery must start mid-battle, not at turn 0.
    driveInteractiveSessionPhases(source, SOURCE_DRIVE_ITERATIONS);

    const sourceSession = source.getSession();
    const matchId = sourceSession.id;
    const prefixLength = sourceSession.events.length;
    // GameCreated + GameStarted + at least the Initiative/Movement/
    // WeaponAttack phase-transition and resolver events from the three
    // driven iterations.
    expect(prefixLength).toBeGreaterThan(2);
    expect(source.isGameOver()).toBe(false);

    await Promise.all(
      sourceSession.events.map((event) => storage.appendEvent(matchId, event)),
    );

    // Recover TWICE through the LIVE factory chain the route mounts —
    // `hydrateRecoverableSessionFromMatchLog` -> `fromSessionAsync`,
    // composed exactly as `recoverInteractiveSession` does it. Never a
    // hand-built session object fed directly into `fromSessionAsync`.
    const recoveredA = await recoverInteractiveSession(matchId, storage);
    const recoveredB = await recoverInteractiveSession(matchId, storage);

    // Sanity: recovery genuinely resumed mid-battle, not a finished game.
    expect(recoveredA.isGameOver()).toBe(false);
    expect(recoveredB.isGameOver()).toBe(false);
    expect(recoveredA.getSession().events).toHaveLength(prefixLength);
    expect(recoveredB.getSession().events).toHaveLength(prefixLength);

    driveInteractiveSessionToCompletion(recoveredA);
    driveInteractiveSessionToCompletion(recoveredB);

    expect(recoveredA.isGameOver()).toBe(true);
    expect(recoveredB.isGameOver()).toBe(true);

    const continuationA = normalizeEventsForComparison(
      recoveredA.getSession().events.slice(prefixLength),
    );
    const continuationB = normalizeEventsForComparison(
      recoveredB.getSession().events.slice(prefixLength),
    );

    // No golden values (design D6) — run-to-run equality only.
    expect(continuationA.length).toBeGreaterThan(0);
    expect(continuationA).toEqual(continuationB);

    // Full-log equality is a stronger, equally valid restatement of the
    // same invariant (identical persisted prefix + identical
    // continuation) — both recovered instances read the same match log.
    const fullA = normalizeEventsForComparison(recoveredA.getSession().events);
    const fullB = normalizeEventsForComparison(recoveredB.getSession().events);
    expect(fullA).toEqual(fullB);
  });
});
