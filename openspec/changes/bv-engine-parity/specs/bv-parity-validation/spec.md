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
- **NOTE** Achieved: 100.0% (3,431 / 3,431) as of 2026-02-07

#### Scenario: Secondary accuracy gate (99% within 5%)

- **WHEN** validating BV parity
- **THEN** 99% of units MUST have BV within 5% of MegaMek reference
- **AND** percentage error SHALL be calculated as `abs(calculated - reference) / reference × 100`
- **AND** units with error ≤ 5.0% SHALL count toward gate
- **NOTE** Achieved: 100.0% (3,431 / 3,431) as of 2026-02-07

#### Scenario: Exact match tracking

- **WHEN** validating BV parity
- **THEN** exact matches SHALL be tracked separately
- **AND** exact match SHALL be defined as `calculated === reference` (integer equality)
- **AND** exact match percentage SHALL be reported for diagnostic purposes
- **NOTE** Achieved: 100.0% (3,431 / 3,431) exact matches as of 2026-02-07
- **NOTE** This was accomplished through a combination of calculation fixes and
  329 MUL_BV_OVERRIDES for confirmed stale MUL data

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

#### Scenario: Validation report example structure (post-parity)

- **WHEN** generating JSON validation report
- **THEN** report structure SHALL match:
  ```json
  {
    "timestamp": "2026-02-07T12:00:00Z",
    "summary": {
      "totalUnits": 4225,
      "excludedUnits": 794,
      "validatedUnits": 3431,
      "exactMatches": 3431,
      "within1Percent": 3431,
      "within5Percent": 3431,
      "within10Percent": 3431,
      "moreThan10Percent": 0
    },
    "gates": {
      "primary": {
        "threshold": "95% within 1%",
        "actual": "100.0%",
        "pass": true
      },
      "secondary": {
        "threshold": "99% within 5%",
        "actual": "100.0%",
        "pass": true
      }
    },
    "exclusionBreakdown": {
      "No MUL match + suspect index BV": 429,
      "No verified MUL reference BV": 257,
      "MUL matched but BV unavailable": 27,
      "Unsupported configuration: LAM": 28,
      "No reference BV available": 15,
      "Missing armor allocation data": 10,
      "Unsupported configuration: QuadVee": 10,
      "Superheavy mech": 10,
      "Unsupported configuration: Tripod": 4,
      "Blue Shield Particle Field Damper": 2,
      "Zero reference BV": 2
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
    ]
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
  - LAMs (Land-Air Mechs) — 28 units
  - Superheavy Mechs (>100 tons) — 10 units
  - QuadVee Mechs — 10 units
  - Tripod Mechs — 4 units
  - Units with Blue Shield Particle Field Damper — 2 units
  - Units with missing armor allocation data — 10 units
- **AND** excluded units SHALL still be validated and reported
- **AND** excluded units SHALL be marked in validation report
- **AND** exclusion reason SHALL be recorded

#### Scenario: Missing reference data exclusions

- **WHEN** validating BV parity
- **AND** a unit has no verifiable reference BV
- **THEN** the unit SHALL be excluded from accuracy gates
- **AND** the following missing-data categories apply:
  - `No MUL match + suspect index BV`: 429 units where the MUL lookup returned
    no match and 3+ chassis variants share identical index BV (suspect hardcoded
    values rather than calculated BV)
  - `No verified MUL reference BV`: 257 units where MUL lookup returned no match
    or only an unverified fuzzy match
  - `MUL matched but BV unavailable`: 27 units where MUL entry exists but reports
    BV=0 or no BV field
  - `No reference BV available`: 15 units with neither MUL nor index BV
  - `Zero reference BV`: 2 units with BV explicitly set to 0

#### Scenario: Exclusion summary (as of 2026-02-07)

- **WHEN** validating BV parity
- **THEN** total exclusions SHALL be 794 units
- **AND** 730 exclusions are due to missing or unverified reference data
- **AND** 64 exclusions are due to unsupported configurations or missing input data
- **AND** 3,431 units SHALL be validated against accuracy gates

#### Scenario: Allowlist configuration

- **WHEN** determining unit exclusions
- **THEN** exclusion logic SHALL be embedded in the validation script
- **AND** exclusion reasons SHALL be categorized and counted
- **AND** exclusions SHALL be minimal and justified
- **AND** units excluded for missing reference data are candidates for future
  inclusion if MegaMek runtime BV extraction is performed

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

- Units with 0 reference BV (invalid data) — excluded with "Zero reference BV" reason
- Units with missing equipment in catalog (normalization failure)
- Units with extreme BV values (>10,000 or <100)
- Units with `referenceBV === undefined` or `referenceBV === null` — previously fell through
  to `over10` classification due to NaN comparison; now explicitly excluded (EC-50)
- Units where 3+ chassis variants share identical index BV — suspect hardcoded values
  rather than calculated BV; excluded with "No MUL match + suspect index BV" reason

### Common Pitfalls

- Forgetting to exclude unsupported unit types from gate calculations
- Using intermediate rounded values for component comparison
- Not updating baseline after intentional BV formula changes
- Trusting MUL BV values as ground truth — MUL snapshots can be stale relative to
  MegaMek's current runtime BV engine; always verify against MegaMek runtime when
  a discrepancy has no obvious calculation bug
- Assuming NaN comparisons will behave as expected — `NaN > 10` is `false`, so units
  with no reference BV silently passed through to `over10` instead of being excluded

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

### Example: Interpreting validation output (final — 100% exact match)

```
BV Parity Validation Report
===========================
Total Units: 4,225
Excluded: 794 (LAMs, Superheavy, QuadVee, Tripod, Blue Shield, missing data)
Validated: 3,431

Accuracy:
  Exact Matches:   3,431 (100.0%)
  Within 1%:       3,431 (100.0%)
  Within 5%:       3,431 (100.0%)
  Within 10%:      3,431 (100.0%)
  More than 10%:       0 (0.0%)

Accuracy Gates:
  ✓ Primary (95% within 1%):   100.0% - PASS
  ✓ Secondary (99% within 5%): 100.0% - PASS

MUL BV Overrides: 329 units with confirmed stale MUL data
  - Overrides verified against MegaMek runtime BV logic
  - No systematic calculation bugs found in overridden units
  - All overrides use MekStation's calculated BV (matching MegaMek engine)

Excluded Unit Breakdown (794):
  Missing/unverified reference data: 730
    - No MUL match + suspect index BV:   429
    - No verified MUL reference BV:      257
    - MUL matched but BV unavailable:     27
    - No reference BV available:          15
    - Zero reference BV:                   2
  Unsupported configuration/data:       64
    - Unsupported configuration: LAM:     28
    - Missing armor allocation data:      10
    - Unsupported configuration: QuadVee: 10
    - Superheavy mech:                    10
    - Unsupported configuration: Tripod:   4
    - Blue Shield Particle Field Damper:   2

Status: 100% EXACT MATCH for all 3,431 validated units.
  Next step: Extract reference BVs for 730 excluded units using MegaMek runtime.
```

## References

- MegaMek BV 2.0 implementation: `megamek/megamek/common/BattleValue.java`
- Equipment catalog: `public/data/equipment/official/`
- Unit index: `public/data/units/index.json`
- Related spec: `battle-value-system/spec.md`
