## ADDED Requirements

### Requirement: Co-op creation personnel market disclosure

The co-op campaign creation surface SHALL resolve its preset options through the existing preset service. When the resolved `personnelMarketStyle` is `DISABLED`, it SHALL show the following hint beside the defaults notice: "This preset has no personnel market. Hiring recruits requires a preset with a personnel market enabled." It SHALL hide that hint when the resolved personnel market is enabled. This disclosure SHALL NOT change preset values, campaign creation behavior, initial market seeding, or failed-create cleanup.

#### Scenario: Standard co-op preset has no personnel market

- **GIVEN** co-op creation uses the Standard preset and Mercenary faction
- **WHEN** the creation entry panel is displayed
- **THEN** the resolved personnel market is disabled
- **AND** the hiring hint is visible beside the defaults notice before creation

#### Scenario: Resolved co-op preset enables a personnel market

- **GIVEN** the preset service resolves co-op options with an enabled personnel market
- **WHEN** the creation entry panel is displayed
- **THEN** the disabled-market hiring hint is absent
