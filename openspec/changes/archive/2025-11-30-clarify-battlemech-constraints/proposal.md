# Clarify BattleMech Construction Constraints

## Summary

Update `engine-system` and `construction-rules-core` specs to clarify BattleMech-specific constraints that differ from other unit types (vehicles, spacecraft).

## Rationale

The current `engine-system` spec states engine ratings must be between 10-500, but this is misleading for BattleMech construction:

1. **Impracticality for 'Mechs**: A 500-rated engine weighs so much that even a 100-ton 'Mech could only achieve 5 Walk MP, which while technically valid, makes no practical sense for construction.

2. **Intended Use**: Engines rated above 400 are primarily intended for non-'Mech units such as massive ground vehicles, mobile structures, or spacecraft where the immense weight is a smaller fraction of total mass.

3. **Standard BattleMech Limit**: For standard BattleMechs (20-100 tons), the practical engine rating maximum is **400** (100 tons × 4 Walk MP).

## Changes

### engine-system Spec

- MODIFY Requirement "Engine Rating System" to clarify BattleMech context
- ADD scenario for BattleMech-specific validation (10-400 for standard 'Mechs)
- ADD note that 400+ ratings exist for other unit types

### construction-rules-core Spec

- ADD Requirement "BattleMech Tonnage Classes" with standard/ultralight/superheavy ranges
- ADD Requirement "Engine Rating by Unit Type" referencing unit-specific limits
- MODIFY existing requirements to reference BattleMech context where applicable

## Impact

- **ValidationService**: Update engine rating validation from 400 max to match spec
- **CalculationService**: No changes needed (uses formulas, not limits)
- **Tests**: Update test cases that assume 500 max rating

## References

- TechManual pp. 46-51 (Engine construction)
- BattleMech Manual (tonnage classes)
