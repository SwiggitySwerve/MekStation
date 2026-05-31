# Tactical Map PR Spec Coverage

Date: 2026-05-26

Branch: `codex/tactical-map-rules-projection`
PR: `#682` (`Draft: Rules-backed tactical map projection`)
Baseline inspected before this maintenance note:
`ff4240ac0b16b604ac1ed77c47b4a4fe07991448`
Latest refreshed head: `38ef4e4c492efb8a8746443560dec330ed488f85`

## Current Review Posture

The tactical-map branch now has OpenSpec coverage for the main player-facing
outcomes in the goal: rules-backed movement projection, combat projection,
terrain/elevation labels, top-down and isometric presentation, shared tooltip
metadata, and preview-to-commit agreement. The PR should still remain draft
until the listed follow-up gaps are either closed or explicitly carved out of
the merge scope because the branch is broad.

The baseline inspection on 2026-05-26 found GitHub still reporting PR `#682` as
`BLOCKED`; `gh pr checks 682` reported no current checks, while the queued PR
Checks run visible in `gh run list` targeted stale head `6a592e5d`. That CI
state has since been superseded by the refresh below.

2026-05-31 refresh: PR `#682` is now `CLEAN` at head
`38ef4e4c492efb8a8746443560dec330ed488f85`, and GitHub PR Checks are passing.
The PR should remain draft by design while review splits and follow-up scope
decisions are made, not because CI is stale.

## Spec-Covered Outcomes

| Outcome area                                 | OpenSpec coverage                                                                                                                | Evidence notes                                                                                                                                                                                                                                                            |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Integrated map explanation layer             | `document-tactical-map-integration-outcomes`                                                                                     | Requires selected-unit movement/combat meaning, non-color blocked reasons, top-down and isometric shared projection semantics, and representative preview-to-commit tests.                                                                                                |
| Movement reachability and costs              | Movement option/cost/mode changes, runtime movement alignment changes, water/road/bridge/amphibious/conversion/gyro changes      | Specs and fixtures now cover MP cost, terrain/elevation contributions, heat, blocked reasons, runtime unit height, infantry mounted/dismounted height precedence, LAM/QuadVee conversion projection, and preview/commit agreement for many representative movement cases. |
| Combat range, LOS, cover, and weapon context | Combat projection, LOS, cover, indirect fire, C3, minimum range, weapon option, weapon impact, underwater, and hull-down changes | Specs now require per-weapon applicability, range bands, arcs, LOS/visibility, cover, environment restrictions, selected-weapon narrowing, and commit-path rejection agreement.                                                                                           |
| Terrain/elevation labels                     | Terrain/elevation label, reference metadata, and tooltip context changes                                                         | Specs require readable terrain/elevation metadata and elevation numbers on top-down hexes while feeding the same facts into isometric layers.                                                                                                                             |
| Isometric 2.5D presentation                  | Isometric stack, rotation, occluder, fog, scene token, and camera control changes                                                | Specs require stacked elevation layers, camera rotation that changes presentation only, depth/occluder metadata, and visibility affordances for units behind tall elevations.                                                                                             |
| Source-trust tracking                        | `track-tactical-map-rule-trust-followups` and `docs/audits/2026-05-22-tactical-map-rules-source-matrix.md`                       | Follow-up boundaries are explicit, and the underwater helper provenance gap is now retired by `pin-underwater-weapon-environment-source`.                                                                                                                                 |

## Remaining Gaps To Keep Out Of Ready-For-Review Claims

- Movement: remaining airborne LAM AirMek/WiGE full pathing and broader
  external oracle differential sweeps remain follow-up work. Represented
  AirMek-to-Mek conversion phase sequencing is now source-pinned by
  `pin-lam-airmek-mek-conversion-steps`.
  Represented altitude-positive VTOL/WiGE units now fail closed in the ground
  projection with source-backed altitude-control reasons via
  `block-airborne-vtol-wige-ground-projection`; full airborne altitude pathing,
  hover/takeoff/landing sequencing, and automatic WiGE landing remain
  follow-up work. WiGE vehicle tokens now expose represented altitude in the
  same top-down/isometric metadata and visible badge channel as VTOL tokens via
  `show-wige-altitude-token-context`. Stale or mismatched movement capability
  motives now fail closed from represented altitude-positive VTOL/WiGE vehicle
  combat state via `block-airborne-vehicle-state-mismatch`. Blocked
  altitude-control projections now carry represented control mode and altitude
  through top-down hex metadata, badges, accessible labels, tooltips, and
  same-hex option metadata via `surface-airborne-altitude-control-context`.
  Represented VTOL/WiGE vehicle altitude can now be changed through replayable
  movement-phase Climb/Descend commands via
  `wire-vtol-wige-altitude-controls`. The represented 1 MP UP/DOWN reserve now
  carries into later movement projection, hover metadata, and commit validation
  via `reserve-altitude-control-mp`; full multi-step airborne pathing,
  hover/takeoff/landing sequencing, automatic WiGE landing, and
  terrain-clearance-specific altitude gates remain follow-up work.
  Runtime infantry mounted/dismounted height precedence is now covered; the
  replayable gameplay-event mutation path is now covered by
  `apply-runtime-movement-state-events`, and tactical command controls are now
  covered by `wire-runtime-movement-state-controls`. Pending conversion
  step/cost metadata now remains visible in map badges and hover tooltips via
  `surface-conversion-steps-in-map-tooltips`, leaving remaining source-specific
  conversion cases and oracle sweeps.
- Combat: broader special range-mode coverage, remaining LOS terrain families,
  full surface-naval underwater expansion, and broader external oracle
  comparisons remain follow-up work.
- Hull-down / vehicle combat: dual-turret split handling, cargo import parity,
  and broader vehicle critical oracle sweeps remain follow-up work. Full
  location-sensitive Tank/VTOL vehicle critical-table selection is no longer
  open after the `align-vehicle-critical-location-tables` slice, represented
  ammo/engine/crew/turret/rotor availability fallthrough is covered by
  `align-vehicle-critical-availability-fallthrough`, initial target
  weapon-location availability is covered by
  `import-vehicle-critical-target-equipment-availability`, initial stabilizer
  mount-presence separation is covered by
  `separate-vehicle-critical-stabilizer-mount-presence`, and runtime
  weapon/stabilizer-state reduction is covered by
  `track-runtime-vehicle-critical-equipment-state`.
  Target hull-down modifiers, attacker leg-weapon/kick blocks, and vehicle
  front-weapon direct-fire blocks, hull-down go-prone, and standing hull-down
  entry, prone-to-hull-down actuator/hip costs, punch/club hull-down hit-table
  selection, vehicle/QuadVee hull-down fixed side-table behavior, and
  session-level vehicle damage dispatch, and basic session-level vehicle
  critical dispatch for represented vehicle targets are no longer open
  preview/commit agreement gaps.
- Isometric: direct touch rotation is now covered by
  `add-isometric-touch-camera-gesture`, and rendered camera-rotation occluder
  retargeting is now covered by `add-isometric-occlusion-rotation-sweep`;
  broader mobile device gesture-matrix and full battlefield occlusion
  interaction sweeps remain follow-up work beyond the representative smoke,
  metadata, pan/zoom, touch-rotation, and occluder-retarget coverage.
- PR readiness: PR `#682` is currently draft by design. Before the runtime
  movement-state event slice, GitHub PR Checks were attached to current head
  `a5a2e3969af3cf4c8aded006d55c488bf312daf3` and passing; pushing the next
  slice will start a fresh check set.

## Merge-Readiness Implication

For PR review, the safest claim is not "the whole tactical-map goal is done."
The defensible claim is: this branch has substantially converted tactical-map
movement/combat/terrain/elevation/isometric behavior into shared, rules-backed
projection data with many source-pinned preview/commit fixtures, while the
remaining uncovered rule families are named and constrained for follow-up
slices.
