# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation

Combat highlights SHALL expose weapon-backed attack legality, range, firing arc, LOS, cover, visibility, heat, ammo, and disabled reasons.

When a selected unit has a configured weapon list, the map SHALL derive attack-range highlighting from the weapon-backed combat projection. Legacy raw `attackRange` props MAY be used only when no configured weapon list exists.
When the attack plan has one or more selected weapon IDs, combat projection surfaces SHALL use only those selected weapons; an empty selected-weapon list SHALL preserve the all-weapons preview behavior.

#### Scenario: Combat reason hover exposes projection provenance

- **GIVEN** a player inspects a combat-only or combined movement+combat hover whose combat projection has a displayed reason
- **WHEN** the combat reason row renders
- **THEN** the row SHALL expose stable machine-readable attackability, target id, range, distance, LOS, arc, invalid, blocked, visibility, LOS-blocker, to-hit, indirect-fire, cover, and displayed-reason attributes when represented
- **AND** the row SHALL expose combat projection source references and rule references from the shared tactical projection when available
- **AND** combat-only and combined tactical hovers SHALL use the same combat reason representation
- **AND** adding this metadata SHALL NOT change range classification, target validity, LOS classification, to-hit modifiers, weapon option filtering, fog visibility, attack validation, or attack resolution
