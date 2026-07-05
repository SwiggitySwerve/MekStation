# campaign-presets Specification

## Purpose

Defines Campaign Presets requirements for Preset Definitions, Option Metadata Registry, Preset Application Service, and Preset Export and Import, preserving the source-of-truth scope introduced by archived change add-campaign-presets.
## Requirements
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

### Requirement: Option Metadata Registry

The system SHALL maintain an OPTION_META registry mapping every ICampaignOptions key to metadata including group (OptionGroupId), label, description, type (boolean/number/string/enum), optional min/max/step for numbers, optional enumValues, and defaultValue.

#### Scenario: Every option has metadata

- **GIVEN** the ICampaignOptions interface has N keys
- **WHEN** OPTION_META is inspected
- **THEN** exactly N entries exist, one per ICampaignOptions key

#### Scenario: Metadata includes valid group assignment

- **GIVEN** OPTION_META entry for 'healingRateMultiplier'
- **WHEN** the entry is inspected
- **THEN** group is OptionGroupId.PERSONNEL, type is 'number', min is 0, and a label and description are present

### Requirement: Preset Application Service

The system SHALL provide an applyPreset function that layers defaults, campaign type adjustments, and preset overrides to produce a complete ICampaignOptions.

#### Scenario: Apply preset layers correctly

- **GIVEN** campaign type MERCENARY and preset CASUAL
- **WHEN** applyPreset is called
- **THEN** the result contains all default options with MERCENARY type adjustments and CASUAL overrides applied on top

#### Scenario: Apply preset for CLAN type

- **GIVEN** campaign type CLAN and preset STANDARD
- **WHEN** applyPreset is called
- **THEN** allowClanEquipment is true (from CLAN type defaults) and useTurnover is true (from STANDARD preset)

### Requirement: Preset Export and Import

The system SHALL provide exportPreset (ICampaignOptions to JSON string) and importPreset (JSON string to Partial<ICampaignOptions>) functions for community sharing.

#### Scenario: Export roundtrip

- **GIVEN** a set of campaign options
- **WHEN** exportPreset is called and the result is passed to importPreset
- **THEN** the imported options match the original options exactly

#### Scenario: Import invalid JSON

- **GIVEN** an invalid JSON string "not valid json"
- **WHEN** importPreset is called
- **THEN** an error is thrown

### Requirement: Option Validation

The system SHALL validate campaign options for numeric ranges, type correctness, and logical consistency, returning errors for invalid values and warnings for suboptimal combinations.

#### Scenario: Negative salary multiplier

- **GIVEN** options with salaryMultiplier set to -1
- **WHEN** validateCampaignOptions is called
- **THEN** the result contains an error for salaryMultiplier being below minimum

#### Scenario: Tax rate out of range

- **GIVEN** options with taxRate set to 150
- **WHEN** validateCampaignOptions is called
- **THEN** the result contains an error for taxRate exceeding maximum of 100

#### Scenario: Logical dependency warning

- **GIVEN** options with useTaxes true but useRoleBasedSalaries false
- **WHEN** validateCampaignOptions is called
- **THEN** the result contains a warning about taxes requiring salary tracking for meaningful impact

### Requirement: Campaign Type Defaults

The system SHALL provide getCampaignTypeDefaults that returns type-specific option overrides (e.g., CLAN enables allowClanEquipment, HOUSE_COMMAND sets salaryMultiplier to 0, PIRATE adjusts salvage rates).

#### Scenario: Clan type defaults

- **GIVEN** CampaignType.CLAN
- **WHEN** getCampaignTypeDefaults is called
- **THEN** allowClanEquipment is true and useFactionRules is true

#### Scenario: House Command type defaults

- **GIVEN** CampaignType.HOUSE_COMMAND
- **WHEN** getCampaignTypeDefaults is called
- **THEN** salaryMultiplier is 0 (house pays salaries)

#### Scenario: Mercenary type has no special defaults

- **GIVEN** CampaignType.MERCENARY
- **WHEN** getCampaignTypeDefaults is called
- **THEN** an empty overrides object is returned (uses standard defaults)
