## MODIFIED Requirements

### Requirement: Gunnery SPA — Gunnery Specialist

The Gunnery Specialist SPA SHALL grant -1 to-hit for attacks with the
weapon category stored as the pilot's Gunnery Specialist designation
and +1 for all other categories. The combat layer SHALL obtain the
designated category via `getPilotDesignation(pilot,
"gunnery_specialist")`.

#### Scenario: Gunnery Specialist with stored Energy designation

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires an energy weapon
- **THEN** the attack SHALL receive -1 to-hit

#### Scenario: Gunnery Specialist with stored Energy designation on ballistic weapon

- **GIVEN** a pilot owns `gunnery_specialist` with designation
  `{ type: "weapon_category", value: "energy" }`
- **WHEN** the pilot fires a ballistic weapon
- **THEN** the attack SHALL receive +1 to-hit

#### Scenario: Missing missile capacity preserves category at the attack boundary

- **GIVEN** a mounted weapon recognized by the existing missile-family classifier
- **WHEN** the weapon attack builder translates it with missing capacity metadata
- **THEN** its category SHALL be MISSILE and SHALL reach the shared to-hit hydration boundary
- **AND** a Missile specialist SHALL receive -1 while an Energy specialist SHALL receive +1
- **AND** those modifiers SHALL differ by two from the former ENERGY classification
- **AND** pilots without that ability and Ballistic specialists SHALL retain their results
- **AND** non-missile category fallbacks, other attack fields and ammunition policies SHALL remain unchanged
- **AND** complete native categories, multi-SPA precedence, tactical-preview category propagation and ammunition parity SHALL remain separate required work
