## ADDED Requirements

### Requirement: Saved Custom Unit Readiness Boundary

Mission readiness and materializer preflight SHALL use one shared combat-adaptability predicate over the roster projection's persisted `unitSource`. They SHALL preserve a saved custom roster instance and its exact custom source `unitRef` while treating `custom` as unavailable for canonical-only combat adaptation. Until a separate custom-combat contract exists, every selected saved custom unit SHALL block launch with a per-unit canonical-combat-unavailable reason. The system SHALL NOT infer provenance from the ref text, substitute a stock unit, or create an encounter, launch force, or game session for the blocked selection.

#### Scenario: Saved custom roster unit remains visible but cannot launch

- **GIVEN** a selected campaign roster instance whose `unitRef` identifies a saved custom BattleMech
- **WHEN** mission readiness projects the selected roster
- **THEN** the roster instance SHALL remain visible with its exact roster-instance id and custom `unitRef`
- **AND** its persisted `unitSource` SHALL remain `custom`
- **AND** readiness SHALL mark that instance non-launchable with a canonical-combat-unavailable reason that names the unit
- **AND** the overall launch projection SHALL remain blocked

#### Scenario: Mixed roster can recover to a canonical-only selection

- **GIVEN** a mission roster containing canonical and saved custom units
- **WHEN** readiness creates its default selection
- **THEN** saved custom units SHALL remain visible but unselected and unavailable for selection
- **AND** canonical launch-capable units SHALL remain selectable
- **AND** a stale or restored selected custom row SHALL remain operable only so the player can deselect it
- **AND** launch MAY become ready after all selected units are canonical and other blockers are cleared

#### Scenario: Blocked custom source does not cross materialization

- **GIVEN** mission readiness is blocked by a saved custom roster instance
- **WHEN** materializer preflight receives that selected roster directly or through the launch page
- **THEN** the shared combat-adaptability predicate SHALL reject it before the first fetch
- **AND** no encounter, launch force, or game session SHALL be created or mutated
- **AND** no canonical or stock fallback `unitRef` SHALL replace the saved custom `unitRef`
