# Add LOS Blocker Map Badge

## Why

Combat target hexes already explain LOS and cover blockers, but the actual hex causing the LOS block or partial-cover modifier is not directly marked. Players can read the blocker coordinate in a tooltip, but the battlefield should point at the terrain or elevation that explains why the attack is blocked or modified.

## What Changes

- Carry LOS blocker metadata from the shared combat projection.
- Attach blocker references to the tactical map projection for the blocker hex.
- Render a compact LOS blocker badge on the hex that causes blocked or partial LOS.
- Expose blocker target hexes, target ids, state, kind, terrain metadata, and reason as DOM metadata.

## Out of Scope

- Changing LOS, cover, indirect-fire, range, arc, or attack resolution rules.
- Recomputing LOS in the renderer.
