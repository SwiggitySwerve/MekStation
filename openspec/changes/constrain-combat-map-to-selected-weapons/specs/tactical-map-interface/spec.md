# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing arc,
LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive
attack-range highlighting from the weapon-backed combat projection. Legacy raw
`attackRange` props MAY be used only when no configured weapon list exists.
When the attack plan has one or more selected weapon IDs, combat projection
surfaces SHALL use only those selected weapons; an empty selected-weapon list
SHALL preserve the all-weapons preview behavior.

#### Scenario: Selected weapon ids constrain map combat projection

- **GIVEN** a selected unit has multiple configured weapons
- **AND** the current attack plan selects only a subset of those weapon IDs
- **WHEN** the map renders range bands, firing arcs, and valid-target metadata
- **THEN** those combat highlights SHALL be derived only from the selected
  weapons
- **AND** unselected weapons SHALL NOT make a target appear in range, in arc, or
  valid

#### Scenario: Empty selected weapon list preserves broad preview

- **GIVEN** a selected unit has configured weapons
- **AND** the current attack plan has no selected weapon IDs
- **WHEN** combat projection renders
- **THEN** range bands, firing arcs, and target metadata SHALL continue to use
  all configured operational weapons for broad preview
