# Tactical Map PR Spec Coverage

Date: 2026-05-26

Branch: `codex/tactical-map-rules-projection`
PR: `#682` (`Draft: Rules-backed tactical map projection`)
Baseline inspected before this maintenance note:
`ff4240ac0b16b604ac1ed77c47b4a4fe07991448`

## Current Review Posture

The tactical-map branch now has OpenSpec coverage for the main player-facing
outcomes in the goal: rules-backed movement projection, combat projection,
terrain/elevation labels, top-down and isometric presentation, shared tooltip
metadata, and preview-to-commit agreement. The PR should still remain draft
until the listed follow-up gaps are either closed or explicitly carved out of
the merge scope, because the branch is broad and GitHub had not attached a
current-head PR check run to the inspected baseline.

Local inspection on this date found GitHub still reporting PR `#682` as
`BLOCKED`; `gh pr checks 682` reported no current checks, while the queued PR
Checks run visible in `gh run list` targeted stale head `6a592e5d`.

## Spec-Covered Outcomes

| Outcome area                                 | OpenSpec coverage                                                                                                                | Evidence notes                                                                                                                                                                                                             |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrated map explanation layer             | `document-tactical-map-integration-outcomes`                                                                                     | Requires selected-unit movement/combat meaning, non-color blocked reasons, top-down and isometric shared projection semantics, and representative preview-to-commit tests.                                                 |
| Movement reachability and costs              | Movement option/cost/mode changes, runtime movement alignment changes, water/road/bridge/amphibious/conversion/gyro changes      | Specs and fixtures now cover MP cost, terrain/elevation contributions, heat, blocked reasons, runtime unit height, LAM/QuadVee conversion projection, and preview/commit agreement for many representative movement cases. |
| Combat range, LOS, cover, and weapon context | Combat projection, LOS, cover, indirect fire, C3, minimum range, weapon option, weapon impact, underwater, and hull-down changes | Specs now require per-weapon applicability, range bands, arcs, LOS/visibility, cover, environment restrictions, selected-weapon narrowing, and commit-path rejection agreement.                                            |
| Terrain/elevation labels                     | Terrain/elevation label, reference metadata, and tooltip context changes                                                         | Specs require readable terrain/elevation metadata and elevation numbers on top-down hexes while feeding the same facts into isometric layers.                                                                              |
| Isometric 2.5D presentation                  | Isometric stack, rotation, occluder, fog, scene token, and camera control changes                                                | Specs require stacked elevation layers, camera rotation that changes presentation only, depth/occluder metadata, and visibility affordances for units behind tall elevations.                                              |
| Source-trust tracking                        | `track-tactical-map-rule-trust-followups` and `docs/audits/2026-05-22-tactical-map-rules-source-matrix.md`                       | Follow-up boundaries are explicit, and the underwater helper provenance gap is now retired by `pin-underwater-weapon-environment-source`.                                                                                  |

## Remaining Gaps To Keep Out Of Ready-For-Review Claims

- Movement: conversion action timing, remaining airborne LAM Fighter/AirMek
  submodes, gameplay events or UI that mutate infantry mount/conversion state,
  and broader external oracle differential sweeps remain follow-up work.
- Combat: broader special range-mode coverage, remaining LOS terrain families,
  full surface-naval underwater expansion, and broader external oracle
  comparisons remain follow-up work.
- Hull-down: full session-level vehicle damage dispatch and dual-turret split
  handling remain follow-up work.
  Target hull-down modifiers, attacker leg-weapon/kick blocks, and vehicle
  front-weapon direct-fire blocks, hull-down go-prone, and standing hull-down
  entry, prone-to-hull-down actuator/hip costs, punch/club hull-down hit-table
  selection, and vehicle/QuadVee hull-down fixed side-table behavior are no
  longer open preview/commit agreement gaps.
- Isometric: broader mobile gesture-matrix and full battlefield
  rotation/occlusion interaction sweeps remain follow-up work beyond the
  representative smoke and metadata coverage.
- PR readiness: a current-head GitHub PR check run is still missing or stale at
  this inspection point; local gates remain the authoritative evidence until CI
  attaches to the latest head.

## Merge-Readiness Implication

For PR review, the safest claim is not "the whole tactical-map goal is done."
The defensible claim is: this branch has substantially converted tactical-map
movement/combat/terrain/elevation/isometric behavior into shared, rules-backed
projection data with many source-pinned preview/commit fixtures, while the
remaining uncovered rule families are named and constrained for follow-up
slices.
