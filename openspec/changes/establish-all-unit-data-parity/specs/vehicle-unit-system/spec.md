## MODIFIED Requirements

### Requirement: Engine and Movement

The system SHALL manage engine configuration and derive movement points.

#### Scenario: Engine rating calculation

- **WHEN** configuring a vehicle's engine
- **THEN** engine rating SHALL equal `tonnage × cruiseMP` less the movement-mode suspension
  factor, as the Combat-vehicle suspension engine rating requirement defines
- **AND** engine rating SHALL be clamped between 10 and 400
- **AND** changing tonnage SHALL recalculate engine rating to maintain cruise MP
- **AND** changing cruise MP SHALL recalculate engine rating

#### Scenario: Flank MP derivation

- **WHEN** cruise MP is set to any value
- **THEN** flank MP SHALL be cruise MP × 1.5 rounded upward, as the Base vehicle flank
  movement consistency requirement defines
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

### Requirement: BLK Format Parsing — Combat Vehicles

The `VehicleUnitHandler` SHALL parse combat vehicle BLK documents.

#### Scenario: Basic combat vehicle parsing

- **GIVEN** a BLK document with `mappedUnitType: UnitType.VEHICLE`
- **WHEN** parsing the document
- **THEN** the handler SHALL extract:
  - Motion type from `document.motionType` (case-insensitive, default: Tracked)
  - Cruise/Flank MP from `document.cruiseMP`
  - Engine rating as `cruiseMP × tonnage`
  - Armor array mapped to locations in the MegaMek BLK order for standard (non-superheavy)
    tanks: Front, Right, Left, Rear, Turret. Superheavy tanks use MegaMek's six-side layout
    (`BLKTankFile.java:188-221`), which is not modelled yet

#### Scenario: Turret detection in BLK

- **WHEN** parsing equipment locations
- **THEN** the handler SHALL detect turrets from:
  - Equipment in `Turret Equipment` or `Turret` location keys
  - `turrettype` raw tag (values: `dual`, `chin`)
- **AND** default turret type SHALL be Single if turret equipment exists

#### Scenario: Vehicle special flags from raw tags

- **WHEN** parsing raw BLK tags
- **THEN** the handler SHALL extract boolean flags:
  - `environmentalsealing` → `hasEnvironmentalSealing`
  - `flotationhull` → `hasFlotationHull`
  - `amphibious` → `isAmphibious`
  - `trailerhitch` → `hasTrailerHitch`
  - `trailer` → `isTrailer`
- **AND** boolean parsing SHALL accept `true` or `1` (case-insensitive)

#### Scenario: Equipment location normalization

- **WHEN** parsing equipment from BLK location keys
- **THEN** the handler SHALL normalize locations:
  - `Front Equipment` / `Front` → VehicleLocation.FRONT
  - `Left Equipment` / `Left Side` → VehicleLocation.LEFT
  - `Right Equipment` / `Right Side` → VehicleLocation.RIGHT
  - `Rear Equipment` / `Rear` → VehicleLocation.REAR
  - `Turret Equipment` / `Turret` → VehicleLocation.TURRET (turret-mounted)
  - `Body Equipment` / `Body` / default → VehicleLocation.BODY

#### Scenario: Armor array order follows MegaMek

- **GIVEN** the pinned `<armor>` blocks `20 46 10 12` (Maxim Flanker) and `16 10 10 8 2 16`
  (Red Kite Attack VTOL, a VTOL)
- **WHEN** the combat-vehicle and VTOL handlers parse them and `formatVehicleArmor` exports the results
- **THEN** Maxim Flanker SHALL load Front 20, Right 46, Left 10, Rear 12
- **AND** Red Kite SHALL load Rotor 2 and Turret 16 (VTOL order is Front, Right, Left, Rear, Rotor, Turret)
- **AND** the export SHALL write the same order back, so a MegaMek load of an exported file keeps each side
- **AND** Red Kite's installed armor total SHALL include the turret and rotor (62)

Order source: MegaMek revision `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
[`Tank.java:123-130`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/Tank.java#L123),
[`BLKTankFile.java:195-200`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKTankFile.java#L195),
[`VTOL.java:79-80`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/units/VTOL.java#L79)
and [`BLKVTOLFile.java:134-139`](https://github.com/MegaMek/megamek/blob/48fcb2f64a1b3f2d575707ce5653dad64927b587/megamek/src/megamek/common/loaders/BLKVTOLFile.java#L134).

### Requirement: Vehicle Store Actions

The system SHALL expose actions for modifying vehicle state.

#### Scenario: Tonnage change side effects

- **WHEN** changing vehicle tonnage
- **THEN** the system SHALL:
  - Recalculate `weightClass`
  - Recalculate `engineRating` to maintain current `cruiseMP`
  - Clamp engine rating between 10 and 400
  - Update `isSuperheavy` flag
  - Mark state as modified

#### Scenario: Cruise MP change side effects

- **WHEN** changing cruise MP
- **THEN** the system SHALL:
  - Update `flankMP` to cruise MP × 1.5 rounded upward
  - Recalculate `engineRating` from tonnage and cruise MP, as the Engine and Movement
    requirement defines
  - Mark state as modified

#### Scenario: Engine rating change side effects

- **WHEN** changing engine rating directly
- **THEN** the system SHALL:
  - Update `cruiseMP` to `floor(rating / tonnage)`
  - Update `flankMP` accordingly
  - Mark state as modified

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
- **AND** controls, lift and additional heat-sink corrections remain separate work

### Requirement: Combat-vehicle suspension engine rating

The combat-vehicle engine owner SHALL subtract the pinned movement-mode
suspension factor from cruise MP times integer tonnage, enforce a minimum
rating of 10 and round upward to the next multiple of 5. Store defaults,
movement/tonnage/motion edits, validation, direct BLK imports and Python BLK
conversion SHALL use that rule. A Tank BLK input with engine code NONE (8) and
zero cruise MP SHALL retain rating zero independently of the trailer flag.
The vehicle store's current engine types all represent an installed engine;
its trailer flag SHALL NOT imply engine absence. Engine-less store designs
remain unrepresented. Support store and converter outputs SHALL retain their
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

#### Scenario: Trailer identity and engine absence remain separate

- **GIVEN** a 20-ton tracked Tank BLK input at zero cruise MP
- **WHEN** imported with either value of the trailer flag
- **THEN** explicit fusion (0) and ICE (1) engine codes SHALL derive rating 10
- **AND** explicit NONE (8) SHALL derive rating zero
- **AND** the raw engine code and trailer flag SHALL each be preserved
- **AND** cruise, motion and tonnage edits to a store with an installed engine
  SHALL retain minimum rating 10 even when its trailer flag is true

Source: MegaMek `BLKTankFile.java:155-162,272-274` at revision
`48fcb2f64a1b3f2d575707ce5653dad64927b587`. The NONE exception is Tank-specific;
this scenario does not claim engine-less VTOL or support construction parity.

### Requirement: Combat-vehicle controls and lift composition

The construction/vehicle owner SHALL compose weight outside rendering. Combat
vehicle controls SHALL weigh tonnage / 20 rounded upward to a half ton, or zero
when explicit hasNoControlSystems context is true. HOVER, VTOL, HYDROFOIL,
SUBMARINE and WIGE SHALL carry tonnage / 10 rounded upward to a half ton for
lift/dive. NAVAL and other modes SHALL carry no lift term. Support vehicles
SHALL retain existing calculations without a combat-construction parity claim.
The status bar and validation SHALL use the same controls/lift quantities and
react to tonnage, motion, family and no-controls context changes.

Source: MegaMek 48fcb2f64a1b3f2d575707ce5653dad64927b587,
TestTank.java:229-250. BLKTankFile.java:268-270 sets no-controls from tag
presence (even a zero payload); Tank.java:268 defaults it to false.

#### Scenario: Controls rounding and explicit absence

- **GIVEN** combat vehicles of 20 and 20.1 tons
- **WHEN** controls mass is computed
- **THEN** controls SHALL weigh 1 and 1.5 tons respectively
- **AND** explicit no-controls SHALL yield zero for either tonnage

#### Scenario: Lift modes and exclusions

- **GIVEN** a 20.1-ton combat vehicle
- **WHEN** configured as hover, VTOL, hydrofoil, submarine or WiGE
- **THEN** lift SHALL weigh 2.5 tons
- **AND** tracked, wheeled, naval, rail and maglev SHALL have zero lift
- **AND** support vehicles SHALL NOT acquire these combat terms

#### Scenario: Independently accounted Tamerlane

- **GIVEN** the pinned Tamerlane Strike Sled (Flamer) at Magna rating 155
- **WHEN** composed using real catalog equipment and standard controls
- **THEN** engine SHALL weigh 8.5, controls 1, lift 2, structure 2, armor 3,
  weapons 3 and turret 0.5 tons, totaling 20 with zero free
- **AND** the fixture's additional heat sinks are zero, without claiming a
  general vehicle heat-sink implementation or BV parity

### Requirement: Base vehicle flank movement consistency

The vehicle construction owner SHALL derive unmodified flank MP as cruise MP
times 1.5 rounded upward. Store edits, initialization, saved-draft reopening,
duplication, validation, BV state inputs, template summaries and status bars
SHALL consume the same rule. Direct vehicle, VTOL and support imports SHALL
retain their existing upward rounding and input guards. Saved flank values
SHALL NOT override derivation from cruise MP when a vehicle store is created.
This requirement covers base movement, without MASC, damage or game modifiers;
it does not establish full BV or support-construction parity.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Entity.java:4004-4016` and `Tank.java:1570-1575`.

#### Scenario: Odd, even and stationary movement

- **GIVEN** vehicles with cruise MP 0, 3, 4, 5 and 17
- **WHEN** base flank movement is derived or displayed
- **THEN** flank MP SHALL be 0, 5, 6, 8 and 26 respectively
- **AND** the BV state adapter SHALL receive those same flank values
- **AND** editing engine rating to derive cruise 3 SHALL yield flank 5

#### Scenario: Reopen and duplicate preserve derived movement

- **GIVEN** a saved vehicle at cruise MP 5, with missing or stale flank MP
- **WHEN** reopened through the vehicle registry or duplicated
- **THEN** its store SHALL contain cruise 5 and flank 8
- **AND** a later cruise edit to 3 SHALL update flank to 5
- **AND** no generated catalog regeneration SHALL be required
