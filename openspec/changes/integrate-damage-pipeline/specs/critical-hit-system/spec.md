# critical-hit-system (delta)

## ADDED Requirements

### Requirement: Critical Effects Applied Through Damage Pipeline

Critical effects SHALL be applied via the damage pipeline integration, not through ad-hoc engine code. Each component type SHALL apply the canonical effect when a critical hit is resolved.

#### Scenario: Engine hit applies +5 heat and counter increment

- **GIVEN** an engine component takes 1 critical hit
- **WHEN** the critical effect is applied
- **THEN** the engine-hit counter SHALL increase by 1
- **AND** subsequent heat phases SHALL add 5 per engine-hit counter to the unit's heat
- **AND** 3 engine hits SHALL destroy the unit

#### Scenario: Gyro hit adds +3 PSR modifier

- **GIVEN** a gyro component takes 1 critical hit
- **WHEN** the critical effect is applied
- **THEN** all future PSR target numbers SHALL include +3 per gyro-hit counter
- **AND** 2 gyro hits on a standard gyro SHALL destroy the gyro
- **AND** an immediate PSR SHALL be queued

#### Scenario: Cockpit hit kills pilot

- **GIVEN** the cockpit takes a critical hit
- **WHEN** the critical effect is applied
- **THEN** the pilot SHALL be killed immediately
- **AND** the unit SHALL be marked disabled

#### Scenario: Sensor hit adds to-hit penalty

- **GIVEN** sensors take a critical hit
- **WHEN** the critical effect is applied
- **THEN** 1 sensor hit SHALL add +1 to all of the unit's attack to-hit rolls
- **AND** 2 sensor hits SHALL add +2 (and the second hit destroys sensors)

#### Scenario: Actuator type determines effect

- **GIVEN** a limb takes a critical hit
- **WHEN** the slot manifest indicates which actuator was hit
- **THEN** the effect SHALL depend on the actuator type (shoulder / upper arm / lower arm / hand / hip / upper leg / lower leg / foot)
- **AND** a hip crit SHALL queue a PSR
- **AND** a shoulder crit SHALL add +4 to-hit for attacks with weapons on that arm

#### Scenario: Weapon crit destroys weapon

- **GIVEN** a weapon takes a critical hit
- **WHEN** the critical effect is applied
- **THEN** the weapon SHALL be marked destroyed
- **AND** the weapon SHALL NOT appear as fireable in subsequent turns

#### Scenario: Heat sink crit reduces dissipation

- **GIVEN** a heat sink takes a critical hit
- **WHEN** the critical effect is applied
- **THEN** the heat sink SHALL be marked destroyed
- **AND** the unit's dissipation capacity SHALL decrease by the heat sink's rating (1 for single, 2 for double)

#### Scenario: Ammo crit triggers explosion

- **GIVEN** an ammo bin takes a critical hit
- **WHEN** the critical effect is applied
- **THEN** an ammo explosion SHALL be resolved (damage = remainingRounds × weapon damage)
- **AND** CASE / CASE II protection SHALL be honored per their rules
