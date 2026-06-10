# Spec Delta: Piloting Skill Rolls

## MODIFIED Requirements

### Requirement: PSR Trigger — Standing Up

The system SHALL trigger a PSR when a prone unit attempts to stand unless
represented unit rules classify the stand-up as automatic success.

#### Scenario: Intact Quad Mek stand-up skips AttemptStand PSR

- **GIVEN** a prone unit has a represented quad stand-up leg profile
- **AND** no represented quad leg location is destroyed
- **AND** the gyro is not destroyed
- **WHEN** the unit stands during committed movement
- **THEN** the system SHALL emit the stand-up success
- **AND** the system SHALL NOT emit `PSRTriggered` or `PSRResolved` for that stand-up
- **AND** no dice roll SHALL be consumed
