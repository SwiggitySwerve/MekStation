## ADDED Requirements

### Requirement: Campaign Creation Recovery Preserves Population and Pending Work

Campaign creation SHALL reuse a pending campaign only after its selected units,
pilots, assignments and construction maxima preparation have completed. Both
ordinary creation and guest-mirror creation SHALL refuse replacement while the
persistence owner reports unacknowledged edits, an active save, a pending flush,
or an outstanding reconciliation/load read. Refusal SHALL leave the current
campaign, edit sequence and pending persistence work unchanged. A clean
replacement SHALL reset persistence and bind the new campaign identity with base
version zero. Legacy adoption SHALL retain its existing identity and history.

#### Scenario: Pilot registration fails before roster completion

- **GIVEN** registration of a selected pilot fails before population completes
- **WHEN** the user retries campaign creation
- **THEN** population SHALL run again before the campaign can report success
- **AND** the saved roster SHALL contain all selected units, registered pilots
  and their resolved assignments
- **AND** the failed attempt SHALL NOT report success or navigate

#### Scenario: Completed roster retries its failed save

- **GIVEN** population completed but server persistence failed
- **WHEN** the user retries
- **THEN** the same campaign, roster-instance and root-force identities SHALL
  be retained without repeating pilot registration

#### Scenario: Existing campaign has pending work

- **GIVEN** campaign A is dirty, saving, awaiting flush reconciliation, or has an
  outstanding reconciliation/load read
- **WHEN** ordinary creation or guest-mirror creation is requested
- **THEN** the request SHALL fail through the caller's existing error channel
- **AND** A, its edit sequence, pending timer and persistence state SHALL remain
  unchanged

#### Scenario: Clean campaign is replaced

- **GIVEN** campaign A has no unsettled persistence work
- **WHEN** campaign B is created
- **THEN** persistence SHALL identify B with base version zero and no inherited
  dirty state, metadata, conflict or source replay fence
- **AND** B's first save SHALL name B in both its request URL and envelope

#### Scenario: Guest mirror preserves host identity

- **GIVEN** campaign A has clean persistence
- **WHEN** a guest mirror is created from the host snapshot
- **THEN** the mirror and fresh persistence SHALL retain the host campaign id
- **AND** mirror creation SHALL NOT issue a campaign write

#### Scenario: Legacy adoption keeps its import contract

- **GIVEN** an existing browser campaign is offered for adoption
- **WHEN** the explicit adoption action runs
- **THEN** its identity and import version SHALL be retained
- **AND** ordinary save SHALL remain blocked until adoption succeeds
