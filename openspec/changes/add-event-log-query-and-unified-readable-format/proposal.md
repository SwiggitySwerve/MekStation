# Add EventLogQuery utility + unified columnar readable format

## Why

Two complementary surfaces need to consume the typed event log shipped by PRs A-C:

1. **In-process consumers** (metrics collectors, scenario tests, future UI replays) currently reinvent ad-hoc `events.filter(e => e.type === X && e.payload.unitId === Y)` predicates. There's no shared utility, no narrowed-type inference, and no place to add reusable helpers like `inTurn(n)` / `bySide('player')` / `byUnit('atlas-as7d')`.

2. **Post-hoc human review** of the readable-companion `*.readable.txt` files needs a fixed-width columnar layout so `awk`, `grep`, `cut` work without per-event-type regexes. Today's formatter (PR A) uses uneven payload-summary widths that defeat column-position tools.

PR D ships both at once because they share a contract: the `IGameEvent` discriminated union as the canonical schema, with side / unitId / phase / sequence / turn as the searchable axes.

## What

### EventLogQuery (TypeScript chainable filter)

New file at `src/simulation/core/EventLogQuery.ts`:

```ts
export class EventLogQuery {
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

- `bySide` reads `event.side` from the envelope (PR B). Falls back to `MetricsCollector.sideFromUnitId` for legacy event streams that lack `side`.
- `byUnit` matches when `event.actorId === unitId` OR `event.payload.unitId === unitId` (covers both author and target attribution).
- `inPhase` reads `event.phase` from the envelope; case-sensitive enum compare.
- `whereActor` accepts a custom predicate over `actorId` for ad-hoc filters.
- All chainable methods return a new `EventLogQuery` instance (immutable).
- `toArray()` returns the underlying readonly array (no copy).

### MetricsCollector + combatFidelityTally adopt EventLogQuery

Refactor existing inline filters in:
- `src/simulation/metrics/MetricsCollector.ts`
- `src/simulation/metrics/combatFidelityTally.ts`

to use `EventLogQuery`. Behavior MUST stay equivalent — existing scenario tests + Monte Carlo distribution tests are the regression net.

### Python columnar formatter (`scripts/format-event-log.py`)

Rewrite the formatter to emit a fixed-width 74-char prefix + variable summary:

```
s<seq:5d> t<turn:2d> <phase:8s> <side:9s> <actor:14s> <action:24s>  <action-summary>
```

| Column | Width | Source |
|---|---|---|
| `s<seq>` | 6 | `event.sequence` |
| `t<turn>` | 4 | `event.turn` |
| `phase` | 8 | `event.phase` (left-padded) |
| `side` | 9 | `event.side` if present, else fall back to actorId-prefix lookup |
| `actor` | 14 | `event.actorId` (last 14 chars; `-` if absent) |
| `action` | 24 | `event.type` lowercased |

After the prefix and 2 spaces, per-action-category summary (see `quick-session` spec delta below for the full table).

Hex coordinates rendered via the existing `coord_to_board_label` (PR A).

### Spec extensions

- `combat-analytics`: ADD `Requirement: EventLogQuery Filter Utility Contract` — chainable filter shape, immutability, `bySide` envelope-then-fallback semantics.
- `quick-session`: MODIFIED `Requirement: Readable Event-Log Companion Formatter Contract` (existing requirement from PR A) — extend with the 74-char fixed-width prefix and per-category summary table. The PR-A scenarios remain valid (the new prefix doesn't change WHICH fields the formatter reads); add new scenarios for prefix layout.

## Impact

- **Affected types**: none (no schema changes — pure consumer-side projection).
- **Affected code**:
  - NEW `src/simulation/core/EventLogQuery.ts` (~80-120 LOC)
  - NEW `src/simulation/core/__tests__/EventLogQuery.test.ts` (~120-150 LOC)
  - REFACTOR `src/simulation/metrics/MetricsCollector.ts` — inline filters → `EventLogQuery`
  - REFACTOR `src/simulation/metrics/combatFidelityTally.ts` — inline filters → `EventLogQuery`
  - REWRITE `scripts/format-event-log.py` — uneven layout → fixed 74-char prefix
- **Affected specs**: `combat-analytics` (ADDED), `quick-session` (MODIFIED, with PR-A scenarios preserved).
- **Risk**: medium — `MetricsCollector` refactor must be behavior-equivalent; the broader test suite (combat-fidelity scenario tests, 4 Monte Carlo distribution tests, 60+ unit tests) is the regression net.

## Out of scope

- New event types (movement_step, magma_damage, etc.) — follow-on changes already named.
- PSR reason discriminated enum — PR E.
- UI replay viewer — separate concern; PR D ships only the substrate.
- A query shim for Python (the readable-companion formatter is already columnar so `awk`/`grep` is the Python-side query interface).
