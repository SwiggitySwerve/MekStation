## Why

The maintenance code-health QC surface has a passing `src` regression gate, but repo-wide scanner debt still lives mostly as ad hoc console output. Wave 12 needs a durable, checked ledger so remaining warnings are fixed, explicitly accepted, or converted into follow-up work instead of being rediscovered by hand.

## What Changes

- Add an OpenSpec capability for maintenance code-health accounting.
- Add a checked maintenance warning ledger under `docs/qc/` for repo-wide stale TODO, file-bloat, near-duplicate, import-health, and design-violation findings.
- Add a validator command that compares the ledger against live scanner output and fails when actionable debt is unaccounted for.
- Update the QC registry/map/graph to link the maintenance surface to its OpenSpec contract, ledger, and verification command.
- Clean stale explanatory TODO-like e2e comments that no longer represent active work.

## Capabilities

### New Capabilities

- `maintenance-code-health`: Defines the maintenance scanner accounting contract, including current-scan evidence, reviewed warning ledger states, and validation behavior.

### Modified Capabilities

- None.

## Impact

- Affected artifacts: `docs/qc/maintenance-warning-ledger.json`, `docs/qc/maintenance-baseline.json`, `docs/qc/mekstation-qc-registry.json`, `docs/qc/mekstation-qc-validation-graph.json`, and `docs/qc/mekstation-qc-map.md`.
- Affected scripts: maintenance/QC validation command wiring in `scripts/` and `package.json`.
- Affected tests: maintenance ledger validator tests plus existing QC validation and maintenance scan gates.
- No gameplay, BattleMech rules, catalog, save-state, or UI runtime behavior changes.

## Non-goals

- Do not refactor the large BV validation and MegaMek conversion scripts in this wave.
- Do not split e2e page objects in this wave; page-object public-method findings are tracked as follow-up debt.
- Do not change scanner thresholds or hide findings by weakening the scanner.
- Do not raise `docs/qc/maintenance-baseline.json`; it may only be lowered to match verified critical/high improvements.
