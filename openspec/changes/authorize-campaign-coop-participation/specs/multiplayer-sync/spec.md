## ADDED Requirements

### Requirement: Co-op participation is server-authorized

The participation binder SHALL derive player, role, campaign, match, and revision from verified server state and SHALL accept only `{ missionId, forceId, choice }` against the current CAMP-01B projection.

#### Scenario: Authorized choice is accepted

- **WHEN** a verified participant submits a valid mission, projected force, and choice at the current registry revision
- **THEN** the server SHALL accept the choice for the derived player and role
- **AND** the session SHALL retain the registry's roster and force projection unchanged

#### Scenario: Identity and full-force fields are rejected

- **WHEN** a client includes player, role, campaign, match, revision, roster, or full-force fields
- **THEN** binding SHALL reject the payload before state mutation
- **AND** the server SHALL never trust those fields as authority

#### Scenario: Foreign or stale choice is rejected

- **WHEN** a choice names a foreign campaign/match/mission, an unknown or foreign force, a stale revision, or a force outside the registered membership
- **THEN** participation SHALL be rejected before publication or launch
- **AND** no roster, force, role, or participant state SHALL be replaced

#### Scenario: Stale connection must rebind

- **WHEN** the connection's server-acknowledged baseline revision differs from the registry's current revision at atomic admission
- **THEN** the choice SHALL be rejected before mutation
- **AND** the connection SHALL require server-owned rebind/rehydration before a later choice
- **AND** a client-supplied revision MUST NOT repair or advance the connection baseline

#### Scenario: Duplicate choice is idempotent

- **WHEN** the same derived participant repeats the identical accepted choice
- **THEN** the server SHALL return the existing acceptance without a second mutation
- **AND** a conflicting repeat SHALL be rejected
