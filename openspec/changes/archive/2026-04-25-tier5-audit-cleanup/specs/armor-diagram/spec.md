## ADDED Requirements

### Requirement: Vehicle Auto-Allocate Canonical Distribution Ratio

The vehicle armor auto-allocate function SHALL distribute total armor points across locations using the canonical TechManual pp.86-87 ratio: 40% Front, 20% Left Side, 20% Right Side, 10% Rear, 10% Turret (when a turret is present). When the vehicle has no turret, the ratio is normalized across the remaining four locations (sum = 0.90, redistributed proportionally). When the vehicle is a VTOL, a 2% rotor allocation is added (the rotor is a structural component, not a weapon mount, so it receives a smaller share than a turret).

This requirement makes the existing implementation testable. The store function `useVehicleStore.autoAllocateArmorLogic` (in `src/stores/useVehicleStore.actions.ts`) already applies these ratios; this scenario adds explicit numeric assertions that were absent from the prior component-level tests (which checked location presence only).

The implementation accepts `armorTonnage` (in tons) as input and converts to points via `floor(tons * 16)`. The `100-point` reference values below correspond to `armorTonnage = 6.25` (100 / 16).

#### Scenario: 100-point turreted vehicle distributes exactly 40/20/20/10/10

- **WHEN** `autoAllocateArmorLogic` runs on a turreted ground vehicle with `armorTonnage = 6.25` (100 points total)
- **THEN** the resulting allocation is `{ Front: 40, LeftSide: 20, RightSide: 20, Rear: 10, Turret: 10 }`
- **AND** the sum of allocated points equals the input total of 100

#### Scenario: Turretless vehicle redistributes turret share proportionally (sum-of-90% normalizer)

- **WHEN** `autoAllocateArmorLogic` runs on a vehicle with no turret, `armorTonnage = 6.25` (100 points total)
- **THEN** the allocation preserves the 40/20/20/10 ratio normalized across `{ Front, LeftSide, RightSide, Rear }` (normalizer = 0.90)
- **AND** Front receives `floor(100 * 0.40 / 0.90) = 44`, each Side receives `floor(100 * 0.20 / 0.90) = 22`, Rear receives `floor(100 * 0.10 / 0.90) = 11`
- **AND** Turret receives 0 (no turret installed)
- **AND** the sum of allocated points (99 due to flooring) is within 1-2 of the input total

#### Scenario: VTOL augments allocation with 2% rotor share

- **WHEN** `autoAllocateArmorLogic` runs on a VTOL with `armorTonnage = 6.25` (100 points total) and no turret
- **THEN** the rotor location receives `floor(100 * 0.02 / 0.92) = 2` points
- **AND** the Front/Side/Rear allocations preserve the 40/20/20/10 ratio normalized across the new 0.92 sum (Front=43, Side=21 each, Rear=10)
- **AND** the rotor share is intentionally smaller than a turret share (2% vs 10%) because the rotor is structural-only, not a weapon mount
