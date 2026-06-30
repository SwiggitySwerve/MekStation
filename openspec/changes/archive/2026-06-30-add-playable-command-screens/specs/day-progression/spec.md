## ADDED Requirements

### Requirement: Time cascade preview for logistics
The day progression system SHALL support logistics previews that process multiple days sequentially without mutating campaign state until the command is approved.

#### Scenario: Preview travel days without mutation
- **WHEN** a route preview requires multiple travel days
- **THEN** the system SHALL produce day-by-day projected reports for repairs, medical recovery, contracts, daily costs, and queued battle outcomes without changing the active campaign

#### Scenario: Commit reuses cascade semantics
- **WHEN** the approved route is committed
- **THEN** the committed day reports SHALL use the same processors and ordering as the preview path
