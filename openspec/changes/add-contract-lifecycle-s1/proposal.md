## Why

Contract lifecycle B needs one pure owner before any producer or caller changes.
Root approved S0 D-1 through D-10; the merge freeze remains in effect.

## What Changes

- Add optional lifecycle version/state types and a version owner with writer 1.
- Add pure readiness, lifetime recommendation, 30-day installment planning,
  exact-cent settlement and completion transforms, with no production callers.
- Validate known lifecycle state at mission hydration while preserving legacy
  bytes and unknown future state.

## Impact

- Affected specs: `mission-contracts` (additive delta only).
- Affected code: campaign contract types, pure contracts module, mission loader.
- No producer stamps version 2; no store, UI, pipeline, schema version, pack,
  fixture, golden, digest or replay version changes.
- S1b owns capability refusals and the frozen-client local-storage experiment.
- S2/S3/S4 own callers, battle results, scheduled writes and reconciliation.
