# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing
arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive
attack-range highlighting from the weapon-backed combat projection. Legacy raw
`attackRange` props MAY be used only when no configured weapon list exists.
When the attack plan has one or more selected weapon IDs, combat projection
surfaces SHALL use only those selected weapons; an empty selected-weapon list
SHALL preserve the all-weapons preview behavior.

#### Scenario: Selected weapon extreme range shades firing arc envelope

- **GIVEN** a selected unit has an operational selected weapon with represented
  long range 6 and extreme range 8
- **AND** a visible enemy target is in the selected weapon's mounted arc at
  distance 7
- **WHEN** the combat map renders selected-weapon range, target, and firing-arc
  projection
- **THEN** the target hex SHALL report the `extreme` combat range bracket
- **AND** the firing-arc overlay SHALL shade that distance-7 hex as part of the
  selected weapon's compatible arc

#### Scenario: Weapons without extreme range keep long-range arc envelope

- **GIVEN** a selected unit has an operational selected weapon with no
  represented extreme range
- **WHEN** the firing-arc overlay renders for the selected weapon
- **THEN** the overlay SHALL use the weapon's represented long range as its
  maximum shaded envelope
