# day-progression Specification Delta

## ADDED Requirements

### Requirement: Market Processors
The system SHALL process three market types via day processors with appropriate frequencies.

#### Scenario: Unit market processor registered
- **GIVEN** the day pipeline is initialized
- **WHEN** processors are registered
- **THEN** the unit market processor is registered with id='unit-market' and phase=DayPhase.MARKETS

#### Scenario: Personnel market processor registered
- **GIVEN** the day pipeline is initialized
- **WHEN** processors are registered
- **THEN** the personnel market processor is registered with id='personnel-market' and phase=DayPhase.MARKETS

#### Scenario: Contract market processor registered
- **GIVEN** the day pipeline is initialized
- **WHEN** processors are registered
- **THEN** the contract market processor is registered with id='contract-market' and phase=DayPhase.MARKETS

#### Scenario: Market events included in day report
- **GIVEN** a day with market refreshes
- **WHEN** advanceDay is called
- **THEN** DayReport.allEvents includes market refresh events with offer counts
