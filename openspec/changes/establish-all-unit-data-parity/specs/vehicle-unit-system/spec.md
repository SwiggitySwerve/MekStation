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
- **AND** a turretless vehicle SHALL export four armor values (a VTOL five), because MegaMek reads one more as a turret (`BLKTankFile.java:185`, `BLKVTOLFile.java:132`)
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
  - Update `cruiseMP` from rating, tonnage and suspension factor, as the Engine and Movement
    requirement defines
  - Update `flankMP` accordingly
  - Mark state as modified

### Requirement: Motive Damage State Tracking

Vehicle units SHALL carry a motive-damage state struct updated by combat resolution.

#### Scenario: Motive damage counters

- **GIVEN** any `IVehicleUnit`
- **WHEN** the combat state is constructed
- **THEN** `unit.combatState.motive` SHALL contain `originalCruiseMP`, `penaltyMP`, `immobilized`, `sinking`, `turretLocked`, `engineHits`, `driverHits`, `commanderHits`, `crewStunnedPhases`

#### Scenario: Motive penalty applies to flank MP

- **GIVEN** a vehicle with original cruise 5, flank 8 (ceil(5×1.5)=8) and penalty 2
- **WHEN** effective MP is computed
- **THEN** effective cruise SHALL equal 3 (5 − 2)
- **AND** effective flank SHALL equal 5 (ceil(3 × 1.5)), as MegaMek `Tank.getWalkMP` subtracts motive damage from cruise (`Tank.java:397`) and `Entity.getRunMP` then rounds upward (`Entity.java:4016`)

#### Scenario: Cumulative motive penalties

- **GIVEN** a vehicle with cumulative motive penalty already at −3
- **WHEN** another motive-damage roll applies −2
- **THEN** penalty SHALL become −5
- **AND** effective cruise MP SHALL not go below 0

### Requirement: Tonnage Ranges

The system SHALL enforce tonnage ranges per vehicle sub-type. One owner holds the
maximum tonnage per motion type (`getTankMaxTonnage` for combat vehicles,
`TestTank.java:132-141`; `getSupportVehicleMaxTonnage` for support vehicles,
`TestSupportVehicle.java:87-107`). The handlers, VAL-VEH-005 and VAL-VEHICLE-TONNAGE
SHALL read it rather than keep their own tables.

#### Scenario: Combat vehicle tonnage

- **WHEN** setting tonnage for a combat vehicle
- **THEN** tonnage MUST be between 1 ton and the motion type's maximum
- **AND** the vehicle SHALL be superheavy above the weight at which MegaMek's loader builds a
  SuperHeavyTank (Tracked 100, Wheeled and WiGE 80, Hover 50, Naval and Submarine 300 tons;
  `BLKTankFile.java:94-123`)
- **AND** the maximum SHALL be Tracked 200, Wheeled and WiGE 160, Hover 100, Naval and
  Submarine 555 tons when superheavy, and Tracked 100, Wheeled and WiGE 80, Hover 50, Naval
  and Submarine 300 tons otherwise
- **AND** Hydrofoil, Rail and Maglev vehicles, which never load as superheavy, SHALL NOT
  exceed 100 tons

#### Scenario: VTOL tonnage

- **WHEN** setting tonnage for a VTOL
- **THEN** tonnage MUST be between 1 and 60 tons (inclusive)
- **AND** a VTOL over 30 tons SHALL be superheavy (`VTOL.java:729`)

#### Scenario: Support vehicle tonnage

- **WHEN** setting tonnage for a support vehicle
- **THEN** tonnage MUST NOT exceed the SVType maximum for its motion type: Wheeled 160,
  Tracked 200, Hover 100, VTOL 60, WiGE 240, Naval, Hydrofoil and Submarine 300, Rail and
  Maglev 600 tons
- **AND** a 600-ton Rail LargeSupportTank (the Adelante) SHALL be accepted

### Requirement: Support Vehicle Size Classes

Support vehicles SHALL be classified by size based on tonnage.

#### Scenario: Size class determination

- **WHEN** determining support vehicle size class
- **THEN** the system SHALL classify as:
  - Small: 1–5 tons (max 5 tons)
  - Medium: 6–80 tons (max 80 tons)
  - Large: 81+ tons (max: the SVType maximum for the motion type)

#### Scenario: Size class tonnage limits in validation

- **WHEN** validating a support vehicle's tonnage against its size class
- **THEN** Small vehicles SHALL NOT exceed 5 tons
- **AND** Medium vehicles SHALL NOT exceed 80 tons
- **AND** no support vehicle SHALL exceed the SVType maximum for its motion type, reported as
  "{motion type} support vehicles cannot exceed {max} tons"

### Requirement: Validation Rules

The system SHALL enforce vehicle-specific validation rules.

#### Scenario: VAL-VEH-001 — Engine Required

- **WHEN** validating any vehicle category unit
- **THEN** the unit MUST have an engine
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-002 — Motive System Required

- **WHEN** validating any vehicle category unit
- **THEN** the unit MUST have a motive system type selected
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-003 — Turret Capacity Limits

- **WHEN** validating a vehicle with a turret (VEHICLE or SUPPORT_VEHICLE, not VTOL)
- **THEN** turret equipment weight MUST NOT exceed turret capacity
- **AND** violation SHALL be `ERROR` severity
- **AND** the error SHALL report the overflow amount

#### Scenario: VAL-VEH-004 — VTOL Rotor Required

- **WHEN** validating a VTOL unit
- **THEN** the VTOL MUST have a rotor system
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-005 — Vehicle Tonnage Range

- **WHEN** validating vehicle tonnage
- **THEN** tonnage MUST be between 1 ton and the maximum the Tonnage Ranges requirement gives
  for the unit's motion type (`getVehicleMaxTonnage`):
  - VEHICLE: the superheavy maximum where MegaMek can load the motion type as superheavy,
    otherwise the ordinary maximum (Tracked 1–200, Hover 1–100, Rail 1–100 tons)
  - VTOL: 1–60 tons
  - SUPPORT_VEHICLE: up to the SVType maximum (Rail 1–600 tons)
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: Combat vehicle handler validation

- **WHEN** the VehicleUnitHandler validates a combat vehicle
- **THEN** it SHALL additionally check:
  - Tonnage ≥ 1 ton
  - Vehicles are marked superheavy when MegaMek's loader builds a SuperHeavyTank
  - Tonnage SHALL NOT exceed `getTankMaxTonnage` for the motion type and superheavy flag
  - Non-trailer vehicles MUST have ≥ 1 cruise MP
  - Total armor SHALL NOT exceed max armor points (`(int)(tonnage × 7 / 2 + 40)`, `TestTank.java:338`)
  - Turret weight SHALL NOT exceed turret capacity
  - Hover vehicles over 50 tons generate a WARNING

#### Scenario: Support vehicle handler validation

- **WHEN** the SupportVehicleUnitHandler validates a support vehicle
- **THEN** it SHALL additionally check:
  - Size class tonnage limits (Small ≤ 5, Medium ≤ 80) and the SVType maximum for the motion
    type (Rail ≤ 600)
  - BAR rating between 1 and 10
  - Total armor SHALL NOT exceed max armor points (`4 + (int)(tonnage × factor)`, factor by
    SVType, `TestSupportVehicle.java:585-617`)
  - Cargo capacity generates an INFO message when > 0

## ADDED Requirements

### Requirement: Ordinary combat turret mechanism mass

The existing turret owner SHALL charge 10% of resolved qualifying equipment mass
for combat vehicles using default half-ton construction rounding and no assigned
Omni base-chassis mechanism allowance. It SHALL round upward to a half ton,
independently for each installed ordinary or VTOL chin turret. Chin SHALL use
the same coefficient as Single and Dual. Validation and weight composition
SHALL consume this rule, and the status bar SHALL display its resulting weight
budget. Ammunition SHALL remain in total equipment mass and SHALL NOT increase
the mechanism basis.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestTank.java:178-226`, `TestEntity.java:147-150,339-348`, and
`TestXMLOption.java:284-285`. MegaMekLab
`62bf19360382049e2e6a1e8f24e859e27bdc5878`, `CVChassisView.java:297-300`,
labels the installed VTOL turret Chin. The pinned Java verifier returns 1 ton
for a synthetic source-loaded Ferret with an actual resolved 7-ton PPC there;
the synthetic design is construction-invalid and proves this term only.

#### Scenario: Chin mass crosses a rounding boundary

- **GIVEN** a combat chin turret with 5, 5.0001 or 7 tons of qualifying equipment
- **WHEN** mechanism mass is calculated with the default ceiling
- **THEN** its mass SHALL be 0.5, 1 or 1 tons respectively
- **AND** validation SHALL accept 1 ton and reject 0.5 tons for the 7-ton case

#### Scenario: Separate turrets round independently

- **GIVEN** two combat turrets with 2.5 tons of qualifying equipment each
- **WHEN** mechanism mass is composed
- **THEN** each SHALL weigh 0.5 tons, for 1 ton combined

#### Scenario: Chin ammunition stays in the equipment budget

- **GIVEN** an installed chin turret carrying a resolved 7-ton PPC and four
  1-ton ammunition bins
- **WHEN** weight composition and the status bar calculate the budget
- **THEN** equipment SHALL contribute 11 tons and mechanism SHALL contribute 1 ton
- **AND** moving the ammunition to Body SHALL NOT change either term

This correction does not implement Omni allowances, patchwork armor-mount
classification, support-family rounding, sponsons, generic turret capacity,
handler equipment materialization or complete unit/BV parity. The obsolete
tonnage-based capacity requirements remain a separate tracked correction;
legacy `maxWeight` values SHALL NOT be represented as genuine Omni allowances.

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
