## ADDED Requirements

### Requirement: Command ledger redaction boundary
GM command ledgers SHALL store private rationale and full before/after diffs for authorized GM views while projecting only public net effects to players.

#### Scenario: Private rationale is owner-only
- **WHEN** a GM intervention includes hidden rationale or private correction notes
- **THEN** owner or host GM views MAY display that rationale, and player views SHALL display only the public summary and resulting state changes

#### Scenario: Redaction survives reload
- **WHEN** a player reloads a campaign or combat ledger containing GM interventions
- **THEN** private GM fields SHALL remain unavailable while public net effects remain visible
