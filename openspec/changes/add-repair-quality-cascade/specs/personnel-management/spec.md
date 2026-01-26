# Personnel Management Specification Delta

## MODIFIED Requirements

### Requirement: Skill Types
The system SHALL support multiple skill types for personnel including combat skills (Gunnery, Piloting), support skills (Tech, Medical, Admin), and specialized skills, with each skill type having distinct progression rules and usage contexts.

#### Scenario: Tech skill for maintenance
- **GIVEN** a personnel member with Tech skill
- **WHEN** performing maintenance checks
- **THEN** Tech skill value is used in target number calculation
- **AND** higher Tech skill makes maintenance easier

#### Scenario: Assign Tech skill to technician
- **GIVEN** a personnel member with role TECH
- **WHEN** creating default skills for the role
- **THEN** Tech skill is included in default skill set
- **AND** Tech skill has appropriate starting value

#### Scenario: Tech skill progression
- **GIVEN** a personnel member with Tech skill
- **WHEN** earning XP and improving skills
- **THEN** Tech skill can be improved using XP
- **AND** Tech skill follows standard skill progression rules
