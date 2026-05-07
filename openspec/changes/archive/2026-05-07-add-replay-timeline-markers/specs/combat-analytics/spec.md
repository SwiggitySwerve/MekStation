# combat-analytics Specification — Delta

## ADDED Requirements

### Requirement: Replay Timeline Key-Moment Markers Contract

The application SHALL ship two timeline overlay components — `KeyMomentMarkers` and `PhaseChangeMarkers` — that render on top of the existing `<ReplayTimeline>` track to surface high-value events at a glance and let the user click-to-seek to those events.

`KeyMomentMarkers` (`src/components/audit/replay/KeyMomentMarkers.tsx`) SHALL:

- Accept props `{ events: readonly IGameEvent[]; minSequence: number; maxSequence: number; onSeek: (progress: number) => void }`.
- Filter the event log via `EventLogQuery.from(events)` for the five key-moment types and render one colored badge per match at the timeline-relative position `(event.sequence - minSequence) / (maxSequence - minSequence)`:
  - `UnitDestroyed` → red badge
  - `CriticalHit` and `CriticalHitResolved` → orange badge
  - `AmmoExplosion` → purple badge
  - `PilotHit` → yellow badge
  - `UnitFell` → gray badge
- On badge click, invoke `onSeek(position)` with the badge's relative position so the parent scrubber jumps to that event's `sequence`.
- Render NOTHING when `events.length === 0` or no event matches the five key-moment types.

`PhaseChangeMarkers` (`src/components/audit/replay/PhaseChangeMarkers.tsx`) SHALL:

- Accept the same prop shape as `KeyMomentMarkers`.
- Render dotted vertical lines at every `TurnStarted` and `PhaseChanged` event's relative position.
- On hover, render a tooltip displaying `Turn ${event.turn} — ${formattedPhase}` (e.g. "Turn 7 — Weapon Attack"), using a human-readable phase label derived from the `GamePhase` enum.
- Render NOTHING when no events match.

`<ReplayTimeline>` (`src/components/audit/replay/ReplayTimeline.tsx`) SHALL accept two optional new props:

```ts
interface ReplayTimelineProps {
  // ... existing props ...
  /**
   * Gameplay event log used to derive key-moment + phase-change overlays.
   * When omitted, no overlays render (existing audit-store consumers are unaffected).
   */
  keyMoments?: readonly IGameEvent[];
  phaseChanges?: readonly IGameEvent[];
}
```

When `keyMoments` is provided, `<ReplayTimeline>` SHALL render `<KeyMomentMarkers>` as an overlay above the track. When `phaseChanges` is provided, it SHALL render `<PhaseChangeMarkers>` as an overlay above the track. Both overlays SHALL forward `onSeek` from the timeline's existing seek callback so badge clicks scrub the player.

#### Scenario: Key-moment markers render at the correct positions

- **GIVEN** an event log with one `UnitDestroyed` at sequence 50, one `CriticalHit` at sequence 100, and `minSequence: 0, maxSequence: 200`
- **WHEN** `<KeyMomentMarkers events={log} minSequence={0} maxSequence={200} onSeek={seek}>` mounts
- **THEN** two badges render
- **AND** the `UnitDestroyed` badge sits at left: 25% (50/200)
- **AND** the `CriticalHit` badge sits at left: 50% (100/200)
- **AND** the `UnitDestroyed` badge has the red color class
- **AND** the `CriticalHit` badge has the orange color class

#### Scenario: Clicking a key-moment badge seeks the timeline

- **GIVEN** a `<KeyMomentMarkers>` rendered with one `UnitDestroyed` at sequence 50 in a [0, 200] range
- **WHEN** the user clicks the badge
- **THEN** `onSeek(0.25)` is called exactly once

#### Scenario: Phase-change markers render at every TurnStarted and PhaseChanged

- **GIVEN** an event log containing `TurnStarted` at sequences 10, 30, 50 and `PhaseChanged` at sequences 15, 35, 55
- **WHEN** `<PhaseChangeMarkers>` mounts
- **THEN** six dotted vertical lines render
- **AND** hovering each line reveals a tooltip with `Turn N — <phase>`

#### Scenario: ReplayTimeline composes overlays only when the optional props are set

- **GIVEN** a `<ReplayTimeline>` rendered without the `keyMoments` or `phaseChanges` props
- **WHEN** the timeline mounts
- **THEN** neither `<KeyMomentMarkers>` nor `<PhaseChangeMarkers>` renders
- **AND** the existing audit-style markers prop continues to render unchanged

#### Scenario: Empty event log renders no marker overlays

- **GIVEN** `<KeyMomentMarkers events={[]} ...>` and `<PhaseChangeMarkers events={[]} ...>`
- **WHEN** the components mount
- **THEN** both render an empty fragment (no badges, no lines)

## MODIFIED Requirements

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

The reducer SHALL walk events in monotonic `sequence` order from the start of the array up to and including the highest event whose `event.sequence <= currentSequence`. It SHALL apply per-event mutations only for the on-map event families enumerated below. All other event types SHALL pass through silently — they may flow through the timeline scrubber but they SHALL NOT change `tokens`, `hexTerrain`, or `mapRadius`.

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
| `ComponentDestroyed` | When the actor unit projects to an `IMechToken` (Mech archetype): translates the runner's 2-letter MegaMek location code (`'HD'`, `'CT'`, `'LT'`, `'RT'`, `'LA'`, `'RA'`, `'LL'`, `'RL'`, plus the quad-specific `'FLL'`, `'FRL'`, `'RLL'`, `'RRL'`) into the corresponding `BipedPipLocation` / `QuadPipLocation` key, then updates the unit's `armorPipState.locations[mappedKey]`. The reducer SHALL initialize `armorPipState` lazily — first damage event allocates the `archetype`-appropriate `locations` map (humanoid / quad / lam) with every location set to `'full'`, then mutates the affected location. Transitions: `'full'` → `'partial'` on the first damage event for that location, and from any state → `'structure'` when `payload.componentType` is an internal component (`engine`, `gyro`, `weapon`, `actuator`, `heat_sink`, `cockpit`, `sensor`, `life_support`, `jump_jet`, `ammo`). When `LocationDestroyed` has already fired on the same location, transitions to `'destroyed'`. Non-Mech tokens SHALL pass `ComponentDestroyed` through silently — `armorPipState` is Mech-only per `IMechToken`. Unrecognized location codes SHALL pass through silently (no throw, no mutation). |
| `CriticalHitResolved` | Same projection logic as `ComponentDestroyed` (covers the post-PR-`add-combat-fidelity-suite` Phase-4 emitter path while `ComponentDestroyed` covers the legacy Phase-3 path). |

The reducer SHALL be idempotent: for any input `(events, currentSequence)`, repeated invocation SHALL produce structurally equivalent output (deep-equal `tokens` and `hexTerrain` arrays).

The reducer SHALL NOT assume monotonic forward progression of `currentSequence` between calls. Stepping the cursor backward SHALL produce the correct state for the new cursor value (re-walking from the beginning of `events` is acceptable; a forward-only optimization is out of scope for this PR).

The reducer SHALL be `useMemo`-d on `[events, currentSequence]` so re-renders that do not change the cursor reuse the prior projection.

#### Scenario: ComponentDestroyed populates Mech armorPipState

- **GIVEN** an event log containing `GameCreated` (seeding a humanoid Mech `player-1`) followed by `ComponentDestroyed { unitId: 'player-1', location: 'LA', componentType: 'actuator' }`
- **WHEN** the reducer walks to `currentSequence ≥ 2`
- **THEN** the `player-1` token's `armorPipState.archetype === 'humanoid'`
- **AND** `armorPipState.locations.leftArm === 'structure'` (actuator is an internal component)
- **AND** all other `BipedPipLocation` values default to `'full'`

#### Scenario: First non-internal damage transitions full → partial

- **GIVEN** a humanoid Mech with no prior `armorPipState`
- **WHEN** a `ComponentDestroyed { location: 'RT', componentType: 'armor' }` event applies
- **THEN** `armorPipState.locations.rightTorso === 'partial'`

#### Scenario: LocationDestroyed plus ComponentDestroyed transitions to destroyed

- **GIVEN** a humanoid Mech that received `LocationDestroyed { location: 'LL' }` at sequence 5
- **WHEN** `ComponentDestroyed { location: 'LL', componentType: 'actuator' }` applies at sequence 10 with cursor at 10
- **THEN** `armorPipState.locations.leftLeg === 'destroyed'`

#### Scenario: ComponentDestroyed on a vehicle is a no-op

- **GIVEN** an event log seeding an `IVehicleToken` for `tank-1` followed by `ComponentDestroyed { unitId: 'tank-1', location: 'turret', componentType: 'weapon' }`
- **WHEN** the reducer walks past the destroyed event
- **THEN** the `tank-1` token has NO `armorPipState` field (vehicles do not project `armorPipState`)
- **AND** the reducer does NOT throw

#### Scenario: CriticalHitResolved follows the same projection rules

- **GIVEN** the Phase-4 emitter shipping `CriticalHitResolved` instead of `ComponentDestroyed`
- **WHEN** the reducer applies a `CriticalHitResolved { unitId: 'player-1', location: 'CT', componentType: 'engine', destroyed: true }` event to a humanoid Mech
- **THEN** `armorPipState.locations.centerTorso === 'structure'` (or `'destroyed'` if `LocationDestroyed` already fired on CT)
