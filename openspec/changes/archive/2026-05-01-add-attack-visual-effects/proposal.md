# Change: Add Attack Visual Effects

## Why

Attack resolution currently fires events into the log and updates state,
but the map is silent — no beam, no trail, no impact. A player watching
two mechs trade fire sees nothing until armor pips start to decay. Phase
7's presentation bar says the attack itself should be legible: a laser
is a colored beam, a missile is a dashed trail, a ballistic is a tracer,
a physical is a shockwave. Impact hexes flash briefly so the origin and
destination of every hit are obvious.

## What Changes

- Render a beam/trail/tracer/shockwave per weapon category when an
  `AttackResolved` event fires
- Lasers: solid colored beam; color keyed to weapon subtype (small/med
  pulse = IR, med/large = green, ER variants = red-orange)
- Missiles: dashed line with an arrowhead traveling from origin to target
- Ballistics (AC, Gauss, MG): short bright tracer dashes
- Physical (punch, kick, club): circular shockwave at the target hex
- Brief flash at the impact hex (white burst, 150ms) confirms landing
- Miss animations use a faded version that terminates past the target
  hex, so hits and misses are distinguishable
- All animations respect `prefers-reduced-motion` (degrade to a 300ms
  connecting line that fades)

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP),
  `add-attack-phase-ui` (attacks actually fire from the UI),
  `weapon-resolution-system`, `tactical-map-interface`
- **Related**: `add-damage-feedback-effects` (pip decay, damage numbers
  are upstream of impact flash), `add-mech-silhouette-sprite-set`
- **Required By**: none — Phase 7 presentation layer

## Impact

- Affected specs: `weapon-resolution-system` (MODIFIED — attack events
  declare a visual-effect category per weapon for UI playback),
  `tactical-map-interface` (MODIFIED — new attack effects layer above
  tokens; click-through preserved), new `attack-effects-system` (ADDED —
  effect catalog, color keys, timing, impact flash, miss variants)
- Affected code: new
  `src/components/gameplay/effects/AttackEffectsLayer.tsx` rendering
  effect primitives, new `src/utils/effects/weaponEffectMap.ts` mapping
  weapon type -> visual category + color, new
  `src/components/gameplay/effects/primitives/` housing LaserBeam,
  MissileTrail, Tracer, Shockwave, ImpactFlash SVG components
- Non-goals: sound effects (out of scope), per-salvo animations for
  ultra/rotary ACs beyond staggered dashes (future refinement),
  cinematic camera pulls, 3D effects (explicitly shelved)
- Database: none
