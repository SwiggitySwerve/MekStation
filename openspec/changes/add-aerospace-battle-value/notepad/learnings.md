## Inherited From Phase 6 Construction / MEMORY.md

**Mech BV architecture** — reference for aerospace:

- `src/utils/construction/battleValueCalculations.ts` = barrel exports
- Defensive: `battleValueDefensive.ts` → `calculateDefensiveBV(config)` returns `{armorBV, structureBV, gyroBV, defensiveFactor, totalDefensiveBV}`
- Offensive: `battleValueOffensive.ts` → `calculateOffensiveBVWithHeatTracking(config)` returns weapon/ammo/speed/total
- Totals: `battleValueTotals.ts` → `calculateTotalBV(config)` and `getBVBreakdown(config)` apply cockpit modifier, sum defensive+offensive
- Pilot: `battleValuePilot.ts` → `calculateAdjustedBV(base, gunnery, piloting)` uses 9×9 `PILOT_SKILL_MULTIPLIERS`
- Equipment BV: `equipmentBVResolver.ts` (barrel) → `equipmentBV/resolution.ts` has `resolveEquipmentBV(id)`, `resolveAmmoBV(id)`, `normalizeEquipmentId(id)`

**Aerospace state / construction** (Phase 6):

- `src/stores/aerospaceState.ts` — `AerospaceState` interface, per-arc armor `IAerospaceArmorAllocation`, `AerospaceSubType` discriminant (ASF/CF/SmallCraft)
- `src/utils/construction/aerospace/` — `siCalculations.ts`, `thrustCalculations.ts`, `armorArcCalculations.ts`, `equipmentSlots.ts`, `weightBreakdown.ts`
- Armor per arc: `NOSE | LEFT_WING | RIGHT_WING | AFT` (ASF/CF); `NOSE | LEFT_SIDE | RIGHT_SIDE | AFT` (Small Craft); `FUSELAGE` internal
- Types: `src/types/unit/AerospaceInterfaces.ts` — `IAerospace`, `IConventionalFighter`, `ISmallCraft`, `AerospaceArc` enum, `AerospaceSubType` enum
- Status bar exists: `src/components/customizer/aerospace/AerospaceStatusBar.tsx` — uses zustand store hooks

**Shared BV helpers**:

- `src/types/validation/BattleValue.ts`:
  - `ARMOR_BV_MULTIPLIERS`, `STRUCTURE_BV_MULTIPLIERS`, `GYRO_BV_MULTIPLIERS` lookups
  - `getArmorBVMultiplier(type)`, `getPilotSkillModifier(gunnery, piloting)`
  - 9×9 `PILOT_SKILL_MULTIPLIERS` matrix

**MegaMek aerospace BV (TechManual pp. 302-304)**:

- Defensive: `(armorBV + siBV + defEquipBV − explosive) × defensiveFactor` where `defensiveFactor = 1 + maxThrust/10`
- armorBV = totalArmor × 2.5 × armorTypeMultiplier (same as mechs)
- siBV = SI × 0.5 × tonnage
- Offensive: `Σ(arc firepool × weight) + fuselage weapons + ammo BV + offensive equipment BV`
- Arc weights: primary (highest BV) = 1.0, opposite = 0.25, sides = 0.5, fuselage always 1.0
- For primary=Nose: Aft=0.25, LeftWing=0.5, RightWing=0.5
- For primary=LeftWing: RightWing=0.25, Nose=0.5, Aft=0.5
- avgThrust = (safeThrust + maxThrust) / 2
- speedFactor = round(pow(1 + (avgThrust - 5) / 10, 1.2) × 100) / 100
- finalBV = (defensive + offensive) × pilotMult × subTypeMultiplier

**Sub-type multipliers** (from proposal):

- Conventional Fighter: × 0.8 on (defensive + offensive)
- Small Craft: armor BV × 1.2 INSIDE defensive block (not final)
- ASF: no adjustment

**MTF/BLK aerospace file format** (confirmed Shilone SL-17 example):

- `<UnitType>Aero</UnitType>`
- `<SafeThrust>6</SafeThrust>` — max = floor(safe × 1.5)
- `<fuel>400</fuel>`
- `<armor>` block lists 4 values: Nose, LW, RW, Aft
- `<Nose Equipment>`, `<Left Wing Equipment>`, `<Right Wing Equipment>`, `<Aft Equipment>`, `<Fuselage Equipment>` blocks
- `<tonnage>65.0</tonnage>`
- `<mul id:>2923</mul id:>` — canonical MUL id for parity comparison

**Data locations**:

- MegaMek aerospace source: `E:/Projects/mm-data/data/mekfiles/fighters/*.blk` and `E:/Projects/mm-data/data/mekfiles/convfighter/*.blk`, `E:/Projects/mm-data/data/mekfiles/smallcraft/*.blk`
- MekStation equipment catalog: `public/data/equipment/official/weapons/`
- MekStation unit data: `public/data/units/battlemechs/` (no aerospace JSON yet — parity harness must read from MegaMek .blk files directly or a conversion script)

**oxfmt + prettier conflict (Windows)**:

- Run `npx oxfmt --check <files>` before commit
- Use `npx oxfmt --write` to fix
- Use Write tool (not Edit) for CRLF issues

---

## Execution learnings (2026-04-18)

**MegaMek BLK armor_type numeric codes** (parsed in `scripts/validate-aerospace-bv.ts:mapArmorType`):

- `0` → STANDARD
- `1` → FERRO_FIBROUS
- `19` → HEAVY_FERRO_ALUMINUM
- `20` → LIGHT_FERRO_ALUMINUM
- `21` → FERRO_ALUMINUM_CLAN
- Anything else falls through to STANDARD (with warning).

**SafeThrust → MaxThrust derivation**: When BLK omits explicit `MaxThrust`, derive as `ceil(safeThrust * 1.5)` (not `floor`). MegaMek source uses ceil for the aerospace path even though the stored value sometimes disagrees by 1 — ceiling matches the TechManual and keeps defensiveFactor = 1 + maxThrust/10 consistent with MegaMekLab.

**Default SI from BLK**: When `<SI>` block is absent, default SI = `safeThrust`. Not `tonnage / 10` — that's the construction default for new units; parsed-from-BLK is treated as finalized so use the authored value or the thrust-based fallback.

**Aerospace arc naming** (normalized via `normalizeArcLocation` in aerospaceBV.ts):

- BLK strings use spaces ("Left Wing", "Right Wing") — normalize to LEFT_WING / RIGHT_WING enum form.
- Small Craft uses "Hull" in BLK — normalize to FUSELAGE (same fire-pool semantics).
- Unknown arc strings → `null` (caller must handle; harness skips the weapon with a warning).

**Arc fire-pool weighting rules** (`calculateAerospaceArcContributions`):

- Primary arc (highest total BV) = 1.0
- Fuselage always 1.0 regardless of primary
- Opposite arc of primary = 0.25
- Side arcs of primary = 0.5
- Opposites for ASF/CF: Nose↔Aft, LeftWing↔RightWing
- Opposites for Small Craft: Nose↔Aft, LeftSide↔RightSide

**Sub-type final multiplier**:

- ASF: × 1.0 (baseline)
- Conventional Fighter: × 0.8 on `(defensive + offensive)` BEFORE pilot mult
- Small Craft: armor BV × 1.2 INSIDE defensive block (not on final) — handled in `calculateAerospaceDefensiveBV` via `smallCraftArmorBonus`

**Test coverage cookbook** (`aerospaceBV.test.ts` — 22 tests):

- SI 5 × 50t × 0.5 = 125 (spec scenario literal)
- maxThrust 9 → defensiveFactor 1.9
- armor 100 pts × 2.5 = 250 (standard multiplier)
- Small Craft armor bonus: 100 × 2.5 × 1.2 = 300
- safeThrust 5 / maxThrust 7 → avgThrust 6 → SF 1.12
- Primary=Nose: Aft 0.25, wings 0.5
- Primary=LeftWing: RightWing 0.25, Nose+Aft 0.5 each
- CF subtype: finalBV = ASF finalBV × 0.8
- Pilot 4/5 → 1.0, 3/4 → 1.32

**Parity harness discovery**: 612 aerospace BLK units parsed successfully (fighters + convfighter + smallcraft). None carry embedded `<BV>` blocks, so report emits `mulBV: null` for every entry. `computedBV` is populated end-to-end and looks plausible against sampled TechManual examples.
