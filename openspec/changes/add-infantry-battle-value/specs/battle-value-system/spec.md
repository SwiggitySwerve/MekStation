# battle-value-system (delta)

## ADDED Requirements

### Requirement: Infantry BV Dispatch

The BV calculator SHALL route `IInfantryUnit` inputs to an infantry-specific calculation path.

#### Scenario: Infantry dispatch

- **GIVEN** an infantry platoon
- **WHEN** `calculateBattleValue` is called
- **THEN** the infantry calculator SHALL be invoked
- **AND** the return SHALL include an `IInfantryBVBreakdown`

### Requirement: Infantry Per-Trooper BV

Infantry per-trooper BV SHALL combine primary weapon, secondary weapon (ratio-adjusted), and armor kit modifier.

#### Scenario: Primary weapon contribution

- **GIVEN** a trooper with primary Laser Rifle (BV 12, damageDivisor 1.0)
- **WHEN** per-trooper BV is computed
- **THEN** primary contribution SHALL equal `12 / 1.0 = 12`

#### Scenario: Secondary ratio scaling

- **GIVEN** a platoon with secondary SRM Launcher (BV 25) at ratio 1-per-4
- **WHEN** per-trooper secondary is computed
- **THEN** secondary contribution SHALL equal `25 × (1 / 4) = 6.25`

#### Scenario: Armor kit modifier

- **GIVEN** a trooper wearing Sneak Camo
- **WHEN** per-trooper BV is computed
- **THEN** an additional 3 BV SHALL be added from the kit modifier

### Requirement: Infantry Platoon BV with Motive Multiplier

Infantry platoon BV SHALL scale by trooper count with a motive-type multiplier.

#### Scenario: Foot platoon BV

- **GIVEN** a 28-trooper Foot platoon with perTrooperBV 15
- **WHEN** platoon BV is computed
- **THEN** platoonBV SHALL equal `15 × 28 × 1.0 = 420`

#### Scenario: Mechanized multiplier

- **GIVEN** a 20-trooper Mechanized-Tracked platoon with perTrooperBV 20
- **WHEN** platoon BV is computed
- **THEN** platoonBV SHALL equal `20 × 20 × 1.15 = 460`

### Requirement: Infantry Anti-Mech Training Multiplier

Platoons with anti-mech training SHALL have final BV multiplied by 1.1.

#### Scenario: Anti-mech trained platoon

- **GIVEN** an anti-mech-trained Foot platoon with platoonBV 420
- **WHEN** final BV is computed (before pilot multiplier)
- **THEN** BV SHALL equal `420 × 1.1 = 462`

### Requirement: Infantry Field Gun BV Addition

A field gun's BV SHALL be added to the platoon BV using the mech-scale equipment resolver.

#### Scenario: AC/5 field gun

- **GIVEN** a Foot platoon crewing an AC/5 field gun with 20 rounds of ammo
- **WHEN** BV is computed
- **THEN** field gun contribution SHALL equal `AC/5 BV (70) + ammo BV` per catalog
- **AND** this SHALL be added to platoonBV before pilot multiplier
