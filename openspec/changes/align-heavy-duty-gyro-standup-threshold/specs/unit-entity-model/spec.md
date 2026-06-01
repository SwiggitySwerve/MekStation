# Spec Delta: Unit Entity Model

## MODIFIED Requirements

### Requirement: Component References

The unit entity SHALL reference components by type. When represented unit data
includes a gyro type, runtime combat-state initialization SHALL preserve that
gyro type so movement and piloting rules can evaluate represented gyro
thresholds.

#### Scenario: Represented gyro type reaches runtime state

- **GIVEN** imported unit data identifies a heavy-duty gyro
- **WHEN** the compendium adapter creates the game unit and combat state is
  initialized
- **THEN** the game unit SHALL carry the represented gyro type
- **AND** the runtime unit state SHALL carry the same represented gyro type
- **AND** stand-up projection and PSR resolution SHALL consume that runtime
  gyro type instead of defaulting to standard-gyro thresholds
