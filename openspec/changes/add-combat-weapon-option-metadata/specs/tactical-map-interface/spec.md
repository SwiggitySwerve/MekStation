# Spec Delta: Tactical Map Interface

## MODIFIED Requirements

### Requirement: Combat Projection Explanation Details

The tactical map interface SHALL include rules-backed combat details in the
shared per-hex tactical projection explanation.

#### Scenario: Projection explanation summarizes per-weapon combat options

- **GIVEN** a combat projection evaluates selected operational weapons against a
  hex
- **WHEN** the shared tactical projection and rendered hex metadata are exposed
- **THEN** every evaluated weapon SHALL retain its own range bracket, in-range
  state, in-arc state, environment legality, availability state, and blocked
  reason when blocked
- **AND** the projection explanation SHALL describe those per-weapon option
  states separately from aggregate weapon availability
- **AND** the rendered hex and combat badge metadata SHALL expose those
  per-weapon option states without relying on color alone
