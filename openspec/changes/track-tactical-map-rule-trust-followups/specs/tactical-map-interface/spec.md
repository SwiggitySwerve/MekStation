# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Tactical Map Rule-Trust Follow-Up Boundaries

The tactical map interface SHALL keep unresolved rule-trust boundaries explicit
whenever a represented map behavior is useful to players but is not yet fully
source-pinned, oracle-differenced, or interaction-swept.

#### Scenario: Source-pinned helper follow-ups are retired

- **GIVEN** a tactical-map follow-up previously tracked represented helper
  provenance rather than a MegaMek or official rules source pin
- **WHEN** a later OpenSpec change links that behavior to concrete MegaMek or
  official source references and adds focused map coverage
- **THEN** the follow-up tracker SHALL stop listing that behavior as an open
  helper-provenance gap
- **AND** any remaining limitations SHALL be restated as narrower behavior gaps,
  such as missing range math, hit-table expansion, or broader oracle sweeps.

#### Scenario: Movement oracle gaps remain named follow-up work

- **GIVEN** movement highlights use represented runtime movement capability,
  terrain cost, elevation cost, and commit-validation paths
- **WHEN** unresolved runtime transitions such as conversion action timing,
  remaining airborne LAM Fighter or AirMek submodes, or broad external oracle
  sweeps are required
- **THEN** those cases SHALL remain tracked as follow-up outcomes before the
  map claims full movement-oracle coverage
- **AND** future coverage SHALL compare preview highlights, command gating, and
  committed movement results for each affected runtime state.
- **AND** movement gaps that already have source-pinned preview/commit coverage,
  such as frogman/swim movement, optional infantry pavement bonus, represented
  unit-height bridge clearance, runtime infantry mounted/dismounted height
  precedence, runtime LAM/QuadVee conversion projection, and replayable runtime
  movement-state gameplay events plus runtime movement-state command controls,
  SHALL NOT remain listed as open headline gaps.
- **AND** hull-down `GET_UP` movement exit projection and replay-state clearing
  SHALL NOT remain grouped under unresolved hull-down entry action
  gaps once source-pinned coverage exists.
- **AND** hull-down `GO_PRONE` movement action projection and replay-state
  clearing SHALL NOT remain grouped under unresolved hull-down entry action
  gaps once source-pinned coverage exists.

#### Scenario: Isometric browser coverage distinguishes smoke from full interaction sweep

- **GIVEN** isometric topography, occluder highlighting, and camera rotation
  have representative smoke coverage, including button/keyboard rotation,
  pointer pan, touch pan, pinch-zoom, direct touch rotation, and rendered
  occluder retargeting when camera rotation changes which tall hex is in front
  of a unit
- **WHEN** the map is evaluated for full battlefield interaction readiness
- **THEN** broader mobile gesture-matrix and occlusion interaction sweeps SHALL
  remain tracked as follow-up outcomes
- **AND** those sweeps SHALL verify that isometric presentation continues to
  consume the same shared projection data as top-down movement, combat,
  terrain, elevation, LOS, and visibility highlights.

#### Scenario: Vehicle critical table follow-ups are narrowed after source-pinned dispatch

- **GIVEN** represented vehicle critical dispatch is source-pinned to MegaMek
  Tank and VTOL struck-location critical tables
- **WHEN** focused coverage proves front, rear, side/body, turret, VTOL rotor,
  engine-type, fuel-tank, and replay-visible state outcomes
- **THEN** tactical-map rule-trust tracking SHALL NOT keep full
  location-sensitive vehicle critical-table dispatch listed as an open gap
- **AND** the remaining vehicle critical follow-ups SHALL be narrowed to cargo
  import parity, dual-turret split identity, and broader external oracle sweeps.
