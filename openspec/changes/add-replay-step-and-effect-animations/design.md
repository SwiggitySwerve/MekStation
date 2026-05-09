# Design — Add Replay Step and Effect Animations

## Context

The replay surfaces today render hex-board state via the pure
`useHexMapStateFromEvents` projection hook fed by a scrubbable
event cursor (`useReplayPlayer.currentSequence`). That projection
is correct — armor pip rings, prone state, destroyed locations,
heat band — but it is also **strictly state, not motion**. Three
visual contracts that exist in live play are missing from replay:

1. **Movement step animation** — live play uses `useAnimationQueue`
   (`src/stores/useAnimationQueue.ts`) plus the renderer's path-
   tween logic to walk tokens through their committed step chain.
   The replay reducer collapses a movement to its destination.
2. **Attack effects** — live `HexMapDisplay` mounts
   `<AttackEffectsLayer>` at line 463, which renders laser beams,
   missile trails, projectile arcs, impact flashes, and cluster
   stagger. Neither replay surface mounts the layer.
3. **Encounter discoverability** — quick-game has a `Replay` tab
   inside `RESULTS_TABS` (`quickGameResults.helpers.ts:14-19`).
   The encounter detail page has no equivalent "open the replay"
   shortcut even after launch persists `gameSessionId`.

This change closes those three gaps without disturbing the data
contracts (`IAttackResolvedPayload`, `IMovementDeclaredPayload`,
NDJSON event log) and without rewriting the live-play paths.

## Decision Log

### D1. Reuse `useAnimationQueue` rather than introducing a replay-only queue

**Choice**: The same `useAnimationQueue` Zustand store that
drives live-play `Movement Path Interpolation` and `Jump Arc
Animation` SHALL be reused for replay-side movement animations.

**Rationale**:
- The store is already a pure Zustand singleton with no live-
  session coupling. It accepts any caller of `enqueue(...)`.
- The store already enforces per-`mapId` overlap detection
  (`canStart` / `overlapsHexes`) so multiple animations per unit
  serialize correctly.
- The renderer-side consumers (path-tween, jump-arc, facing-
  rotate) are already wired against this store. Reusing it
  means replay automatically inherits any future improvements
  to the live-play animation contract.

**Alternatives considered**:
- **Replay-only queue duplicate**. Rejected — a separate queue
  would create a second integration point and the renderers
  would have to subscribe to two stores or accept which-store-
  is-authoritative-now logic. Pure tax on future maintenance.
- **Inline animation calls in the projection hook**. Rejected
  because it would violate the pure-projection contract spelled
  out in `combat-analytics` "Replay State-From-Events Reducer
  Contract" — that contract is the basis for the reducer's
  `useMemo` correctness and is reused by audit-store consumers.
  Side effects must live in a separate adapter.

### D2. Side-effect adapter as a dedicated React hook

**Choice**: `useReplayMovementAnimations(events, currentSequence,
{ mapId, prefersReducedMotion })` is a NEW hook at
`src/hooks/replay/useReplayMovementAnimations.ts`. It does NOT
modify `useHexMapStateFromEvents`. It runs in `useEffect`,
observes `currentSequence` against a previous-cursor ref, and
walks the relevant slice of `events` to enqueue animations.

**Rationale**:
- Keeps the projection hook pure and unit-testable in isolation.
- React's standard `useEffect` semantics handle the "cursor
  changed, fire side effect, reset on unmount" lifecycle
  cleanly — no manual subscription bookkeeping.
- Easy to test in isolation: render a test component with a
  controllable cursor, assert on `useAnimationQueue.getState()`.

**Alternatives considered**:
- **Subscribe directly to the replay player from the queue
  store**. Rejected — would create a circular dependency
  (`useAnimationQueue` ↔ `useReplayPlayer`) and put cursor logic
  inside a store that is currently agnostic of cursor concepts.
- **Emit animations from the projection hook conditioned on a
  `mode: 'replay'` flag**. Rejected per D1 — projection purity
  is a load-bearing contract.

### D3. Cursor-rewind reset semantics

**Choice**: When the adapter's `currentSequence` decreases
between renders (a rewind), it SHALL call
`useAnimationQueue.getState().reset()` BEFORE enqueueing any
catch-up animations for the new cursor position. The pure
reducer continues to walk-from-zero on every projection so token
positions stay correct; the adapter only flushes the visual
queue.

**Rationale**:
- Without flush, a stale 900 ms walk could finish ON TOP OF the
  watcher's new state, ending with the token in the wrong hex.
- `reset()` already wipes `queue` AND `active` AND completion
  listeners — exactly the cleanup we need. No additional API
  surface required.
- The forward-only adapter case (cursor strictly increases) is
  the common path and pays no overhead — the rewind branch only
  triggers when `prevCursor > nextCursor`.

**Alternatives considered**:
- **Per-step `cancel(animationId)` instead of full reset**.
  Rejected — adds bookkeeping (track every queued id by
  cursor), and the queue's overlap detection already serializes
  per-unit, so a full flush has the same observable end-state
  with much less code.
- **Skip rewind support entirely (forward-only animation)**.
  Rejected — the scrubber's whole purpose is bidirectional, and
  watchers will rewind to re-watch a key moment.

### D4. AttackEffectsLayer cross-references hex coords from token state

**Choice**: The layer SHALL NOT receive enriched payloads with
`sourceHex` / `targetHex` fields. `IAttackResolvedPayload` stays
unchanged. The layer SHALL look up `payload.attackerId` and
`payload.targetId` against the `tokens` array (already used to
drive the hex-map render) to read each unit's `position` at the
event's sequence.

**Rationale**:
- The persisted NDJSON event log is the authoritative replay
  source for thousands of existing files. Adding `sourceHex` /
  `targetHex` would either break old files (forcing migration)
  or require a fallback path in the layer (defeating the
  enrichment purpose).
- The token-array lookup is already how the live-play
  `AttackEffectsLayer` resolves geometry — copying that
  approach to the replay path means the layer code is identical
  in both surfaces.
- The `tokens` array passed to the layer comes from
  `useHexMapStateFromEvents(events, currentSequence)`, so token
  positions are by construction current at the event's sequence.

**Alternatives considered**:
- **Enrich the payload at write time**. Rejected — would
  invalidate every existing replay file under
  `simulation-reports/swarm/`, `simulation-reports/quick/`,
  `simulation-reports/encounter/`. Not a 1-day fix; not
  worth the cost when token-state lookup works.
- **Snapshot a hex-coordinate map alongside the projection
  hook**. Rejected — `tokens[].position` already serves as
  that map. Extra structure for no behavioral gain.

### D5. Defer Gap C (EventList side panel)

**Choice**: The Council surfaced a third gap — a vertically-
scrollable event list beside the hex map showing the full
`IGameEvent` stream — and explicitly deferred it for a later
change.

**Rationale**:
- Today's scrubber + `KeyMomentMarkers` + `PhaseChangeMarkers`
  cover the navigation use case (jump to "the moment").
- An EventList is a substantially larger UX problem (filter,
  group-by-turn, search, virtual-scroll for 1000+ events) that
  deserves its own design pass.
- Bundling it into this change inflates scope and delays the
  high-value visual polish (movement walk, beam flash) into a
  bigger PR.

**Alternatives considered**: keep — but the scope inflation
risk per the OMO Council's `Mid-sized Task` AI-slop checklist
makes deferral the right call.

### D6. `mapId` collision between live-play and replay

**Choice**: The replay-side `<AttackEffectsLayer>` and replay-
side movement-animation enqueues SHALL use a deterministic
`mapId` like `'replay'` or `'quickgame-replay'` that does NOT
collide with the live-play `mapId` (typically the active hex
map's identifier from `useGameplayStore`).

**Rationale**:
- The animation queue's `canStart` / `overlapsHexes` logic
  partitions by `mapId`. If a live game and a replay surface
  ever co-mount in the same React tree (e.g. dev hot-reload, or
  a future "watch your friend's game while playing" mode), they
  must not interfere with each other's animations.
- A constant string per replay surface is the simplest stable
  identifier — no need to wire through a unique-id generator.

### D7. Encounter Watch Replay link uses Next router, not anchor

**Choice**: The button SHALL call `router.push(...)` rather than
render a raw `<a href="...">`.

**Rationale**:
- Next.js's client-side router preserves React state across
  the navigation. The encounter store's loaded encounter, the
  validation cards, and any in-progress modal state all stay
  warm if the user hits the back button to return to the
  encounter detail page.
- Matches the style used by the existing
  `EncounterActionsFooter` actions for consistency.

## Data Flow

```
Replay event log (NDJSON)
        │
        ▼
useReplayPlayer ─── currentSequence ─┐
        │                            │
        ▼                            ▼
useHexMapStateFromEvents     useReplayMovementAnimations  (NEW)
        │                            │
        │                            └──► useAnimationQueue.enqueue
        │                                        │
        ▼                                        ▼
      tokens[]              ┌──── Renderer reads queue.active
        │                   │     and animates path / arc / rotate
        ▼                   │
HexMapDisplay ◄─ tokens ────┘
        │
        ├── AttackEffectsLayer (NEW MOUNT)
        │     │
        │     └── reads tokens[] to derive source/target hex
        │     └── enqueues effect animations into useAnimationQueue
        │
        └── Existing token / armor-pip / heat layers
```

The existing `useHexMapStateFromEvents` reducer is unchanged.
The new adapter hook (`useReplayMovementAnimations`) shares its
`events` input but writes to the side-effect store
(`useAnimationQueue`) only.

The `AttackEffectsLayer` already enqueues effect animations into
`useAnimationQueue` in live play (see `effects/AttackEffectsLayer.tsx`
lines 113-114: `useAnimationQueue((state) => state.enqueue)`).
Mounting it on the replay surface inherits that behavior — no
duplicate logic.

## File Changes

### New files

- **`src/hooks/replay/useReplayMovementAnimations.ts`** — the
  side-effect adapter hook. Subscribes to `currentSequence`
  changes via `useEffect`, walks `events` from a stored
  `prevCursor` ref to the new cursor, enqueues per-step
  animations, calls `reset()` on rewind. Respects
  `usePrefersReducedMotion()`.

- **`src/hooks/replay/__tests__/useReplayMovementAnimations.test.tsx`**
  — unit tests for forward advancement, rewind reset, jump
  step, reduced motion skip, missing-steps fallback, skipped
  step kinds.

- **`src/hooks/replay/__tests__/useReplayMovementAnimations.integration.test.tsx`**
  — integration test rendering a small replay with
  `useHexMapStateFromEvents` + the new adapter and asserting
  on `useAnimationQueue` state across cursor moves.

- **`src/components/quickgame/__tests__/QuickGameReplayPanel.attackEffects.test.tsx`**
  — integration test asserting `<AttackEffectsLayer>` mounts
  inside the panel with the right props.

- **`src/pages/gameplay/games/__tests__/replay.attackEffects.test.tsx`**
  — same assertion for the standalone replay route.

- **`src/components/gameplay/pages/__tests__/EncounterDetailPage.watchReplay.test.tsx`**
  — unit test for the Watch Replay button visibility and click
  navigation.

- **Storybook story for the Watch Replay state** — co-located
  near existing `EncounterDetailPage.*.stories.tsx` (whichever
  module currently hosts encounter-detail stories).

### Modified files

- **`src/components/quickgame/QuickGameReplayPanel.tsx`** —
  mount `<AttackEffectsLayer>` as a sibling to
  `<HexMapDisplay>`; call `useReplayMovementAnimations(events,
  replay.currentSequence, { mapId: 'quickgame-replay' })`.

- **`src/pages/gameplay/games/[id]/replay.tsx`** — same two
  additions, with `mapId: 'replay'`.

- **`src/components/gameplay/pages/EncounterDetailPage.actions.tsx`**
  (or a sibling section module — confirm during 2.5; the
  encounter detail page composition is split across multiple
  `.sections.tsx` / `.actions.tsx` files at
  `src/components/gameplay/pages/`) — render the Watch Replay
  button conditioned on `encounter.gameSessionId`. The button
  uses `next/router`'s `push` and the existing `Button`
  primitive from `@/components/ui`.

### Unchanged files (key non-changes)

- **`src/hooks/replay/useHexMapStateFromEvents.ts`** — pure
  projection contract preserved. No new branches, no new side
  effects.
- **`src/components/gameplay/effects/AttackEffectsLayer.tsx`** —
  the layer already has all the geometry derivation it needs
  via `tokens`. No prop changes, no behavior changes.
- **`src/types/gameplay/GameSessionInterfaces.ts`** —
  `IAttackResolvedPayload` and `IMovementDeclaredPayload` stay
  exactly as they are. The persisted NDJSON contract holds.
- **`src/stores/useAnimationQueue.ts`** — store API is reused
  exactly as-is (`enqueue`, `reset`).
