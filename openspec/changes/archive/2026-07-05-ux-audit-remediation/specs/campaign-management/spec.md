# campaign-management Delta Specification

## ADDED Requirements

### Requirement: Creation Wizard Preset Funding

The campaign creation wizard SHALL apply the selected preset's option overrides (via applyPreset, including startingFunds) when creating the campaign, so the created campaign's starting balance reflects the chosen preset rather than defaulting to zero.

#### Scenario: Wizard passes preset options into creation

- **GIVEN** a user completes the creation wizard with the STANDARD preset selected
- **WHEN** the campaign is created
- **THEN** createCampaign SHALL receive the applied preset options including startingFunds
- **AND** the campaign's starting balance SHALL equal the preset's startingFunds

### Requirement: Creation Wizard Roster Persistence

Units and pilots added on the wizard's Roster step SHALL persist into the created campaign: the campaign dashboard Force Snapshot SHALL count them, and mission launch readiness SHALL see them. When the wizard roster contains exactly one unit and exactly one pilot, the pilot SHALL be auto-assigned to the unit.

#### Scenario: Wizard pilot appears in the created campaign

- **GIVEN** a user adds one unit and one pilot ("MechWarrior 1") on the wizard Roster step
- **WHEN** the campaign is created and the dashboard renders
- **THEN** the Force Snapshot SHALL report 1 mech and 1 pilot

#### Scenario: Lone pilot auto-assigns to lone unit

- **GIVEN** a wizard roster with exactly one unit and exactly one pilot
- **WHEN** the campaign is created
- **THEN** the pilot SHALL be assigned to the unit
- **AND** mission launch readiness for that unit SHALL NOT warn about a missing pilot

#### Scenario: Multi-unit roster leaves assignment explicit

- **GIVEN** a wizard roster with two units and one pilot with no assignment chosen
- **WHEN** the campaign is created
- **THEN** the pilot SHALL persist unassigned
- **AND** launch readiness SHALL surface the unassigned-pilot warning with an assignment affordance
