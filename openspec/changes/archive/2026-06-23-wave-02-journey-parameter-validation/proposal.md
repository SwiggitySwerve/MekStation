## Why

Journey QC is now the proof surface for major gameplay flows, but the runner currently accepts malformed journey parameters and still writes passing evidence. A repeatable proof system needs to reject invalid configurable inputs before run plans, artifacts, logs, and bug reports can be trusted.

## What Changes

- Add strict runtime validation for journey parameter overrides before execution or dry-run evidence is claimed.
- Reject invalid integer, boolean, enum, and string-list values with journey/parameter-specific messages.
- Enforce numeric minimum and maximum bounds declared in the journey catalog.
- Add regression coverage for invalid campaign contract counts, invalid BattleMech tech base values, and valid parameter coercion.
- Document the runner contract so generated evidence can only be based on catalog-valid inputs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `journey-qc`: Journey run-plan materialization must validate parameter overrides against catalog parameter definitions and fail before writing trusted execution evidence when overrides are malformed or out of bounds.

## Impact

- Affected scripts: `scripts/qc/journey-qc-core.mjs`, `scripts/qc/run-journey-scenarios.mjs`, and journey QC tests.
- Affected docs/specs: `openspec/specs/journey-qc/spec.md` and journey QC usage documentation.
- No dependency changes.

## Non-goals

- Do not replace synthetic/catalog-backed journey steps with domain, browser, or hybrid adapters in this slice.
- Do not expand the journey catalog beyond the seven required journeys.
- Do not change long-campaign stability behavior except through shared parameter validation.
