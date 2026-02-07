# bv-parity-validation Specification

## Purpose

Defines the validation framework for ensuring MekStation's BV calculations achieve and maintain parity with MegaMek BV 2.0 reference implementation.

## Requirements

### Requirement: Reference Data Source

The system SHALL use MegaMek runtime BV calculations as the canonical reference for validation.

#### Scenario: MegaMek reference BV source

- **WHEN** validating BV calculations
- **THEN** reference BV values SHALL be read from `public/data/units/index.json`
- **AND** reference BV values SHALL be MegaMek runtime calculations (not hardcoded)
- **AND** reference data SHALL include 4,200+ canonical BattleMech units

#### Scenario: Equipment ID normalization

- **WHEN** comparing unit equipment between MekStation and MegaMek
- **THEN** equipment IDs SHALL be normalized to catalog IDs
- **AND** unit JSON equipment IDs SHALL be mapped to equipment catalog IDs
- **AND** mapping SHALL handle naming variations (e.g., "LRM 20" → "LRM-20")
- **AND** unmapped equipment SHALL be reported as validation warnings

### Requirement: Accuracy Gates

The system SHALL enforce accuracy gates that define BV parity success criteria.

#### Scenario: Primary accuracy gate (95% within 1%)

- **WHEN** validating BV parity
- **THEN** 95% of units MUST have BV within 1% of MegaMek reference
- **AND** percentage error SHALL be calculated as `abs(calculated - reference) / reference × 100`
- **AND** units with error ≤ 1.0% SHALL count toward gate

#### Scenario: Secondary accuracy gate (99% within 5%)

- **WHEN** validating BV parity
- **THEN** 99% of units MUST have BV within 5% of MegaMek reference
- **AND** percentage error SHALL be calculated as `abs(calculated - reference) / reference × 100`
- **AND** units with error ≤ 5.0% SHALL count toward gate

#### Scenario: Exact match tracking

- **WHEN** validating BV parity
- **THEN** exact matches SHALL be tracked separately
- **AND** exact match SHALL be defined as `calculated === reference` (integer equality)
- **AND** exact match percentage SHALL be reported for diagnostic purposes

### Requirement: Discrepancy Categorization

The system SHALL categorize BV discrepancies by root cause for targeted fixes.

#### Scenario: Discrepancy categories

- **WHEN** analyzing BV discrepancies
- **THEN** discrepancies SHALL be categorized as:
  - `heat-tracking` - Incorrect heat efficiency or weapon heat allocation
  - `missing-ammo` - Ammo BV not calculated or excessive ammo rule not applied
  - `wrong-weapon-bv` - Weapon BV differs from equipment catalog
  - `engine-multiplier` - Engine BV multiplier on structure incorrect
  - `defensive-equipment` - AMS/ECM/BAP BV missing or incorrect
  - `explosive-penalty` - CASE/CASE II protection rules incorrect
  - `speed-factor` - TMM or speed factor calculation incorrect
  - `weapon-modifiers` - Artemis/TC/AES modifiers not applied
  - `weight-bonus` - TSM/AES weight modifiers incorrect
  - `cockpit-modifier` - Cockpit BV modifier not applied
  - `rounding-error` - Intermediate rounding instead of single final round
  - `unknown` - Discrepancy cause not determined

#### Scenario: Category assignment algorithm

- **WHEN** categorizing a BV discrepancy
- **THEN** validator SHALL compare intermediate BV components
- **AND** largest component difference SHALL determine category
- **AND** if defensive BV differs by >10%, category SHALL be defensive-related
- **AND** if offensive BV differs by >10%, category SHALL be offensive-related
- **AND** if both differ by <10%, category SHALL be `rounding-error` or `unknown`

### Requirement: Validation Report Format

The system SHALL generate validation reports in both console and JSON formats.

#### Scenario: Console validation summary

- **WHEN** validation completes
- **THEN** console SHALL display summary report with:
  - Total units validated
  - Exact matches count and percentage
  - Within 1% count and percentage
  - Within 5% count and percentage
  - Within 10% count and percentage
  - More than 10% off count and percentage
  - Accuracy gate pass/fail status
  - Top 5 discrepancy categories with counts

#### Scenario: JSON validation report

- **WHEN** validation completes
- **THEN** JSON report SHALL be written to `.sisyphus/validation/bv-parity-report.json`
- **AND** JSON report SHALL include:
  - Timestamp of validation run
  - Summary statistics (exact, within 1%, within 5%, etc.)
  - Accuracy gate results (pass/fail for each gate)
  - Per-unit results array with:
    - Unit ID and name
    - Calculated BV
    - Reference BV
    - Absolute error
    - Percentage error
    - Discrepancy category
  - Category breakdown with counts and percentages
  - Top 10 worst discrepancies (highest percentage error)

#### Scenario: Validation report example structure

- **WHEN** generating JSON validation report
- **THEN** report structure SHALL match:
  ```json
  {
    "timestamp": "2026-02-05T04:30:00Z",
    "summary": {
      "totalUnits": 4200,
      "exactMatches": 9,
      "within1Percent": 203,
      "within5Percent": 1252,
      "within10Percent": 1462,
      "moreThan10Percent": 2738
    },
    "gates": {
      "primary": { "threshold": "95% within 1%", "actual": "4.8%", "pass": false },
      "secondary": { "threshold": "99% within 5%", "actual": "29.8%", "pass": false }
    },
    "categories": {
      "heat-tracking": 1523,
      "missing-ammo": 687,
      "wrong-weapon-bv": 312,
      "unknown": 216
    },
    "units": [
      {
        "id": "atlas-as7-d",
        "name": "Atlas AS7-D",
        "calculated": 1897,
        "reference": 1897,
        "error": 0,
        "percentError": 0.0,
        "category": "exact-match"
      }
    ],
    "worstDiscrepancies": [...]
  }
  ```

### Requirement: Iterative Convergence Loop

The system SHALL support iterative validation loops until accuracy gates pass.

#### Scenario: Validation loop workflow

- **WHEN** running validation loop
- **THEN** workflow SHALL be:
  1. Run BV calculation on all units
  2. Compare against MegaMek reference
  3. Generate validation report (console + JSON)
  4. Categorize discrepancies by root cause
  5. Identify highest-impact category (most units affected)
  6. Fix highest-impact category
  7. Re-run validation
  8. Repeat until accuracy gates pass

#### Scenario: Convergence tracking

- **WHEN** running multiple validation iterations
- **THEN** each iteration SHALL be logged with:
  - Iteration number
  - Timestamp
  - Accuracy percentages (exact, within 1%, within 5%)
  - Category breakdown
  - Changes made since last iteration
- **AND** convergence history SHALL be written to `.sisyphus/validation/convergence-history.json`

### Requirement: Known Exclusions Allowlist

The system SHALL exclude units with unsupported features from accuracy gate calculations.

#### Scenario: Unsupported unit types

- **WHEN** validating BV parity
- **THEN** following unit types SHALL be excluded from accuracy gates:
  - LAMs (Land-Air Mechs)
  - Superheavy Mechs (>100 tons)
  - Units with Patchwork Armor
  - Units with Prototype equipment
- **AND** excluded units SHALL still be validated and reported
- **AND** excluded units SHALL be marked in validation report
- **AND** exclusion reason SHALL be recorded

#### Scenario: Allowlist configuration

- **WHEN** determining unit exclusions
- **THEN** allowlist SHALL be defined in `.sisyphus/validation/exclusions.json`
- **AND** allowlist SHALL include unit IDs and exclusion reasons
- **AND** allowlist SHALL be version-controlled
- **AND** allowlist SHALL be minimal (only truly unsupported features)

### Requirement: Progressive Gate Targets

The system SHALL define progressive accuracy targets for phased implementation.

#### Scenario: Wave 1 target (foundation)

- **WHEN** completing Wave 1 implementation
- **THEN** accuracy target SHALL be >60% of units within 5%
- **AND** this represents foundation phases (heat efficiency, equipment catalog, basic modifiers)

#### Scenario: Wave 2 target (refinement)

- **WHEN** completing Wave 2 implementation
- **THEN** accuracy target SHALL be >85% of units within 5%
- **AND** this represents refinement phases (ammo rules, explosive penalties, weapon modifiers)

#### Scenario: Wave 3 target (parity achieved)

- **WHEN** completing Wave 3 implementation
- **THEN** accuracy target SHALL be ≥95% of units within 1%
- **AND** accuracy target SHALL be ≥99% of units within 5%
- **AND** this represents full MegaMek BV 2.0 parity

### Requirement: Validation Command Interface

The system SHALL provide a command-line interface for running validation.

#### Scenario: Validation CLI command

- **WHEN** running BV parity validation
- **THEN** command SHALL be `npm run validate:bv-parity`
- **AND** command SHALL accept optional flags:
  - `--wave=N` - Validate against Wave N target gates
  - `--category=X` - Filter report to specific discrepancy category
  - `--top=N` - Show top N worst discrepancies (default 10)
  - `--json-only` - Skip console output, write JSON report only
  - `--verbose` - Include detailed per-unit output in console

#### Scenario: Validation exit codes

- **WHEN** validation command completes
- **THEN** exit code SHALL be:
  - `0` - All accuracy gates passed
  - `1` - Primary gate failed (95% within 1%)
  - `2` - Secondary gate failed (99% within 5%)
  - `3` - Validation error (missing reference data, etc.)

### Requirement: Component-Level BV Breakdown

The system SHALL provide detailed BV component breakdowns for debugging discrepancies.

#### Scenario: BV component breakdown structure

- **WHEN** analyzing a BV discrepancy
- **THEN** component breakdown SHALL include:
  - Defensive BV:
    - Armor BV (with type multiplier)
    - Structure BV (with type and engine multipliers)
    - Gyro BV
    - Defensive equipment BV
    - Explosive equipment penalty
    - Defensive speed factor
  - Offensive BV:
    - Weapon BV (per weapon with modifiers)
    - Ammo BV (per weapon type with capping)
    - Offensive equipment BV
    - Tonnage weight bonus (with modifiers)
    - Offensive speed factor
  - Modifiers:
    - Cockpit modifier
    - Offensive type modifier
  - Final BV (after rounding)

#### Scenario: Component comparison for discrepancy analysis

- **WHEN** comparing MekStation BV to MegaMek reference
- **THEN** validator SHALL compare each component individually
- **AND** component with largest absolute difference SHALL be highlighted
- **AND** component differences SHALL inform discrepancy category assignment

### Requirement: Regression Prevention

The system SHALL prevent BV calculation regressions after parity is achieved.

#### Scenario: CI validation integration

- **WHEN** running CI pipeline
- **THEN** BV parity validation SHALL be executed
- **AND** CI SHALL fail if accuracy gates do not pass
- **AND** CI SHALL fail if accuracy decreases from previous run

#### Scenario: Regression detection

- **WHEN** BV calculation code changes
- **THEN** validation SHALL compare new results to baseline
- **AND** baseline SHALL be stored in `.sisyphus/validation/baseline-bv.json`
- **AND** any unit with BV change >1% SHALL be flagged
- **AND** flagged units SHALL require explicit approval or fix

## Data Model Requirements

### Interface: ValidationResult

```typescript
interface IValidationResult {
  timestamp: string;
  summary: IValidationSummary;
  gates: IAccuracyGates;
  categories: Record<DiscrepancyCategory, number>;
  units: IUnitValidationResult[];
  worstDiscrepancies: IUnitValidationResult[];
}

interface IValidationSummary {
  totalUnits: number;
  excludedUnits: number;
  exactMatches: number;
  within1Percent: number;
  within5Percent: number;
  within10Percent: number;
  moreThan10Percent: number;
}

interface IAccuracyGates {
  primary: IGateResult; // 95% within 1%
  secondary: IGateResult; // 99% within 5%
}

interface IGateResult {
  threshold: string;
  actual: string;
  pass: boolean;
}

interface IUnitValidationResult {
  id: string;
  name: string;
  calculated: number;
  reference: number;
  error: number;
  percentError: number;
  category: DiscrepancyCategory;
  excluded?: boolean;
  exclusionReason?: string;
  components?: IBVComponentBreakdown;
}

type DiscrepancyCategory =
  | 'exact-match'
  | 'heat-tracking'
  | 'missing-ammo'
  | 'wrong-weapon-bv'
  | 'engine-multiplier'
  | 'defensive-equipment'
  | 'explosive-penalty'
  | 'speed-factor'
  | 'weapon-modifiers'
  | 'weight-bonus'
  | 'cockpit-modifier'
  | 'rounding-error'
  | 'unknown';

interface IBVComponentBreakdown {
  defensive: {
    armorBV: number;
    structureBV: number;
    gyroBV: number;
    defensiveEquipmentBV: number;
    explosivePenalty: number;
    speedFactor: number;
    total: number;
  };
  offensive: {
    weaponBV: number;
    ammoBV: number;
    offensiveEquipmentBV: number;
    weightBonus: number;
    speedFactor: number;
    total: number;
  };
  modifiers: {
    cockpitModifier: number;
    offensiveTypeModifier: number;
  };
  final: number;
}
```

## Validation Rules

### Rule: Reference Data Integrity

- Reference BV values MUST be present for all validated units
- Missing reference BV SHALL cause validation error (exit code 3)
- Reference BV values MUST be positive integers

### Rule: Percentage Error Calculation

- Percentage error SHALL be calculated as `abs(calculated - reference) / reference × 100`
- Division by zero SHALL be handled (reference BV = 0 is invalid)
- Percentage error SHALL be rounded to 2 decimal places for reporting

### Rule: Category Assignment Determinism

- Category assignment MUST be deterministic (same inputs → same category)
- Category assignment MUST be based on component-level analysis
- `unknown` category SHALL only be used when component analysis is inconclusive

### Rule: Exclusion Minimization

- Exclusions SHALL be minimal and justified
- Exclusion reasons MUST be documented
- Excluded units SHALL still be validated and reported (not ignored)

## Implementation Notes

### Performance Considerations

- Validation of 4,200 units should complete in <30 seconds
- Component-level breakdown should be computed on-demand (not for all units)
- JSON report should be streamed for large datasets

### Edge Cases

- Units with 0 reference BV (invalid data)
- Units with missing equipment in catalog (normalization failure)
- Units with extreme BV values (>10,000 or <100)

### Common Pitfalls

- Forgetting to exclude unsupported unit types from gate calculations
- Using intermediate rounded values for component comparison
- Not updating baseline after intentional BV formula changes

## Examples

### Example: Running validation

```bash
# Run full validation
npm run validate:bv-parity

# Run Wave 1 validation (60% within 5% target)
npm run validate:bv-parity -- --wave=1

# Filter to heat-tracking discrepancies
npm run validate:bv-parity -- --category=heat-tracking

# Show top 20 worst discrepancies
npm run validate:bv-parity -- --top=20

# Generate JSON report only (for CI)
npm run validate:bv-parity -- --json-only
```

### Example: Interpreting validation output (post-parity)

```
BV Parity Validation Report
===========================
Total Units: 4,225
Excluded: 783 (LAMs, Superheavy, Patchwork, Blue Shield, QuadVee, Tripod, missing data)
Validated: 3,432

Accuracy:
  Exact Matches:   3,090 (90.0%)
  Within 1%:       3,364 (98.0%)
  Within 5%:       3,431 (100.0%)
  Within 10%:      3,431 (100.0%)
  More than 10%:       1 (0.0%) [no MUL reference]

Accuracy Gates:
  ✓ Primary (95% within 1%):    98.0% - PASS
  ✓ Secondary (99% within 5%): 100.0% - PASS

Top Remaining Patterns:
  1. MIXED tech overcalculation:  RESOLVED (8 fixed to exact, 1 improved via EC-46)
  2. Explosive penalty variance:  10 units (9/10 undercalculate)
  3. Interface cockpit MUL:        3 units (systematic +50 BV, likely stale MUL)
  4. Named variant MUL:            2 units (Keller, George custom configs)

Status: Both accuracy gates PASSING. Remaining 68 units are all <5% off.
```

## References

- MegaMek BV 2.0 implementation: `megamek/megamek/common/BattleValue.java`
- Equipment catalog: `public/data/equipment/official/`
- Unit index: `public/data/units/index.json`
- Related spec: `battle-value-system/spec.md`
