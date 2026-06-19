/**
 * EventLogQuery — chainable, immutable filter utility over `IGameEvent[]`.
 *
 * Per `add-event-log-query-and-unified-readable-format` (combat-analytics
 * delta — EventLogQuery Filter Utility Contract): the simulation core
 * SHALL ship a chainable, immutable query utility that wraps a
 * `readonly IGameEvent[]` and exposes filter methods.
 *
 * Each filter method returns a NEW `EventLogQuery` instance. The
 * underlying event array is never mutated and never copied — `from()`
 * just wraps the array by reference, and each filter produces a freshly
 * filtered slice that the next link in the chain wraps in turn.
 *
 * Consumers (metrics collectors, scenario tests, future UI replays)
 * should use this utility instead of inline
 * `events.filter(e => e.type === X && e.payload.unitId === Y)` predicates
 * — the chained calls compose cleanly and keep the filter semantics
 * (envelope-then-fallback for `bySide`, dual actor/target attribution
 * for `byUnit`) consistent across consumers.
 */

import {
  GameEventType,
  GamePhase,
  GameSide,
  IGameEvent,
} from '@/types/gameplay/GameSessionInterfaces';

import { sideFromUnitId } from './sideFromActor';

export class EventLogQuery {
  /**
   * Private constructor — call sites use the static `from()` entry point
   * (or the chainable filter methods) rather than instantiating directly.
   * This makes the wrap-by-reference invariant unambiguous from the
   * outside: there is exactly one ctor path and it doesn't copy.
   */
  private constructor(private readonly events: readonly IGameEvent[]) {}

  /**
   * Entry point. Wraps the supplied event array by reference (no copy)
   * so the query layer adds zero memory overhead for an unfiltered chain.
   */
  static readonly from = (events: readonly IGameEvent[]): EventLogQuery =>
    new EventLogQuery(events);

  /**
   * Filter to events whose `event.type` equals the argument. The generic
   * type parameter exists so call sites can preserve narrowed payload
   * types when they immediately read `.first()` / `.toArray()` after
   * `ofType(...)` — TypeScript's discriminated-union narrowing kicks in
   * on the consumer side.
   */
  ofType<T extends GameEventType>(type: T): EventLogQuery {
    return new EventLogQuery(this.events.filter((e) => e.type === type));
  }

  /**
   * Filter to events that touch `unitId` from EITHER attribution side:
   * - the envelope `event.actorId === unitId` (the unit that authored
   *   the event — typically the attacker / mover / heat-emitter)
   * - the payload `event.payload.unitId === unitId` (the unit the event
   *   describes — typically the target of damage / crits / pilot hits;
   *   this also covers self-events where actorId === payload.unitId)
   *
   * Covering both attribution paths matches how MetricsCollector walks
   * the event log — every payload that carries a `unitId` registers
   * against its derived side, so byUnit reproduces that bidirectional
   * matching for consumers that want a per-unit slice.
   */
  byUnit(unitId: string): EventLogQuery {
    return new EventLogQuery(
      this.events.filter((e) => {
        if (e.actorId === unitId) return true;
        const payload = e.payload as { readonly unitId?: string };
        return payload.unitId === unitId;
      }),
    );
  }

  /**
   * Filter to events on a given side. Reads the envelope `event.side`
   * first (post-`denormalize-event-envelope-and-close-emission-contract-gaps`
   * the field is populated at emission time by `createGameEvent`), then
   * falls back to `sideFromUnitId(event.actorId)` for legacy NDJSON
   * streams written before the envelope-denormalization landed.
   *
   * The fallback is best-effort — events with neither `side` nor an
   * `actorId` matching the canonical prefix (e.g., system / lifecycle
   * events with no actor) are dropped. That matches the spec's
   * "drops events with no side" expectation while keeping legacy
   * mixed-stream replay correct.
   */
  bySide(side: GameSide): EventLogQuery {
    return new EventLogQuery(
      this.events.filter((e) => {
        if (e.side !== undefined) return e.side === side;
        // Legacy fallback: derive side from actorId prefix. The
        // GameSide enum values are the lowercase strings 'player' /
        // 'opponent', matching sideFromUnitId's return shape.
        if (e.actorId === undefined) return false;
        const derived = sideFromUnitId(e.actorId);
        return derived === side;
      }),
    );
  }

  /**
   * Filter to events on a given turn. Turn comparison is exact-match.
   */
  readonly inTurn = (turn: number): EventLogQuery =>
    new EventLogQuery(this.events.filter((e) => e.turn === turn));

  /**
   * Filter to events in a given phase. Phase comparison is exact-match
   * against the `GamePhase` enum value (lowercased string).
   */
  inPhase(phase: GamePhase): EventLogQuery {
    return new EventLogQuery(this.events.filter((e) => e.phase === phase));
  }

  /**
   * Filter to events whose `actorId` (when present) satisfies the
   * predicate. Events with no `actorId` are dropped — `whereActor` is
   * for actor-scoped slicing, so a missing actor is always a non-match.
   */
  readonly whereActor = (
    predicate: (actorId: string) => boolean,
  ): EventLogQuery =>
    new EventLogQuery(
      this.events.filter(
        (e) => e.actorId !== undefined && predicate(e.actorId),
      ),
    );

  /**
   * Returns the current filtered array. No copy — consumers SHALL treat
   * the returned array as readonly (the type signature enforces this at
   * the type-system level).
   */
  readonly toArray = (): readonly IGameEvent[] => this.events;

  /**
   * Returns the length of the current filtered array.
   */
  readonly count = (): number => this.events.length;

  /**
   * Returns the first event of the current filtered array, or
   * `undefined` if empty. Useful for `query.ofType(X).byUnit(Y).first()`
   * style spot-checks in scenario tests.
   */
  readonly first = (): IGameEvent | undefined => this.events[0];
}
