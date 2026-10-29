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
`48fcb2f64a1b3f2d575707ce5653dad64927b587`, `Engine.java:396-460`.
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
- **AND** controls, lift and additional heat-sink corrections remain separate work

### Requirement: Combat-vehicle suspension engine rating

The combat-vehicle engine owner SHALL subtract the pinned movement-mode
suspension factor from cruise MP times integer tonnage, enforce a minimum
rating of 10 and round upward to the next multiple of 5. Store defaults,
movement/tonnage/motion edits, validation, direct BLK imports and Python BLK
conversion SHALL use that rule. An explicit engine-less converter input with
zero cruise MP SHALL retain rating zero. Support store and converter outputs SHALL retain their
legacy rating behavior and SHALL NOT acquire a combat-vehicle parity claim.

#### Scenario: Tamerlane rating reaches reactive callers

- **GIVEN** a 20-ton hover combat vehicle with cruise MP 12
- **WHEN** created or changed through the vehicle store, imported or converted
- **THEN** its suspension factor SHALL be 85 and its engine rating SHALL be 155
- **AND** editing its rating to 155 SHALL preserve cruise MP 12
- **AND** changing its motion to tracked SHALL derive rating 240
- **AND** whole-vehicle weight parity SHALL remain unproven until controls and lift ship

#### Scenario: Rounding and construction families remain explicit

- **GIVEN** a 52-ton tracked combat vehicle with cruise MP 3
- **WHEN** its rating is derived
- **THEN** rating 156 SHALL round upward to 160
- **AND** a 5-ton hover combat vehicle at cruise MP 8 SHALL use minimum rating 10
- **AND** a support vehicle SHALL NOT use the combat suspension table
