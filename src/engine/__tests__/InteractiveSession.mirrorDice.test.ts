/**
 * An adopted session must name its dice (C-1c PR 0, Option A).
 *
 * `InteractiveSession.fromSession` used to build a session with no
 * roller. The End-phase PSR drain then fell back to `resolvePendingPSRs`'
 * default `rollDice`, which is `Math.random`: a reconnecting guest that
 * advanced the End phase locally rolled PSRs the host never saw.
 *
 * The roller is now required. A guest mirror passes the roller that
 * throws; a session that is meant to roll passes a seeded one.
 */

import type { IGameSession } from '@/types/gameplay';

import { InteractiveSession } from '@/engine/InteractiveSession';
import {
  createMirrorDiceRoller,
  MirrorSessionRolledDiceError,
} from '@/lib/p2p/mirrorDiceRoller';
import { SeededD6Roller } from '@/simulation/core';
import { GameEventType, GamePhase } from '@/types/gameplay';
import { resolvePendingPSRs } from '@/utils/gameplay/gameSessionPSRResolution';

import {
  advanceHostToEndWithQueuedPsr,
  makePsrFixtureHost,
} from './InteractiveSession.psrEndFixture.test-helpers';

/** The host's End-phase snapshot, built before any spy is installed. */
function endPhaseSnapshot(): IGameSession {
  const host = makePsrFixtureHost();
  advanceHostToEndWithQueuedPsr(host);
  return host.getSession();
}

function count(session: IGameSession, type: GameEventType): number {
  return session.events.filter((event) => event.type === type).length;
}

/** Run `action`, returning what it threw and how often Math.random was read. */
function observeAmbientRandom(action: () => void): {
  thrown: unknown;
  ambientReads: number;
} {
  const random = jest.spyOn(Math, 'random').mockReturnValue(0.5);
  let thrown: unknown;
  try {
    action();
  } catch (error) {
    thrown = error;
  }
  const ambientReads = random.mock.calls.length;
  random.mockRestore();
  return { thrown, ambientReads };
}

describe('InteractiveSession.fromSession dice', () => {
  it('a mirror-adopted session refuses to resolve the queued PSR locally', () => {
    const snapshot = endPhaseSnapshot();
    expect(snapshot.currentState.phase).toBe(GamePhase.End);
    expect(count(snapshot, GameEventType.PSRTriggered)).toBe(1);
    const guest = InteractiveSession.fromSession(
      snapshot,
      createMirrorDiceRoller(),
    );

    const { thrown, ambientReads } = observeAmbientRandom(() =>
      guest.advancePhase(),
    );

    expect(thrown).toBeInstanceOf(MirrorSessionRolledDiceError);
    expect(ambientReads).toBe(0);
    // Nothing was written: the guest is still at End with the PSR queued.
    expect(guest.getSession().currentState.phase).toBe(GamePhase.End);
    expect(count(guest.getSession(), GameEventType.PSRResolved)).toBe(0);
  });

  it('a session given a seeded roller resolves the PSR from it, not Math.random', () => {
    const snapshot = endPhaseSnapshot();
    const run = (): IGameSession => {
      const session = InteractiveSession.fromSession(
        snapshot,
        new SeededD6Roller(11).asD6Roller(),
      );
      session.advancePhase();
      return session.getSession();
    };

    let first!: IGameSession;
    let second!: IGameSession;
    const { thrown, ambientReads } = observeAmbientRandom(() => {
      first = run();
      second = run();
    });

    expect(thrown).toBeUndefined();
    expect(ambientReads).toBe(0);
    expect(count(first, GameEventType.PSRResolved)).toBe(1);
    expect(
      first.events.find((e) => e.type === GameEventType.PSRResolved)?.payload,
    ).toEqual(
      second.events.find((e) => e.type === GameEventType.PSRResolved)?.payload,
    );
  });

  it('adopting a session without naming a roller is refused, not defaulted', () => {
    const snapshot = endPhaseSnapshot();

    const { thrown, ambientReads } = observeAmbientRandom(() =>
      // @ts-expect-error the roller is required
      InteractiveSession.fromSession(snapshot),
    );

    expect(thrown).toBeInstanceOf(TypeError);
    expect((thrown as Error).message).toMatch(/needs a dice roller/);
    expect(ambientReads).toBe(0);
  });
});

describe('resolvePendingPSRs', () => {
  it('requires a roller', () => {
    const snapshot = endPhaseSnapshot();

    const { thrown, ambientReads } = observeAmbientRandom(() =>
      // @ts-expect-error the roller is required
      resolvePendingPSRs(snapshot),
    );

    expect(thrown).toBeInstanceOf(TypeError);
    expect(ambientReads).toBe(0);
  });
});
