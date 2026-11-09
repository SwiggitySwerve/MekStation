## ADDED Requirements

### Requirement: Single Open Refit Admission

The refit owner SHALL define active as in-progress and open as proposed or active. The campaign action SHALL refuse a new order for a unit with an open order, an unowned unit, a stale campaign context or a guest mirror before mutation.

#### Scenario: A proposed order reserves its unit

- **GIVEN** a unit with a proposed or in-progress order
- **WHEN** another order is committed for that unit
- **THEN** the action SHALL refuse without mutation or dirty marking
- **AND** completed and cancelled history SHALL NOT prevent a later order

#### Scenario: Guest mirrors cannot author refits

- **GIVEN** a guest campaign mirror
- **WHEN** creation or cancellation is requested
- **THEN** the action SHALL refuse before changing the mirror

### Requirement: Refit Cancellation

The system SHALL allow cancellation by order ID from either open status, changing only status to cancelled. Terminal or missing orders SHALL remain unchanged. Cancellation SHALL NOT create money, inventory or configuration changes.

#### Scenario: Cancel work already started

- **GIVEN** an in-progress order with recorded hours
- **WHEN** the host cancels that order
- **THEN** its status SHALL become cancelled with all other fields preserved
- **AND** subsequent days SHALL neither advance it nor apply its target
- **AND** the saved record SHALL retain the cancelled order

### Requirement: Read-Safe Legacy Refit Conflicts

The system SHALL load and round-trip all duplicate orders without silently deduplicating them. Multiple open orders for a unit SHALL pause that unit's refit progress and report a conflict until explicit cancellations leave one open order.

#### Scenario: Resolve old duplicate orders explicitly

- **GIVEN** a saved campaign with multiple open orders for one unit
- **WHEN** the campaign loads and advances a day
- **THEN** all those orders and their hours SHALL remain intact
- **AND** other units' unconflicted refits SHALL continue
- **WHEN** the player cancels orders by ID until one open order remains
- **THEN** the remaining active order SHALL progress normally

### Requirement: Refit Cancellation Surface

The Mech Bay SHALL list every open order with progress and a Cancel Refit control. Guest controls SHALL be disabled. Labels SHALL use Title Case and messages SHALL be short sentence-case sentences, using existing bay styling. Save failures SHALL remain visible and retryable, without claiming durable success.

#### Scenario: A refit save is retried

- **GIVEN** an order was created or cancelled locally but persistence failed
- **WHEN** the player retries saving
- **THEN** the same order SHALL be saved without creating a second order
- **AND** durable success SHALL be reported only after acknowledgement
