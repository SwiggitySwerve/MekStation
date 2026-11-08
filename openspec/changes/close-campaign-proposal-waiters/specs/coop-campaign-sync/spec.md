## ADDED Requirements

### Requirement: Unique proposal identity
An arbiter and guest transport adapter SHALL reject proposal ID reuse within their lifetime with a mechanical rejection whose reason is malformed-intent. A duplicate SHALL NOT replace or resolve the first proposal, replace its timer or waiter, or commit a second action.

#### Scenario: Duplicate pending or completed ID
- **WHEN** a guest resubmits an ID while pending, committing, or already resolved
- **THEN** the second submission is rejected and the first retains its original payload and outcome

### Requirement: Terminal proposal closure
Closing the arbiter, runtime, or proposal connection SHALL resolve every pending guest caller with a session-closed result exactly once and remove its listeners and timers.

#### Scenario: Close during admission
- **WHEN** closure occurs before the initial submit promise returns pending
- **THEN** the registered caller still receives a terminal closure result

#### Scenario: Multiple pending callers
- **WHEN** explicit close, remote close, or runtime reset occurs
- **THEN** all callers settle and no terminal callback runs twice

#### Scenario: Reconnect replaces transport
- **WHEN** a new transport replaces an old transport
- **THEN** old callers settle without replaying their proposals and late callbacks cannot close the new transport
