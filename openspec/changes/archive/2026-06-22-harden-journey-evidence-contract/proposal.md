## Why

Journey QC now provides the right command surface, catalog, logs, and evidence bundle, but current runs can still pass without making the execution backing explicit. That makes it too easy to confuse catalog-shaped synthetic evidence with domain-backed or UI-backed journey execution.

## What Changes

- Add explicit execution backing metadata to journey run plans, step results, diagnostics, reports, and artifacts.
- Add a runner gate that can fail selected journeys when domain-backed or UI-backed execution is required but only synthetic/catalog-backed evidence exists.
- Keep existing smoke journey runs fast and non-breaking while making the remaining adapter gap visible and queryable.
- Update tests so the evidence contract proves both the default smoke behavior and the stricter backing-required failure path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `journey-qc`: Journey runs must distinguish synthetic/catalog-backed evidence from domain-backed or UI-backed execution and expose a strict gate for callers that require non-synthetic backing.

## Impact

- Affects `scripts/qc/journey-qc-core.mjs`, `scripts/qc/run-journey-scenarios.mjs`, journey QC tests, journey QC docs, and the `journey-qc` OpenSpec capability.
- Does not change player-facing UI, production APIs, or persisted campaign/combat data.
- Establishes a clear migration path for replacing synthetic steps with real domain or browser adapters in later waves.
