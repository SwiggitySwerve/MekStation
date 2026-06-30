## ADDED Requirements

### Requirement: Tactical GM intervention surface
The tactical command surface SHALL provide owner or host GM users with combat intervention commands for correcting combat state, undoing or repairing actions, withdrawing or rescuing units, reloading unit configuration, and resolving manual conflicts.

#### Scenario: GM previews combat correction
- **WHEN** a GM selects a combat intervention during an active battle
- **THEN** the surface SHALL show before/after state, affected units, public net effect, private rationale field, conflict warnings, and approval controls before commit

#### Scenario: Player cannot access GM commands
- **WHEN** a non-GM player views the tactical command surface
- **THEN** GM intervention controls SHALL be hidden or disabled and SHALL NOT expose private GM context
