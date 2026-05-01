# Change: Add Damage Feedback Effects

## Why

Phase 1's `add-damage-feedback-ui` gives us armor-pip decay, crit
bursts, damage number floaters, and a pilot-wound flash — all on the
selected unit's action panel or directly over the token. Phase 7 broadens
that to the _battlefield_: a heavy hit shakes the screen, a destroyed
location vents smoke, engine crits ignite fire, and a dying unit bursts
into a debris cloud. Persistent effects (smoke, fire) stick around for
the rest of the unit's life so even a player scrolling back into the
fight can read the wound history at a glance.

## What Changes

- Screen shake on impacts >= 10 damage in a single resolved hit
  (intensity scales with damage; clamped and dampened under reduced
  motion)
- Hit-location flash: the specific pip group on the sprite ring glows
  white briefly when its location takes damage
- Smoke puffs continuously from any destroyed location while the unit
  is alive (LA destroyed -> smoke above left arm pip group)
- Fire on engine crits — small animated flame at the unit's torso
  persists for the rest of its life
- Debris cloud + sprite fade when a unit is destroyed (center torso
  gone or pilot killed); final token state is a wreck silhouette

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP),
  `add-mech-silhouette-sprite-set` (sprite + pip ring),
  `add-damage-feedback-ui` (pip decay, crit burst, damage numbers),
  `damage-system`, `tactical-map-interface`
- **Related**: `add-attack-visual-effects` (impact flash is upstream of
  these effects), `add-heat-and-shutdown-visual-indicators` (shared
  visual grammar)
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `damage-system` (MODIFIED — destroyed-location and
  engine-crit events must carry enough metadata for UI playback; unit
  destruction event carries cause), `tactical-map-interface` (MODIFIED
  — new persistent-effect layer for smoke/fire, screen-shake controller,
  wreck sprite rendering, hit-location flash)
- Affected code: new
  `src/components/gameplay/effects/HitLocationFlash.tsx`,
  `src/components/gameplay/effects/SmokePuff.tsx`,
  `src/components/gameplay/effects/EngineFire.tsx`,
  `src/components/gameplay/effects/DebrisCloud.tsx`, new
  `src/hooks/useScreenShake.ts`, new wreck sprite variants per
  archetype under `public/sprites/mechs/wrecks/`
- Non-goals: camera effects beyond screen shake (zoom punch, chromatic
  aberration, cinematic pulls — future), sound (out), real-time
  destruction physics, 3D effects (shelved)
- Database: none
