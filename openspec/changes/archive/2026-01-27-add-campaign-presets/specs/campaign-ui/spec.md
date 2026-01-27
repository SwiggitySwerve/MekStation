## ADDED Requirements

### Requirement: Campaign Creation Wizard
The system SHALL provide a multi-step campaign creation wizard with 4 steps: campaign type selection, preset selection, option customization, and summary/confirmation.

#### Scenario: Wizard step 1 - Campaign type selection
- **WHEN** the user opens the campaign creation wizard
- **THEN** 5 campaign types are displayed as selectable cards with name, icon, and description

#### Scenario: Wizard step 2 - Preset selection
- **WHEN** the user selects a campaign type and proceeds
- **THEN** 4 presets (Casual, Standard, Full, Custom) are displayed with feature comparison highlights

#### Scenario: Wizard step 3 - Option customization
- **WHEN** the user selects a preset and proceeds
- **THEN** all campaign options are displayed grouped by OptionGroupId in collapsible panels, pre-filled with the selected preset's values

#### Scenario: Wizard step 4 - Summary
- **WHEN** the user completes customization and proceeds
- **THEN** a summary of all selected options is displayed with campaign name input and a create button

### Requirement: Option Group Panel
The system SHALL render campaign options grouped by OptionGroupId with appropriate input controls (toggles for booleans, number inputs with min/max for numbers, dropdowns for enums).

#### Scenario: Boolean option rendering
- **GIVEN** an option with type 'boolean'
- **WHEN** the option group panel renders
- **THEN** a toggle switch is displayed with the option's label and description

#### Scenario: Number option with range
- **GIVEN** an option with type 'number', min 0, max 100, step 1
- **WHEN** the option group panel renders
- **THEN** a number input is displayed constrained to the specified range
