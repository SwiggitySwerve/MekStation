## Why

The long-campaign stability runner already proves repeatable 6-10 contract headless campaign evidence, but it was not protected by the global QC gate or a first-class QC registry surface. This change prevents long-campaign stability from silently decaying while later campaign and maintenance waves build on it.

## What Changes

- Add a long-campaign QC validator that checks global script wiring, the QC registry surface, journey catalog bounds, gameplay UI flow linkage, validation graph nodes, source anchors, and stale OpenSpec active refs.
- Wire `verify:qc:campaign-long` into the top-level `verify:qc` path so global QC runs the 10-contract, 2-run stability proof.
- Add `qc:campaign-long:validate` as the fast metadata guard for long-campaign coverage.
- Add a first-class `long-campaign-stability` QC registry surface with claim ID, commands, tests, source evidence, and explicit browser-boundary gap wording.
- Align the `campaign-long` journey catalog contract count with the stability runner by declaring the 10-contract maximum.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `journey-qc`: Add a protected long-campaign QC wiring requirement so the stability gate remains globally discoverable and runnable.

## Impact

- Affected scripts: `package.json`, `scripts/qc/validate-long-campaign-qc.mjs`, and focused QC tests.
- Affected QC artifacts: `docs/qc/mekstation-qc-registry.json`, `docs/qc/mekstation-qc-validation-graph.json`, `docs/qc/mekstation-journey-scenarios.json`, and `docs/qc/mekstation-qc-map.md`.
- Affected specs: `journey-qc`.
- Dependencies: no new package or runtime dependencies.
