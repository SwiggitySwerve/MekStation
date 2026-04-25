## ADDED Requirements

### Requirement: Vehicle Auto-Allocate Canonical Distribution Ratio

The vehicle armor auto-allocate function SHALL distribute total armor points across locations using the canonical TechManual pp.86-87 ratio: 40% Front, 20% Left Side, 20% Right Side, 10% Rear, 10% Turret (or normalized across remaining locations when the vehicle has no turret or has VTOL rotors).

This requirement makes the existing implementation testable. The store function `useVehicleStore.autoAllocateArmor` already applies these ratios; this scenario adds explicit numeric assertions that were absent from the existing component-level tests (which checked location *presence* only).

#### Scenario: 100-point vehicle armor pool distributes 40/20/20/10/10

- **WHEN** `autoAllocateArmor(totalArmorPoints = 100)` runs on a turreted ground vehicle
- **THEN** the resulting allocation is `{ Front: 40, LeftSide: 20, RightSide: 20, Rear: 10, Turret: 10 }`

#### Scenario: Turretless vehicle redistributes turret share proportionally

- **WHEN** `autoAllocateArmor(totalArmorPoints = 100)` runs on a vehicle with no turret
- **THEN** the resulting allocation preserves the 40/20/20/10 ratio across `{ Front, LeftSide, RightSide, Rear }`
- **AND** the turret share is redistributed proportionally (or zeroed) per the implementation's normalization rule
- **AND** the sum of allocated points equals the input total

#### Scenario: VTOL replaces turret with rotor allocation

- **WHEN** `autoAllocateArmor(totalArmorPoints = 100)` runs on a VTOL
- **THEN** the rotor location receives the equivalent of the turret share (10% baseline)
- **AND** the front/side/rear ratios remain `40/20/20/10`
