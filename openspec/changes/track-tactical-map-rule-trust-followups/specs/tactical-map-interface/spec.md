# Spec Delta: Tactical Map Interface

## ADDED Requirements

### Requirement: Tactical Map Rule-Trust Follow-Up Boundaries

The tactical map interface SHALL keep unresolved rule-trust boundaries explicit
whenever a represented map behavior is useful to players but is not yet fully
source-pinned, oracle-differenced, or interaction-swept.

#### Scenario: Environment provenance distinguishes represented helper evidence

- **GIVEN** combat environment context is derived from MekStation's represented
  underwater/torpedo helper behavior
- **WHEN** the map exposes source and rule-reference metadata for that context
- **THEN** the metadata SHALL identify the helper as represented MekStation
  behavior until a narrower MegaMek or official source pin is linked
- **AND** the tactical map SHALL NOT present that helper provenance as complete
  MegaMek or official rules parity.

#### Scenario: Movement oracle gaps remain named follow-up work

- **GIVEN** movement highlights use represented runtime movement capability,
  terrain cost, elevation cost, and commit-validation paths
- **WHEN** unmodeled runtime transitions such as conversion changes,
  mount/dismount changes, LAM fighter modes, AirMek ground-clearance submodes,
  or broad external oracle sweeps are required
- **THEN** those cases SHALL remain tracked as follow-up outcomes before the
  map claims full movement-oracle coverage
- **AND** future coverage SHALL compare preview highlights, command gating, and
  committed movement results for each affected runtime state.

#### Scenario: Isometric browser coverage distinguishes smoke from full interaction sweep

- **GIVEN** isometric topography, occluder highlighting, and camera rotation
  have representative smoke coverage, including button/keyboard rotation,
  pointer pan, touch pan, pinch-zoom, and touch rotation
- **WHEN** the map is evaluated for full battlefield interaction readiness
- **THEN** broader mobile gesture-matrix and occlusion interaction sweeps SHALL
  remain tracked as follow-up outcomes
- **AND** those sweeps SHALL verify that isometric presentation continues to
  consume the same shared projection data as top-down movement, combat,
  terrain, elevation, LOS, and visibility highlights.
