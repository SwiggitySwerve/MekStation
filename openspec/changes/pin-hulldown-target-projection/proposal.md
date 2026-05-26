# Pin Hull-Down Target Projection

## Why

MekStation already had a hull-down to-hit helper, but it used an older
spec-local +1/no-stack model and the tactical map did not read represented
target hull-down state from the shared combat state. MegaMek applies a +2
hull-down modifier for Mek-style targets when hull-down combines with LOS or
terrain cover, and weapon attack declarations should use the same modifier the
map previews.

## What Changes

- Source-pin hull-down target modifiers to MegaMek `ComputeTerrainMods`.
- Thread represented `hullDown` unit state into combat projection, committed
  attack declarations, and quick-sim weapon attack to-hit context.
- Surface hull-down cover metadata and to-hit modifiers on tactical-map hexes,
  cover overlays, and hover context.

## Out Of Scope

- Hull-down entry/exit movement actions.
- Vehicle/QuadVee fortified-hex hull-down side-table handling.
- Hull-down leg-weapon fire restrictions and physical-attack restrictions.
