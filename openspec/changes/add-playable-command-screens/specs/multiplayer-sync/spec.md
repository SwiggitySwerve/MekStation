## ADDED Requirements

### Requirement: Authoritative command result sync
Multiplayer sync SHALL replicate committed command results, not untrusted local mutations, for player actions, host decisions, and GM interventions.

#### Scenario: Guest intent resolves through host commit
- **WHEN** a guest submits a playable command intent during a networked match
- **THEN** the host SHALL validate the intent, append the authoritative command result or rejection, and replicate that result back to the guest

#### Scenario: Host GM intervention replicates redacted result
- **WHEN** a host commits a GM intervention during a networked match
- **THEN** sync SHALL broadcast the public result payload to guests and SHALL keep private GM metadata out of guest-replayed event streams

### Requirement: Reconnect preserves command authority and redaction
Reconnect and replay SHALL preserve host authority, guest mirror state, command results, and GM redaction boundaries.

#### Scenario: Guest reconnects after GM intervention
- **WHEN** a guest reconnects after a host committed a GM intervention
- **THEN** replay SHALL reconstruct the public resulting state and event feed without exposing private GM rationale or hidden correction details
