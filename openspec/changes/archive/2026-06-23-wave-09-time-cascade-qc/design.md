## Context

Wave 9 implementation already provides typed time-cascade commands, pure previews, stored projected effects, replay helpers, action-ledger projection, and manual-takeover conflicts. The missing layer is an inexpensive proof surface that future maintainers can run before broader campaign journeys.

## Decisions

### Decision 1: Share ledger QC mechanics

Use a small `gm-ledger-qc-core` helper for registry lookup, command/spec requirements, stale OpenSpec references, and source-anchor token checks.

Alternative considered: copy the Wave 8 campaign-ledger validator and edit names. Rejected because it would create avoidable near-duplicate maintenance debt exactly where QC is meant to reduce it.

### Decision 2: Validate command wiring instead of re-running all journeys

The time-cascade validator proves the lane is mapped to the right surface, focused tests, implementation modules, day processors, specs, and campaign roots. Longer campaign stability stays in `qc:campaign-long:stability`.

Alternative considered: make the time-cascade validator run full long-campaign scenarios. Rejected because the validator should be fast enough to run on demand and in `verify:qc`.

### Decision 3: Keep external effects explicit

The validator anchors the current boundary: campaign-owned roots are projected automatically, while pilot recovery, roster progression, and vault-owned effects must be explicit projected external effects or manual-takeover conflicts.

Alternative considered: silently treat external roster/vault effects as in-scope because they are mentioned by the product intent. Rejected because that would weaken the current source-of-truth split and hide unsupported mutation behind a QC pass.

## Validation Plan

1. Run the new time-cascade validator in text and JSON mode.
2. Run the new validator unit test plus focused time-cascade, campaign-boundary, and day-processor tests.
3. Run existing campaign-ledger validator/tests to prove the shared core did not regress Wave 8.
4. Run `qc:validate`, `verify:qc`, `typecheck`, `format:check`, and strict OpenSpec validation before archiving.
