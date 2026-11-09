## ADDED Requirements

### Requirement: Reconnect request does not wait forever

A guest that has sent a `reconnect-request` SHALL stop waiting when the host
does not answer. The guest SHALL start a wait when the request is sent and
restart it on every `replay-stream` chunk for the match, and the final chunk
(`done: true`) SHALL end it. When the wait elapses, the guest SHALL show its
locally logged board and enter the host-pending state through the same path as
the pre-request host timeout; a match already `aborted` SHALL stay aborted.
A chunk that fails to apply SHALL be logged and SHALL NOT prevent later chunks
from being applied.

#### Scenario: Host never answers the request

- **GIVEN** a guest that sent a reconnect request
- **WHEN** no replay chunk arrives within the wait
- **THEN** the guest SHALL hydrate from its local match log and enter host-pending

#### Scenario: Replay chunks keep arriving

- **GIVEN** a guest receiving a multi-chunk replay
- **WHEN** each non-final chunk arrives before the wait elapses
- **THEN** the wait SHALL restart and the guest SHALL NOT enter host-pending

#### Scenario: One chunk fails to apply

- **GIVEN** a final chunk whose application throws
- **WHEN** a later final chunk arrives
- **THEN** the later chunk SHALL still be applied

### Requirement: Wrong-match reconnect is surfaced to the guest

A guest with a pending reconnect request SHALL treat a `peer-rejected`
envelope with reason `wrong-match` as a rejection of that request, before any
replay chunk has arrived: it SHALL stop waiting and redirect to the lobby.
Other `peer-rejected` reasons, and `wrong-match` outside that window, SHALL be
ignored by the reconnect session. No envelope kind or field is added.

#### Scenario: Host answers wrong-match

- **GIVEN** a guest that sent a reconnect request and received no replay chunk
- **WHEN** a `peer-rejected` envelope with reason `wrong-match` arrives
- **THEN** the guest SHALL redirect to the lobby and stop its wait
