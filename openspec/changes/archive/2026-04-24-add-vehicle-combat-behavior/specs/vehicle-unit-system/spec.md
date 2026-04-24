# vehicle-unit-system (delta)

## ADDED Requirements

### Requirement: Motive Damage State Tracking

Vehicle units SHALL carry a motive-damage state struct updated by combat resolution.

#### Scenario: Motive damage counters

- **GIVEN** any `IVehicleUnit`
- **WHEN** the combat state is constructed
- **THEN** `unit.combatState.motive` SHALL contain `originalCruiseMP`, `penaltyMP`, `immobilized`, `sinking`, `turretLocked`, `engineHits`, `driverHits`, `commanderHits`, `crewStunnedPhases`

#### Scenario: Motive penalty applies to flank MP

- **GIVEN** a vehicle with original cruise 5, flank 7 (floor(5×1.5)=7) and penalty 2
- **WHEN** effective MP is computed
- **THEN** effective cruise SHALL equal 3 (5 − 2)
- **AND** effective flank SHALL equal 4 (floor(3 × 1.5))

#### Scenario: Cumulative motive penalties

- **GIVEN** a vehicle with cumulative motive penalty already at −3
- **WHEN** another motive-damage roll applies −2
- **THEN** penalty SHALL become −5
- **AND** effective cruise MP SHALL not go below 0
