/**
 * AcceptedIntentTracker unit tests — harden-multiplayer-transport (M2),
 * design D7 / tasks 6.x.
 */

import {
  GameEventType,
  GamePhase,
  type IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { AcceptedIntentTracker } from '../reconnection/AcceptedIntentTracker';

function makeEvent(sequence: number, intentId?: string): IGameEvent {
  return {
    id: `evt-${sequence}`,
    gameId: 'm',
    sequence,
    timestamp: new Date().toISOString(),
    type: GameEventType.PhaseChanged,
    turn: 1,
    phase: GamePhase.Initiative,
    payload: (intentId ? { intentId } : {}) as never,
  } as IGameEvent;
}

describe('AcceptedIntentTracker', () => {
  it('flags a re-recorded intent id as a duplicate', () => {
    const tracker = new AcceptedIntentTracker();
    expect(tracker.isDuplicate('intent-1')).toBe(false);
    tracker.record('intent-1');
    expect(tracker.isDuplicate('intent-1')).toBe(true);
  });

  it('record is idempotent and does not refresh recency', () => {
    const tracker = new AcceptedIntentTracker(2);
    tracker.record('a');
    tracker.record('a'); // idempotent
    expect(tracker.size()).toBe(1);
  });

  it('evicts the oldest id once the bound is exceeded', () => {
    const tracker = new AcceptedIntentTracker(3);
    tracker.record('a');
    tracker.record('b');
    tracker.record('c');
    tracker.record('d'); // evicts 'a'
    expect(tracker.size()).toBe(3);
    expect(tracker.isDuplicate('a')).toBe(false); // evicted
    expect(tracker.isDuplicate('b')).toBe(true);
    expect(tracker.isDuplicate('d')).toBe(true);
  });

  it('reconstructs the accepted-id set from a persisted event log', () => {
    const log: IGameEvent[] = [
      makeEvent(0), // GameCreated-class — no intentId
      makeEvent(1, 'intent-move-1'),
      makeEvent(2), // continuation event of the same intent
      makeEvent(3, 'intent-attack-1'),
    ];
    const tracker = AcceptedIntentTracker.fromEventLog(log);
    expect(tracker.isDuplicate('intent-move-1')).toBe(true);
    expect(tracker.isDuplicate('intent-attack-1')).toBe(true);
    expect(tracker.isDuplicate('never-seen')).toBe(false);
    expect(tracker.size()).toBe(2);
  });

  it('reconstruction replays ids in sequence order so eviction is stable', () => {
    const log: IGameEvent[] = [
      makeEvent(2, 'c'),
      makeEvent(0, 'a'),
      makeEvent(1, 'b'),
    ];
    // maxSize 2 → after sorted replay a,b,c the oldest ('a') is evicted.
    const tracker = AcceptedIntentTracker.fromEventLog(log, 2);
    expect(tracker.isDuplicate('a')).toBe(false);
    expect(tracker.isDuplicate('b')).toBe(true);
    expect(tracker.isDuplicate('c')).toBe(true);
  });
});
