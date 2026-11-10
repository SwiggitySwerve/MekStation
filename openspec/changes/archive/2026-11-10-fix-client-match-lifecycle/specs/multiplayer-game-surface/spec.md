## ADDED Requirements

### Requirement: Client match lifecycle recovery

The client SHALL keep local match status `aborted` until explicit session reset.
Automatic WS readiness, match resume, P2P awareness, and P2P replay recovery SHALL
use the store's guarded status transition and SHALL NOT perform explicit reset.
The client SHALL clear pause metadata and its pause error together when recovery
succeeds, the match times out, or the connection closes. A seat timeout SHALL
replace the pause presentation with a terminal timeout error while continuing
to accept authoritative outcome events. Session teardown SHALL clear local match
status and grace facts so a later match does not inherit them.

#### Scenario: Replay readiness recovers a pending match

- **GIVEN** a paused client with pause metadata, a pause error, and pending local match status
- **WHEN** replay readiness or MatchResumed arrives
- **THEN** the client SHALL become ready and clear both pause fields and pending grace facts

#### Scenario: Seat timeout remains terminal through automatic recovery

- **GIVEN** a paused client
- **WHEN** SeatTimedOut arrives followed by readiness, MatchResumed, or MatchPaused
- **THEN** local match status SHALL remain aborted and the pause overlay SHALL remain absent
- **AND** authoritative outcome history SHALL continue to reach the mirror

#### Scenario: P2P recovery respects abort

- **GIVEN** an aborted local match
- **WHEN** peer awareness or reconnect replay reports recovery
- **THEN** local match status and its terminal grace facts SHALL remain unchanged

#### Scenario: Teardown permits a later match

- **GIVEN** a pending or aborted match
- **WHEN** the WS session or P2P match is torn down
- **THEN** local match status SHALL reset to live and grace facts SHALL clear
- **AND** a later P2P match SHALL NOT be refused because of the earlier local status

#### Scenario: Polling changes do not start a new match

- **GIVEN** an aborted P2P match
- **WHEN** polling dependencies change without changing the match identity
- **THEN** local match status SHALL remain aborted
