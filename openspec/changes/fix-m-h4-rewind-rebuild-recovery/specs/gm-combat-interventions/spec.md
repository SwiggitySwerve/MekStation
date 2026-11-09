## ADDED Requirements

### Requirement: Committed Rewind Survives a Failed Live Rebuild

A GM combat rewind that the journal has committed SHALL be answered as committed even when the live match host cannot be rebuilt. The commit route SHALL rebuild the live host before it stores the GM's private reason. When the rebuild fails, the route SHALL answer 200 with the committed result and SHALL add `rebuildPending: true` only while the host still serves the superseded session. A host whose rebuild failed before it claimed the activated branch SHALL keep that rebuild pending and SHALL retry it, inside its command queue, before its next command and after its next join, until a retry succeeds or the stream's effective head leaves that branch. A failure after the host claimed the branch SHALL NOT leave a rebuild pending. The pending rebuild SHALL NOT be persisted; restart recovery folds the activated branch. A rebuild SHALL NOT adopt, renew or release a correction lease it did not acquire.

#### Scenario: Rebuild failure after commit

- **GIVEN** a live host for a match whose rewind the journal has committed
- **WHEN** the live rebuild throws before the host claims the activated branch
- **THEN** the route SHALL answer 200 with `kind: 'committed'` and `rebuildPending: true`
- **AND** the route SHALL still store the GM's private reason

#### Scenario: Rebuild runs before the reason is stored

- **GIVEN** a committed rewind with a private reason
- **WHEN** storing the reason fails
- **THEN** the live host SHALL already serve the activated branch

#### Scenario: Next command heals a pending host

- **GIVEN** a host with a pending rebuild
- **WHEN** a player sends a command and the retried rebuild succeeds
- **THEN** the host SHALL serve the activated branch and admit the command

#### Scenario: Failed retry stays pending

- **GIVEN** a host with a pending rebuild
- **WHEN** the retried rebuild fails again
- **THEN** the command SHALL be refused as `STALE_BRANCH`
- **AND** the next command SHALL retry the rebuild again

#### Scenario: Seated join heals a pending host

- **GIVEN** a host with a pending rebuild
- **WHEN** a seated player joins
- **THEN** the host SHALL retry the rebuild and replay the rebuilt stream to attached sockets as a replacement stream

#### Scenario: Failure after the claim is not pending

- **GIVEN** a rebuild that fails after the host claimed the activated branch
- **WHEN** the next command arrives
- **THEN** the host SHALL NOT fold the branch again

#### Scenario: A concurrent correction's lease survives the rebuild

- **GIVEN** another owner holds the live correction lease on the match stream
- **WHEN** the live host rebuilds on the activated branch
- **THEN** that lease SHALL remain live with the same id, owner and fencing epoch

### Requirement: A Closed Host Is Not Rebuilt

A live host that has closed SHALL NOT be rebuilt from an activated rewind branch. `rebuildFromActivatedBranch` SHALL do nothing for a closed host, including a host that closes while its rebuild waits in the command queue, and SHALL NOT leave a rebuild pending for it. The rewind-commit route SHALL treat a closed host as having no live host and SHALL answer the committed result without `rebuildPending`. Boot recovery folds the activated branch for the match. Intents, lobby intents and joins to a closed or completed match remain refused by the existing guards.

#### Scenario: Rewind on a match whose host already closed

- **GIVEN** a match whose host closed on completion but is still registered
- **WHEN** a GM rewind commits
- **THEN** the route SHALL answer 200 `committed` without `rebuildPending`
- **AND** the closed host SHALL keep its session and served branch

#### Scenario: Host closes while the rebuild is queued

- **GIVEN** a rebuild waiting in a host's command queue
- **WHEN** the host closes before the rebuild runs
- **THEN** the rebuild SHALL NOT run

