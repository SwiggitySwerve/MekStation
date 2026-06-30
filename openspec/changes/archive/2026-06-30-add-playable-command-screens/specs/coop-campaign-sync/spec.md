## ADDED Requirements

### Requirement: Co-op campaign command authority projection
Co-op campaign command screens SHALL map host and guest roles into the shared command-screen authority model. Hosts SHALL see authoritative campaign and GM controls for owned campaigns, while guests SHALL see proposal, normal player action, and public-result views only.

#### Scenario: Host sees authoritative campaign commands
- **WHEN** a host opens a co-op campaign command screen
- **THEN** the screen SHALL expose host-authorized preview, approve, veto, manual takeover, and GM correction controls for commands that affect campaign state

#### Scenario: Guest sees proposal or public command path
- **WHEN** a guest opens the same co-op campaign command screen
- **THEN** the screen SHALL hide host-only and GM-private controls and SHALL route mutating actions through proposal or validated player command paths

### Requirement: Co-op player-safe GM result projection
Co-op campaign GM interventions SHALL project public net effects to guests while preserving private rationale and full correction details for authorized host or owner GM views.

#### Scenario: Guest receives redacted intervention result
- **WHEN** the host commits a GM campaign intervention in a co-op campaign
- **THEN** the guest SHALL receive a public command result that explains the net effect and SHALL NOT receive private GM rationale or hidden correction context
