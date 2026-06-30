## ADDED Requirements

### Requirement: Playable command screen E2E journeys
Journey QC SHALL include automated E2E journeys for combat command, campaign starmap logistics, mission readiness roster handoff, Mek stable to customizer return, GM intervention redaction, and campaign persistence reload.

#### Scenario: Combat command journey validates preview and commit
- **WHEN** the combat command E2E journey runs
- **THEN** it SHALL select a unit, preview movement or attack, assert legal/illegal reasons, commit an action, and verify the committed state/log matches the preview

#### Scenario: Campaign logistics journey validates reload truth
- **WHEN** the campaign logistics E2E journey runs
- **THEN** it SHALL preview travel, commit travel, reload the campaign, and assert persisted location, date, finance, activity, and downstream state match the committed preview

#### Scenario: Readiness and customizer journey validates deployment handoff
- **WHEN** the readiness/customizer E2E journey runs
- **THEN** it SHALL select a mission roster, follow a blocker to stable or customizer, return to readiness, refresh validation, and verify encounter materialization receives the selected campaign roster

#### Scenario: GM redaction journey validates player and GM views
- **WHEN** the GM redaction E2E journey runs
- **THEN** it SHALL commit a GM intervention, assert the GM view shows private rationale and full diff, assert the player view shows only public net effect, and repeat after reload
