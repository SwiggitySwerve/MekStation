# Spec Delta: Movement System

## ADDED Requirements

### Requirement: Destroyed Gyro Nontracked Movement Projection

Movement projection and movement commit validation SHALL reject represented
non-prone destroyed-gyro movement when the active movement mode is not tracked
or wheeled.

#### Scenario: Standing destroyed-gyro Mek cannot use ordinary movement

- **GIVEN** a non-prone unit has represented destroyed-gyro damage
- **AND** the selected movement mode resolves to ordinary walk, run, jump, or
  another non-tracked/non-wheeled mode
- **WHEN** the player previews or commits movement to a destination hex
- **THEN** the destination SHALL be invalid
- **AND** the projection and commit rejection SHALL explain that destroyed gyro
  movement only permits tracked or wheeled movement.

#### Scenario: Tracked and wheeled destroyed-gyro movement remains legal

- **GIVEN** a non-prone unit has represented destroyed-gyro damage
- **AND** the active movement capability resolves to tracked or wheeled
  movement
- **WHEN** the player previews and commits a legal destination
- **THEN** the destination SHALL remain reachable when terrain and MP allow it
- **AND** committed movement SHALL use the same MP/path outcome as the preview.
