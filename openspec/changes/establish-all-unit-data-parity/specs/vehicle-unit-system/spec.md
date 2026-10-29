## MODIFIED Requirements

### Requirement: Engine and Movement

The system SHALL manage engine configuration and derive movement points.

#### Scenario: Engine rating calculation

- **WHEN** configuring a vehicle's engine
- **THEN** engine rating SHALL equal `tonnage × cruiseMP`
- **AND** engine rating SHALL be clamped between 10 and 400
- **AND** changing tonnage SHALL recalculate engine rating to maintain cruise MP
- **AND** changing cruise MP SHALL recalculate engine rating

#### Scenario: Flank MP derivation

- **WHEN** cruise MP is set to any value
- **THEN** flank MP SHALL be `floor(cruiseMP × 1.5)`
- **AND** flank MP SHALL be read-only (derived)

#### Scenario: Engine type selection

- **WHEN** selecting an engine type
- **THEN** the available types SHALL include: Standard Fusion, XL (IS), XL (Clan), Light, XXL, Compact, ICE, Fuel Cell, Fission
- **AND** trailers SHALL have engine type disabled (no engine)

#### Scenario: Engine weight multipliers for combat vehicles

- **WHEN** calculating engine weight
- **THEN** the system SHALL apply these multipliers to base weight:
  - Standard Fusion: 1.0×
  - XL: 0.5×
  - XXL: exactly one third
  - Compact: 1.5×
  - Light: 0.75×
  - ICE: 2.0×
  - Fuel Cell: 1.2×
  - Fission: 1.75×
- **AND** installed engine weight SHALL apply the rounding, shielding and hover minimum
  from the Installed combat-vehicle engine weight requirement

Multiplier source: MegaMek revision `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
[`Engine.java:409-438`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/equipment/Engine.java#L409).

## ADDED Requirements

### Requirement: Installed combat-vehicle engine weight

The combat-vehicle construction owner SHALL calculate installed engine weight
from the canonical rating table and shared engine-type definitions, with the
vehicle's tonnage and motion type supplied explicitly. The result SHALL apply
the engine modifier, enforce the fission minimum of 5 tons, round upward to a
half ton, apply the 1.5 shielding factor to fusion and fission engines, and
round upward to a half ton again. Hover combat vehicles SHALL then enforce a
minimum of 20% of vehicle tonnage, rounded upward to a half ton. ICE and fuel-cell
engines SHALL NOT receive fusion shielding. Support-vehicle engine construction
uses separate rules and is outside this requirement.

Source: MegaMek `Engine.getWeightEngine`, revision
`48fcb2f64a1b3f2d575707ce5653dad64927b587`, `Engine.java:396-450`.
The generic engine calculator retains its existing contract.

#### Scenario: Fusion shielding follows intermediate rounding

- **GIVEN** a tracked combat vehicle with a rating-200 engine
- **WHEN** the installed engine weight is calculated
- **THEN** standard fusion SHALL weigh 13 tons
- **AND** XL fusion SHALL weigh 7 tons, after 4.25 rounds to 4.5 before shielding

#### Scenario: Fission minimum and non-fusion shielding exclusions

- **GIVEN** tracked combat vehicles with rating-25 engines
- **WHEN** installed engine weights are calculated
- **THEN** fission SHALL weigh 7.5 tons
- **AND** ICE and fuel-cell engines SHALL each weigh 1 ton without shielding

#### Scenario: Hover minimum rounds upward and reaches the display

- **GIVEN** a 52-ton combat vehicle with a rating-25 standard fusion engine
- **WHEN** its motion type changes from tracked to hover
- **THEN** installed engine weight SHALL change from 1 ton to 10.5 tons
- **AND** the status bar SHALL recompute weight free from the changed context
- **AND** changing hover tonnage SHALL recompute the engine minimum

#### Scenario: Loaded reference proves one engine term

- **GIVEN** the pinned loaded Tamerlane Strike Sled (Flamer), 20 tons and Magna 155
- **WHEN** its installed standard fusion engine weight is calculated
- **THEN** the engine term SHALL weigh 8.5 tons
- **AND** engine-term agreement SHALL NOT establish whole-vehicle weight parity
- **AND** suspension, controls, lift and additional heat-sink corrections remain separate work
