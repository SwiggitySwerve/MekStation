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

### Requirement: Restart Keeps Seated Players Resynced After a Rewind

Boot recovery of a match whose effective head sits on an activated rewind branch SHALL mark the host and every seated player for resync, exactly as the live rebuild does, so that a seated player's next join replays from the rebuilt head regardless of the `lastSeq` it quotes. The mark SHALL be consumed by that join. Boot recovery SHALL NOT mark spectators, and SHALL NOT mark a match whose effective head is on the live path. The mark SHALL NOT be persisted.

#### Scenario: Stale lastSeq after a restart replays the rebuilt head

- **GIVEN** a match rewound before a restart, and a seated player whose client holds events from the superseded stream
- **WHEN** that player rejoins the recovered host quoting a `lastSeq` past the rebuilt head
- **THEN** the host SHALL replay the rebuilt stream from its start

#### Scenario: The mark is consumed

- **GIVEN** a seated player who has rejoined the recovered host once
- **WHEN** the player rejoins quoting the rebuilt head's last sequence
- **THEN** the host SHALL resume from that sequence and replay nothing

#### Scenario: Spectators and never-rewound matches are not marked

- **GIVEN** a recovered host with a spectator seat, or a recovered match that was never rewound
- **WHEN** the spectator, or any player, rejoins quoting the last sequence they hold
- **THEN** the host SHALL resume from that sequence

