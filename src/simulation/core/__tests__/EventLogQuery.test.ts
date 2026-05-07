/**
 * EventLogQuery — unit tests covering all 5 spec scenarios from
 * `add-event-log-query-and-unified-readable-format` (combat-analytics
 * delta — EventLogQuery Filter Utility Contract) plus edge cases
 * (empty array, no-match filter, immutability invariants).
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  IDamageAppliedPayload,
  IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { EventLogQuery } from '../EventLogQuery';

/**
 * Helper: build a synthetic `IGameEvent` envelope with sensible defaults
 * so tests can focus on the field(s) they care about. Every override
 * lands on the returned event verbatim — including `side: undefined` to
 * exercise the legacy-fallback path of `bySide`.
 */
function makeEvent(overrides: Partial<IGameEvent>): IGameEvent {
  const base: IGameEvent = {
    id: 'evt-test',
    gameId: 'game-test',
    sequence: 0,
    timestamp: '2026-05-07T00:00:00.000Z',
    type: GameEventType.DamageApplied,
    turn: 1,
    phase: GamePhase.WeaponAttack,
    payload: {
      unitId: 'player-1',
      location: 'CT',
      damage: 5,
      armorRemaining: 10,
      structureRemaining: 20,
      locationDestroyed: false,
    } as IDamageAppliedPayload,
    actorId: 'player-1',
    side: GameSide.Player,
  };
  return { ...base, ...overrides };
}

describe('EventLogQuery', () => {
  describe('spec scenario: ofType narrows to a single event type', () => {
    it('keeps only events whose type matches the argument', () => {
      // Build a 100-event log with 30 DamageApplied, 50 AttackResolved,
      // 20 of mixed other types — mirrors the spec scenario exactly.
      const events: IGameEvent[] = [
        ...Array.from({ length: 30 }, (_, i) =>
          makeEvent({ type: GameEventType.DamageApplied, sequence: i }),
        ),
        ...Array.from({ length: 50 }, (_, i) =>
          makeEvent({ type: GameEventType.AttackResolved, sequence: 30 + i }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          makeEvent({ type: GameEventType.HeatGenerated, sequence: 80 + i }),
        ),
        ...Array.from({ length: 10 }, (_, i) =>
          makeEvent({ type: GameEventType.MovementDeclared, sequence: 90 + i }),
        ),
      ];
      expect(events).toHaveLength(100);

      const result = EventLogQuery.from(events)
        .ofType(GameEventType.DamageApplied)
        .count();

      expect(result).toBe(30);
    });
  });

  describe('spec scenario: byUnit matches both actor and payload-unit attribution', () => {
    it('matches when actorId === unitId OR payload.unitId === unitId', () => {
      const actorMatch = makeEvent({
        actorId: 'player-1',
        payload: {
          unitId: 'opponent-2',
          location: 'CT',
          damage: 5,
          armorRemaining: 10,
          structureRemaining: 20,
          locationDestroyed: false,
        } as IDamageAppliedPayload,
      });
      // Target attribution: damage_applied where the player-1 unit is
      // the TARGET (payload.unitId), opponent-2 is the source (and
      // therefore actorId on the envelope).
      const targetMatch = makeEvent({
        actorId: 'opponent-2',
        side: GameSide.Opponent,
        payload: {
          unitId: 'player-1',
          location: 'LT',
          damage: 3,
          armorRemaining: 7,
          structureRemaining: 15,
          locationDestroyed: false,
          sourceUnitId: 'opponent-2',
        } as IDamageAppliedPayload,
      });
      const irrelevant = makeEvent({
        actorId: 'opponent-3',
        side: GameSide.Opponent,
        payload: {
          unitId: 'opponent-2',
          location: 'CT',
          damage: 1,
          armorRemaining: 5,
          structureRemaining: 5,
          locationDestroyed: false,
        } as IDamageAppliedPayload,
      });

      const result = EventLogQuery.from([actorMatch, targetMatch, irrelevant])
        .byUnit('player-1')
        .toArray();

      expect(result).toHaveLength(2);
      expect(result).toContain(actorMatch);
      expect(result).toContain(targetMatch);
      expect(result).not.toContain(irrelevant);
    });
  });

  describe('spec scenario: bySide reads envelope side first, falls back for legacy streams', () => {
    it('keeps player events whether they have envelope side or only actorId', () => {
      // Mix of post-PR-B events (envelope side present) and legacy
      // events (envelope side absent — only actorId).
      const envelopePlayer = makeEvent({
        sequence: 1,
        actorId: 'player-1',
        side: GameSide.Player,
      });
      const envelopeOpponent = makeEvent({
        sequence: 2,
        actorId: 'opponent-1',
        side: GameSide.Opponent,
      });
      const legacyPlayer = makeEvent({
        sequence: 3,
        actorId: 'player-2',
        side: undefined, // Legacy: no envelope side
      });
      const legacyOpponent = makeEvent({
        sequence: 4,
        actorId: 'opponent-2',
        side: undefined,
      });
      const legacyNoActor = makeEvent({
        sequence: 5,
        actorId: undefined,
        side: undefined,
      });

      const result = EventLogQuery.from([
        envelopePlayer,
        envelopeOpponent,
        legacyPlayer,
        legacyOpponent,
        legacyNoActor,
      ])
        .bySide(GameSide.Player)
        .toArray();

      expect(result).toHaveLength(2);
      expect(result).toContain(envelopePlayer);
      expect(result).toContain(legacyPlayer);
      expect(result).not.toContain(envelopeOpponent);
      expect(result).not.toContain(legacyOpponent);
      expect(result).not.toContain(legacyNoActor);
    });

    it('drops legacy events whose actorId does not match a side prefix', () => {
      const synthetic = makeEvent({
        actorId: 'synthetic-test-fixture-id',
        side: undefined,
      });
      const result = EventLogQuery.from([synthetic])
        .bySide(GameSide.Player)
        .toArray();

      expect(result).toHaveLength(0);
    });
  });

  describe('spec scenario: order-independence of chained filters', () => {
    it('produces identical results regardless of filter order', () => {
      const events: IGameEvent[] = [
        makeEvent({
          sequence: 1,
          type: GameEventType.DamageApplied,
          actorId: 'player-1',
          side: GameSide.Player,
        }),
        makeEvent({
          sequence: 2,
          type: GameEventType.DamageApplied,
          actorId: 'opponent-1',
          side: GameSide.Opponent,
        }),
        makeEvent({
          sequence: 3,
          type: GameEventType.AttackResolved,
          actorId: 'player-1',
          side: GameSide.Player,
        }),
        makeEvent({
          sequence: 4,
          type: GameEventType.DamageApplied,
          actorId: 'player-2',
          side: GameSide.Player,
        }),
      ];

      const aFirst = EventLogQuery.from(events)
        .ofType(GameEventType.DamageApplied)
        .bySide(GameSide.Player)
        .toArray();
      const bFirst = EventLogQuery.from(events)
        .bySide(GameSide.Player)
        .ofType(GameEventType.DamageApplied)
        .toArray();

      expect(aFirst).toEqual(bFirst);
      expect(aFirst).toHaveLength(2);
      expect(aFirst.map((e) => e.sequence)).toEqual([1, 4]);
    });
  });

  describe('spec scenario: chained methods are immutable', () => {
    it('does not mutate the source query when a filter is applied', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, type: GameEventType.DamageApplied }),
        makeEvent({ sequence: 2, type: GameEventType.AttackResolved }),
        makeEvent({ sequence: 3, type: GameEventType.HeatGenerated }),
      ];

      const q = EventLogQuery.from(events);
      const q2 = q.ofType(GameEventType.DamageApplied);

      expect(q.count()).toBe(3); // Original unchanged
      expect(q2.count()).toBe(1); // Derived filtered
      // q is still iterable in full afterwards.
      expect(q.toArray()).toHaveLength(3);
    });

    it('returns NEW EventLogQuery instances from each filter method', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1 }),
        makeEvent({ sequence: 2 }),
      ];
      const q = EventLogQuery.from(events);
      const q2 = q.ofType(GameEventType.DamageApplied);
      const q3 = q.byUnit('player-1');
      const q4 = q.bySide(GameSide.Player);
      const q5 = q.inTurn(1);
      const q6 = q.inPhase(GamePhase.WeaponAttack);
      const q7 = q.whereActor((id) => id === 'player-1');

      // Every filter call returns a new instance (we use `!==`
      // identity comparison rather than equality because it's the
      // immutability invariant we care about).
      expect(q2).not.toBe(q);
      expect(q3).not.toBe(q);
      expect(q4).not.toBe(q);
      expect(q5).not.toBe(q);
      expect(q6).not.toBe(q);
      expect(q7).not.toBe(q);
    });
  });

  describe('inTurn', () => {
    it('keeps only events whose turn matches the argument', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, turn: 1 }),
        makeEvent({ sequence: 2, turn: 2 }),
        makeEvent({ sequence: 3, turn: 2 }),
        makeEvent({ sequence: 4, turn: 3 }),
      ];

      const result = EventLogQuery.from(events).inTurn(2).toArray();
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.sequence)).toEqual([2, 3]);
    });
  });

  describe('inPhase', () => {
    it('keeps only events whose phase matches the argument', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, phase: GamePhase.Movement }),
        makeEvent({ sequence: 2, phase: GamePhase.WeaponAttack }),
        makeEvent({ sequence: 3, phase: GamePhase.Movement }),
        makeEvent({ sequence: 4, phase: GamePhase.Heat }),
      ];

      const result = EventLogQuery.from(events)
        .inPhase(GamePhase.Movement)
        .toArray();
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.sequence)).toEqual([1, 3]);
    });
  });

  describe('whereActor', () => {
    it('keeps only events whose actorId satisfies the predicate', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, actorId: 'player-1' }),
        makeEvent({ sequence: 2, actorId: 'opponent-1' }),
        makeEvent({ sequence: 3, actorId: 'player-2' }),
        makeEvent({ sequence: 4, actorId: undefined }),
      ];

      const result = EventLogQuery.from(events)
        .whereActor((id) => id.startsWith('player-'))
        .toArray();
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.sequence)).toEqual([1, 3]);
    });

    it('drops events with no actorId regardless of predicate result', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, actorId: undefined }),
      ];
      // Predicate that would otherwise match anything — we want to be
      // sure events with no actor never satisfy `whereActor`.
      const result = EventLogQuery.from(events)
        .whereActor(() => true)
        .toArray();
      expect(result).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('from([]) — empty array returns count 0 and undefined first()', () => {
      const q = EventLogQuery.from([]);
      expect(q.count()).toBe(0);
      expect(q.first()).toBeUndefined();
      expect(q.toArray()).toEqual([]);
    });

    it('no-match filter — empty result keeps query callable downstream', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, type: GameEventType.DamageApplied }),
      ];
      const q = EventLogQuery.from(events).ofType(GameEventType.UnitDestroyed);
      expect(q.count()).toBe(0);
      expect(q.first()).toBeUndefined();
      // Chaining further filters on an empty result is still valid.
      expect(q.byUnit('player-1').count()).toBe(0);
    });

    it('whereActor with always-false predicate yields empty result', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 1, actorId: 'player-1' }),
        makeEvent({ sequence: 2, actorId: 'opponent-1' }),
      ];
      const result = EventLogQuery.from(events)
        .whereActor(() => false)
        .toArray();
      expect(result).toHaveLength(0);
    });

    it('first() returns the first event of the filtered slice', () => {
      const events: IGameEvent[] = [
        makeEvent({ sequence: 10, type: GameEventType.DamageApplied }),
        makeEvent({ sequence: 11, type: GameEventType.DamageApplied }),
      ];
      const result = EventLogQuery.from(events)
        .ofType(GameEventType.DamageApplied)
        .first();
      expect(result?.sequence).toBe(10);
    });

    it('toArray returns the inner array without copying', () => {
      const events: IGameEvent[] = [makeEvent({ sequence: 1 })];
      const q = EventLogQuery.from(events);
      // Identity check — `from` doesn't copy, so the returned array IS
      // the input array. (After a filter the returned array is a new
      // slice, but the entry-point invariant holds.)
      expect(q.toArray()).toBe(events);
    });
  });
});
