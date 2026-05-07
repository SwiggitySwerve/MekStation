## ADDED Requirements

### Requirement: Replay State-From-Events Reducer Contract

The application SHALL ship a pure projection hook at `src/hooks/replay/useHexMapStateFromEvents.ts` that consumes `events: readonly IGameEvent[]` plus a `currentSequence: number` cursor and returns `{ tokens, hexTerrain, mapRadius }` ready for `<HexMapDisplay>` rendering. The hook SHALL have NO I/O, NO side effects, and NO React refs — it is a memoized projection over its inputs.

```ts
export interface ReplayHexMapState {
  readonly tokens: readonly IUnitToken[];
  readonly hexTerrain: readonly IHexTerrain[];
  readonly mapRadius: number;
}

export function useHexMapStateFromEvents(
  events: readonly IGameEvent[],
  currentSequence: number,
): ReplayHexMapState;
```

The reducer SHALL walk events in monotonic `sequence` order from the start of the array up to and including the highest event whose `event.sequence <= currentSequence`. It SHALL apply per-event mutations only for the eight on-map event families enumerated below. All other event types SHALL pass through silently — they may flow through the timeline scrubber but they SHALL NOT change `tokens`, `hexTerrain`, or `mapRadius`.

The covered event families and their mutations:

| Event type | Mutation |
|---|---|
| `GameCreated` | Seeds the initial `tokens` array from `payload.units` (one `IUnitToken` per unit, with the variant chosen by `unit.unitType`). Sets `mapRadius = payload.config.mapRadius`. |
| `MovementDeclared` | Updates the actor token's `position` to `payload.to` and `facing` to `payload.facing`. |
| `DamageApplied` | Tracks accumulated location-level damage on the affected unit (per-unit per-location bookkeeping). When `payload.locationDestroyed === true` AND `payload.location === 'CT'`, sets the unit's `isDestroyed = true`. |
| `LocationDestroyed` | Records the destroyed location in the per-unit damage map. When `payload.location === 'CT'`, sets the unit's `isDestroyed = true`. |
| `TransferDamage` | Records the transfer in the per-unit damage map (informational; does not flip `isDestroyed` on its own). |
| `UnitDestroyed` | Sets the unit's `isDestroyed = true`. |
| `UnitFell` | Tags the unit as prone (rendered via the existing token component's prone visualization). |
| `UnitStood` | Clears the unit's prone tag. |
| `HeatGenerated` / `HeatDissipated` | Tracks `currentHeat` per unit (consumed by the token's existing heat-band rendering). |
| `PilotHit` | Increments per-unit `pilotWounds`. |

The reducer SHALL be idempotent: for any input `(events, currentSequence)`, repeated invocation SHALL produce structurally equivalent output (deep-equal `tokens` and `hexTerrain` arrays).

The reducer SHALL NOT assume monotonic forward progression of `currentSequence` between calls. Stepping the cursor backward SHALL produce the correct state for the new cursor value (re-walking from the beginning of `events` is acceptable; a forward-only optimization is out of scope for this PR).

The reducer SHALL be `useMemo`-d on `[events, currentSequence]` so re-renders that do not change the cursor reuse the prior projection.

For NDJSON streams that omit `GameCreated` (e.g., a partial log starting mid-encounter), the reducer SHALL return `{ tokens: [], hexTerrain: [], mapRadius: 0 }` and SHALL NOT throw — the page can detect the empty `tokens` array and render an "incomplete event log" placeholder.

#### Scenario: GameCreated seeds tokens and mapRadius

- **GIVEN** a 1-event log containing only `GameCreated` with `payload.units = [unitA, unitB]` and `payload.config.mapRadius = 17`
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 0)` is called
- **THEN** the result `tokens` SHALL contain exactly two entries (one per unit)
- **AND** `tokens[0].unitId` SHALL equal `unitA.id`
- **AND** `tokens[1].unitId` SHALL equal `unitB.id`
- **AND** `mapRadius` SHALL equal `17`

#### Scenario: MovementDeclared updates position and facing for the actor

- **GIVEN** a log with `GameCreated` (unitA at default origin) followed by `MovementDeclared { unitId: unitA.id, to: { q: 3, r: 5 }, facing: Facing.SouthEast }`
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 1)` is called
- **THEN** the token for `unitA` SHALL have `position.q === 3 && position.r === 5`
- **AND** the token's `facing` SHALL equal `Facing.SouthEast`

#### Scenario: UnitDestroyed flips isDestroyed

- **GIVEN** a log with `GameCreated` (unitA, unitB) followed by `UnitDestroyed { unitId: unitA.id, cause: 'damage' }`
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 1)` is called
- **THEN** the token for `unitA` SHALL have `isDestroyed === true`
- **AND** the token for `unitB` SHALL have `isDestroyed === false`

#### Scenario: LocationDestroyed on CT flips isDestroyed

- **GIVEN** a log with `GameCreated` (unitA) followed by `LocationDestroyed { unitId: unitA.id, location: 'CT' }`
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 1)` is called
- **THEN** the token for `unitA` SHALL have `isDestroyed === true`

#### Scenario: Cursor truncation excludes events beyond currentSequence

- **GIVEN** a log with `GameCreated` (unitA at origin) at sequence 0, `MovementDeclared` (unitA → `(2,2)`) at sequence 1, and `UnitDestroyed` (unitA) at sequence 2
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 1)` is called
- **THEN** the token for `unitA` SHALL have `position.q === 2 && position.r === 2`
- **AND** `isDestroyed === false` (the destroy event is past the cursor)

#### Scenario: Backward cursor seek returns correct earlier state

- **GIVEN** a log where `useHexMapStateFromEvents(events, 5)` was called and produced state S5
- **WHEN** `useHexMapStateFromEvents(events, 2)` is called
- **THEN** the result SHALL equal the state that would have been produced by walking events 0..2 from scratch
- **AND** SHALL NOT carry any mutations from events 3..5

#### Scenario: Empty-prefix log without GameCreated returns empty defaults

- **GIVEN** an event log that does not contain a `GameCreated` event (e.g., a partial NDJSON stream)
- **WHEN** `useHexMapStateFromEvents(events, currentSequence: 100)` is called
- **THEN** the result SHALL equal `{ tokens: [], hexTerrain: [], mapRadius: 0 }`
- **AND** SHALL NOT throw

#### Scenario: Idempotent on repeated invocation

- **GIVEN** any event log and any `currentSequence`
- **WHEN** the reducer is invoked twice with the same `(events, currentSequence)`
- **THEN** both invocations SHALL produce structurally equivalent `{ tokens, hexTerrain, mapRadius }` results
