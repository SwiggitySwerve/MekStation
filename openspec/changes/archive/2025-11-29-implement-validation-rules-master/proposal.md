# Change: Implement Validation Rules Master

## Why

All BattleTech construction rules must be enforced through a unified validation system. The validation-rules-master provides the central registry and orchestration of all validation rules from all phases.

## What Changes

- **ADDED** Validation Rules Master - Centralized validation rule registry
- **ADDED** Validation Orchestrator - Coordinated validation execution
- **ADDED** Error Reporting - Structured validation error reporting
- **ADDED** Rule Categories - Weight, slots, tech base, era, construction sequence

## Impact

- **Affected specs**: All construction and equipment specs
- **Affected code**:
  - `src/services/validation/` - Validation service layer
  - `src/services/ConstructionRulesValidator.ts` - Main validator
  - `constants/BattleTechConstructionRules.ts` - Rule constants

## Dependencies

- All previous phases (1-5)

## Related Specifications

- `openspec/specs/validation-rules-master/spec.md`
