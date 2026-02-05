# Change: Add Missing Test Coverage and Validation Rules

## Why

An audit of January 2026 archived openspecs revealed that several features were archived without completing their test coverage tasks. Additionally, aerospace validation rules were specified but never implemented. This creates:

1. **Risk**: Untested code paths may have bugs that go undetected
2. **Regression risk**: Future changes may break functionality without test coverage
3. **Incomplete features**: Aerospace units lack proper validation

## What Changes

### Missing Tests (Add)

- `usePilotStore` tests - Store has 14 actions with no test coverage
- `UnitValidationRegistry` tests - Registry manages rule registration
- `UnitValidationOrchestrator` tests - Orchestrator runs validation rules
- Unit card integration tests - Import/share preview integration

### Missing Features (Add)

- `AerospaceValidationRules` - Thrust/weight ratio, fuel capacity, weapon arc validation
- Unit card print-friendly styles - CSS for print media

## Impact

- **Affected specs**: `pilot-system`, `validation-rules-master`, `unit-card-view`, `aerospace-customizer`
- **Affected code**:
  - `src/stores/usePilotStore.ts` (add tests)
  - `src/services/validation/` (add tests + aerospace rules)
  - `src/components/unit-card/` (add print styles)
- **No breaking changes** - All additions

## Source Archives (remediation targets)

| Archive                                       | Incomplete Tasks    | This Proposal Covers            |
| --------------------------------------------- | ------------------- | ------------------------------- |
| `add-pilot-system`                            | 4 test tasks        | usePilotStore tests             |
| `add-comprehensive-unit-validation-framework` | 12 test tasks       | Registry + Orchestrator tests   |
| `add-aerospace-customizer`                    | 5 validation tasks  | AerospaceValidationRules        |
| `add-unit-card-view`                          | 3 integration tasks | Print styles (preview deferred) |
