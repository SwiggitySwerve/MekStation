## ADDED Requirements

### Requirement: Mek stable deployment readiness
The Mek stable SHALL show deployment readiness for each unit, including unit status, pilot assignment, damage summary, repair/refit tickets, ammo or supply gaps, Battle Value or weight where available, and mission eligibility reasons.

#### Scenario: Stable row explains deployment eligibility
- **WHEN** a unit appears in the Mek stable while a mission context is active
- **THEN** the row SHALL show whether the unit is eligible, why it is blocked or risky, and which action can resolve the blocker

### Requirement: Stable actions preserve campaign context
The Mek stable SHALL route repair, refit, customizer, pilot, acquisition, and readiness actions with campaign and mission return context where applicable.

#### Scenario: Player fixes a blocked unit from stable
- **WHEN** a player opens a fix action for an ineligible unit
- **THEN** the destination surface SHALL receive the campaign unit identity and SHALL return to the stable or readiness screen with validation refreshed
