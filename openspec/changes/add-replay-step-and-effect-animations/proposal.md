# Add Replay Step and Effect Animations

## Why

The hex-board replay surfaces (`/gameplay/games/[id]/replay` and the
`Replay` tab inside `QuickGameResults`) currently render scrub-driven
state without the visual layers that make live combat feel like a
battle. Three concrete gaps were surfaced by today's OMO Council on
hex-board replay polish:

1. **Movement plays as instant teleports.** The replay reducer at
   `src/hooks/replay/useHexMapStateFromEvents.ts:610-617` collapses
   every `MovementDeclared` to its destination — `acc.position =
   payload.to`. The full step chain in
   `IMovementDeclaredPayload.steps[]` (4-tuple of `forward` / `turn`
   / `lateral` / `jump` / `standUp` / `goProne` etc.) is ignored, so
   tokens snap rather than walk through their committed path.
2. **Weapon impacts have no visual feedback.** The
   `AttackEffectsLayer` (557 lines, renders laser / missile /
   projectile primitives) is mounted in the live-play
   `HexMapDisplay` but NOT in either replay surface. Replay watchers
   see damage pip rings update silently with no beam, missile trail,
   or impact flash.
3. **Encounters have no Watch Replay shortcut.** Quick-game has a
   discoverable `Replay` tab in `RESULTS_TABS`, but the encounter
   detail page (`/gameplay/encounters/[id]`) has no link to
   `/gameplay/games/<gameSessionId>/replay` even when the encounter
   is `Launched` and has a populated `gameSessionId`.

Today's encounter-to-replay work (PRs #562 – #565) closed the data
loop end-to-end. This change is the **next polish layer**: making
the watcher experience match the playable experience.

## What Changes

### Gap A — Movement step animation in replay (M effort)

The replay reducer SHALL keep its pure projection contract. A new
**side-effect adapter** SHALL observe reducer cursor advancement and
enqueue one `TacticalAnimation` per `IMovementStep` into the
existing `useAnimationQueue` Zustand store. On cursor rewind
(monotonic decrease in `currentSequence`), the adapter SHALL flush
the queue via `useAnimationQueue.getState().reset()` so stale walks
do not finish after the watcher scrubs back. The same animation
queue already drives live-play `Movement Path Interpolation`; this
change reuses that infrastructure on the replay path so the visual
contract is identical (300 ms / hex walk, 180 ms / hex run, 600 ms
parabolic jump arc, reduced-motion snap).

### Gap A' — AttackEffectsLayer in replay surfaces (S effort)

The `<AttackEffectsLayer>` component SHALL be mounted as a sibling
to `<HexMapDisplay>` inside `QuickGameReplayPanel.tsx` and inside
`/gameplay/games/[id]/replay.tsx`. The layer SHALL receive the same
`tokens` array used to drive the map render; it derives source and
target hex coordinates by looking up `attackerId` / `targetId`
against the token positions current at the resolved-event's
sequence. No payload enrichment is required —
`IAttackResolvedPayload` does not gain `sourceHex` / `targetHex`
fields; cross-reference from token state is sufficient.

### Gap B — Encounter Watch Replay link (S effort)

The encounter detail page SHALL render a "Watch Replay" navigation
control linking to `/gameplay/games/<gameSessionId>/replay` when the
loaded encounter has a populated `gameSessionId` (i.e. has been
launched). The control SHALL be hidden when `gameSessionId` is
`undefined`. The control SHALL sit alongside the existing encounter
action surfaces (`EncounterActionsFooter`).

### Out of scope (explicitly deferred)

- **EventList side panel inside the replay surfaces.** The Council
  surfaced this as Gap C — a vertically-scrollable event list
  beside the hex map showing the full IGameEvent stream — but
  deferred for a later change. Today's scrubber + key-moment
  markers cover the navigation use case for now.
- **Hex coordinate enrichment of `IAttackResolvedPayload`.** Cross-
  referencing from token state at the event's sequence is adequate
  and avoids breaking the persisted NDJSON event-log contract.
- **Rewriting the live-play animation contracts.** The existing
  `Movement Path Interpolation`, `Jump Arc Animation`,
  `Phase Advancement Gate On Active Animations`, and
  `Reduced Motion Accessibility` requirements are reused as-is.
  This change adds a new replay-side requirement that delegates to
  them.

## Impact

- **Affected specs**:
  - `tactical-map-interface` — 2 ADDED requirements (Replay
    Movement Step Animation Playback, Attack Effects Layer In
    Replay Surfaces).
  - `encounter-system` — 1 ADDED requirement (Encounter Detail
    Watch Replay Link).
- **Affected code**:
  - NEW: `src/hooks/replay/useReplayMovementAnimations.ts` — the
    side-effect adapter that observes cursor advancement and
    enqueues movement-step animations.
  - MODIFIED: `src/components/quickgame/QuickGameReplayPanel.tsx`
    — mount `<AttackEffectsLayer>` and call the new replay
    movement-animation hook.
  - MODIFIED: `src/pages/gameplay/games/[id]/replay.tsx` — same
    two additions for the standalone replay route.
  - MODIFIED:
    `src/components/gameplay/pages/EncounterDetailPage.actions.tsx`
    (or a sibling section module) — render the Watch Replay link
    button when `encounter.gameSessionId` is present.
- **Affected tests**: ~50 new unit + integration tests across the
  three deliverables.
- **No breaking changes** — `IAttackResolvedPayload`,
  `IMovementDeclaredPayload`, and the persisted NDJSON event-log
  contract are unchanged.

## Test Strategy

- **Infrastructure**: exists (Jest + @swc/jest, Storybook, Playwright).
- **Tests**: tests-after — implementation tasks land first, then
  unit + integration coverage in dedicated tasks (see `tasks.md`
  Section 3). Manual smoke is required because the Council surfaced
  Gap A' / Gap B as user-experience polish that visual diff alone
  cannot verify.
- **Agent QA**: each implementation task includes acceptance
  criteria the executor (Atlas / Hephaestus) verifies via
  `npm run typecheck`, `npm run lint`, the targeted Jest run, and
  a Storybook story render where applicable.
