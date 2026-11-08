## MODIFIED Requirements

### Requirement: Creation Wizard Roster Persistence

Units and pilots added on the wizard's Roster step SHALL persist into the created campaign: the campaign dashboard Force Snapshot SHALL count them, and mission launch readiness SHALL see them. When the wizard roster contains exactly one unit and exactly one pilot, the pilot SHALL be auto-assigned to the unit. A unit missing its required pilot SHALL be blocked from launch, following [MekHQ `Unit.checkDeployment()` at pinned e7adc2c](https://github.com/MegaMek/mekhq/blob/e7adc2c6f3b17ec8ad243d30843e22207fe935e4/MekHQ/src/mekhq/campaign/unit/Unit.java#L1660-L1691).

#### Scenario: Wizard pilot appears in the created campaign

- **GIVEN** a user adds one unit and one pilot ("MechWarrior 1") on the wizard Roster step
- **WHEN** the campaign is created and the dashboard renders
- **THEN** the Force Snapshot SHALL report 1 mech and 1 pilot

#### Scenario: Lone pilot auto-assigns to lone unit

- **GIVEN** a wizard roster with exactly one unit and exactly one pilot
- **WHEN** the campaign is created
- **THEN** the pilot SHALL be assigned to the unit
- **AND** mission launch readiness for that unit SHALL NOT report a missing pilot

#### Scenario: Multi-unit roster leaves assignment explicit

- **GIVEN** a wizard roster with two units and one pilot with no assignment chosen
- **WHEN** the campaign is created
- **THEN** the pilot SHALL persist unassigned
- **AND** readiness SHALL surface `pilot_unassigned` exactly once per affected unit as a blocker, never as a warning
- **AND** the reason SHALL retain "No pilot assigned. Assign one before launch." and an "Assign pilot" action linking to `/gameplay/campaigns/<campaignId>/personnel?intent=assign-pilot&unit=<unitId>`
- **AND** the dashboard, Mech Bay and mission launch page SHALL show the reason and assignment action

#### Scenario: Fresh assigned roster is ready after facts load

- **GIVEN** a fresh wizard roster with distinct unit instances, assigned active pilots, Ready construction condition and no deployment combat states
- **WHEN** snapshot authority and the canonical catalog have loaded
- **THEN** each unit SHALL be eligible and selected by default, whether construction maxima are present or absent
- **AND** missing combat states SHALL NOT imply destruction
- **AND** pending authority or catalog reads SHALL show a loading state before presenting the readiness selection panel
