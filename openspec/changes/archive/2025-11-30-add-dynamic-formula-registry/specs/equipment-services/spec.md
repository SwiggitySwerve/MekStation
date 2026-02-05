# Equipment Services Spec Delta

## ADDED Requirements

### Requirement: Formula Type System

The system SHALL define a structured formula type system for variable equipment calculations.

**Rationale**: Data-driven formulas enable extensibility without code changes.

**Priority**: Critical

#### Scenario: Define formula types

- **WHEN** defining a variable equipment formula
- **THEN** formula type MUST be one of: FIXED, CEIL_DIVIDE, FLOOR_DIVIDE, MULTIPLY, MULTIPLY_ROUND, EQUALS_WEIGHT, EQUALS_FIELD, MIN, MAX
- **AND** each type has specific required fields

#### Scenario: MIN combinator

- **GIVEN** a formula with type MIN and formulas array
- **WHEN** evaluating the formula
- **THEN** return the minimum value of all sub-formula evaluations

#### Scenario: MAX combinator

- **GIVEN** a formula with type MAX and formulas array
- **WHEN** evaluating the formula
- **THEN** return the maximum value of all sub-formula evaluations

---

### Requirement: Formula Evaluator

The system SHALL provide a generic formula evaluator that interprets formula definitions.

**Rationale**: Single evaluation engine for all variable equipment.

**Priority**: Critical

#### Scenario: Evaluate CEIL_DIVIDE formula

- **GIVEN** a formula { type: 'CEIL_DIVIDE', field: 'directFireWeaponTonnage', divisor: 4 }
- **AND** context { directFireWeaponTonnage: 10 }
- **WHEN** FormulaEvaluator.evaluate(formula, context) is called
- **THEN** return ceil(10 / 4) = 3

#### Scenario: Evaluate MULTIPLY_ROUND formula

- **GIVEN** a formula { type: 'MULTIPLY_ROUND', field: 'tonnage', multiplier: 0.05, roundTo: 0.5 }
- **AND** context { tonnage: 75 }
- **WHEN** FormulaEvaluator.evaluate(formula, context) is called
- **THEN** return 4.0 (75 × 0.05 = 3.75, rounded up to nearest 0.5)

#### Scenario: Evaluate nested MIN formula

- **GIVEN** a formula { type: 'MIN', formulas: [{ type: 'FIXED', value: 10 }, { type: 'CEIL_DIVIDE', field: 'rating', divisor: 25 }] }
- **AND** context { rating: 300 }
- **WHEN** evaluating the formula
- **THEN** return min(10, ceil(300/25)) = min(10, 12) = 10

#### Scenario: Missing context field

- **GIVEN** a formula referencing field 'engineRating'
- **AND** context without engineRating
- **WHEN** evaluating the formula
- **THEN** throw ValidationError with message indicating missing field

---

### Requirement: Formula Registry

The system SHALL provide a layered formula registry supporting both builtin and custom formulas.

**Rationale**: Builtin formulas are versioned with code; custom formulas support user-defined equipment.

**Priority**: Critical

#### Scenario: Get builtin formulas

- **GIVEN** builtin formulas are defined for "targeting-computer-is"
- **WHEN** FormulaRegistry.getFormulas("targeting-computer-is") is called
- **THEN** return the builtin formula definitions

#### Scenario: Custom overrides builtin

- **GIVEN** builtin formulas exist for "targeting-computer-is"
- **AND** custom formulas are registered for "targeting-computer-is"
- **WHEN** FormulaRegistry.getFormulas("targeting-computer-is") is called
- **THEN** return the custom formula definitions (not builtin)

#### Scenario: Get custom-only formulas

- **GIVEN** custom formulas are registered for "custom-equipment-123"
- **AND** no builtin formulas exist for that ID
- **WHEN** FormulaRegistry.getFormulas("custom-equipment-123") is called
- **THEN** return the custom formula definitions

#### Scenario: No formulas exist

- **GIVEN** no builtin or custom formulas for "unknown-equipment"
- **WHEN** FormulaRegistry.getFormulas("unknown-equipment") is called
- **THEN** return undefined

---

### Requirement: Custom Formula Registration

The system SHALL allow runtime registration of custom equipment formulas.

**Rationale**: Users can define variable formulas for custom equipment.

**Priority**: High

#### Scenario: Register custom formulas

- **GIVEN** a new custom equipment "my-custom-tc"
- **WHEN** FormulaRegistry.registerCustomFormulas("my-custom-tc", formulas) is called
- **THEN** formulas are stored in memory
- **AND** formulas are persisted to IndexedDB

#### Scenario: Update custom formulas

- **GIVEN** custom formulas exist for "my-custom-tc"
- **WHEN** registerCustomFormulas("my-custom-tc", newFormulas) is called
- **THEN** replace existing formulas with new formulas

#### Scenario: Unregister custom formulas

- **GIVEN** custom formulas exist for "my-custom-tc"
- **WHEN** FormulaRegistry.unregisterCustomFormulas("my-custom-tc") is called
- **THEN** formulas are removed from memory
- **AND** formulas are removed from IndexedDB

---

### Requirement: Custom Formula Persistence

The system SHALL persist custom formulas in IndexedDB across sessions.

**Rationale**: User-defined formulas must survive page refresh.

**Priority**: High

#### Scenario: Load custom formulas on initialization

- **GIVEN** custom formulas were previously saved to IndexedDB
- **WHEN** FormulaRegistry.initialize() is called
- **THEN** load all custom formulas into memory

#### Scenario: Persist on registration

- **GIVEN** FormulaRegistry is initialized
- **WHEN** registerCustomFormulas is called
- **THEN** save formulas to IndexedDB 'custom-formulas' store

---

### Requirement: Builtin Variable Equipment Formulas

The system SHALL define data-driven formulas for all standard variable equipment.

**Rationale**: Replaces hardcoded calculation methods with declarative definitions.

**Priority**: Critical

#### Scenario: Targeting Computer IS formula

- **GIVEN** builtin formulas include "targeting-computer-is"
- **THEN** weight formula = CEIL_DIVIDE(directFireWeaponTonnage, 4)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 10000)
- **AND** requiredContext = ["directFireWeaponTonnage"]

#### Scenario: Targeting Computer Clan formula

- **GIVEN** builtin formulas include "targeting-computer-clan"
- **THEN** weight formula = CEIL_DIVIDE(directFireWeaponTonnage, 5)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(weight, 10000)

#### Scenario: MASC IS formula

- **GIVEN** builtin formulas include "masc-is"
- **THEN** weight formula = CEIL_DIVIDE(engineRating, 20)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(tonnage, 1000)
- **AND** requiredContext = ["engineRating", "tonnage"]

#### Scenario: MASC Clan formula

- **GIVEN** builtin formulas include "masc-clan"
- **THEN** weight formula = CEIL_DIVIDE(engineRating, 25)
- **AND** slots formula = EQUALS_WEIGHT
- **AND** cost formula = MULTIPLY(tonnage, 1000)

#### Scenario: Supercharger formula

- **GIVEN** builtin formulas include "supercharger"
- **THEN** weight formula = MULTIPLY_ROUND(engineWeight, 0.1, roundTo: 0.5)
- **AND** slots formula = FIXED(1)
- **AND** cost formula = MULTIPLY(engineWeight, 10000)
- **AND** requiredContext = ["engineWeight"]

#### Scenario: Partial Wing formula

- **GIVEN** builtin formulas include "partial-wing"
- **THEN** weight formula = MULTIPLY_ROUND(tonnage, 0.05, roundTo: 0.5)
- **AND** slots formula = FIXED(6)
- **AND** cost formula = MULTIPLY(weight, 50000)
- **AND** requiredContext = ["tonnage"]

#### Scenario: TSM formula

- **GIVEN** builtin formulas include "tsm"
- **THEN** weight formula = FIXED(0)
- **AND** slots formula = FIXED(6)
- **AND** cost formula = MULTIPLY(tonnage, 16000)
- **AND** requiredContext = ["tonnage"]

---

## MODIFIED Requirements

### Requirement: Variable Equipment Property Calculation

The system SHALL calculate properties for equipment whose values depend on mech context, using the formula registry and evaluator.

**Rationale**: Data-driven calculation replaces hardcoded switch statements.

**Priority**: Critical

#### Scenario: Calculate Targeting Computer weight

- **GIVEN** a mech with 10 tons of direct-fire weapons
- **WHEN** calculateProperties("targeting-computer-is", context) is called
- **THEN** look up formulas in registry
- **AND** evaluate weight formula: ceil(10 / 4) = 3 tons
- **AND** evaluate slots formula: EQUALS_WEIGHT = 3
- **AND** evaluate cost formula: 3 × 10000 = 30000
- **AND** return { weight: 3, criticalSlots: 3, cost: 30000 }

#### Scenario: Calculate MASC weight

- **GIVEN** a mech with engine rating 300 and 75 tons
- **WHEN** calculateProperties("masc-is", { engineRating: 300, tonnage: 75 }) is called
- **THEN** look up formulas in registry
- **AND** evaluate weight formula: ceil(300 / 20) = 15 tons
- **AND** return weight = 15, criticalSlots = 15

#### Scenario: Calculate custom equipment

- **GIVEN** custom formulas registered for "my-custom-equipment"
- **WHEN** calculateProperties("my-custom-equipment", context) is called
- **THEN** use custom formulas from registry
- **AND** return calculated properties

#### Scenario: Unknown equipment

- **GIVEN** no formulas exist for "unknown-equipment"
- **WHEN** calculateProperties("unknown-equipment", context) is called
- **THEN** throw ValidationError "Unknown variable equipment: unknown-equipment"

---

### Requirement: Check Variable Equipment

The system SHALL identify whether equipment has variable properties by checking registry presence.

**Rationale**: Derived from registry rather than hardcoded list.

**Priority**: Medium

#### Scenario: Builtin variable equipment

- **WHEN** isVariable("targeting-computer-is") is called
- **THEN** return true (formulas exist in registry)

#### Scenario: Custom variable equipment

- **GIVEN** custom formulas registered for "my-custom-tc"
- **WHEN** isVariable("my-custom-tc") is called
- **THEN** return true

#### Scenario: Non-variable equipment

- **WHEN** isVariable("weapon-medium-laser-is") is called
- **THEN** return false (no formulas in registry)

---

### Requirement: Get Required Context

The system SHALL report what context fields are needed for variable equipment, extracted from formula definitions.

**Rationale**: Required context defined alongside formulas, not separately.

**Priority**: Medium

#### Scenario: Targeting Computer context

- **WHEN** getRequiredContext("targeting-computer-is") is called
- **THEN** return formulas.requiredContext = ["directFireWeaponTonnage"]

#### Scenario: MASC context

- **WHEN** getRequiredContext("masc-is") is called
- **THEN** return formulas.requiredContext = ["engineRating", "tonnage"]

#### Scenario: Unknown equipment

- **WHEN** getRequiredContext("unknown-equipment") is called
- **THEN** return empty array []

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Formula operation types
 */
type FormulaType =
  | 'FIXED' // Constant value
  | 'CEIL_DIVIDE' // ceil(field / divisor)
  | 'FLOOR_DIVIDE' // floor(field / divisor)
  | 'MULTIPLY' // field × multiplier
  | 'MULTIPLY_ROUND' // field × multiplier, rounded to precision
  | 'EQUALS_WEIGHT' // = calculated weight (for slots that equal weight)
  | 'EQUALS_FIELD' // = context field directly
  | 'MIN' // minimum of sub-formulas
  | 'MAX'; // maximum of sub-formulas

/**
 * Formula definition
 */
interface IFormula {
  readonly type: FormulaType;
  readonly field?: string; // Context field name
  readonly value?: number; // For FIXED type
  readonly divisor?: number; // For CEIL_DIVIDE, FLOOR_DIVIDE
  readonly multiplier?: number; // For MULTIPLY variants
  readonly roundTo?: number; // Rounding precision (0.5, 1, etc.)
  readonly formulas?: IFormula[]; // For MIN/MAX combinators
}

/**
 * Complete variable equipment formulas
 */
interface IVariableFormulas {
  readonly weight: IFormula;
  readonly criticalSlots: IFormula;
  readonly cost: IFormula;
  readonly requiredContext: readonly string[];
}

/**
 * Formula evaluator interface
 */
interface IFormulaEvaluator {
  evaluate(formula: IFormula, context: Record<string, number>): number;
  validateContext(formula: IFormula, context: Record<string, number>): string[];
}

/**
 * Formula registry interface
 */
interface IFormulaRegistry {
  initialize(): Promise<void>;
  getFormulas(equipmentId: string): IVariableFormulas | undefined;
  isVariable(equipmentId: string): boolean;
  getRequiredContext(equipmentId: string): readonly string[];
  registerCustomFormulas(
    equipmentId: string,
    formulas: IVariableFormulas,
  ): Promise<void>;
  unregisterCustomFormulas(equipmentId: string): Promise<void>;
}

/**
 * Stored custom formula (IndexedDB)
 */
interface IStoredFormula {
  readonly equipmentId: string;
  readonly formulas: IVariableFormulas;
  readonly createdAt: number;
  readonly modifiedAt: number;
}
```

---

## Implementation Notes

### Performance Considerations

- Use Map for O(1) formula lookups
- Cache evaluated results for repeated calculations with same context
- Lazy load custom formulas only when needed

### Edge Cases

- Empty formulas array for MIN/MAX returns 0
- EQUALS_WEIGHT before weight calculated throws error
- Circular formula references should be detected and rejected

### Validation Rules

- All formulas must have valid type
- CEIL_DIVIDE/FLOOR_DIVIDE must have divisor > 0
- MULTIPLY variants must have defined multiplier
- MIN/MAX must have at least one sub-formula
- Required context fields must be non-empty strings

---

## References

### Related Specs

- `equipment-database/spec.md` - Equipment definitions
- `persistence-services/spec.md` - IndexedDB storage

### Related Code

- `src/services/equipment/EquipmentCalculatorService.ts`
- `src/types/equipment/VariableEquipment.ts`
