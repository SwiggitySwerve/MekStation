# Proposal: Add Projection Channel Status Breakdown

## Why

The tactical map now composes movement and combat into one per-hex projection, but a single `mixed` status does not tell the player which tactical channel is legal and which one is blocked. A hex can be a legal movement destination while the enemy occupying it is out of range, or a range-only combat hex with no target. The projection should make those channel states explicit so map UI, badges, and tooltips do not infer them from separate movement or combat fields.

## What Changes

- Add movement-channel status to each tactical map hex projection.
- Add combat-channel status to each tactical map hex projection, including a range-only state for empty weapon envelope hexes.
- Surface channel statuses on rendered hex metadata, projection status badges, and combined tactical hover tooltips.
- Preserve existing movement, combat, LOS, range, and cover calculations.

## Out of Scope

- Changing movement pathfinding, weapon range, firing arc, LOS, target visibility, or attack legality.
- Changing the top-level `neutral` / `legal` / `blocked` / `mixed` projection status semantics.
- Adding new map controls or visual overlay modes.

## Impact

- Affected spec: `tactical-map-interface`
- Affected code: `src/utils/gameplay/tacticalMapProjection.ts`, `src/components/gameplay/HexMapDisplay/*`
- Tests: focused projection unit coverage and HexMapDisplay mixed movement/combat coverage
