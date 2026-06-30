## ADDED Requirements

### Requirement: Campaign customizer handoff
The customizer SHALL support campaign-origin edit sessions that preserve campaign id, unit id, optional mission id, return route, campaign date, rules level, budget, inventory/refit constraints, and canonical unit identity.

#### Scenario: Campaign unit opens in editor
- **WHEN** a player opens the customizer from mission readiness or the Mek stable
- **THEN** the editor SHALL load the campaign-owned unit context and SHALL indicate that changes will be applied through campaign refit or campaign unit update semantics

#### Scenario: Return refreshes readiness
- **WHEN** a player saves or cancels a campaign-origin customizer session
- **THEN** the app SHALL return to the originating readiness or stable context and SHALL refresh deployment validation against canonical campaign state
