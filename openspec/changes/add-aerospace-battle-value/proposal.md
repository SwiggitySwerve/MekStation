# Change: Add Aerospace Battle Value

## Why

Aerospace units currently compute BV as 0, which distorts force composition whenever an ASF or small craft is included in a campaign force. This change introduces aerospace BV 2.0 following TechManual rules — defensive BV uses SI in place of the mech gyro term, offensive BV uses nose/wing/aft weapon grouping with an arc-weighted fire-pool, and the speed factor uses `(safeThrust + maxThrust)/2` rather than ground MP.

## What Changes

- Add aerospace defensive BV = (armor BV + SI BV + defensive equipment BV − explosive penalties) × defensive factor
- Add SI BV = SI × 0.5 × tonnage (scales with fighter durability)
- Add defensive factor = 1 + (maxThrust / 10) (aero analog to TMM factor)
- Add aerospace offensive BV = Σ(arc fire pool × 1.0) + fuselage weapons (already full BV) + ammo BV + offensive equipment BV
- Add arc fire pool: the single highest-BV arc contributes 100%, opposite arc 25%, side arcs 50%
- Add speed factor = round(pow(1 + ((avgThrust − 5) / 10), 1.2) × 100) / 100 where avgThrust = (safeThrust + maxThrust) / 2
- Apply conventional-fighter multiplier 0.8 (fragile airframe)
- Apply small-craft multiplier 1.2 for armor tonnage bonus
- Integrate pilot skill multiplier via shared gunnery × piloting table
- Record aerospace BV breakdown on unit and surface via status bar
- Add validation harness to compare computed BV against MegaMekLab canonical aerospace units

## Non-goals

- Warship BV
- BV recalculation during combat fuel depletion
- Dynamic bombing-load BV adjustments (those are pod configurations, not aggregate BV)

## Dependencies

- **Requires**: `add-aerospace-construction`, `battle-value-system`
- **Blocks**: `add-aerospace-combat-behavior` (AI uses BV for target selection)

## Impact

- **Affected specs**: `battle-value-system` (MODIFIED — aerospace path), `aerospace-unit-system` (ADDED — BV breakdown)
- **Affected code**: `src/utils/construction/aerospace/aerospaceBV.ts` (new), `src/utils/construction/battleValueCalculations.ts` (dispatch), `src/utils/construction/equipmentBVResolver.ts` (arc weighting), `src/components/customizer/aerospace/AerospaceStatusBar.tsx`
- **Validation target**: ≥ 90% within 5% vs canonical aerospace units (catalog is smaller so parity target lower)
