# Design

## Approach
Add a lightweight Node validator under `scripts/qc/` that reads `docs/qc/mekstation-qc-registry.json` and verifies the tactical projection proof contract without launching the heavier tactical suites. The validator emits a compact summary by default and JSON when requested.

## Validation Contract
- Required tactical surfaces must exist for overall tactical map combat, rules explanation, top-down legibility, movement agreement, combat agreement, and isometric mode.
- Each required surface must expose its expected claim ID and at least one command for the automated lane it owns.
- Required tactical source anchors must still exist and contain the symbols/data attributes that connect map rendering to shared projection data.
- Browser-only visual coverage must remain discoverable, but the parity validator itself stays headless.
- Required tactical surfaces must not point at stale `activeChangeRefs` once no matching OpenSpec change directory exists.

## Boundary
This wave consolidates parity proof. It does not make the tactical quick gate or Playwright visual gate obsolete; instead it verifies that those gates are still registered and anchored to the correct source files.
