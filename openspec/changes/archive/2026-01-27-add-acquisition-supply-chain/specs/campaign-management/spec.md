## MODIFIED Requirements

### Requirement: Campaign Options

The system SHALL support 80 configurable campaign options organized by category (personnel, financial, combat, force, general, acquisition), including 15 new acquisition-related options.

#### Scenario: Default acquisition options are sensible

- **GIVEN** createDefaultCampaignOptions is called
- **WHEN** the options are inspected
- **THEN** useAcquisitionSystem is false, usePlanetaryModifiers is true, acquisitionTransitUnit is 'month', clanPartsPenalty is true, acquisitionSkillModifier is true, useAutoLogistics is false, autoLogisticsStockTarget is 100, and all acquisition options have valid default values

#### Scenario: Acquisition system can be enabled

- **GIVEN** a campaign with useAcquisitionSystem set to true
- **WHEN** the day processor runs
- **THEN** the acquisition processor attempts pending acquisitions and delivers arrived items

#### Scenario: Planetary modifiers affect acquisition

- **GIVEN** a campaign with usePlanetaryModifiers set to true
- **WHEN** an acquisition roll is calculated
- **THEN** planetary tech sophistication, industrial capacity, and output ratings modify the target number

#### Scenario: Transit units are configurable

- **GIVEN** a campaign with acquisitionTransitUnit set to 'week'
- **WHEN** delivery time is calculated
- **THEN** the result is in weeks instead of months

#### Scenario: Clan parts penalty applies in era

- **GIVEN** a campaign in year 3055 with clanPartsPenalty set to true
- **WHEN** acquiring a clan part
- **THEN** a +3 penalty is applied to the target number

#### Scenario: Auto-logistics can be enabled

- **GIVEN** a campaign with useAutoLogistics set to true
- **WHEN** the day processor runs
- **THEN** units are scanned for needed parts and acquisition requests are auto-queued
