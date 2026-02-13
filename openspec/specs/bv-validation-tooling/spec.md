# BV Validation Tooling Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: battle-value-system
**Affects**: None (tooling spec)

---

## Overview

### Purpose

This specification documents the BV (Battle Value) validation tooling infrastructure used to verify and improve the accuracy of MekStation's BV calculation engine against canonical MegaMek reference data. The tooling consists of 549 analysis scripts organized into functional categories that support a systematic validation methodology: trace discrepancies, identify patterns, implement fixes, and verify regression-free improvements.

**Note**: This is a **tooling specification**, not a runtime system specification. It documents the development and validation workflow, not production code behavior.

### Scope

**In Scope:**

- Script categorization and purposes (trace, check, analyze, debug, find, audit, temp)
- Subdirectory organization (analysis/, data-migration/, megameklab-conversion/, mm-data/, metrics/, performance/)
- Validation methodology (trace → identify pattern → fix → verify regression)
- Common script patterns (data loading, BV comparison, output formatting)
- Representative script examples from each category

**Out of Scope:**

- Runtime BV calculation logic (see battle-value-system spec)
- Production validation rules (see validation-patterns spec)
- Unit data formats (see unit-data-model spec)
- Test suite infrastructure (see testing-strategy spec)
- CI/CD validation pipelines (see deployment-pipeline spec)

### Key Concepts

- **Trace Script**: Investigates a specific unit or discrepancy to understand BV calculation differences
- **Check Script**: Validates a hypothesis or pattern across multiple units
- **Analyze Script**: Aggregates data to identify systematic patterns or gaps
- **Debug Script**: Deep-dives into a specific calculation issue with detailed output
- **Find Script**: Searches for units matching specific criteria (e.g., unresolved equipment)
- **Audit Script**: Compares MekStation data against external sources (MegaMek, MUL)
- **Temp Script**: Temporary exploratory script (often becomes trace/check/analyze after refinement)
- **Validation Report**: JSON output from `validate-bv.ts` containing BV comparison results for all units
- **Breakdown**: Detailed BV component breakdown (offensive, defensive, weapon, ammo, speed factor, modifiers)

---

## Requirements

### Requirement: Script Organization by Category

The validation tooling SHALL organize scripts into functional categories based on their primary purpose.

**Rationale**: Categorization enables developers to quickly locate relevant scripts when investigating specific types of BV discrepancies.

**Priority**: High

**Source**: `scripts/` directory structure (549 entries, 389 TypeScript files)

#### Scenario: Trace script usage

**GIVEN** a unit with a BV discrepancy (e.g., "Atlas AS7-C" is 2% under reference)
**WHEN** developer runs `npx tsx scripts/trace-unit-bv.ts atlas-as7-c`
**THEN** script outputs unit metadata, equipment array, critical slots, defensive equipment resolution, and AMS ammo
**AND** developer identifies which equipment items are unresolved or miscalculated

**Source**: `scripts/trace-unit-bv.ts:1-76`

#### Scenario: Check script usage

**GIVEN** a hypothesis that MUL-sourced BV values have higher accuracy than non-MUL values
**WHEN** developer runs `npx tsx scripts/check-mul-accuracy.ts`
**THEN** script outputs accuracy metrics (exact, within 1%, within 5%) separately for MUL and non-MUL units
**AND** developer confirms or rejects the hypothesis based on statistical comparison

**Source**: `scripts/check-mul-accuracy.ts:1-69`

#### Scenario: Analyze script usage

**GIVEN** 200+ units outside 1% accuracy threshold
**WHEN** developer runs `npx tsx scripts/analyze-remaining-gaps.ts`
**THEN** script buckets units by percent range (1-2%, 2-3%, 3-5%, 5-10%, 10%+)
**AND** script identifies common patterns (tech base, no halved weapons, weapon gaps)
**AND** developer prioritizes fixes based on pattern frequency

**Source**: `scripts/analyze-remaining-gaps.ts:1-80`

#### Scenario: Audit script usage

**GIVEN** weapon catalog BV values that may differ from MegaMek Java source
**WHEN** developer runs `npx tsx scripts/audit-bv-megamek.ts`
**THEN** script walks MegaMek Java weapon files, extracts BV values, and compares against MekStation catalog
**AND** script reports mismatches with file paths and line numbers

**Source**: `scripts/audit-bv-megamek.ts:1-80`

### Requirement: Script Categories and Counts

The validation tooling SHALL maintain the following script categories with approximate counts:

| Category    | Count | Purpose                                                                  |
| ----------- | ----- | ------------------------------------------------------------------------ |
| `trace-*`   | ~153  | Investigate specific units or discrepancies with detailed output         |
| `check-*`   | ~156  | Validate hypotheses or patterns across multiple units                    |
| `analyze-*` | ~55   | Aggregate data to identify systematic patterns or gaps                   |
| `debug-*`   | ~22   | Deep-dive into specific calculation issues with verbose logging          |
| `find-*`    | ~27   | Search for units matching specific criteria (e.g., unresolved equipment) |
| `audit-*`   | ~4    | Compare MekStation data against external sources (MegaMek, MUL)          |
| `temp-*`    | ~41   | Temporary exploratory scripts (often promoted to other categories)       |

**Rationale**: Category counts provide insight into the validation workflow's focus areas. High trace/check counts indicate iterative hypothesis testing.

**Priority**: Medium

**Source**: `scripts/` directory (grep counts by prefix)

#### Scenario: Category distribution reflects workflow

**GIVEN** the validation workflow emphasizes iterative hypothesis testing
**WHEN** developer reviews script category counts
**THEN** trace and check scripts dominate (~309 combined, 56% of total)
**AND** analyze scripts are fewer (~55, 10%) but higher-leverage
**AND** temp scripts (~41, 7%) represent active exploration

### Requirement: Subdirectory Organization

The validation tooling SHALL organize specialized scripts into subdirectories:

| Subdirectory             | Purpose                                                            |
| ------------------------ | ------------------------------------------------------------------ |
| `analysis/`              | Detailed analysis scripts (coverage, equipment systems, weapons)   |
| `data-migration/`        | Scripts for migrating unit data (add BV/cost/rules level to index) |
| `megameklab-conversion/` | Scripts for converting MegaMekLab unit files to MekStation format  |
| `mm-data/`               | Scripts for processing MegaMek data files                          |
| `metrics/`               | Scripts for measuring refactoring and validation metrics           |
| `performance/`           | Scripts for performance profiling and optimization                 |

**Rationale**: Subdirectories separate specialized tooling from the main validation workflow scripts.

**Priority**: Medium

**Source**: `scripts/` directory structure (6 subdirectories)

#### Scenario: Analysis subdirectory usage

**GIVEN** developer needs to audit equipment coverage across all units
**WHEN** developer runs `npx tsx scripts/analysis/equipment_systems_analysis.js`
**THEN** script outputs equipment usage statistics, unresolved items, and coverage gaps
**AND** developer identifies which equipment types need catalog entries

**Source**: `scripts/analysis/` directory (5 scripts)

#### Scenario: Data migration subdirectory usage

**GIVEN** unit index needs BV values added from validation report
**WHEN** developer runs `npx tsx scripts/data-migration/add-bv-to-index.ts`
**THEN** script reads validation report, updates index.json with BV values, and writes updated file
**AND** unit browser displays BV values without recalculating on every load

**Source**: `scripts/data-migration/` directory (5 scripts)

### Requirement: Validation Methodology

The validation tooling SHALL support a systematic methodology for improving BV accuracy:

1. **Trace**: Identify units with discrepancies using `validate-bv.ts` report
2. **Identify Pattern**: Use trace/check/analyze scripts to find common causes
3. **Fix**: Implement fix in BV calculation engine or equipment catalog
4. **Verify Regression**: Re-run `validate-bv.ts` to ensure fix improves accuracy without breaking other units

**Rationale**: Systematic methodology prevents ad-hoc fixes that improve one unit but break others.

**Priority**: Critical

**Source**: Validation workflow pattern observed across 549 scripts

#### Scenario: Trace → Identify → Fix → Verify workflow

**GIVEN** validation report shows 50 units undercalculated by 1-2%
**WHEN** developer runs `npx tsx scripts/trace-1pct-band.ts` to sample units
**AND** developer runs `npx tsx scripts/analyze-1to5-range.js` to identify common pattern (e.g., missing cockpit modifier)
**AND** developer implements fix in `src/utils/construction/battleValueCalculator.ts`
**AND** developer runs `npm run validate:bv` to regenerate report
**THEN** 45 of 50 units move to "exact" or "within 1%" status
**AND** no previously-accurate units regress to "outside 1%" status

#### Scenario: Regression detection

**GIVEN** developer implements fix for Clan weapon BV calculation
**WHEN** developer runs `npx tsx scripts/check-regression.ts` comparing old and new validation reports
**THEN** script outputs units that improved, units that regressed, and net accuracy change
**AND** developer confirms no regressions before committing fix

**Source**: `scripts/check-regression.ts` (regression detection pattern)

### Requirement: Common Script Patterns

Validation scripts SHALL follow common patterns for data loading, BV comparison, and output formatting.

**Rationale**: Consistent patterns enable rapid script creation and reduce cognitive load when reading unfamiliar scripts.

**Priority**: Medium

**Source**: Representative scripts from each category

#### Scenario: Data loading pattern

**GIVEN** script needs to analyze a specific unit
**WHEN** script loads unit data
**THEN** script reads `public/data/units/battlemechs/index.json` to find unit entry
**AND** script reads unit file from `public/data/units/battlemechs/{path}` using entry.path
**AND** script parses JSON to access unit properties (chassis, model, tonnage, techBase, equipment, criticalSlots)

**Source**: `scripts/trace-unit-bv.ts:5-8`, `scripts/analyze-remaining-gaps.ts:10-14`

#### Scenario: BV comparison pattern

**GIVEN** script needs to compare calculated BV against reference BV
**WHEN** script loads validation report
**THEN** script reads `validation-output/bv-validation-report.json`
**AND** script filters `allResults` array by status (exact, within1pct, outside1pct, error)
**AND** script accesses `percentDiff`, `difference`, `breakdown` properties for analysis

**Source**: `scripts/check-mul-accuracy.ts:6-9`, `scripts/analyze-remaining-gaps.ts:7-8`

#### Scenario: Output formatting pattern

**GIVEN** script outputs analysis results
**WHEN** script formats output
**THEN** script uses console.log with section headers (`=== SECTION NAME ===`)
**AND** script uses padded columns for tabular data (`.padEnd()`, `.padStart()`)
**AND** script uses `.toFixed(1)` or `.toFixed(2)` for percentage formatting
**AND** script outputs counts, averages, and distributions for statistical summaries

**Source**: `scripts/check-mul-accuracy.ts:32-50`, `scripts/analyze-remaining-gaps.ts:21-29`

### Requirement: TypeScript Configuration

Validation scripts SHALL use TypeScript with configuration optimized for script execution.

**Rationale**: TypeScript provides type safety and IDE support while allowing rapid script development.

**Priority**: Medium

**Source**: `scripts/tsconfig.json:1-36`

#### Scenario: Script execution with tsx

**GIVEN** developer writes a new validation script `scripts/check-new-pattern.ts`
**WHEN** developer runs `npx tsx scripts/check-new-pattern.ts`
**THEN** tsx compiles TypeScript on-the-fly using `scripts/tsconfig.json`
**AND** script imports from `src/` using `@/` path alias (baseUrl: "../src")
**AND** script accesses validation utilities (resolveEquipmentBV, normalizeEquipmentId)

**Source**: `scripts/tsconfig.json:15-18` (baseUrl and paths configuration)

#### Scenario: Script imports from src

**GIVEN** script needs to use equipment BV resolver
**WHEN** script imports `import { resolveEquipmentBV } from '../src/utils/construction/equipmentBVResolver';`
**THEN** TypeScript resolves import using baseUrl and paths configuration
**AND** script accesses production code utilities without duplication

**Source**: `scripts/trace-unit-bv.ts:35`, `scripts/debug-bv.ts:23`

---

## Data Model Requirements

### Required Interfaces

The validation tooling MUST use the following TypeScript interfaces for validation report structure:

```typescript
/**
 * Validation report structure output by validate-bv.ts
 */
interface IValidationReport {
  /**
   * All validation results (one per unit)
   */
  readonly allResults: IValidationResult[];

  /**
   * Summary statistics
   */
  readonly summary: {
    readonly total: number;
    readonly exact: number;
    readonly within1pct: number;
    readonly within5pct: number;
    readonly outside5pct: number;
    readonly errors: number;
  };
}

/**
 * Validation result for a single unit
 */
interface IValidationResult {
  /**
   * Unit identifier (e.g., "atlas-as7-c")
   */
  readonly unitId: string;

  /**
   * Unit chassis (e.g., "Atlas")
   */
  readonly chassis: string;

  /**
   * Unit model (e.g., "AS7-C")
   */
  readonly model: string;

  /**
   * Validation status
   */
  readonly status:
    | 'exact'
    | 'within1pct'
    | 'within5pct'
    | 'outside5pct'
    | 'error';

  /**
   * Reference BV from index (MegaMek or MUL)
   */
  readonly indexBV: number;

  /**
   * Calculated BV from MekStation engine
   */
  readonly calculatedBV: number;

  /**
   * Absolute difference (calculatedBV - indexBV)
   */
  readonly difference: number;

  /**
   * Percent difference ((difference / indexBV) * 100)
   */
  readonly percentDiff: number | null;

  /**
   * Detailed BV breakdown (if available)
   */
  readonly breakdown?: IBVBreakdown;

  /**
   * Validation issues (e.g., "Unresolved weapon: Clan ER PPC")
   */
  readonly issues?: string[];
}

/**
 * Detailed BV component breakdown
 */
interface IBVBreakdown {
  readonly offensiveBV: number;
  readonly defensiveBV: number;
  readonly weaponBV: number;
  readonly ammoBV: number;
  readonly halvedWeaponBV?: number;
  readonly speedFactor: number;
  readonly cockpitModifier?: number;
  readonly gyroModifier?: number;
}
```

### Required Constants

```typescript
/**
 * Validation report file path
 */
const VALIDATION_REPORT_PATH = 'validation-output/bv-validation-report.json';

/**
 * Unit index file path
 */
const UNIT_INDEX_PATH = 'public/data/units/battlemechs/index.json';

/**
 * Unit data directory
 */
const UNIT_DATA_DIR = 'public/data/units/battlemechs';
```

---

## Dependencies

### Depends On

- **battle-value-system**: Validation scripts test the BV calculation engine defined in this spec
- **unit-data-model**: Scripts load and parse unit data files
- **equipment-database**: Scripts resolve equipment BV values from catalogs

### Used By

- **None** (tooling spec, not used by runtime code)

### Validation Workflow

1. **Run validation**: `npm run validate:bv` generates `validation-output/bv-validation-report.json`
2. **Analyze discrepancies**: Use trace/check/analyze scripts to identify patterns
3. **Implement fixes**: Update BV calculation engine or equipment catalogs
4. **Verify regression**: Re-run validation and compare reports
5. **Commit fixes**: Commit code changes with validation report showing improvement

---

## Implementation Notes

### Performance Considerations

- **Parallel execution**: Scripts process units sequentially; consider parallelization for large-scale analysis
- **Caching**: Validation report is cached; regenerate only when BV engine or unit data changes
- **Memory usage**: Loading all 4,200+ units into memory may require 1-2GB RAM for analysis scripts

### Edge Cases

- **Missing reference BV**: Some units lack MegaMek or MUL BV values; scripts should skip or flag these
- **Division by zero**: Percent difference calculation must handle indexBV=0 case
- **Unresolved equipment**: Scripts should detect and report equipment items that fail to resolve to catalog entries

### Common Pitfalls

- **Pitfall**: Running analysis scripts on stale validation report
  - **Solution**: Always run `npm run validate:bv` before analysis to ensure fresh data

- **Pitfall**: Temp scripts accumulating without cleanup
  - **Solution**: Periodically review temp-\* scripts and promote useful ones to trace/check/analyze or delete

- **Pitfall**: Scripts hardcoding file paths that break on different machines
  - **Solution**: Use `path.resolve()` and relative paths from project root

---

## Examples

### Example 1: Trace a specific unit

**Input**:

```bash
npx tsx scripts/trace-unit-bv.ts atlas-as7-c
```

**Output**:

```
=== Atlas AS7-C (atlas-as7-c) ===
Tech Base: Inner Sphere
Tonnage: 100
Engine: Fusion 300
Cockpit: Standard Cockpit
Gyro: Standard Gyro

--- Equipment Array ---
  ac-20 @ Right Torso
  medium-laser @ Right Torso
  medium-laser @ Left Torso
  lrm-20 @ Left Torso
  srm-6 @ Center Torso

--- Crit Slots (non-structural) ---
  RT: AC/20
  RT: Medium Laser
  LT: Medium Laser
  LT: LRM-20
  CT: SRM-6

--- Defensive Equipment Resolution ---
  (none)

--- AMS Ammo ---
  (none)
```

### Example 2: Check MUL accuracy

**Input**:

```bash
npx tsx scripts/check-mul-accuracy.ts
```

**Output**:

```
=== MUL-SOURCED BV (1,234 units) ===
  Exact: 856 (69.4%)
  Within 1%: 1,102 (89.3%)
  Within 5%: 1,198 (97.1%)

=== NON-MUL BV (2,966 units) ===
  Exact: 1,823 (61.5%)
  Within 1%: 2,534 (85.4%)
  Within 5%: 2,801 (94.4%)

=== 1-2% BAND: MUL=45, NonMUL=156 ===
```

### Example 3: Analyze remaining gaps

**Input**:

```bash
npx tsx scripts/analyze-remaining-gaps.ts
```

**Output**:

```
=== REMAINING OUTSIDE 1%: 234 ===
  Under: 178, Over: 56

  1-2%: under=89 over=23 total=112
  2-3%: under=45 over=12 total=57
  3-5%: under=28 over=15 total=43
  5-10%: under=12 over=4 total=16
  10%+: under=4 over=2 total=6

=== 1-2% UNDERCALCULATED BAND ===
  Count: 89
  No halved weapons: 34
  Inner Sphere: 67
  Clan: 18
  Mixed: 4
  Avg base offensive gap: 12.3
```

---

## References

### Official BattleTech Rules

- **TechManual**: Pages 315-317 - Battle Value 2.0 calculation formulas
- **Total Warfare**: Page 315 - Battle Value overview

### Related Documentation

- `openspec/specs/battle-value-system/spec.md` - BV calculation engine specification
- `scripts/validate-bv.ts` - Main validation script
- `validation-output/bv-validation-report.json` - Validation report structure

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Documented 549 scripts across 7 categories (trace, check, analyze, debug, find, audit, temp)
- Documented 6 subdirectories (analysis, data-migration, megameklab-conversion, mm-data, metrics, performance)
- Documented validation methodology (trace → identify pattern → fix → verify regression)
- Documented common script patterns (data loading, BV comparison, output formatting)
- Documented TypeScript configuration for script execution
