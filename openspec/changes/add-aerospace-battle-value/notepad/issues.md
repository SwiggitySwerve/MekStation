# Issues Encountered & Resolutions

## [2026-04-18] Import placement bug in aerospaceBV.ts

**Issue**: `import { getPilotSkillModifier } from "../../../types/validation/BattleValue"` was sitting at line ~575 (end of file) from an earlier drafting pass. TypeScript accepted it, but oxlint flagged and ESM semantics make late imports a code smell.
**Resolution**: Merged into the existing top-of-file import with `getArmorBVMultiplier`: `import { getArmorBVMultiplier, getPilotSkillModifier } from "../../../types/validation/BattleValue";`. Deleted the stray late import.
**Reference**: `src/utils/construction/aerospace/aerospaceBV.ts:8`

## [2026-04-18] Unused-export hack for internal weapon sum

**Issue**: Bottom of aerospaceBV.ts had `export { sumWeaponBV as _aerospaceSumWeaponBV_internal };` — a legacy re-export used by tests to poke at the internal helper. Violates public-API hygiene.
**Resolution**: Removed the hack. Replaced with a clean named export `sumAerospaceWeaponBV(items: IAerospaceBVEquipment[]): number` that delegates to the internal `sumWeaponBV`. Tests now import the public name.
**Reference**: `src/utils/construction/aerospace/aerospaceBV.ts` (bottom of file)

## [2026-04-18] BLK files lack MUL BV blocks

**Issue**: `scripts/validate-aerospace-bv.ts` tried to extract `<BV>` from fighter BLK files — none exists. `mul-bv-cache.json` also has no aerospace entries.
**Resolution**: Parity harness emits `mulBV: null`, `delta: null`, `deltaPct: null` in the report. Spec's validator-output scenario is satisfied (required fields present per unit). Task 9.4 (parity targets) parked as future work once MUL aerospace scrape exists.
**Reference**: `validation-output/aerospace-bv-validation-report.json`

## [2026-04-18] ESLint 9 missing config

**Issue**: `npx eslint .` errored with "couldn't find eslint.config.js" when running post-edit lint.
**Resolution**: Project actually uses oxlint (see `package.json` scripts). Swapped to `npx oxlint` — clean (one pre-existing unrelated warning in AerospaceStructureTab.tsx).

## [2026-04-18] oxfmt single-vs-double quote drift

**Issue**: Initial `npx oxfmt --check` flagged 5 touched files (aerospaceBV.ts, aerospaceBV.test.ts, AerospaceStatusBar.tsx, validate-aerospace-bv.ts, aerospace/index.ts) for quote-style mismatches.
**Resolution**: `npx oxfmt --write` on those 5 files. Re-ran typecheck + tests post-format — 22/22 tests still pass.
