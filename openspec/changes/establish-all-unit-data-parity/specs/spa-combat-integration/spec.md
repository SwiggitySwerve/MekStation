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
- **THEN** its category SHALL be MISSILE and SHALL reach the shared declaration to-hit hydration boundary used by GameEngine, InteractiveSession AI and P2P attacks
- **AND** a Missile specialist SHALL receive -1 while an Energy specialist SHALL receive +1
- **AND** those modifiers SHALL differ by two from the former ENERGY classification
- **AND** pilots without that ability and Ballistic specialists SHALL retain their results
- **AND** non-missile category fallbacks, other attack fields and ammunition policies SHALL remain unchanged
- **AND** complete native categories, multi-SPA precedence, ID/name-dependent mixed-volley effects, tactical-preview and committed human interactive category propagation, and ammunition parity SHALL remain separate required work


#### Scenario: Mixed categories retain their own Gunnery Specialist modifiers

- **GIVEN** a declaration contains missile, energy and ballistic weapons
- **WHEN** the shared declaration owner computes the volley in either order
- **THEN** each weapon SHALL use its own category in the existing to-hit calculator before the impossible-shot clamp
- **AND** every weapon SHALL retain the existing shared range, minimum range, C3, terrain, called-shot and indirect-fire context
- **AND** the event SHALL carry per-weapon target numbers and modifier details for mixed-category volleys, and resolution SHALL use those numbers after JSON serialization
- **AND** the volley-level number SHALL retain the first weapon's result for legacy consumers
- **AND** single-category declarations SHALL retain their existing payload shape and older events without overrides SHALL retain the shared-number fallback
- **AND** ID/name-dependent effects and human grid projection category propagation SHALL remain separate required work
