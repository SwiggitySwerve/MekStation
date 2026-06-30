## ADDED Requirements

### Requirement: Networked tactical command authority surface
The networked tactical game surface SHALL expose host, guest, player, and GM command affordances through the same tactical command dock and map projection vocabulary used by solo play.

#### Scenario: Host GM command is available in networked tactical play
- **WHEN** a host or authorized GM opens a live networked tactical match
- **THEN** the tactical command surface SHALL expose GM intervention commands that preview effects, require approval, and commit through the authoritative host path

#### Scenario: Guest tactical surface mirrors authority
- **WHEN** a guest opens a live networked tactical match
- **THEN** the tactical command surface SHALL show legal player actions for guest-controlled units, route mutating commands as host-validated intents, and hide GM-private controls

### Requirement: Networked tactical player-safe result log
Networked tactical game surfaces SHALL show player-visible event logs that include public command and GM intervention outcomes without exposing private host or GM rationale.

#### Scenario: Guest sees public GM correction result
- **WHEN** a host commits a tactical GM correction during a networked match
- **THEN** the guest view SHALL show the public net effect in the feed and SHALL NOT show private rationale, hidden before/after details, or manual takeover notes
