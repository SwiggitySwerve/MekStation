## ADDED Requirements

### Requirement: Acquisition Request Identity and Legacy Compatibility

The system SHALL allocate a unique ID when creating each acquisition request,
independent of queue length, and SHALL reject insertion of an already-used ID.
The same deterministic, idempotent normalizer SHALL repair legacy duplicate IDs
and failed requests through local and server campaign hydration. It SHALL preserve
request order, quantities, attempts and delivered inventory without replaying
historical deliveries or reconstructing lost stock.

#### Scenario: Remove then add the same part

- **GIVEN** two requests for the same part and the first is removed
- **WHEN** another request is added
- **THEN** its ID differs from both prior requests and removing the survivor removes only that survivor

#### Scenario: Normalize old saves through both loaders

- **GIVEN** a saved list containing colliding IDs and terminal failed requests
- **WHEN** the server and local loaders hydrate it
- **THEN** both produce identical unique IDs and failed requests become pending
- **AND** loading the repaired save again produces identical request data
- **AND** an already-delivered row retains the original ID ahead of an undelivered duplicate

#### Scenario: Missing legacy attempt date

- **GIVEN** a previously attempted request without a valid lastAttemptDate
- **WHEN** the save is hydrated
- **THEN** lastAttemptDate is set to the saved campaign date without incrementing attempts
- **AND** repeated hydration does not move that date

### Requirement: Acquisition Retry Waiting Period

The system SHALL keep unsuccessful acquisitions pending indefinitely and retry
after seven campaign calendar days, matching the default WAITING_PERIOD at MekHQ
e7adc2c6f3b17ec8ad243d30843e22207fe935e4. Each actual roll SHALL increment attempts
once and set lastAttemptDate. A cooldown skip SHALL consume no RNG, increment no
attempts and emit no acquisition-roll event. No persisted option SHALL be added.

#### Scenario: Failure remains pending through cooldown

- **GIVEN** an acquisition roll fails on day D
- **WHEN** daily processing runs again on D through D+6
- **THEN** it stays pending with unchanged attempts and no new roll
- **WHEN** processing reaches D+7
- **THEN** another attempt is made

#### Scenario: Unlimited retries and eventual delivery

- **GIVEN** a request has failed repeatedly with the waiting period observed
- **WHEN** another eligible roll succeeds
- **THEN** it enters transit and eventually delivers its quantity exactly once

#### Scenario: Reload and campaign day routes preserve cooldown

- **GIVEN** a failed request is pending during its waiting period
- **WHEN** campaign saves reload or fast-forward or co-op day progression runs
- **THEN** the existing attempt date controls eligibility through the same daily processor
