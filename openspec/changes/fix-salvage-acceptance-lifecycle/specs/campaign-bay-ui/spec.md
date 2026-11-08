## ADDED Requirements

### Requirement: Whole-unit salvage acceptance follows enrollment

The system SHALL distinguish a mercenary salvage award from whole-unit
enrollment using one shared enrollment predicate. It SHALL display an awarded,
unenrolled whole unit as pending review, enable Accept, and exclude that unit
from the accepted-value total. Recorded force membership is enrollment evidence;
the decision boundary SHALL also recognize the loaded campaign's bound roster.

#### Scenario: Player accepts an allocated unit

- **GIVEN** an awarded mercenary unit that is not enrolled
- **WHEN** the player accepts it
- **THEN** the existing acknowledged enrollment boundary SHALL persist its roster entry, force membership and recovered damage exactly once
- **AND** a refused save SHALL leave it available for retry without partial holdings

#### Scenario: Enrolled salvage cannot be declined

- **GIVEN** a whole-unit candidate already recorded in campaign holdings
- **WHEN** the player or a direct store caller attempts decline
- **THEN** the decision SHALL refuse without mutation, dirty marking or persistence
- **AND** the panel SHALL disable both decisions for the accepted unit

#### Scenario: Concurrent decline cannot masquerade as acceptance

- **GIVEN** acceptance is in flight for a whole-unit candidate
- **WHEN** a decline is requested for that candidate
- **THEN** decline SHALL refuse with a short sentence while acceptance retains its existing result

#### Scenario: Cached projections cannot override enrollment

- **GIVEN** a saved campaign has allocation records and a stale cached bay projection
- **WHEN** its salvage bay is selected after reload
- **THEN** status and accepted value SHALL reflect current enrollment evidence
- **AND** a previously declined but enrolled unit SHALL remain displayed as accepted

#### Scenario: Declined salvage remains reviewable before enrollment

- **GIVEN** a declined whole-unit candidate that is not enrolled
- **WHEN** the player accepts it
- **THEN** the existing enrollment path SHALL remain available

#### Scenario: Co-op authority remains host owned

- **WHEN** a co-op guest attempts either decision
- **THEN** the action SHALL refuse without mutation
- **AND** host acceptance SHALL retain the existing PUT, journal and live-host persistence path
