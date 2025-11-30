# Change: Add Dynamic Formula Registry for Variable Equipment

## Why

The current EquipmentCalculatorService has hardcoded equipment IDs, switch statements, and individual calculation methods. This creates several problems:

1. **Not extensible**: Adding new variable equipment requires code changes
2. **No custom equipment support**: Users cannot define their own variable equipment formulas
3. **Tight coupling**: Equipment IDs are magic strings scattered across the codebase
4. **Maintenance burden**: Formula changes require code deployments

We need a data-driven approach where:
- Variable equipment is discovered from formula definitions, not hardcoded
- Built-in formulas are centrally defined as data, not code
- Custom equipment formulas can be stored at runtime (IndexedDB)
- A generic formula evaluator handles all calculations

## What Changes

- **ADDED** Formula type system with support for arithmetic operations and MIN/MAX combinators
- **ADDED** FormulaEvaluator service for generic formula evaluation
- **ADDED** FormulaRegistry with layered architecture (builtin + custom)
- **ADDED** Custom formula persistence in IndexedDB
- **MODIFIED** Variable Equipment Property Calculation - now uses registry instead of hardcoded logic
- **MODIFIED** Check Variable Equipment - derived from registry presence
- **MODIFIED** Get Required Context - extracted from formula definitions

## Impact

- **Affected specs**: equipment-services
- **Affected code**:
  - `src/types/equipment/VariableEquipment.ts` - New formula type definitions
  - `src/services/equipment/FormulaEvaluator.ts` - New generic evaluator
  - `src/services/equipment/FormulaRegistry.ts` - New registry service
  - `src/services/equipment/EquipmentCalculatorService.ts` - Refactored to use registry
  - `src/services/persistence/IndexedDBService.ts` - New store for custom formulas

## Architecture Decision

**Decision**: Use a unified formula registry with runtime layer

**Rationale**:
- Standard equipment formulas defined in code (type-safe, versioned)
- Custom equipment formulas stored in IndexedDB (user-defined, exportable)
- Custom formulas can override builtin (for variants)
- `isVariable()` derived from registry presence (no sync issues)
- Formula bug fixes apply to all builtin equipment automatically

**Alternatives Considered**:
- Option A (formulas embedded in equipment): Rejected - bloats saves, versioning nightmare
- Option B (separate static registry): Rejected - no support for custom equipment
- Option C (IVariableEquipment type): Rejected - type rigidity, collection confusion
- Option D (hybrid marker + registry): Rejected - redundant, same sync issues

