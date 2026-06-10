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

#### Scenario: Cover overlay exposes projected target-cover context

- **GIVEN** the cover overlay is enabled
- **AND** a selected unit has weapon-backed combat projection data for a target
  hex
- **WHEN** the cover overlay marker renders for that hex
- **THEN** the marker SHALL expose projected cover level, cover modifier,
  partial-cover state, target ids, and projected cover reason as inspectable
  metadata
- **AND** the marker accessible label SHALL include a concise projected cover
  summary

#### Scenario: Projection cover renders without terrain-cover marker

- **GIVEN** a target receives partial cover from a represented intervening
  building or elevation source
- **AND** the target hex terrain alone would not render a cover overlay marker
- **WHEN** the cover overlay is enabled
- **THEN** the target hex SHALL still render a cover overlay marker sourced from
  the combat projection
