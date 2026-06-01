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

When a vehicle attacker carries represented vehicle combat state and the
selected weapon carries represented vehicle mount metadata, combat projection
and attack declaration SHALL apply the same vehicle-specific to-hit modifiers.
In particular, a chin-turret vehicle that pivoted the turret this turn SHALL
show the +1 chin-turret pivot modifier on the map and commit the same target
number in `AttackDeclared`.

When a committed vehicle volley contains weapons with different represented
mount contexts, combat projection and attack declaration SHALL expose
per-weapon target numbers. Resolution SHALL use those per-weapon values when
present so turret-only modifiers apply only to the weapons fired from that
turret.

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

#### Scenario: Chin turret pivot modifier is projected and committed

- **GIVEN** a selected vehicle weapon is represented as mounted in a chin turret
- **AND** the vehicle combat state says the turret pivoted this turn
- **WHEN** combat projection renders an in-arc target
- **THEN** the target SHALL expose the `Chin Turret Pivot` +1 to-hit modifier
- **AND** the committed `AttackDeclared` event SHALL carry the same target
  number and modifier stack

#### Scenario: Mixed chin turret and body volley keeps per-weapon target numbers

- **GIVEN** a selected vehicle volley includes a pivoted chin-turret weapon and
  a body-mounted weapon
- **WHEN** combat projection renders an in-arc target
- **THEN** the target SHALL expose one per-weapon target number for the
  chin-turret weapon with `Chin Turret Pivot` +1
- **AND** it SHALL expose a separate per-weapon target number for the body
  weapon without the chin-turret modifier
- **AND** attack resolution SHALL use the matching per-weapon target numbers
  when resolving each weapon
