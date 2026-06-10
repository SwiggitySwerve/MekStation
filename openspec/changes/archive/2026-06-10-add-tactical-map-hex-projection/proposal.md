# Change: Add Tactical Map Hex Projection

## Why

MekStation's tactical map already receives rules-derived terrain, movement, combat, LOS, and path data, but `HexMapDisplay` still threads those surfaces as separate lookups while rendering each cell. That makes it too easy for future overlays to become UI-only calculations that drift from the engine.

The active map goal needs the battlefield to be a tactical explanation layer: when a unit is selected, every highlighted hex should explain terrain, elevation, movement legality, combat range, LOS, cover, and blocked reasons from the same evidence surface the engine uses.

This change introduces a small rules-backed per-hex projection contract. It does not replace the movement or combat engines. It composes their existing outputs into a single `ITacticalMapHexProjection` per hex so top-down and isometric rendering consume the same map facts.

## What Changes

- Add a pure tactical-map projection helper that merges:
  - terrain/elevation,
  - movement reachability and movement invalid reasons,
  - combat range/target/LOS/cover/invalid reasons,
  - selected/hover/path state,
  - legacy attack range fallback for older callers.
- Wire `HexMapDisplay` state to build and consume this projection lookup before rendering `HexCell`.
- Add metadata to rendered hexes proving the UI is reading one projection status/intent/reason surface.
- Preserve projection status, channel state, blocked reasons, and the rules-backed projection explanation in the rendered hex title/accessible label.
- Preserve the same projection summary on isometric scene hex wrappers so the depth-sorted 2.5D layer remains inspectable.
- Add focused tests for the pure helper and the rendered map metadata.

## Capabilities

### Modified

- `tactical-map-interface` - adds the per-hex projection contract used by map rendering and hover/explanation surfaces.

## Impact

- Source impact is limited to tactical-map projection utilities and `HexMapDisplay` state/render wiring.
- No rules are changed. Existing movement and combat helper outputs remain the source of truth.
- No data migration, API migration, or replay format change.

## Non-Goals

- Rewriting movement pathfinding, combat to-hit, or LOS rules.
- Replacing the existing `movementRange`, `attackRange`, `unitWeapons`, or `combatState` props.
- Completing all isometric art/layer polish in this slice.
- Archiving unrelated OpenSpec changes.
