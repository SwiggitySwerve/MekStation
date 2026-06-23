## ADDED Requirements

### Requirement: Incomplete Combat Correction Rejection
The combat intervention implementer SHALL reject incomplete or no-op correction payloads with clear conflict reasons before approval.

#### Scenario: Empty unit correction is blocked
- **WHEN** the GM previews a reposition/facing, damage/critical, or heat/ammo correction that identifies a unit but contains no fields to change
- **THEN** the preview SHALL be blocked with a reason naming the missing correction detail
- **AND** no combat projected effect SHALL be produced

#### Scenario: Empty turn-order correction is blocked
- **WHEN** the GM previews a turn-order correction without phase, initiative, activation, order, or active-unit data
- **THEN** the preview SHALL be blocked with a reason naming the missing turn-order detail
- **AND** no combat projected effect SHALL be produced
