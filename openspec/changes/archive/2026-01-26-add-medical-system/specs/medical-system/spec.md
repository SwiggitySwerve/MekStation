# medical-system Specification Delta

## ADDED Requirements

### Requirement: Medical System Selection
The system SHALL support three selectable medical systems: Standard (skill check), Advanced (d100), and Alternate (attribute-based).

#### Scenario: Standard system selected
- **GIVEN** a campaign with medicalSystem set to STANDARD
- **WHEN** healing is processed
- **THEN** doctor Medicine skill check (2d6 vs TN) is used

#### Scenario: Advanced system selected
- **GIVEN** a campaign with medicalSystem set to ADVANCED
- **WHEN** healing is processed
- **THEN** d100 roll with fumble/critical thresholds is used

#### Scenario: Alternate system selected
- **GIVEN** a campaign with medicalSystem set to ALTERNATE
- **WHEN** healing is processed
- **THEN** attribute-based check (BODY or Surgery) is used

### Requirement: Standard Medical System
The system SHALL use doctor Medicine skill checks where success heals 1 hit and failure waits.

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

### Requirement: Advanced Medical System
The system SHALL use d100 rolls with fumble/critical thresholds based on doctor experience.

#### Scenario: Fumble worsens injury
- **GIVEN** a Green doctor (fumble threshold 50) treating an injury
- **WHEN** d100 roll is 50 or lower
- **THEN** injury daysToHeal increases by 20% or +5 days

#### Scenario: Critical success reduces time
- **GIVEN** an Elite doctor (crit threshold 80) treating an injury
- **WHEN** d100 roll is 80 or higher
- **THEN** injury daysToHeal decreases by 10%

#### Scenario: Untreated injury worsens
- **GIVEN** a patient with no assigned doctor in Advanced system
- **WHEN** daily healing is processed
- **THEN** 30% chance injury worsens (+20% time)

### Requirement: Alternate Medical System
The system SHALL use attribute checks with margin-of-success determining outcome.

#### Scenario: Positive margin heals
- **GIVEN** a patient with BODY 8 and injury severity 3
- **WHEN** 2d6 roll minus (8 + penalty) is positive
- **THEN** injury is healed

#### Scenario: Margin -1 to -5 extends time
- **GIVEN** a patient with BODY 8 and injury severity 3
- **WHEN** 2d6 roll minus (8 + penalty) is between -1 and -5
- **THEN** injury healing time is extended

#### Scenario: Margin ≤ -6 makes permanent
- **GIVEN** a patient with BODY 8 and injury severity 3
- **WHEN** 2d6 roll minus (8 + penalty) is -6 or worse
- **THEN** injury becomes permanent

### Requirement: Doctor Capacity Management
The system SHALL enforce doctor capacity limits with admin skill bonus.

#### Scenario: Base capacity is 25 patients
- **GIVEN** a doctor with no admin skill
- **WHEN** capacity is calculated
- **THEN** capacity is 25 patients

#### Scenario: Admin skill increases capacity
- **GIVEN** a doctor with Admin skill 5 and doctorsUseAdministration enabled
- **WHEN** capacity is calculated
- **THEN** capacity is 25 + floor(5 × 25 × 0.2) = 50 patients

#### Scenario: Overloaded doctor gets penalty
- **GIVEN** a doctor with 30 patients and capacity 25
- **WHEN** medical check is performed
- **THEN** target number penalty is applied

### Requirement: Natural Healing
The system SHALL provide slower natural healing for patients without assigned doctor.

#### Scenario: Natural healing waits longer
- **GIVEN** a patient with no assigned doctor
- **WHEN** healing is processed
- **THEN** healing check occurs every naturalHealingWaitingPeriod days (default 7)

#### Scenario: Natural healing uses patient attributes
- **GIVEN** a patient with no assigned doctor in Alternate system
- **WHEN** healing check is performed
- **THEN** patient BODY attribute is used instead of doctor skill

### Requirement: Surgery for Permanent Injuries
The system SHALL support surgery to remove permanent flag or install prosthetics.

#### Scenario: Surgery margin ≥ 4 removes permanent
- **GIVEN** a surgeon with Medicine 8 performing surgery on permanent injury
- **WHEN** 2d6 roll minus (8+2) is 4 or higher
- **THEN** permanent flag is removed and injury heals normally

#### Scenario: Surgery margin 0-3 installs prosthetic
- **GIVEN** a surgeon with Medicine 8 performing surgery on permanent injury
- **WHEN** 2d6 roll minus (8+2) is between 0 and 3
- **THEN** prosthetic is installed, removing skill modifier but adding attribute penalty -1

#### Scenario: Surgery failure leaves unchanged
- **GIVEN** a surgeon with Medicine 8 performing surgery on permanent injury
- **WHEN** 2d6 roll minus (8+2) is negative
- **THEN** injury remains permanent and unchanged
