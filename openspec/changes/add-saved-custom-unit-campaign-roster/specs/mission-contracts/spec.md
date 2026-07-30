## ADDED Requirements

### Requirement: Saved Custom Unit Readiness Boundary

Mission readiness SHALL preserve a saved custom roster instance and its exact custom source `unitRef` while treating that source as unavailable for canonical-only combat adaptation. Until a separate custom-combat contract exists, every selected saved custom unit SHALL block launch with a per-unit canonical-combat-unavailable reason. The system SHALL NOT substitute a stock unit or create an encounter, launch force, or game session for the blocked selection.

#### Scenario: Saved custom roster unit remains visible but cannot launch

- **GIVEN** a selected campaign roster instance whose `unitRef` identifies a saved custom BattleMech
- **WHEN** mission readiness projects the selected roster
- **THEN** the roster instance SHALL remain visible with its exact roster-instance id and custom `unitRef`
- **AND** readiness SHALL mark that instance non-launchable with a canonical-combat-unavailable reason that names the unit
- **AND** the overall launch projection SHALL remain blocked

#### Scenario: Blocked custom source does not cross materialization

- **GIVEN** mission readiness is blocked by a saved custom roster instance
- **WHEN** the player attempts to proceed toward mission launch
- **THEN** encounter materialization SHALL NOT run
- **AND** no encounter, launch force, or game session SHALL be created or mutated
- **AND** no canonical or stock fallback `unitRef` SHALL replace the saved custom `unitRef`
