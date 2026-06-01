# Add Hover Movement Mode Cost Badge

## Why

During movement preview, hovering a reachable destination replaces the normal Walk/Run/Jump movement badge with a plain MP badge. That keeps cumulative cost visible, but it hides the movement type and motive mode exactly when the player is inspecting how the path will be executed.

## What Changes

- Render hovered reachable movement cost badges with the movement type/mode abbreviation and MP cost.
- Preserve hover cost, movement type, movement mode, and heat metadata on the badge.
- Keep blocked movement, path, terrain, elevation, and commit rules unchanged.

## Out of Scope

- Recalculating movement reachability or path cost.
- Changing movement rules, heat rules, terrain costs, or commit validation.
