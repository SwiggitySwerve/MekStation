# mm-Data Parity Validation System

## Problem Statement

MekStation contains 4,218 BattleMech units converted from MegaMek's mm-data repository. We need to ensure 100% data parity between mm-data source files and MekStation's JSON units. This requires:

1. **Data parity**: Every unit in mm-data exists in MekStation
2. **Validation parity**: MekStation's construction rules produce identical results
3. **Continuous parity**: System to detect discrepancies as code evolves

## Proposed Solution

Build a TypeScript-based comparison pipeline that loads both mm-data `.blk` files and MekStation JSON files into the same `IUnit` interface, then performs deep field-by-field comparison.

### Architecture

```
┌─────────────────┐         ┌──────────────────┐
│   mm-data .blk  │         │ MekStation .json │
└────────┬────────┘         └────────┬─────────┘
         │                          │
         ▼                          ▼
┌─────────────────────────────────────────┐
│     BlkUnitLoaderService                │
│     (Parse .blk → IUnit)                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     UnitLoaderService (existing)        │
│     (Load .json → IUnit)                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     IUnit Interface                     │
│     (Canonical unit representation)     │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│     ParityValidator                     │
│     (Deep comparison of two IUnits)     │
└─────────────────────────────────────────┘
```

### Components

**1. BlkUnitLoaderService** (NEW)

- Parses mm-data `.blk` files into `IUnit` interface
- Maps blk key-value format to TypeScript objects
- Reuses enum mappings from `scripts/megameklab-conversion/enum_mappings.py`
- Handles special cases: critical slots, equipment arrays, armor allocation

**2. ParityValidator** (NEW)

- Takes two `IUnit` objects and performs deep comparison
- Compares all fields: identity, stats, armor, equipment, critical slots
- Reports field-level discrepancies with severity ratings
- Tolerates minor text variations (whitespace, capitalization)

**3. ComparisonOrchestrator** (NEW)

- Main entry point script (`scripts/parity/compare-mm-data.ts`)
- Clones mm-data repository to temporary directory
- Iterates through all MekStation JSON files
- Finds corresponding `.blk` file by `mulId`
- Runs ParityValidator for each unit pair
- Generates comprehensive reports

**4. ParityReporter** (NEW)

- Generates three report formats: console (real-time), JSON (machine-readable), HTML (human-readable)
- Creates summary dashboard with pass/warning/fail counts
- Outputs actionable discrepancies grouped by root cause
- Supports historical tracking

## Comparison Strategy

### Data Points Compared

**Identity & Classification**

- `id`, `chassis`, `model`, `mulId`
- `unitType`, `configuration`, `techBase`
- `era`, `year`, `rulesLevel`

**Core Statistics**

- `tonnage`, `engine.rating`, `engine.type`
- `gyro.type`, `structure.type`
- `heatSinks.count`, `heatSinks.type`
- `movement.walk`, `movement.run`, `movement.jump`

**Armor & Structure**

- `armor.type`
- `armor.allocation` (point-by-point per location)

**Equipment**

- Array length match
- Each item: `id`, `location`, `count`
- Set-based comparison (order-independent)

**Critical Slots**

- Each location's slot array
- Order-sensitive comparison
- `null` (empty) slot alignment

**Calculated Metrics**

- Battle Value 2.0 (validates BV calculator)
- C-Bill cost (validates cost formulas)

### Discrepancy Severity

**🔴 CRITICAL** - Data integrity issues

- Missing unit (mulId not found in mm-data)
- Tonnage mismatch
- Engine rating/type mismatch
- Missing or extra equipment

**🟡 WARNING** - Calculation or mapping issues

- BV2 mismatch (indicates calculator problem)
- Cost mismatch (indicates formula problem)
- Armor points slightly off (rounding error)
- Minor critical slot text differences

**🟢 INFO** - Minor differences

- Whitespace/capitalization in equipment names
- Source field variations

## Report Output

### Console (Real-time)

```
✓ Comparing Atlas AS-7D (mulId: 1234)... PASS
⚠ Comparing Timber Wolf TBR-Prime (mulId: 5678)... 3 warnings
✗ Comparing Hunchback HBK-4G (mulId: 9012)... FAILED
```

### JSON (Machine-readable)

```json
{
  "summary": {
    "totalUnits": 4218,
    "passed": 4150,
    "warnings": 52,
    "failed": 16,
    "timestamp": "2026-01-08T20:00:00Z",
    "mmDataCommit": "abc123def"
  },
  "discrepancies": [...]
}
```

### HTML (Human-readable)

- Executive summary dashboard
- Filterable discrepancy table
- Per-unit side-by-side comparison view
- PDF export capability

## CI/CD Integration

Non-blocking report generation on every push:

1. Run parity validation
2. Generate reports (JSON + HTML)
3. Upload as GitHub Actions artifacts (90-day retention)
4. Optional: Publish to GitHub Pages for historical tracking

**Benefits**

- Continuous visibility without blocking PRs
- Historical parity tracking over time
- Asynchronous developer review

## Implementation Location

```
scripts/parity/
├── blk-parser.ts              # BLK file parser
├── blk-unit-loader.service.ts # Load .blk → IUnit
├── parity-validator.ts        # Compare two IUnits
├── parity-reporter.ts         # Generate reports
├── compare-mm-data.ts         # Main entry point
└── utils/
    ├── comparison-utils.ts    # Deep comparison helpers
    └── report-generators.ts   # Console/JSON/HTML writers
```

## Future Benefits

This investment serves dual purposes:

1. **Parity Validation**: Ensures data integrity with mm-data
2. **Import/Export Foundation**: TypeScript parser enables future import/export of mm-data files directly in the application

## Success Criteria

- All 4,218 BattleMechs validated against mm-data
- Zero critical discrepancies
- Automated CI/CD reports on every push to main
- Clear actionable output for any warnings found
