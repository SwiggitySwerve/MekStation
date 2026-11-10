## Why

Critical-only recovery extensions need one recogniser and callable dispatcher.
The combined o3a branch also restores native marker cells, whose representation
is still under review. Split the shared contract from marker recovery so the
other recovery lanes can build on it without changing existing allocations.

## What Changes

- Share critical-entry recognition, parsed size evidence and actual slot coverage.
- Route existing ammo, bomb bay, heat sink and grouped weapon recovery through
  one exhaustive dispatcher with explicit no-op arms for deferred kinds.
- Preserve exact native system identities and the shared notice classification
  owner, retaining Chain Whip and ISC3Sensors equipment cells.
- Leave marker cells in the residual and notice; add no marker hydration.
- Preserve separately pinned notice metadata when the crew fixture generator
  refreshes loader entries, so re-pinning retains the fixture's current schema.

## Capabilities

### Modified Capabilities

- `unit-services`: shared recognition and exhaustive recovery dispatch.

## Impact

Unit loader, conversion vocabulary and their tests. Existing equipment, crew
fixture and Omni pod editor behavior remain unchanged. The full census requires
a separate coordinator GO after local unit and static proof.
