# Learnings — add-aerospace-combat-behavior

## Codebase conventions observed

- Aerospace construction already exists under `src/utils/construction/aerospace/` with:
  `armorArcCalculations.ts`, `crewCalculations.ts`, `engineWeightAerospace.ts`,
  `equipmentSlots.ts`, `fuelCalculations.ts`, `siCalculations.ts`,
  `thrustCalculations.ts`, `validationRules.ts`, `weightBreakdown.ts`, `aerospaceBV.ts`.
- Aerospace types live in `src/types/unit/AerospaceInterfaces.ts`:
  - `AerospaceArc` enum: `NOSE`, `LEFT_WING`, `RIGHT_WING`, `LEFT_SIDE`, `RIGHT_SIDE`, `AFT`, `FUSELAGE`.
  - `AerospaceSubType` enum: `AEROSPACE_FIGHTER`, `CONVENTIONAL_FIGHTER`, `SMALL_CRAFT`.
  - `IAerospace`, `IConventionalFighter`, `ISmallCraft` with `armorByArc` plus type guards (`isAerospace`, etc.).
- UnitType values relevant: `UnitType.AEROSPACE`, `UnitType.CONVENTIONAL_FIGHTER`, `UnitType.SMALL_CRAFT` (from `src/types/unit/BattleMechInterfaces.ts`).
- `IAerospaceUnit` (in `src/types/unit/BaseUnitInterfaces.ts`) exposes `structuralIntegrity`, `fuel`, `heatSinks`, `movement` (safeThrust, maxThrust), `armor`, etc.
- Mech hit-location tables live in `src/utils/gameplay/hitLocation.ts` as `FRONT_HIT_LOCATION_TABLE` etc. Aerospace tables are NEW.
- Mech damage pipeline lives under `src/utils/gameplay/damage/` (resolve.ts, location.ts, critical.ts, destruction.ts, pilot.ts). Aerospace damage is a NEW module — do not modify the mech pipeline.
- Existing unit tests live at `src/utils/gameplay/__tests__/*.test.ts` per module.
- Movement utilities live in `src/utils/gameplay/movement/`. Aerospace flying movement is a NEW module.
- Firing arc logic already exists in `src/utils/gameplay/firingArc.ts` (ground mechs). Aerospace arcs are NEW.
- Heat utilities live in `src/utils/gameplay/heat.ts`. Aerospace heat is separate.

## File naming + style

- Kebab-case for folders; camelCase for source files (e.g. `aerospaceDamage.ts`).
- Use `@spec openspec/changes/.../spec.md` doc comments at top of every new file.
- Use `oxfmt` for formatting, `oxlint` for linting (not eslint / prettier).
- Tests live next to their modules under `__tests__/` dirs or in the global `src/utils/gameplay/__tests__/` collection — mirror whichever pattern the surrounding code uses.
- Import alias: `@/...` resolves to `src/...`.
- Public enums/interfaces in `src/types/gameplay/*` or nested under unit types.

## No-go zones

- Do NOT touch `src/utils/gameplay/damage/` or any mech hit-location / mech damage code.
- Do NOT modify `src/utils/construction/aerospace/aerospaceBV.ts` (Wave 1 already completed).
- Do NOT change `GameEngine.ts` control flow except for adding an `isAerospaceUnit` dispatch branch for damage/hit-location/movement.

## Wave 3 deferral pattern (from user brief)

- If parity tests require MUL reference BV and data is missing, emit `mulBV: null` and note the defer — same pattern Wave 1/2 used. (Probably not relevant to combat behavior — this is data-path terminology, noted for completeness.)
