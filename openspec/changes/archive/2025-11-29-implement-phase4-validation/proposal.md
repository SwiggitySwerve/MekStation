# Change: Implement Phase 4 Validation & Calculations

## Why

BattleMech construction requires validation of heat management, battle value calculation, tech ratings, damage systems, and critical hit mechanics. Phase 4 implements these calculation and validation systems.

## What Changes

- **ADDED** Battle Value System - BV1 and BV2 calculation formulas
- **ADDED** Heat Management System - Heat generation, dissipation, and tracking
- **ADDED** Tech Rating System - Technology complexity rating (A-F)
- **ADDED** Damage System - Damage calculation and resolution
- **ADDED** Critical Hit System - Critical hit tables and effects

## Impact

- **Affected specs**: Phase 5 data models, UI components
- **Affected code**:
  - `src/services/validation/` - Validation services
  - `src/services/calculation/` - Calculation services
  - `src/utils/battleValue/` - BV calculation utilities
  - `src/utils/heat/` - Heat management utilities

## Dependencies

- Phase 1 Foundation (Core Types)
- Phase 2 Construction (Components)
- Phase 3 Equipment (Weapons, Heat)

## Related Specifications

- `openspec/specs/phase-4-validation-calculations/battle-value-system/spec.md`
- `openspec/specs/phase-4-validation-calculations/heat-management-system/spec.md`
- `openspec/specs/phase-4-validation-calculations/tech-rating-system/spec.md`
- `openspec/specs/phase-4-validation-calculations/damage-system/spec.md`
- `openspec/specs/phase-4-validation-calculations/critical-hit-system/spec.md`
