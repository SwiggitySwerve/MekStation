# Change: Add Per-Type Hex Map Tokens

## Why

Phase 1 shipped the interactive combat UI with mech-only hex tokens. `src/components/gameplay/HexMapDisplay/` contains no `unitType` branching — every placed unit renders as a mech silhouette with the mech movement/facing conventions. When Phase 6 adds vehicles, aerospace, BA, infantry, and ProtoMech to the combat loop, the map needs:

- **Per-type token shapes** (a tank silhouette ≠ a mech silhouette; an infantry stack ≠ a ProtoMech point)
- **Per-type facing rules** (vehicles face a cardinal direction; aerospace vector with velocity arrows; infantry has no facing)
- **Per-type stacking rules** (mechs occupy one hex; infantry stack multiple platoons per hex; BA rides on mechs)
- **Per-type movement markers** (aerospace shows velocity vectors, VTOLs show altitude, infantry show move modes)

Without these, a Phase 6 unit is technically constructible but cannot appear on the combat map in any meaningful way. The `add-<type>-combat-behavior` proposals cover rules (damage, motive hits, morale) but not token rendering. This change closes that gap.

## What Changes

- Introduce `UnitTokenForType` component that dispatches on `unit.type` to the per-type token renderer
- Add `MechToken.tsx` (extract existing behavior into a named component — minimal refactor)
- Add `VehicleToken.tsx` — rectangular base, motion-type icon (tracked/wheeled/hover/VTOL/naval), cardinal-direction facing indicator
- Add `AerospaceToken.tsx` — triangular wing silhouette, velocity vector arrow showing current speed + direction, altitude badge
- Add `BattleArmorToken.tsx` — grouped pip representing N troopers (4–6 dots), can render as a passenger badge overlaid on a mech token when mounted
- Add `InfantryToken.tsx` — stack icon with trooper count, motive-type badge (foot/motorized/jump/mechanized), specialization icon
- Add `ProtoMechToken.tsx` — compact silhouette, point grouping (up to 5 protos displayed as a cluster)
- Extend `IGameUnit` with `tokenType` discriminator (or derive from `unit.type`) so the renderer can dispatch
- Add per-type facing / altitude / stacking rules to the map's placement logic
- Update Phase 1's mech-only selection ring + range brackets to be aware of token dimensions per type

## Non-goals

- Final artwork (silhouettes, icons) — Phase 7 polish. This change ships with placeholder geometric shapes + text labels; Phase 7 replaces with art.
- Animation (movement interpolation, impact visuals) — Phase 7
- Atmospheric combat (aerospace dogfights on a separate map) — future Phase
- Fog-of-war tokens (hidden unit rendering) — deferred to Phase 4.5

## Dependencies

- **Requires**: Phase 1 `tactical-map-interface` spec and existing `HexMapDisplay` components; each `add-<type>-combat-behavior` change (needs the per-type combat rules to interpret facing / stacking)
- **Required by**: none (terminal for combat UI per type)
- **Phase 4 coupling**: multiplayer sends token updates via server events; token shape is client-side rendering only, so no protocol change

## Ordering in Phase 6

Ship after each type's combat-behavior proposal lands:

```
add-<type>-construction      → (tabs, diagrams, record sheet) → type buildable
add-<type>-combat-behavior   → rules of engagement defined
add-per-type-hex-tokens      → type RENDERS on the map correctly
```

Tokens can ship one type at a time; the dispatcher returns to a generic placeholder for unimplemented types.

## Impact

- **Affected specs**: `tactical-map-interface` (ADDED: per-type token rendering, per-type facing, per-type stacking, velocity vectors for aerospace)
- **Affected code**: `src/components/gameplay/HexMapDisplay/*`, `src/components/gameplay/UnitToken/` (new folder)
- **New files**: 6 token components (Mech + 5 new types), dispatcher, per-type facing helpers
- **Minor type extension**: `IGameUnit.type: UnitType` (already present on source data; may need to be threaded through `IAdaptedUnit`)
