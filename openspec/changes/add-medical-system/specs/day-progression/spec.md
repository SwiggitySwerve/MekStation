# day-progression Specification Delta

## MODIFIED Requirements

### Requirement: Personnel Healing
The system SHALL process personnel healing using the selected medical system (Standard/Advanced/Alternate) with doctor skill checks and capacity management.

#### Scenario: Reduce injury duration
- **GIVEN** a wounded person with injury daysToHeal 14
- **WHEN** advanceDay is called
- **THEN** injury daysToHeal is reduced based on medical system outcome

#### Scenario: Heal completed injuries
- **GIVEN** a wounded person with injury daysToHeal 1
- **WHEN** advanceDay is called and medical check succeeds
- **THEN** injury daysToHeal becomes 0 and injury is removed from injuries array

#### Scenario: Return to active status
- **GIVEN** a wounded person with last injury healing (daysToHeal 1) and no other injuries
- **WHEN** advanceDay is called and medical check succeeds
- **THEN** person status changes to ACTIVE and daysToWaitForHealing is set to 0

#### Scenario: Multiple injuries heal independently
- **GIVEN** a person with 3 injuries having daysToHeal [5, 10, 15]
- **WHEN** advanceDay is called
- **THEN** each injury is checked independently based on medical system

#### Scenario: Medical system determines healing rate
- **GIVEN** a campaign with medicalSystem set to STANDARD
- **WHEN** advanceDay is called
- **THEN** doctor Medicine skill check determines if injury heals

#### Scenario: Doctor capacity affects treatment
- **GIVEN** a doctor with 30 patients and capacity 25
- **WHEN** advanceDay is called
- **THEN** overload penalty is applied to medical checks

#### Scenario: Natural healing for unassigned patients
- **GIVEN** a patient with no assigned doctor
- **WHEN** advanceDay is called
- **THEN** natural healing check occurs every naturalHealingWaitingPeriod days
