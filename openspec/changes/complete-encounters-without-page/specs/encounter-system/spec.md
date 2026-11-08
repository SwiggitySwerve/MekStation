## ADDED Requirements

### Requirement: Headless Fast-Forward Encounter Completion
Campaign fast-forward SHALL link the materialized encounter to the session it actually fought and SHALL complete that encounter through the server session boundary before publishing the battle's combat outcome. A refused link or completion SHALL fail the battle without publishing an outcome. Fast-forward SHALL NOT send restart intent.

#### Scenario: Fast-forwarded battle completes its encounter
- **GIVEN** a bridged scenario materialized into a fresh Ready encounter
- **WHEN** the fast-forward runner resolves the battle
- **THEN** the encounter SHALL be Completed and linked to the resolved session ID
- **AND** the combat outcome SHALL be published afterwards

#### Scenario: Refused completion publishes nothing
- **GIVEN** a fast-forward battle whose session link or completion is refused
- **WHEN** the runner reaches the encounter lifecycle step
- **THEN** the runner SHALL fail with the refusal
- **AND** no combat outcome SHALL be pending for the campaign

### Requirement: Teardown Does Not Complete Encounters
Closing or unmounting a game session without a terminal outcome SHALL NOT submit or perform encounter completion. Only a Completed session with a terminal history SHALL be submitted for completion.

#### Scenario: Unmounting an unfinished encounter game
- **GIVEN** a game page showing an encounter-linked session in Setup, Active or Abandoned status
- **WHEN** the page unmounts
- **THEN** no encounter completion SHALL be submitted

#### Scenario: Completed control
- **GIVEN** a game page showing a Completed encounter-linked session
- **WHEN** the page mounts and unmounts
- **THEN** its terminal history SHALL be submitted exactly once
