# personnel-management Specification Delta

## MODIFIED Requirements

### Requirement: Injury Tracking
The system SHALL track personnel injuries with type, location, severity, healing time, permanent flag, modifiers, and prosthetic status.

#### Scenario: Injury has all required fields
- **GIVEN** a person with an injury
- **WHEN** the injury is inspected
- **THEN** injury has type, location, severity (1-5), daysToHeal, permanent flag, skillModifier, and attributeModifier

#### Scenario: Permanent injury has flag set
- **GIVEN** a person with a permanent injury
- **WHEN** the injury is inspected
- **THEN** permanent flag is true and injury does not heal naturally

#### Scenario: Prosthetic injury has flag set
- **GIVEN** a person with a prosthetic installed
- **WHEN** the injury is inspected
- **THEN** hasProsthetic flag is true, skillModifier is 0, and attributeModifier is -1

#### Scenario: Multiple injuries compound difficulty
- **GIVEN** a person with 4 injuries
- **WHEN** medical check is performed with tougherHealing enabled
- **THEN** target number penalty is max(0, 4-2) = +2
