# Document Tactical Map Integration Outcomes

## Why

The tactical-map projection PR is intentionally broad: it touches shared
movement, combat, terrain, elevation, visibility, top-down rendering, isometric
rendering, command gating, and browser proof fixtures. The branch already has
many narrow OpenSpec deltas, but reviewers also need a high-level contract that
states the outcomes the integrated changes are supposed to deliver.

## What Changes

- Add a top-level tactical-map interface requirement describing the map as a
  rules-backed battlefield explanation layer.
- Summarize the expected movement, combat, terrain/elevation, visibility, and
  isometric outcomes at the level of player-facing behavior and engine
  agreement.
- Keep the detailed rule slices in their existing targeted OpenSpec changes;
  this change is the integration-level contract tying those slices together.

## Out Of Scope

- New movement or combat rule implementation.
- Replacing the existing narrow OpenSpec deltas.
- Claiming full BattleTech/MegaMek parity beyond represented unit modes,
  terrain data, weapons, and scenario state currently modeled by MekStation.
