# Change: Add Aerospace Construction

## Why

Aerospace fighters, conventional fighters, and small craft play meaningful air-to-ground roles in campaigns, but their construction pipeline is a skeleton. `src/components/customizer/aerospace/` has four tabs but the store doesn't enforce engine/thrust coupling, structural integrity limits, fuel tonnage, armor arc max, or equipment-per-arc slot counts. This change completes aerospace construction so Phase 6 BV and 2D combat behavior have legal inputs.

## What Changes

- Add chassis configuration: aerospace fighter (5–100t) / conventional fighter (5–50t) / small craft (100–200t)
- Add engine selection tuned for aerospace: Fusion / XL / Compact Fusion / ICE / Fuel Cell, with rating-to-thrust tables and bay-location rules
- Add Safe Thrust / Max Thrust calculation: `maxThrust = floor(safeThrust × 1.5)`, safeThrust = engineRating / tonnage
- Add Structural Integrity (SI) defaulting to `ceil(tonnage / 10)`, rising to max table
- Add fuel tonnage minimums by unit sub-type and burn rate per thrust; `fuelTons × pointsPerTon = fuelPoints`
- Add armor allocation across 4 arcs (Nose, Left Wing, Right Wing, Aft) — small craft uses Left Side / Right Side
- Add armor max per arc = tonnage × armor-factor table (heavier = more)
- Add equipment mounting per firing arc + Fuselage (internal) with arc-based slot counts
- Add crew calculation: small craft requires crew + passengers with life support tonnage
- Add heat sink pool (aerospace uses 10 engine-free heat sinks baseline)
- Add construction validation rule set `VAL-AERO-*` — tonnage ranges, engine / thrust legality, SI within table, fuel minimum, armor max per arc
- Wire the pipeline into the aerospace store and customizer tabs

## Non-goals

- Aerospace combat (altitude / vectoring / fuel burn during combat) — `add-aerospace-combat-behavior`
- BV calculation — `add-aerospace-battle-value`
- DropShip / JumpShip / WarShip construction — out of scope
- Atmospheric re-entry and gravity adaptation — future work

## Dependencies

- **Requires**: existing `aerospace-unit-system` spec stubs, `construction-services`, `engine-system`, `armor-system`
- **Blocks**: `add-aerospace-battle-value`, `add-aerospace-combat-behavior`
- **Phase 1 coupling**: none at construction — BV / combat handle coupling

## Ordering in Phase 6

Aerospace is the second of five unit types after vehicles.

## Impact

- **Affected specs**: `aerospace-unit-system` (ADDED — engine / SI / fuel / armor / crew / validation), `construction-rules-core` (MODIFIED to dispatch aerospace path), `validation-rules-master` (MODIFIED)
- **Affected code**: `src/stores/aerospace/`, `src/utils/construction/aerospace/`, `src/components/customizer/aerospace/*`, `src/types/aerospace/`
- **New files**: aerospace engine/thrust calculator, SI tables, fuel burn constants, aerospace armor arc tables
