# Wave 7: Tactical Projection Parity

## Why
Tactical map projection agreement is currently proved by several focused Jest and browser lanes, but the proof is scattered across the QC registry, tactical scenario suites, UI metadata helpers, and older audit notes. The next waves need one fast gate that says whether the tactical map still has shared projection coverage for movement, combat, terrain, elevation, LOS, overlays, and invalid reasons before deeper UI or campaign work relies on it.

## What Changes
- Add a dedicated tactical projection parity validator that inspects the QC registry, required tactical surfaces, runnable commands, source anchors, browser-boundary coverage, and stale active-change references.
- Wire the validator into the aggregate QC gate and expose a focused package command.
- Update tactical QC docs and registry evidence so future tactical reviews start from the new parity manifest instead of stale active-change names.

## Out Of Scope
- Replacing the existing tactical Jest or Playwright suites.
- Browser-driving every tactical checkpoint in this wave.
- Reworking tactical map rendering behavior beyond proof/validation wiring.
