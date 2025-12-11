# Change: Add No Double-Casting Architecture Rule

## Why

Double type assertions (`as unknown as T`) completely bypass TypeScript's type system, creating a code smell that often masks deeper type compatibility issues. This pattern:
- Silences compiler errors but causes runtime crashes
- Makes code harder to refactor safely
- Indicates missing type guards or conversion functions
- Violates the project's type safety principles

## What Changes

- **ADDED**: New architectural requirement prohibiting double type assertions
- **ADDED**: ESLint rule enforcement via `no-restricted-syntax`
- **ADDED**: Approved alternatives pattern (type guards, conversion functions, proper interface design)
- **MODIFIED**: Validation patterns spec to include compile-time type safety rules

## Impact

- **Affected specs**: `validation-patterns`
- **Affected code**: 
  - `eslint.config.mjs` - New lint rule (already implemented)
  - 15 test files containing 55+ violations requiring fixes
- **Breaking**: No - existing violations emit warnings, not errors
- **Migration**: Replace all `as unknown as` patterns with proper type handling

## Acceptance Criteria

1. ESLint warns on any `as unknown as` usage
2. All existing violations are fixed with proper typing
3. Build and tests pass without the double-casting pattern
4. Spec documents the requirement and approved alternatives

