## MODIFIED Requirements

### Requirement: Campaign Creation Wizard

The system SHALL provide a multi-step campaign creation wizard with 4 steps: campaign type selection, preset selection, option customization, and summary/confirmation. Roster units created by the wizard SHALL be canonical-backed — each stored roster entry carries a canonical `unitRef` resolvable in the canonical unit dataset — and wizard-created pilots SHALL be registered in the pilot vault with distinct default names.

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

#### Scenario: Roster units are canonical-backed

- **WHEN** the user adds a weight-class unit in the wizard roster step and creates the campaign
- **THEN** the stored roster entry SHALL carry a canonical `unitRef` that resolves in the canonical unit dataset
- **AND** campaign surfaces (Mech Bay, force views, encounter materialization) SHALL show that unit's real name, weight, and battle value (never "not cataloged")

#### Scenario: Wizard pilots are distinct and vault-registered

- **WHEN** the user adds multiple pilots in the wizard roster step and creates the campaign
- **THEN** each pilot SHALL receive a distinct default name (e.g. "MechWarrior 1", "MechWarrior 2", …)
- **AND** each pilot SHALL be registered in the pilot vault such that the Personnel detail panel resolves progression, abilities, and assignment (never "Pilot not found in vault")
