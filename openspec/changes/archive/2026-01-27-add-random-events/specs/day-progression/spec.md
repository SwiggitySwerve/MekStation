# day-progression Specification Delta

## ADDED Requirements

### Requirement: Random Events Processing

The system SHALL process random events daily with frequency-based routing (daily, weekly, monthly) for prisoner events, life events, contract events, and historical events.

#### Scenario: Random events processor registered

- **GIVEN** the day pipeline is initialized
- **WHEN** processors are registered
- **THEN** the random events processor is registered with id='random-events' and phase=DayPhase.EVENTS

#### Scenario: Life events fire daily

- **GIVEN** a campaign with useLifeEvents enabled
- **WHEN** advanceDay is called
- **THEN** life events are checked and generated if applicable

#### Scenario: Prisoner events fire on Mondays

- **GIVEN** a campaign with usePrisonerEvents enabled and currentDate is Monday
- **WHEN** advanceDay is called
- **THEN** prisoner events are processed based on capacity and overflow

#### Scenario: Contract events fire on 1st of month

- **GIVEN** a campaign with useContractEvents enabled and currentDate is 1st of month
- **WHEN** advanceDay is called
- **THEN** contract events are processed for all active contracts

#### Scenario: Gray Monday fires on specific dates

- **GIVEN** a campaign with simulateGrayMonday enabled and currentDate is 3132-08-09
- **WHEN** advanceDay is called
- **THEN** Gray Monday bankruptcy event is generated with 99% balance debit

#### Scenario: Disabled event categories produce no events

- **GIVEN** a campaign with usePrisonerEvents disabled
- **WHEN** advanceDay is called on Monday
- **THEN** no prisoner events are generated

#### Scenario: Random events included in day report

- **GIVEN** a day with random events generated
- **WHEN** advanceDay is called
- **THEN** DayReport.allEvents includes random event entries with category, severity, and effects
