## ADDED Requirements

### Requirement: EventLogQuery Filter Utility Contract

The simulation core SHALL ship a chainable, immutable query utility at `src/simulation/core/EventLogQuery.ts` that wraps a `readonly IGameEvent[]` and exposes filter methods. Each method SHALL return a NEW `EventLogQuery` instance — the underlying event array is never mutated and never copied. Consumers (metrics collectors, scenario tests, future UI replays) SHALL use this utility instead of inline `events.filter(e => e.type === X && e.payload.unitId === Y)` predicates.

The utility MUST expose at minimum these methods:

```ts
class EventLogQuery {
  static from(events: readonly IGameEvent[]): EventLogQuery;
  ofType<T extends GameEventType>(type: T): EventLogQuery;
  byUnit(unitId: string): EventLogQuery;
  bySide(side: GameSide): EventLogQuery;
  inTurn(turn: number): EventLogQuery;
  inPhase(phase: GamePhase): EventLogQuery;
  whereActor(predicate: (actorId: string) => boolean): EventLogQuery;
  toArray(): readonly IGameEvent[];
  count(): number;
  first(): IGameEvent | undefined;
}
```

Method semantics:

- `from(events)` — entry point; SHALL NOT copy the array (just wrap by reference for chainable filtering).
- `ofType(type)` — keeps events whose `event.type` equals the argument.
- `byUnit(unitId)` — keeps events whose `event.actorId === unitId` OR whose `event.payload.unitId === unitId` (covers both author and target attribution).
- `bySide(side)` — keeps events whose envelope `event.side` equals the argument. For legacy event streams without `event.side`, the utility MAY fall back to the actorId-prefix lookup (`MetricsCollector.sideFromUnitId`) for back-compat.
- `inTurn(turn)` — keeps events whose `event.turn` equals the argument.
- `inPhase(phase)` — keeps events whose `event.phase` equals the argument.
- `whereActor(predicate)` — keeps events whose `event.actorId` (when present) satisfies the predicate; events with no `actorId` are dropped.
- `toArray()` — returns the current filtered readonly array (no copy; the inner array is exposed directly).
- `count()` — returns the length of the current filtered array.
- `first()` — returns the first event of the current filtered array, or `undefined` if empty.

Chainable methods SHALL be order-independent — `query.ofType(X).bySide(Y)` and `query.bySide(Y).ofType(X)` SHALL produce the same result.

`MetricsCollector` and `combatFidelityTally` SHALL adopt this utility, replacing existing inline `events.filter(...)` chains. The refactor SHALL be behavior-equivalent — existing scenario tests, Monte Carlo distribution tests, and combat-fidelity unit tests are the regression net.

#### Scenario: ofType narrows to a single event type

- **GIVEN** a 100-event log with 30 `damage_applied`, 50 `attack_resolved`, and 20 other types
- **WHEN** `EventLogQuery.from(events).ofType(GameEventType.DamageApplied).count()` is called
- **THEN** the result SHALL be 30

#### Scenario: byUnit matches both actor and payload-unit attribution

- **GIVEN** a log with one event where `actorId: 'player-1'` and one event where `payload.unitId: 'player-1'` (target attribution, e.g. `damage_applied` with `sourceUnitId: 'opponent-2'` but `payload.unitId: 'player-1'`)
- **WHEN** `EventLogQuery.from(events).byUnit('player-1').toArray()` is called
- **THEN** the result SHALL contain BOTH events

#### Scenario: bySide reads envelope side first, falls back for legacy streams

- **GIVEN** a log where some events have `event.side: 'player'` (post-PR B) and others have only `actorId: 'player-1'` (legacy, no envelope side)
- **WHEN** `EventLogQuery.from(events).bySide(GameSide.Player).toArray()` is called
- **THEN** the result SHALL contain ALL player-side events regardless of which side-source the event was authored from

#### Scenario: Order-independence of chained filters

- **GIVEN** any event log
- **WHEN** `EventLogQuery.from(events).ofType(GameEventType.DamageApplied).bySide(GameSide.Player).toArray()` is called
- **AND** `EventLogQuery.from(events).bySide(GameSide.Player).ofType(GameEventType.DamageApplied).toArray()` is called
- **THEN** both results SHALL contain identical events in identical order

#### Scenario: Chained methods are immutable (no mutation of intermediate queries)

- **GIVEN** a query `q = EventLogQuery.from(events)` and a derived `q2 = q.ofType(GameEventType.DamageApplied)`
- **WHEN** `q.count()` is called
- **THEN** the result SHALL be `events.length` (the original unfiltered count)
- **AND** `q2.count()` SHALL be the filtered count
