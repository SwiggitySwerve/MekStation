# Display Formatting Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2026-02-13
**Dependencies**: None
**Affects**: UI components, data presentation, user experience

---

## Overview

### Purpose

This specification defines formatting utilities for displaying numeric values, currency, time durations, percentages, and game-specific units (tonnage, heat, damage, range) in a consistent, human-readable format across the MekStation application.

### Scope

**In Scope:**

- Number formatting with locale-aware thousands separators
- Currency formatting (C-Bills) with abbreviations and full display
- Duration formatting (milliseconds to human-readable time)
- Percentage formatting with configurable decimal precision
- Game value formatting (Battle Value, tonnage, armor points, heat, damage, range, movement)
- Unit display with proper pluralization and abbreviations

**Out of Scope:**

- Date/time formatting (calendar dates, timestamps)
- Internationalization (i18n) beyond en-US locale
- User-configurable formatting preferences
- Input parsing and validation
- Number rounding strategies (covered by calculation specs)

### Key Concepts

- **Locale-Aware Formatting**: Uses `toLocaleString('en-US')` for thousands separators
- **Precision Control**: Configurable decimal places for fractional values
- **Unit Abbreviation**: Shortened suffixes (K, M, B) for large currency values
- **Pluralization**: Singular/plural forms based on numeric value
- **Game Units**: BattleTech-specific units (tons, C-Bills, BV, heat, damage)

---

## Requirements

### Requirement: Number Formatting with Thousands Separators

The system SHALL format numeric values with locale-aware thousands separators for improved readability.

**Rationale**: Large numbers (Battle Value, C-Bills, tonnage) are easier to read with comma separators.

**Priority**: High

#### Scenario: Format large numbers with commas

- **GIVEN** a numeric value >= 1,000
- **WHEN** formatting for display
- **THEN** thousands separators (commas) are inserted
- **AND** locale is en-US

#### Scenario: Format small numbers without separators

- **GIVEN** a numeric value < 1,000
- **WHEN** formatting for display
- **THEN** no thousands separators are added
- **AND** value displays as-is

#### Scenario: Handle zero values

- **GIVEN** a numeric value of 0
- **WHEN** formatting for display
- **THEN** displays as "0" without separators

#### Scenario: Handle negative numbers

- **GIVEN** a negative numeric value
- **WHEN** formatting for display
- **THEN** negative sign precedes the formatted number
- **AND** thousands separators are applied to absolute value

### Requirement: Currency Formatting (C-Bills)

The system SHALL format C-Bill values with thousands separators and appropriate unit suffixes.

**Rationale**: BattleTech uses C-Bills as the standard currency; large values benefit from abbreviation.

**Priority**: High

#### Scenario: Format full C-Bill amounts

- **GIVEN** a C-Bill amount
- **WHEN** using full formatting
- **THEN** displays with thousands separators
- **AND** appends " C-Bills" suffix
- **AND** includes "$" prefix

#### Scenario: Abbreviate millions with M suffix

- **GIVEN** a C-Bill amount >= 1,000,000
- **WHEN** using abbreviated formatting
- **THEN** divides by 1,000,000
- **AND** appends "M C-Bills" suffix
- **AND** shows 1 decimal place for values < 10M

#### Scenario: Abbreviate thousands with K suffix

- **GIVEN** a C-Bill amount >= 1,000 and < 1,000,000
- **WHEN** using abbreviated formatting
- **THEN** divides by 1,000
- **AND** appends "K C-Bills" suffix
- **AND** shows 1 decimal place for values < 10K

#### Scenario: Abbreviate billions with B suffix

- **GIVEN** a C-Bill amount >= 1,000,000,000
- **WHEN** using abbreviated formatting
- **THEN** divides by 1,000,000,000
- **AND** appends "B C-Bills" suffix
- **AND** shows 1 decimal place for values < 10B

#### Scenario: Remove trailing .0 from abbreviated values

- **GIVEN** an abbreviated C-Bill value with .0 decimal
- **WHEN** formatting
- **THEN** trailing ".0" is removed
- **AND** displays as whole number with suffix

### Requirement: Duration Formatting

The system SHALL format time durations from milliseconds to human-readable strings.

**Rationale**: Game sessions, turn timers, and simulation durations need clear time display.

**Priority**: Medium

#### Scenario: Format hours and minutes

- **GIVEN** a duration >= 1 hour
- **WHEN** formatting
- **THEN** displays as "{hours}h {minutes}m"
- **AND** minutes are modulo 60

#### Scenario: Format minutes and seconds

- **GIVEN** a duration >= 1 minute and < 1 hour
- **WHEN** formatting
- **THEN** displays as "{minutes}m {seconds}s"
- **AND** seconds are modulo 60

#### Scenario: Format seconds only

- **GIVEN** a duration < 1 minute
- **WHEN** formatting
- **THEN** displays as "{seconds}s"

#### Scenario: Handle sub-second durations

- **GIVEN** a duration < 1 second
- **WHEN** formatting
- **THEN** displays as "0s"
- **AND** milliseconds are floored to seconds

### Requirement: Percentage Formatting

The system SHALL format fractional values as percentages with configurable decimal precision.

**Rationale**: Armor coverage, hit probabilities, and efficiency metrics display as percentages.

**Priority**: Medium

#### Scenario: Format with default 1 decimal place

- **GIVEN** a fractional value (0.0 to 1.0)
- **WHEN** formatting without precision parameter
- **THEN** multiplies by 100
- **AND** displays with 1 decimal place
- **AND** appends "%" suffix

#### Scenario: Format with custom decimal precision

- **GIVEN** a fractional value and decimal precision parameter
- **WHEN** formatting
- **THEN** multiplies by 100
- **AND** displays with specified decimal places
- **AND** appends "%" suffix

#### Scenario: Round percentage values correctly

- **GIVEN** a fractional value requiring rounding
- **WHEN** formatting with precision
- **THEN** uses standard rounding (0.5 rounds up)
- **AND** displays rounded result

### Requirement: Battle Value Formatting

The system SHALL format Battle Value (BV) with thousands separators and "BV" suffix.

**Rationale**: Battle Value is a core game metric for unit comparison and balancing.

**Priority**: High

#### Scenario: Format Battle Value with separators

- **GIVEN** a Battle Value number
- **WHEN** formatting
- **THEN** applies thousands separators
- **AND** appends " BV" suffix

### Requirement: Weight Formatting

The system SHALL format tonnage values with proper precision and pluralization.

**Rationale**: BattleMech weight is measured in tons with half-ton precision.

**Priority**: High

#### Scenario: Format whole ton values

- **GIVEN** an integer tonnage value
- **WHEN** formatting
- **THEN** displays without decimal places
- **AND** appends " tons" (plural)

#### Scenario: Format fractional ton values

- **GIVEN** a fractional tonnage value
- **WHEN** formatting
- **THEN** displays with 1 decimal place (default precision)
- **AND** appends " tons"

#### Scenario: Handle singular ton

- **GIVEN** a tonnage value of exactly 1
- **WHEN** formatting
- **THEN** appends " ton" (singular)

#### Scenario: Respect custom precision

- **GIVEN** a tonnage value and precision parameter
- **WHEN** formatting
- **THEN** displays with specified decimal places
- **AND** removes unnecessary trailing zeros

### Requirement: Armor Points Formatting

The system SHALL format armor point values with optional maximum display.

**Rationale**: Armor displays as current/max points for damage tracking.

**Priority**: Medium

#### Scenario: Format armor points only

- **GIVEN** an armor point value
- **WHEN** formatting without maximum
- **THEN** displays as "{points} pts"

#### Scenario: Format armor points with maximum

- **GIVEN** current and maximum armor point values
- **WHEN** formatting
- **THEN** displays as "{current}/{max} pts"

### Requirement: Heat Formatting

The system SHALL format heat values with appropriate sign indicators.

**Rationale**: Heat generation/dissipation uses +/- notation for clarity.

**Priority**: Medium

#### Scenario: Format positive heat with plus sign

- **GIVEN** a positive heat value
- **WHEN** formatting
- **THEN** prepends "+" sign
- **AND** appends " heat" suffix

#### Scenario: Format negative heat with minus sign

- **GIVEN** a negative heat value
- **WHEN** formatting
- **THEN** includes "-" sign
- **AND** appends " heat" suffix

#### Scenario: Format zero heat without sign

- **GIVEN** a heat value of 0
- **WHEN** formatting
- **THEN** displays as "0 heat"
- **AND** no sign prefix

### Requirement: Damage Formatting

The system SHALL format damage values with "dmg" suffix.

**Rationale**: Weapon damage displays consistently across UI.

**Priority**: Medium

#### Scenario: Format damage value

- **GIVEN** a damage number
- **WHEN** formatting
- **THEN** displays as "{damage} dmg"

### Requirement: Range Formatting

The system SHALL format weapon range as short/medium/long triplet.

**Rationale**: BattleTech weapons have three range brackets.

**Priority**: Medium

#### Scenario: Format range brackets

- **GIVEN** short, medium, and long range values
- **WHEN** formatting
- **THEN** displays as "{short}/{medium}/{long}"
- **AND** uses "/" separator

### Requirement: Movement Formatting

The system SHALL format movement points as walk/run or walk/run/jump.

**Rationale**: BattleMech movement displays as MP values.

**Priority**: Medium

#### Scenario: Format walk/run movement

- **GIVEN** walk and run MP values
- **WHEN** formatting without jump
- **THEN** displays as "{walk}/{run}"

#### Scenario: Format walk/run/jump movement

- **GIVEN** walk, run, and jump MP values
- **WHEN** formatting with jump > 0
- **THEN** displays as "{walk}/{run}/{jump}"

#### Scenario: Calculate run MP if not provided

- **GIVEN** walk MP only
- **WHEN** formatting
- **THEN** calculates run as ceil(walk × 1.5)
- **AND** displays as "{walk}/{calculated_run}"

#### Scenario: Omit jump if zero

- **GIVEN** walk, run, and jump MP where jump = 0
- **WHEN** formatting
- **THEN** displays as "{walk}/{run}"
- **AND** omits jump value

---

## Data Model Requirements

### Required Functions

The implementation MUST provide the following TypeScript functions:

```typescript
/**
 * Format currency value in C-Bills with thousands separators.
 * @param amount - Amount in C-Bills
 * @returns Formatted string with commas and C-Bills unit
 * @example formatCurrency(1234567) // "$1,234,567 C-Bills"
 */
function formatCurrency(amount: number): string;

/**
 * Format duration in milliseconds to human-readable string.
 * @param milliseconds - Duration in milliseconds
 * @returns Formatted string (e.g., "2h 30m", "45s", "2m 30s")
 * @example formatDuration(150000) // "2m 30s"
 */
function formatDuration(milliseconds: number): string;

/**
 * Format percentage value as a string with specified decimal places.
 * @param value - Value between 0 and 1 (e.g., 0.755 for 75.5%)
 * @param decimals - Number of decimal places to display (default: 1)
 * @returns Formatted percentage string
 * @example formatPercentage(0.755) // "75.5%"
 */
function formatPercentage(value: number, decimals?: number): string;

/**
 * Format Battle Value (BV) with thousands separator
 * @param bv - Battle Value to format
 * @returns Formatted BV string (e.g., "1,234 BV")
 * @example formatBV(1234) // "1,234 BV"
 */
function formatBV(bv: number): string;

/**
 * Format weight in tons
 * @param tons - Weight in tons
 * @param precision - Decimal places (default 1 for half-ton precision)
 * @returns Formatted weight string (e.g., "75 tons", "35.5 tons")
 * @example formatWeight(75) // "75 tons"
 */
function formatWeight(tons: number, precision?: number): string;

/**
 * Format cost in C-Bills with appropriate suffix (K, M, B)
 * @param cbills - Cost in C-Bills
 * @returns Formatted cost string (e.g., "1.5M C-Bills")
 * @example formatCost(1500000) // "1.5M C-Bills"
 */
function formatCost(cbills: number): string;

/**
 * Format cost in C-Bills with full number (no abbreviation)
 * @param cbills - Cost in C-Bills
 * @returns Formatted cost string (e.g., "1,500,000 C-Bills")
 * @example formatCostFull(1500000) // "1,500,000 C-Bills"
 */
function formatCostFull(cbills: number): string;

/**
 * Format armor points
 * @param points - Number of armor points
 * @param maxPoints - Optional maximum points for display as fraction
 * @returns Formatted armor string (e.g., "45 pts", "45/50 pts")
 * @example formatArmorPoints(45, 50) // "45/50 pts"
 */
function formatArmorPoints(points: number, maxPoints?: number): string;

/**
 * Format heat value
 * @param heat - Heat value
 * @returns Formatted heat string (e.g., "+5 heat", "-3 heat")
 * @example formatHeat(5) // "+5 heat"
 */
function formatHeat(heat: number): string;

/**
 * Format damage value
 * @param damage - Damage value
 * @returns Formatted damage string (e.g., "10 dmg")
 * @example formatDamage(10) // "10 dmg"
 */
function formatDamage(damage: number): string;

/**
 * Format range in hexes
 * @param short - Short range in hexes
 * @param medium - Medium range in hexes
 * @param long - Long range in hexes
 * @returns Formatted range string (e.g., "3/6/9")
 * @example formatRange(3, 6, 9) // "3/6/9"
 */
function formatRange(short: number, medium: number, long: number): string;

/**
 * Format movement points
 * @param walk - Walking MP
 * @param run - Running MP (optional, calculated as walk * 1.5 if not provided)
 * @param jump - Jump MP (optional)
 * @returns Formatted movement string (e.g., "4/6", "4/6/4")
 * @example formatMovement(4, 6, 4) // "4/6/4"
 */
function formatMovement(walk: number, run?: number, jump?: number): string;
```

### Function Constraints

- All formatting functions MUST accept numeric inputs
- All formatting functions MUST return string outputs
- Functions MUST handle edge cases (0, negative, very large values)
- Functions MUST use en-US locale for thousands separators
- Functions MUST NOT throw errors for valid numeric inputs
- Optional parameters MUST have sensible defaults

---

## Formatting Rules

### Locale Settings

**Rule**: All number formatting MUST use `toLocaleString('en-US')` for consistency.

**Rationale**: Ensures comma thousands separators and period decimal separators.

### Decimal Precision

**Rule**: Fractional values MUST display with appropriate precision:

- Tonnage: 1 decimal place (half-ton precision)
- Percentages: 1 decimal place (default), configurable
- C-Bill abbreviations: 1 decimal place for values < 10 (K/M/B), 0 for >= 10

**Rationale**: Balances readability with precision requirements.

### Pluralization

**Rule**: Unit suffixes MUST use singular form for value = 1, plural otherwise:

- 1 ton / 2 tons
- 1 pt / 2 pts

**Rationale**: Grammatically correct English.

### Sign Display

**Rule**: Heat values MUST show explicit sign for positive values, implicit for negative:

- Positive: "+5 heat"
- Negative: "-3 heat"
- Zero: "0 heat"

**Rationale**: Clarifies heat generation vs dissipation.

### Abbreviation Thresholds

**Rule**: C-Bill abbreviations MUST use:

- B suffix: >= 1,000,000,000
- M suffix: >= 1,000,000
- K suffix: >= 1,000
- Full number: < 1,000

**Rationale**: Standard SI prefix conventions.

---

## Implementation Notes

### Performance Considerations

- `toLocaleString()` is performant for display formatting
- Avoid formatting in tight loops; cache formatted values when possible
- Formatting functions are pure (no side effects)

### Edge Cases

- **NaN/Infinity**: Implementations SHOULD validate inputs before formatting
- **Very large numbers**: `toLocaleString()` handles arbitrarily large numbers
- **Negative values**: All formatters handle negative inputs gracefully
- **Fractional milliseconds**: Duration formatter floors to whole seconds

### Common Pitfalls

- **Forgetting locale parameter**: Always use `toLocaleString('en-US')`
- **Incorrect pluralization**: Check for exactly 1, not truthy/falsy
- **Trailing .0 removal**: Use regex `/\.0$/` for abbreviated C-Bills
- **Run MP calculation**: Use `Math.ceil(walk * 1.5)` not `Math.floor`

---

## Examples

### Currency Formatting

```typescript
formatCurrency(1234567); // "$1,234,567 C-Bills"
formatCurrency(100); // "$100 C-Bills"
formatCurrency(0); // "$0 C-Bills"
formatCurrency(-1000); // "$-1,000 C-Bills"

formatCost(1500000); // "1.5M C-Bills"
formatCost(750000); // "750K C-Bills"
formatCost(500); // "500 C-Bills"
formatCost(1500000000); // "1.5B C-Bills"
formatCost(10000000); // "10M C-Bills" (no decimal)

formatCostFull(1500000); // "1,500,000 C-Bills"
```

### Duration Formatting

```typescript
formatDuration(9000000); // "2h 30m"
formatDuration(150000); // "2m 30s"
formatDuration(45000); // "45s"
formatDuration(0); // "0s"
formatDuration(500); // "0s" (sub-second)
formatDuration(3600000); // "1h 0m"
```

### Percentage Formatting

```typescript
formatPercentage(0.755); // "75.5%"
formatPercentage(0.75534, 2); // "75.53%"
formatPercentage(0, 1); // "0.0%"
formatPercentage(1); // "100.0%"
formatPercentage(0.755, 0); // "76%" (rounded)
```

### Game Value Formatting

```typescript
formatBV(1234); // "1,234 BV"
formatBV(0); // "0 BV"

formatWeight(75); // "75 tons"
formatWeight(35.5); // "35.5 tons"
formatWeight(1); // "1 ton"
formatWeight(35.567, 2); // "35.57 tons"

formatArmorPoints(45); // "45 pts"
formatArmorPoints(45, 50); // "45/50 pts"

formatHeat(5); // "+5 heat"
formatHeat(-3); // "-3 heat"
formatHeat(0); // "0 heat"

formatDamage(10); // "10 dmg"

formatRange(3, 6, 9); // "3/6/9"

formatMovement(4, 6); // "4/6"
formatMovement(4, 6, 4); // "4/6/4"
formatMovement(4); // "4/6" (run calculated)
formatMovement(4, 6, 0); // "4/6" (jump omitted)
```

---

## References

### Official Rules

- BattleTech: Total Warfare (currency, tonnage, movement notation)
- BattleTech: TechManual (Battle Value, heat, damage)

### Related Specifications

- None (foundational utility)

### Implementation Files

- `src/utils/simulation-viewer/formatting.ts` - Currency, duration, percentage
- `src/utils/formatting/gameValueFormatters.ts` - Game-specific values

---

## Changelog

### Version 1.0 (2026-02-13)

- Initial specification
- Defined 12 formatting functions
- Documented locale, precision, pluralization, and abbreviation rules
- Comprehensive examples and edge cases
