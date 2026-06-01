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

#### Scenario: Firing arc overlay exposes combat projection context

- **GIVEN** a selected unit has a configured selected weapon
- **AND** the firing-arc overlay shades a hex for that selected weapon's
  represented arc and range envelope
- **WHEN** the shaded arc hex has a shared combat projection entry
- **THEN** the shaded arc hex SHALL expose the projection firing arc, range
  bracket, distance, in-range state, in-arc state, attackability, target ids,
  valid target ids, and available weapon ids as inspectable metadata
- **AND** the shaded arc hex accessible label SHALL include a concise combat
  projection summary
