# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing
arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When vehicle-like unit data represents weapon mount metadata, combat projection
SHALL import the weapon identity and mount coverage before rendering range,
arc, and valid-target highlights. Single-arc vehicle mounts SHALL constrain
projection to their represented chassis arc. Multi-arc mounts SHALL constrain
projection to the represented arc set instead of degrading to all-arc legacy
behavior.

#### Scenario: Vehicle equipment IDs are imported for combat projection

- **GIVEN** a represented vehicle weapon mount carries `equipmentId`
- **AND** its mount `id` is only a mount-slot identifier
- **WHEN** the unit is adapted for combat
- **THEN** the weapon SHALL be resolved from `equipmentId`
- **AND** the mount-slot id SHALL NOT be treated as the weapon catalog id

#### Scenario: Vehicle sponson mount highlights only covered arcs

- **GIVEN** a selected vehicle weapon is represented as a left sponson mount
- **WHEN** combat projection and firing-arc shading render
- **THEN** front and left-side target hexes SHALL be treated as covered
- **AND** rear and right-side target hexes SHALL be blocked as out of arc
- **AND** committed attacks SHALL accept and reject the same targets as the
  map projection
