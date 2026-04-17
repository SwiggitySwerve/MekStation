# battle-value-system (delta)

## ADDED Requirements

### Requirement: ProtoMech BV Dispatch

The BV calculator SHALL route `IProtoMechUnit` inputs to a proto-specific calculation path.

#### Scenario: Proto dispatch

- **GIVEN** a ProtoMech
- **WHEN** `calculateBattleValue` is called
- **THEN** the proto calculator SHALL be invoked
- **AND** the return SHALL include an `IProtoMechBVBreakdown`

### Requirement: ProtoMech Defensive BV

The proto defensive BV SHALL combine armor, structure, defensive equipment, explosive penalty, and a TMM-based factor.

#### Scenario: Armor BV baseline

- **GIVEN** a Medium proto with 20 armor points
- **WHEN** armorBV is computed
- **THEN** armorBV SHALL equal `20 × 2.5 × 1.0 = 50`

#### Scenario: Structure BV baseline

- **GIVEN** a Medium proto with 12 structure points
- **WHEN** structureBV is computed
- **THEN** structureBV SHALL equal `12 × 1.5 × 1.0 = 18`

### Requirement: ProtoMech Offensive BV and Main Gun

Proto offensive BV SHALL include arm weapons and a MainGun location weapon with the same BV as a mech-mounted instance.

#### Scenario: Main gun BV at full value

- **GIVEN** a proto with a main-gun PPC (catalog BV 176)
- **WHEN** offensive BV is computed
- **THEN** the main gun contribution SHALL equal 176 BV (no proto-specific modifier)

#### Scenario: Proto speed factor

- **GIVEN** a proto with walkMP 6 and jumpMP 4
- **WHEN** speed factor is computed
- **THEN** `mp = 6 + round(4 / 2) = 8`
- **AND** `sf = round(pow(1 + (8 − 5) / 10, 1.2) × 100) / 100`

### Requirement: ProtoMech Chassis Multiplier

Proto final BV SHALL be adjusted by chassis type.

#### Scenario: Glider multiplier

- **GIVEN** a Glider proto with pre-multiplier BV 280
- **WHEN** the chassis multiplier is applied
- **THEN** BV SHALL equal `280 × 0.9 = 252`

#### Scenario: Ultraheavy multiplier

- **GIVEN** an Ultraheavy proto with pre-multiplier BV 600
- **WHEN** the chassis multiplier is applied
- **THEN** BV SHALL equal `600 × 1.15 = 690`
