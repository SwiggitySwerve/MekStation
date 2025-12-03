## MODIFIED Requirements

### Requirement: Variable Equipment Formula Registry

The system SHALL maintain a registry of formulas for variable equipment (equipment whose weight, slots, cost, or damage depends on mech configuration).

**Rationale**: Centralizes all variable equipment calculations in one data-driven location.

**Priority**: Critical

#### Scenario: Formula lookup
- **GIVEN** a variable equipment ID like "masc-is" or "targeting-computer-clan"
- **WHEN** FormulaRegistry.getFormulas(equipmentId) is called
- **THEN** return the IVariableFormulas containing weight, criticalSlots, cost, and optional damage formulas

#### Scenario: Formula source
- **GIVEN** variable equipment formulas are defined in `variableEquipmentFormulas.ts`
- **WHEN** the registry initializes
- **THEN** all standard formulas SHALL be available via `VARIABLE_EQUIPMENT_FORMULAS`
- **AND** custom formulas from IndexedDB SHALL override standard formulas

