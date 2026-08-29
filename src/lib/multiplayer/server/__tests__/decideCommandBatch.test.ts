/**
 * Decision seam: an ordered event batch without advancing the live
 * engine (adopt-combat-event-journal-authority task 2.2).
 *
 * The 2.1 digest lock is the equality anchor: same seeded host, three
 * AdvancePhase commands, same `sequence:type` signature and post-state
 * digest. This file must not edit that lock.
 */

import type { IGameUnit } from '@/types/gameplay/GameSessionInterfaces';
import type { IIntent } from '@/types/multiplayer/Protocol';

import { createMinimalGrid } from '@/engine/GameEngine.helpers';
import { SeededRandom } from '@/simulation/core/SeededRandom';
import { GameEventType, GameSide, type IGameEvent } from '@/types/gameplay';

import { buildHostSession } from '../ServerMatchHostBootstrap';
import {
  decideCommandBatch,
  digestCommandPostState,
  type IDecideCommandBatchDeps,
} from '../ServerMatchHostDecision';
import { dispatchToEngine } from '../ServerMatchHostEngineDispatch';

const ADVANCE: IIntent['intent'] = { kind: 'AdvancePhase' };

const INVALID_MOVE: IIntent['intent'] = {
  kind: 'Move',
  unitId: 'lock-player',
  to: { q: 99, r: 99 },
  facing: 0,
  movementType: 'walk',
};

const DEPS: IDecideCommandBatchDeps = {
  randomSeed: 42,
  diceSeed: 42,
};

/** Same two-sided roster the 2.1 digest lock uses. */
function twoSidedRoster(): IGameUnit[] {
  return [
    {
      id: 'lock-player',
      name: 'lock-player',
      side: GameSide.Player,
      unitRef: 'lock-player',
      pilotRef: 'lock-player-pilot',
      gunnery: 4,
      piloting: 5,
    },
    {
      id: 'lock-opponent',
      name: 'lock-opponent',
      side: GameSide.Opponent,
      unitRef: 'lock-opponent',
      pilotRef: 'lock-opponent-pilot',
      gunnery: 4,
      piloting: 5,
    },
  ] as IGameUnit[];
}

function makeLive() {
  return buildHostSession({
    mapRadius: 4,
    turnLimit: 5,
    random: new SeededRandom(42),
    grid: createMinimalGrid(4),
    playerUnits: [],
    opponentUnits: [],
    gameUnits: twoSidedRoster(),
    diceSeed: 42,
  });
}

function signature(events: readonly IGameEvent[]): string[] {
  return events.map((event) => `${event.sequence}:${event.type}`);
}

function snapshot(session: ReturnType<typeof makeLive>['session']) {
  const live = session.getSession();
  return {
    eventCount: live.events.length,
    digest: digestCommandPostState(live),
    eventIds: live.events.map((event) => event.id),
    sessionObject: live,
  };
}

describe('decideCommandBatch', () => {
  it('EQUALITY: decided batch for command N+1 matches the live path and the digest lock', () => {
    const { session } = makeLive();

    for (let i = 0; i < 3; i += 1) {
      const decided = decideCommandBatch(session, ADVANCE, DEPS);
      const head = session.getSession().events.length;
      dispatchToEngine(session, ADVANCE);
      const applied = session.getSession().events.slice(head);
      expect(signature(applied)).toEqual(signature(decided.events));
      expect(digestCommandPostState(session.getSession())).toBe(
        decided.postStateDigest,
      );
    }

    expect(signature(session.getSession().events)).toEqual([
      '0:game_created',
      '1:game_started',
      '2:initiative_rolled',
      '3:initiative_order_set',
      '4:phase_changed',
      '5:movement_locked',
      '6:movement_locked',
      '7:phase_changed',
      '8:attack_locked',
      '9:attack_locked',
      '10:attacks_revealed',
      '11:phase_changed',
    ]);
    expect(digestCommandPostState(session.getSession())).toBe(
      '164f29962e280bee5b09130ed0ff5b37475df5a2afe4d267aca665e76c4b5262',
    );
  });

  it('UNTOUCHED: decide leaves the live session digest and event count unchanged', () => {
    const { session, captureRef } = makeLive();
    const before = snapshot(session);
    const captureBefore = captureRef.current;

    decideCommandBatch(session, ADVANCE, DEPS);

    const after = snapshot(session);
    expect(after.eventCount).toBe(before.eventCount);
    expect(after.digest).toBe(before.digest);
    expect(after.eventIds).toEqual(before.eventIds);
    expect(after.sessionObject).toBe(before.sessionObject);
    expect(captureRef.current).toBe(captureBefore);
    expect(captureRef.current.getCaptured()).toEqual(
      captureBefore.getCaptured(),
    );
  });

  it('SCRATCH FIDELITY: decide after several live commits still matches the live path', () => {
    const { session } = makeLive();
    dispatchToEngine(session, ADVANCE);
    dispatchToEngine(session, ADVANCE);

    const decided = decideCommandBatch(session, ADVANCE, DEPS);
    const head = session.getSession().events.length;
    dispatchToEngine(session, ADVANCE);
    const applied = session.getSession().events.slice(head);

    expect(signature(applied)).toEqual(signature(decided.events));
    expect(digestCommandPostState(session.getSession())).toBe(
      decided.postStateDigest,
    );
    expect(decided.events.length).toBeGreaterThan(0);
  });

  it('DETERMINISM: two decides of the same intent from the same state match', () => {
    const { session } = makeLive();
    const first = decideCommandBatch(session, ADVANCE, DEPS);
    const second = decideCommandBatch(session, ADVANCE, DEPS);

    expect(signature(second.events)).toEqual(signature(first.events));
    expect(second.postStateDigest).toBe(first.postStateDigest);
  });

  it('ISOLATION: a refused movement_invalid decide does not commit on live', () => {
    const { session, captureRef } = makeLive();
    const before = snapshot(session);
    const captureBefore = captureRef.current;

    const decided = decideCommandBatch(session, INVALID_MOVE, DEPS);

    const after = snapshot(session);
    expect(after.eventCount).toBe(before.eventCount);
    expect(after.digest).toBe(before.digest);
    expect(after.sessionObject).toBe(before.sessionObject);
    expect(captureRef.current).toBe(captureBefore);
    expect(
      decided.events.some(
        (event) => event.type === GameEventType.MovementInvalid,
      ),
    ).toBe(true);
  });
});
