# Change: Add Movement Interpolation Animations

## Why

Today when a unit's movement resolves, the token snaps instantly from
its start hex to its destination hex. The event log carries the real
story, but a player watching the map never sees movement happen — they
see teleportation. Phase 7's north star is "a stranger watching the
screen understands what's happening without reading the log," so
movement has to be animated: slide along the committed path, respect
walk / run / jump speeds, and let jumps arc. The animation must block
phase advancement until it completes so cause-and-effect is legible.

## What Changes

- When a movement is committed, the token interpolates from its start
  hex to each hex along the A\* path in sequence
- Walk speed: 300ms per hex; Run speed: 180ms per hex; Jump: single
  ballistic arc from start to destination over 600ms
- Facing rotates during the path at the same ease curve
- The session's next-unit lock waits for the current animation to
  complete before advancing
- Users with `prefers-reduced-motion` see instant teleport (legacy
  behavior) without breaking any logic

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP),
  `add-movement-phase-ui` (move commit UX), `movement-system`,
  `tactical-map-interface`
- **Related**: `add-mech-silhouette-sprite-set` (sprite rotation runs
  alongside path tween)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `movement-system` (MODIFIED — movement events now
  expose a serialized path and MP mode for playback; animation is a
  UI concern but the path data must be present),
  `tactical-map-interface` (ADDED — path-tween contract, phase
  advancement gating, reduced-motion fallback)
- Affected code: `src/components/gameplay/HexMapDisplay/UnitToken.tsx`
  (consume animation props), new
  `src/components/gameplay/animation/useMovementTween.ts` hook, new
  `src/stores/useAnimationQueue.ts` to gate phase advancement on active
  animations
- Non-goals: non-path animations (rotation without movement, standing
  up — separate effects in future phases), multiplayer animation sync
  (Phase 4 owns that), sound effects (out of scope), cinematic camera
  pulls (camera stays under user control per `add-minimap-and-camera-controls`)
- Database: none
