## ADDED Requirements

### Requirement: Single anomaly dismissal

An anomaly alert card SHALL begin dismissal once per mounted card and invoke its dismissal callback once after the existing 300 ms fade.

#### Scenario: Repeated pointer dismissal

- **GIVEN** an alert with a dismissal callback
- **WHEN** the user repeatedly clicks Dismiss before the fade completes
- **THEN** the callback SHALL run once with the anomaly identifier after 300 ms
- **AND** the card SHALL disappear

#### Scenario: Repeated keyboard dismissal

- **GIVEN** an alert with a dismissal callback
- **WHEN** the user activates Dismiss repeatedly with Enter or Space
- **THEN** the callback SHALL run once after the fade
- **AND** subsequent activation during the fade SHALL NOT schedule another callback
