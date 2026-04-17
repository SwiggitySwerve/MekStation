# Change: Add Mech Silhouette Sprite Set

## Why

Phase 1's combat MVP renders unit tokens as abstract hex markers — useful
for hit-testing, useless for reading a battlefield at a glance. Phase 7
demands a presentation layer where a stranger watching the screen can tell
a light scout from an assault mech, whether it's humanoid or quad, which
way it's facing, and which locations are beat up. This change ships a
homemade (not licensed) 2D silhouette sprite set keyed off weight class
and chassis archetype, with a facing indicator and an armor-pip damage
overlay baked into every sprite.

## What Changes

- Add a homemade SVG silhouette sprite library covering four weight
  classes (light, medium, heavy, assault) and three archetypes
  (humanoid biped, quad, LAM)
- Each sprite includes a built-in facing indicator (directional notch
  or head rotation) that rotates in 60° increments with unit facing
- Overlay armor-pip rings around each sprite that visualize hit-location
  damage state (full / partial / structure / destroyed)
- Replace the current abstract `UnitToken` marker with the sprite
  renderer; selection ring and side color remain
- Sprites scale to current hex size and stay crisp at zoom 0.5x–2.0x

## Dependencies

- **Requires**: `add-interactive-combat-core-ui` (Phase 1 MVP shipped —
  this change upgrades its token rendering), `tactical-map-interface`
  (hex map + token contract)
- **Related**: `add-terrain-rendering`, `add-damage-feedback-effects`,
  `add-heat-and-shutdown-visual-indicators` (these all layer visuals on
  top of the sprite set; can parallelize)
- **Required By**: none — Phase 7 is the final presentation phase

## Impact

- Affected specs: `tactical-map-interface` (MODIFIED — token rendering
  contract now references sprites + pip overlays), new `unit-sprite-system`
  (ADDED — sprite catalog, archetype/weight class keys, facing bake-in,
  damage overlay)
- Affected code: `src/components/gameplay/HexMapDisplay/UnitToken.tsx`
  (swap abstract marker for sprite renderer), new
  `src/components/gameplay/sprites/` directory housing SVG assets + the
  `MechSprite` component, new `src/utils/sprites/spriteSelector.ts` for
  weight-class/archetype lookup
- Non-goals: 3D models (explicitly shelved — mech-IP licensing), licensed
  BattleTech/MechWarrior art (homemade only), per-variant sprites (one
  silhouette per weight-class × archetype bucket is sufficient),
  animation of the sprite itself (that's `add-movement-interpolation-animations`)
- Database: none
- Assets: new SVG files under `public/sprites/mechs/` — all homemade,
  version-controlled
