# campaign-presets Delta Specification

## MODIFIED Requirements

### Requirement: Preset Definitions

The system SHALL define 4 built-in presets (CASUAL, STANDARD, FULL, CUSTOM) as IPresetDefinition objects with id, name, description, icon, and option overrides (Partial<ICampaignOptions>). Every built-in preset except CUSTOM SHALL define a positive startingFunds override so a newly created campaign begins with a viable balance.

#### Scenario: Casual preset configuration

- **GIVEN** the CASUAL preset definition
- **WHEN** its overrides are inspected
- **THEN** useTurnover is false, useTaxes is false, trackFactionStanding is false, useRandomEvents is false, and healingRateMultiplier is 2.0
- **AND** startingFunds is greater than 0 C-bills

#### Scenario: Standard preset configuration

- **GIVEN** the STANDARD preset definition
- **WHEN** its overrides are inspected
- **THEN** useTurnover is true, useRoleBasedSalaries is true, trackFactionStanding is true, useRandomEvents is true, and useTaxes is false
- **AND** startingFunds is greater than 0 C-bills

#### Scenario: Full preset configuration

- **GIVEN** the FULL preset definition
- **WHEN** its overrides are inspected
- **THEN** useTurnover is true, useRoleBasedSalaries is true, useTaxes is true, trackFactionStanding is true, and useRandomEvents is true
- **AND** startingFunds is greater than 0 C-bills

#### Scenario: Custom preset has no overrides

- **GIVEN** the CUSTOM preset definition
- **WHEN** its overrides are inspected
- **THEN** the overrides object is empty (uses createDefaultCampaignOptions defaults)

#### Scenario: Preset-created campaign is not born insolvent

- **GIVEN** a campaign created with the STANDARD preset applied
- **WHEN** the campaign dashboard finance summary is computed at creation time
- **THEN** the balance SHALL equal the preset's startingFunds
- **AND** the operations queue SHALL NOT raise a critical zero-runway finance alert solely from the starting state
