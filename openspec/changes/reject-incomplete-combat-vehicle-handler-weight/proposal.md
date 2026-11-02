# Document explicit combat-handler weight unavailability

## Why

S11 (#2549) replaced incomplete Tank/VTOL calculateWeight subtotals with one explicit error boundary. Its requirement initially lived in the broad parity delta. Give that API contract a dedicated package without duplicating or changing it.

## What changes

Move the existing availability requirement unchanged from establish-all-unit-data-parity into this package and retarget the helper's spec annotation. Parsing remains independent; currentWeight cannot supply missing equipment mass; support totals stay with their current owner.

## Impact

Documentation/annotation only; no runtime calculation changes. The number-only API may return a numeric total only after a future complete authoritative construction calculation exists. Existing full mass and BV parity gaps remain separate work. Canonical vehicle-unit-system is unchanged until authorized sync/archive.
