# Add Combined Tooltip Stand-Up Details

## Why

The map already carries stand-up movement cost and PSR metadata on movement hexes, and the movement-only hover tooltip exposes it. When a hex has both movement and combat projection data, the combined tactical tooltip replaces the movement-only tooltip but omits those stand-up details.

That makes a rules-relevant movement condition disappear exactly when the player is comparing movement and attack implications on the same hex.

## What Changes

- Add stand-up cost, stand-up PSR target/impossible reason, and stand-up modifier details to the combined movement+combat tooltip.
- Preserve the existing combined tactical tooltip status, movement, combat, terrain, and projection-reason rows.
- Add focused render coverage proving stand-up details remain visible when movement and combat overlays overlap.

## Out of Scope

- Changing stand-up rules, PSR computation, movement reachability, or combat projection.
- Changing tooltip placement or broader map visual styling.
