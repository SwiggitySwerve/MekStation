# Change: Add Comprehensive Unit Validation Framework

## Why

The current validation system (`validation-rules-master`) is BattleMech-specific with 89 rules covering mech construction. MekStation supports 16 unit types (BattleMechs, OmniMechs, Vehicles, VTOLs, Aerospace, Infantry, Battle Armor, etc.), but lacks a unified validation framework that:

1. Defines common validation rules applicable to ALL unit types
2. Provides unit-type-specific validation layers that extend the base
3. Establishes a clear inheritance hierarchy for validation rules
4. Enables future unit type support without rewriting validation logic

## What Changes

- **ADDED** Unit Validation Framework - Hierarchical validation architecture
  - Base validation layer (applies to all 16 unit types)
  - Category validation layers (Mechs, Vehicles, Aerospace, Infantry)
  - Unit-type-specific validation layers (BattleMech, OmniMech, Vehicle, VTOL, etc.)
- **ADDED** Universal Validation Rules - Rules that apply to every unit
  - Entity identity validation (id, name required)
  - Tech base validation (IS/Clan/Mixed compatibility)
  - Era availability validation (introduction/extinction years)
  - Rules level validation (Introductory/Standard/Advanced/Experimental)
  - Weight validation (tonnage constraints per unit type)
  - Cost/BV validation (non-negative values)
- **ADDED** Validation Rule Inheritance - Rules can be inherited, overridden, or extended
- **ADDED** Unit Type Registry - Maps unit types to their validation rule sets
- **MODIFIED** Validation Rules Master - Refactored as BattleMech-specific extension of base framework

## Impact

- **Affected specs**:
  - `validation-rules-master` - Becomes BattleMech-specific extension
  - `validation-patterns` - Extended with unit type awareness
  - `core-entity-types` - Referenced for base entity validation
  - `core-enumerations` - UnitType enum drives rule selection

- **Affected code**:
  - `src/services/construction/ValidationService.ts` - Refactored to use framework
  - `src/utils/validation/rules/ValidationRuleRegistry.ts` - Extended for unit types
  - `src/utils/validation/rules/ValidationOrchestrator.ts` - Unit-type-aware execution
  - `src/types/validation/rules/ValidationRuleInterfaces.ts` - New interfaces
  - NEW: `src/services/validation/UnitValidationFramework.ts`
  - NEW: `src/services/validation/validators/` - Per-unit-type validators

## Dependencies

- `core-entity-types` - IEntity, ITechBaseEntity, ITemporalEntity interfaces
- `core-enumerations` - UnitType, TechBase, RulesLevel, Era enums
- `validation-patterns` - Base validation result interfaces
- `validation-rules-master` - Existing BattleMech rules (to be refactored)

## Related Specifications

- `openspec/specs/unit-validation-framework/spec.md` (NEW)
- `openspec/specs/validation-rules-master/spec.md` (MODIFIED)
- `openspec/specs/validation-patterns/spec.md` (MODIFIED)
