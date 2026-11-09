## ADDED Requirements

### Requirement: External campaign persistence transition ownership

Production callers outside the persistence owner SHALL use named actions that
dispatch through the campaign save reducer instead of writing persistence
fields directly. The actions SHALL preserve the existing ordering and guards.

#### Scenario: Creation exposes reset before identity binding

- **GIVEN** settled persistence for an existing campaign
- **WHEN** a solo campaign, co-op host campaign, or guest mirror is created
- **THEN** observers SHALL see the reset snapshot followed by the new campaign id
- **AND** pending-work guards and guest identity SHALL remain unchanged

#### Scenario: Day rollback restores only a newly dirtied state

- **GIVEN** rollback restores campaign content and wiring marks it dirty
- **WHEN** persistence was clean before that restoration
- **THEN** the named action SHALL clear dirty without changing editSeq or diagnostics
- **AND** it SHALL leave the wiring's existing timer behavior unchanged

#### Scenario: Rollback dirty restoration is a no-op

- **GIVEN** persistence was already dirty or is still clean
- **WHEN** dirty restoration is requested
- **THEN** the action SHALL dispatch nothing and notify no subscribers

#### Scenario: Failed co-op creation restores the captured context

- **GIVEN** an unacknowledged co-op creation fails and its campaign still owns the page
- **WHEN** cleanup succeeds
- **THEN** it SHALL retain acknowledged-id deletion and reset coordination first
- **AND** restore the previous campaign before restoring its captured persistence snapshot
- **AND** snapshot restoration SHALL preserve the existing intervening timer behavior

#### Scenario: A later campaign selection owns its own state

- **GIVEN** a later campaign was selected while co-op creation was in flight
- **WHEN** creation cleanup runs
- **THEN** it SHALL NOT reset or restore persistence over that later selection
