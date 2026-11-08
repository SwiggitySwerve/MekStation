## ADDED Requirements

### Requirement: Co-op mission launch is resumable and exclusive

The host SHALL acquire a synchronous guard before the first asynchronous launch operation, scoped per campaign, session and mission. It SHALL retain created identities and resume the failed stage without duplicating successful work. The guard SHALL NOT block a different mission or single-player launch.

#### Scenario: Overlapping launch calls

- **GIVEN** a host with synchronized deploying participation and ready units
- **WHEN** two calls launch the same mission before either can finish
- **THEN** only one shared match and local encounter SHALL be created
- **AND** the durable mission SHALL contain that encounter id exactly once

#### Scenario: Remote response is lost after commit

- **GIVEN** match creation committed but its response was lost
- **WHEN** the host retries
- **THEN** the identical prepared request SHALL recover the same shared match
- **AND** only one local encounter id SHALL be checkpointed

#### Scenario: Checkpoint fails or conflicts

- **GIVEN** the encounter launched but its campaign checkpoint failed
- **WHEN** the host retries, resynchronizing first after a conflict
- **THEN** the existing encounter SHALL be checkpointed without relaunching
- **AND** a conflicting campaign SHALL NOT be force-overwritten

#### Scenario: Navigation fails

- **GIVEN** the encounter and campaign checkpoint succeeded
- **WHEN** navigation rejects or is cancelled
- **THEN** retry SHALL navigate using the same encounter without another launch or checkpoint

#### Scenario: Campaign day is advancing

- **GIVEN** a day advance is in flight
- **WHEN** the host attempts a new co-op mission launch
- **THEN** launch SHALL be refused before side effects and the control SHALL be disabled

### Requirement: Guests join the host-recorded encounter

Guests SHALL retain participation choices and SHALL join the host-recorded encounter without creating encounters or saving campaign mutations. The guest surface SHALL explain that the host starts the mission. Button labels SHALL use Title Case.

#### Scenario: Guest bypasses the launch UI

- **GIVEN** an authenticated guest in a co-op campaign
- **WHEN** the guest posts a mission-create request, including a retry for an existing match
- **THEN** the server SHALL refuse it with `403 COOP_MISSION_HOST_REQUIRED` before durable writes
- **AND** guest participation and tactical command permissions SHALL remain unchanged

#### Scenario: Deploying guest joins

- **GIVEN** the host has checkpointed the encounter id
- **WHEN** a deploying guest joins the mission
- **THEN** the guest SHALL refresh the authoritative record and navigate to that encounter
- **AND** the guest SHALL NOT create a match, encounter or campaign checkpoint

#### Scenario: Guest remains in HQ or host has not checkpointed

- **GIVEN** a guest chooses command HQ or the host has not yet recorded an encounter
- **WHEN** the guest attempts to join
- **THEN** HQ participation SHALL route to the campaign and a deploying guest without an encounter SHALL receive a waiting explanation
- **AND** neither path SHALL create an encounter or campaign checkpoint
