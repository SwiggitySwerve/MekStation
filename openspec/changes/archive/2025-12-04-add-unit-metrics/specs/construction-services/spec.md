## MODIFIED Requirements

### Requirement: Calculate Cost

The system SHALL calculate the C-Bill cost of a mech using TechManual formulas.

**Rationale**: Cost tracking for campaign play and army building.

**Priority**: Medium

#### Scenario: Calculate total cost

- **GIVEN** a complete mech build
- **WHEN** calculateCost(mech) is called
- **THEN** return total C-Bill cost as integer
- **AND** cost SHALL equal sum of all component costs plus base chassis cost

#### Scenario: Calculate engine cost

- **GIVEN** engine with rating and type
- **WHEN** calculating engine cost
- **THEN** cost = (rating^2) × 5000 × type_multiplier
- **AND** Standard Fusion multiplier = 1.0
- **AND** XL Fusion multiplier = 2.0
- **AND** Light Fusion multiplier = 1.5
- **AND** XXL Fusion multiplier = 3.0
- **AND** Compact Fusion multiplier = 1.5
- **AND** ICE multiplier = 0.3
- **AND** Fuel Cell multiplier = 0.35
- **AND** Fission multiplier = 0.75

#### Scenario: Calculate gyro cost

- **GIVEN** gyro with engine rating and type
- **WHEN** calculating gyro cost
- **THEN** cost = ceil(engineRating / 100) × 300000 × type_multiplier
- **AND** Standard multiplier = 1.0
- **AND** Heavy-Duty multiplier = 2.0
- **AND** Compact multiplier = 1.5
- **AND** XL multiplier = 0.5

#### Scenario: Calculate structure cost

- **GIVEN** structure with tonnage and type
- **WHEN** calculating structure cost
- **THEN** cost = tonnage × cost_per_ton
- **AND** Standard cost = 400 per ton
- **AND** Endo Steel cost = 1600 per ton
- **AND** Endo-Composite cost = 1600 per ton
- **AND** Reinforced cost = 6400 per ton
- **AND** Composite cost = 1600 per ton
- **AND** Industrial cost = 300 per ton

#### Scenario: Calculate armor cost

- **GIVEN** armor with total points and type
- **WHEN** calculating armor cost
- **THEN** cost = total_points × cost_per_point
- **AND** Standard cost = 625 per point (10000 / 16)
- **AND** Ferro-Fibrous cost = 1250 per point (20000 / 16)
- **AND** Light Ferro-Fibrous cost = 937.5 per point
- **AND** Heavy Ferro-Fibrous cost = 1562.5 per point
- **AND** Stealth cost = 3125 per point
- **AND** Hardened cost = 1875 per point
- **AND** Reactive cost = 1875 per point

#### Scenario: Calculate cockpit cost

- **GIVEN** cockpit type
- **WHEN** calculating cockpit cost
- **THEN** Standard cockpit = 200000 C-Bills
- **AND** Small cockpit = 175000 C-Bills
- **AND** Command Console = 500000 C-Bills
- **AND** Torso-Mounted = 750000 C-Bills

#### Scenario: Calculate heat sink cost

- **GIVEN** heat sinks with count and type
- **WHEN** calculating heat sink cost
- **THEN** Single heat sink = 2000 C-Bills each
- **AND** Double heat sink = 6000 C-Bills each

#### Scenario: Calculate base chassis cost

- **GIVEN** mech tonnage
- **WHEN** calculating base chassis cost
- **THEN** cost = tonnage × 10000 C-Bills
