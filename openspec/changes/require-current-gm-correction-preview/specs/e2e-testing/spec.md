## ADDED Requirements

### Requirement: Current successful GM correction preview
The GM correction producer SHALL authorize approval only after a successful preview of the exact correction request in the current match, credential, and mirror context. Approval SHALL submit that pinned request without rebuilding it and SHALL consume authorization before dispatch.

#### Scenario: Successful preview
- **WHEN** the current correction preview succeeds
- **THEN** Approve is enabled and submits exactly that request with the optional private reason

#### Scenario: Preview fails or is still pending
- **WHEN** preview has not succeeded, is pending, is refused, is unavailable, or throws
- **THEN** Approve is disabled and direct approval commits nothing

#### Scenario: Earlier preview becomes stale
- **WHEN** another preview starts or match, credential, or mirror context changes
- **THEN** previous authorization is invalid and a late completion cannot restore it

#### Scenario: Approval consumes preview
- **WHEN** approval dispatches, including a commit that later fails
- **THEN** another approval requires a new successful preview
