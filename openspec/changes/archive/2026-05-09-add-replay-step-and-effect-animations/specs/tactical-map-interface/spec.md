# tactical-map-interface — Delta for add-replay-step-and-effect-animations

## ADDED Requirements

### Requirement: Replay Movement Step Animation Playback

The replay surfaces SHALL animate token movement during scrub by enqueueing one `TacticalAnimation` per `IMovementStep` from `IMovementDeclaredPayload.steps[]` into the existing `useAnimationQueue` Zustand store at `src/stores/useAnimationQueue.ts`. The two replay surfaces in scope are `QuickGameReplayPanel` (at `src/components/quickgame/QuickGameReplayPanel.tsx`) and the standalone replay route (at `src/pages/gameplay/games/[id]/replay.tsx`). The animation contract (per-hex tween duration, jump arc shape, reduced-motion fallback) SHALL match the live-play contract defined by `Movement Path Interpolation`, `Jump Arc Animation`, and `Reduced Motion Accessibility` so the watcher sees the same visual behavior the player saw at commit time.

The replay-side enqueue SHALL be performed by a side-effect
adapter (a React hook) that observes cursor advancement on
`useReplayPlayer.currentSequence` (or the equivalent shared replay
player state). The pure projection hook
`useHexMapStateFromEvents` SHALL remain side-effect-free — the
adapter SHALL be a separate hook that consumes the same `events`
array and the live cursor.

When the cursor advances forward across a `MovementDeclared`
event, the adapter SHALL enqueue exactly one `TacticalAnimation`
per entry in `payload.steps[]`, in `step.index` order. Steps with
`kind: 'forward'` / `'lateral'` / `'jump'` SHALL produce a
`TacticalAnimation` with `kind: 'movement'`, the step's `from` and
`to` packed as a 2-entry `path` array, and the step's `mpCost`
mapped to the appropriate `MovementAnimationMode` (walk/run/jump).
Steps with `kind: 'turn'` SHALL produce a movement animation
carrying only `initialFacing` and `finalFacing` (no path) so the
existing facing-tween logic in the queue consumer can render the
rotation. Steps with `kind: 'standUp'` / `'goProne'` /
`'chargeDeclared'` / `'dfaDeclared'` / `'shakeOffSwarm'` SHALL be
skipped at the adapter (these are state transitions handled by
existing token-renderer pose state, not interpolated paths) and
SHALL NOT throw.

When the cursor decreases (the watcher rewinds via the scrubber),
the adapter SHALL call
`useAnimationQueue.getState().reset()` before walking the events
forward to the new cursor position. This flushes any in-flight or
queued animations that the watcher has now scrubbed past so a
stale "still walking" animation cannot finish on top of the new
state.

When the user has `prefers-reduced-motion: reduce` set, the
adapter SHALL skip the per-step enqueue entirely. Token positions
SHALL update via the pure reducer's `acc.position = payload.to`
projection only, matching live-play `Reduced Motion Accessibility`.

When `payload.steps` is missing (legacy event streams written
before PR #533), the adapter SHALL fall back to a single instant-
snap animation derived from `payload.from` / `payload.to`,
mirroring the live-play `Movement Animation Replay Backfill`
contract in `movement-system`.

#### Scenario: Forward step chain enqueues one animation per step

- **GIVEN** a replay with a `MovementDeclared` event carrying
  `payload.steps` of 5 entries
  `[forward(0→1), forward(1→2), turn(left), forward(2→3), turn(right)]`
- **AND** the watcher's `prefers-reduced-motion` is `no-preference`
- **WHEN** the cursor advances from `currentSequence = 0` past the
  movement event
- **THEN** the adapter SHALL call `useAnimationQueue.getState().enqueue`
  exactly 5 times in `step.index` order
- **AND** the 3 `forward` enqueues SHALL each carry a 2-entry
  `path` of the step's `from` and `to` hex coordinates
- **AND** the 2 `turn` enqueues SHALL carry only `initialFacing`
  and `finalFacing` (no `path`)

#### Scenario: Jump step produces a single jump-mode animation

- **GIVEN** a `MovementDeclared` whose `payload.steps` is exactly
  one entry `[{ kind: 'jump', from: {q:0,r:0}, to: {q:4,r:0},
  mpCost: 4, terrainEntered: '...' }]`
- **WHEN** the adapter processes the event
- **THEN** exactly one animation SHALL be enqueued
- **AND** that animation's `mode` SHALL be the jump-arc mode
  (whatever value `MovementAnimationMode.Jump` resolves to in
  `@/types/gameplay`)
- **AND** the existing live-play jump-arc renderer SHALL drive
  the parabolic arc from `(q:0,r:0)` to `(q:4,r:0)` over 600 ms

#### Scenario: Cursor rewind flushes the animation queue

- **GIVEN** a replay where the watcher has scrubbed to
  `currentSequence = 50` and movement animations are mid-flight
  in `useAnimationQueue.active`
- **WHEN** the watcher drags the scrubber back to
  `currentSequence = 30`
- **THEN** the adapter SHALL call
  `useAnimationQueue.getState().reset()` before re-walking events
  to sequence 30
- **AND** the queue's `active` and `queue` arrays SHALL both be
  empty at the moment immediately after the rewind transition

#### Scenario: Reduced-motion skips per-step enqueue entirely

- **GIVEN** the watcher has `prefers-reduced-motion: reduce`
- **WHEN** the cursor advances across a 5-step `MovementDeclared`
- **THEN** `useAnimationQueue.getState().enqueue` SHALL NOT be
  called for any of the 5 steps
- **AND** the token's `position` SHALL still update to
  `payload.to` via the pure reducer (token jumps to destination
  without intermediate visual interpolation)

#### Scenario: Legacy event without steps falls back to instant snap

- **GIVEN** a replay with a `MovementDeclared` event whose
  `payload.steps` field is absent (legacy NDJSON written before
  step-chain emission shipped)
- **WHEN** the cursor advances across the event
- **AND** the watcher's `prefers-reduced-motion` is
  `no-preference`
- **THEN** the adapter SHALL enqueue exactly one animation
- **AND** that animation SHALL carry a 2-entry `path` of
  `payload.from` and `payload.to`
- **AND** the adapter SHALL NOT throw on the missing `steps`
  field

#### Scenario: Skipped step kinds do not throw

- **GIVEN** a `MovementDeclared` whose `payload.steps` includes a
  `{ kind: 'standUp', at, mpCost: 2, psrTriggered: true }` entry
- **WHEN** the adapter processes the event
- **THEN** the adapter SHALL NOT call `enqueue` for the
  `standUp` step
- **AND** the adapter SHALL NOT throw
- **AND** subsequent `forward` / `turn` / `jump` / `lateral`
  steps in the same payload SHALL still enqueue normally

### Requirement: Attack Effects Layer In Replay Surfaces

The replay surfaces SHALL mount `<AttackEffectsLayer>` as a sibling to `<HexMapDisplay>` so weapon impacts render their laser / missile / projectile / impact-flash primitives during replay scrub. The two replay surfaces in scope are `QuickGameReplayPanel` (at `src/components/quickgame/QuickGameReplayPanel.tsx`) and the standalone replay route (at `src/pages/gameplay/games/[id]/replay.tsx`). The layer SHALL receive the same `tokens` array that drives the hex-map render — derived from `useHexMapStateFromEvents(events, currentSequence).tokens` — and the same `events` array passed to the projection hook.

The layer SHALL NOT require enrichment of `IAttackResolvedPayload`
with `sourceHex` / `targetHex` fields. The layer's existing
attacker-and-target-hex derivation logic SHALL look up
`payload.attackerId` and `payload.targetId` in the `tokens` array
to find each unit's `position` at the event's sequence, matching
the cross-reference behavior already used in live play.

The layer SHALL render above the unit token layer and beneath
modal overlays, matching the existing `Attack Effects Layer`
requirement for live play. The `mapId` prop SHALL be a
deterministic identifier scoped to the replay surface (e.g.
`'replay'` or `'quickgame-replay'`) so animation queue overlap
detection isolates replay animations from any concurrently-
mounted live-play animation queue.

#### Scenario: QuickGameReplayPanel mounts the attack effects layer

- **GIVEN** the user activates the `Replay` tab in
  `QuickGameResults` for a completed quick game
- **WHEN** `QuickGameReplayPanel` mounts
- **THEN** the rendered DOM SHALL contain exactly one
  `<AttackEffectsLayer>` element
- **AND** the layer SHALL receive `events={game.events}`
- **AND** the layer SHALL receive `tokens` from
  `useHexMapStateFromEvents(events, currentSequence).tokens`
- **AND** the layer SHALL receive a `mapId` prop that does NOT
  collide with the live-play `mapId`

#### Scenario: Standalone replay route mounts the attack effects layer

- **GIVEN** a navigation to `/gameplay/games/<sessionId>/replay`
  with a populated event log
- **WHEN** the replay page mounts
- **THEN** the rendered DOM SHALL contain exactly one
  `<AttackEffectsLayer>` element
- **AND** the layer SHALL be a sibling to `<HexMapDisplay>` in
  the rendered tree (not a parent or child)

#### Scenario: Beam derives endpoints from token state at event sequence

- **GIVEN** a replay with two units `player-1` at hex
  `(q=0,r=0)` and `opponent-2` at hex `(q=3,r=0)` after both
  have moved during the encounter
- **AND** an `AttackResolved` event firing at sequence 75 with
  `payload.attackerId = 'player-1'` and `payload.targetId =
  'opponent-2'` and `payload.hit = true`
- **WHEN** the cursor reaches sequence 75
- **THEN** the attack effects layer SHALL render a beam between
  `player-1`'s position at sequence 75 and `opponent-2`'s
  position at sequence 75
- **AND** the layer SHALL NOT read any `sourceHex` /
  `targetHex` field from `payload` (these fields do not exist)

#### Scenario: Reduced motion respects existing layer fallback

- **GIVEN** the watcher has `prefers-reduced-motion: reduce`
- **AND** the replay surface mounts `<AttackEffectsLayer>`
- **WHEN** an `AttackResolved` event fires
- **THEN** the layer SHALL use its existing reduced-motion
  fallback (`REDUCED_MOTION_LINE_DURATION_MS = 300` and
  `REDUCED_MOTION_IMPACT_FLASH_MS = 80`)
- **AND** the layer SHALL NOT play full-duration beam / missile
  trail animations
