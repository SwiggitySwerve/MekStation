## ADDED Requirements

### Requirement: Proposal submission failure feedback

The guest proposal hook SHALL catch a transport throw or promise rejection, record a local submission failure with useful error text, and release that action's pending state. This local failure SHALL NOT be represented as a server veto or mechanical rejection.

#### Scenario: Transport throws or rejects

- **GIVEN** a guest submits a campaign proposal
- **WHEN** its transport throws or rejects
- **THEN** the submission promise SHALL settle without an unhandled rejection
- **AND** the proposal feed and live announcement SHALL show the submission failure
- **AND** the pending indicator SHALL clear and the action SHALL permit retry

#### Scenario: Existing server outcomes

- **GIVEN** a guest submits a campaign proposal
- **WHEN** the transport returns an existing server outcome
- **THEN** the existing pending, committed, vetoed, mechanically rejected, and stale-head behavior SHALL be preserved
