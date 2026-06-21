# medical-system Delta — close-campaign-economic-loop

## MODIFIED Requirements

### Requirement: Standard Medical System

The system SHALL use doctor Medicine skill checks where success heals 1 hit and
failure waits. The Medicine skill value SHALL be read from the doctor's roster
model rather than a hardcoded constant, so doctors of differing skill heal at
materially different rates, and the shorthanded modifier SHALL be derived from
the doctor's assigned patient load rather than always being zero.

#### Scenario: Doctor success heals injury

- **GIVEN** a doctor with Medicine skill 7 treating an injury
- **WHEN** 2d6 roll is 7 or higher
- **THEN** injury daysToHeal is reduced to 0 (healed)

#### Scenario: Doctor failure waits

- **GIVEN** a doctor with Medicine skill 7 treating an injury
- **WHEN** 2d6 roll is 6 or lower
- **THEN** injury daysToHeal remains unchanged

#### Scenario: Tougher healing modifier applies

- **GIVEN** a patient with 4 injuries and tougherHealing enabled
- **WHEN** medical check is performed
- **THEN** target number increases by max(0, 4-2) = +2

#### Scenario: Doctor skill is sourced from the roster model

- **GIVEN** a green doctor and an elite doctor whose roster models record different
  Medicine skill values
- **WHEN** each treats the same injury on the same seed
- **THEN** the Medicine skill value used SHALL be each doctor's recorded value, not a
  shared hardcoded constant
- **AND** the two doctors SHALL produce different heal outcomes.

#### Scenario: Shorthanded doctor incurs a target-number penalty

- **GIVEN** a doctor assigned more patients than their capacity
- **WHEN** a medical check is performed
- **THEN** the shorthanded modifier SHALL be a positive target-number penalty derived
  from the patient load
- **AND** it SHALL NOT be a flat zero.
