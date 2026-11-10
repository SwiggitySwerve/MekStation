## ADDED Requirements

### Requirement: Routed Enemy Generates No Scenarios

The system SHALL generate no scenario for an ACTIVE contract whose enemy morale level is ROUTED, whatever the battle-chance roll. Every other level SHALL generate scenarios as before. This is the pinned MekHQ rule that scenario odds against a routed enemy are -1 (StratConRulesManager.java:4492-4495, e7adc2c). It is partial ROUTED behaviour: the early end, payout and rout end date that accompany a rout are not implemented, so a routed contract has no battles until a monthly morale check rallies it or it expires.

#### Scenario: A routed contract is skipped

- **GIVEN** a Monday, the AtB scenarios option on, and an ACTIVE contract at ROUTED with a combat team whose battle roll hits
- **WHEN** scenario generation runs
- **THEN** no scenario SHALL be generated for that contract

#### Scenario: Other levels still generate

- **GIVEN** the same setup at CRITICAL, WEAKENED, STALEMATE, ADVANCING, DOMINATING or OVERWHELMING
- **WHEN** scenario generation runs
- **THEN** a scenario SHALL be generated

#### Scenario: Only the routed contract is skipped

- **GIVEN** a routed contract and a STALEMATE contract, both ACTIVE
- **WHEN** scenario generation runs
- **THEN** a scenario SHALL be generated for the STALEMATE contract only
