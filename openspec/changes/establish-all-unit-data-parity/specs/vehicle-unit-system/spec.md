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

#### Scenario: Support engine validation uses support construction

- **GIVEN** a support vehicle with its current tonnage, motion, cruise MP, engine type and engine technology rating
- **WHEN** construction validation computes its engine quantities, including through the status bar
- **THEN** it SHALL use the existing support effective-rating and installed-mass owners
- **AND** its effective rating SHALL retain fractional tonnage and the support cap of 500 without a combat suspension deduction
- **AND** the combat 400-rating validation error SHALL NOT apply to a support engine
- **AND** a 20-ton tracked fusion support vehicle at cruise MP 1 SHALL report 5 tons at technology C and 1.5 tons at technology D
- **AND** combat engine validation and the separate support structure, controls, heat and complete-weight contracts SHALL retain their existing behavior

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`Engine.java:396-404,453-474,601-603`. These are engine quantities, not a
claim of complete support construction validity.

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
- **AND** the minimum SHALL be 0.001 ton (`getVehicleMinTonnage`), not 1 ton: `TestSupportVehicle`
  has no 1-ton floor, and a 0.04-ton support VTOL and a 0.35-ton Wheeled cycle are valid in MegaMek

### Requirement: Support Vehicle Size Classes

Support vehicles SHALL be classified by size based on tonnage.

#### Scenario: Size class determination

- **WHEN** determining support vehicle size class
- **THEN** the system SHALL classify as:
  - Small: 0.001–5 tons (max 5 tons)
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

#### Scenario: Retired VAL-VEH-003 turret capacity rule

- **WHEN** validating any vehicle category unit, including one with legacy turret `capacity` and `usedWeight` values
- **THEN** `VAL-VEH-003` SHALL NOT be registered or exported and no generic turret-capacity error SHALL be reported
- **AND** total vehicle weight validation SHALL continue to reject allocated weight above the vehicle tonnage

#### Scenario: VAL-VEH-004 — VTOL Rotor Required

- **WHEN** validating a VTOL unit
- **THEN** the VTOL MUST have a rotor system
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: VAL-VEH-005 — Vehicle Tonnage Range

- **WHEN** validating vehicle tonnage
- **THEN** tonnage MUST be between the minimum (1 ton, 0.001 ton for a support vehicle,
  `getVehicleMinTonnage`) and the maximum the Tonnage Ranges requirement gives
  for the unit's motion type (`getVehicleMaxTonnage`):
  - VEHICLE: the superheavy maximum where MegaMek can load the motion type as superheavy,
    otherwise the ordinary maximum (Tracked 1–200, Hover 1–100, Rail 1–100 tons)
  - VTOL: 1–60 tons
  - SUPPORT_VEHICLE: up to the SVType maximum (Rail 0.001–600 tons)
- **AND** violation SHALL be `CRITICAL_ERROR` severity

#### Scenario: Combat vehicle handler validation

- **WHEN** the VehicleUnitHandler validates a combat vehicle
- **THEN** it SHALL additionally check:
  - Tonnage ≥ 1 ton
  - Vehicles are marked superheavy when MegaMek's loader builds a SuperHeavyTank
  - Tonnage SHALL NOT exceed `getTankMaxTonnage` for the motion type and superheavy flag
  - Non-trailer vehicles MUST have ≥ 1 cruise MP
  - Total armor SHALL NOT exceed max armor points (`(int)(tonnage × 7 / 2 + 40)`, `TestTank.java:338`)
  - An `<armor>` array of a length MegaMek refuses to load ("Incorrect armor array length")
    SHALL load for inspection and report that as an error (the VTOL handler does the same)
  - Hover vehicles over 50 tons generate a WARNING

#### Scenario: Support vehicle handler validation

- **WHEN** the SupportVehicleUnitHandler validates a support vehicle
- **THEN** it SHALL additionally check:
  - Size class tonnage limits (Small ≤ 5, Medium ≤ 80) and the SVType maximum for the motion
    type (Rail ≤ 600)
  - BAR rating between 1 and 10
  - Total armor SHALL NOT exceed max armor points (`4 + (int)(tonnage × factor)`, factor by
    SVType, `TestSupportVehicle.java:585-617`)
  - Total armor SHALL fit the armor tonnage it weighs (`TestEntity.correctArmorOverAllocation`):
    for BAR 2-10 armor, the points' weight rounded up to a kilogram (under 5 tons) or a half
    ton, divided by the BAR weight per point at the source's `armor_tech_rating`, floored and
    capped by the armor limit, MUST be at least the allocated points
  - An `<armor>` array of a refused length reports "Incorrect armor array length" as an error
  - Cargo capacity generates an INFO message when > 0

### Requirement: Turret System

The system SHALL provide turret configuration unique to the Vehicle unit type.

#### Scenario: Turret types

- **WHEN** configuring a turret
- **THEN** the available types SHALL be:
  - None — no turret, fixed weapon mounts only
  - Single — 360° rotation for weapons
  - Dual — two independent turrets
  - Chin — forward-facing VTOL turret (VTOL only)

#### Scenario: Turret type filtering by motion type

- **WHEN** the vehicle is a VTOL
- **THEN** only None and Chin turret types SHALL be available
- **WHEN** the vehicle is a ground vehicle (non-VTOL)
- **THEN** only None, Single, and Dual turret types SHALL be available (Chin excluded)

#### Scenario: Turret creation

- **WHEN** selecting a turret type other than None
- **THEN** the system SHALL create a turret configuration with:
  - `type`: the selected turret type
  - `rotationArc`: 360°

#### Scenario: Removing turret

- **WHEN** setting turret type to None
- **THEN** the turret configuration SHALL be set to `null`
- **AND** any turret-mounted equipment SHALL be moved to Body location

#### Scenario: Turret weight capacity validation

- **WHEN** turret-mounted equipment weighs more than 10% of the vehicle's tonnage
- **THEN** no turret capacity error SHALL be reported, because a turret has no capacity of its own
  (pinned MegaMek `TestTank` and `TestSupportVehicle` define none)
- **AND** the vehicle SHALL be invalid only when its total weight exceeds its tonnage

#### Scenario: Saved turret configuration without cached mass

- **WHEN** saving or reopening a turret with its type and rotation arc
- **THEN** cached currentWeight SHALL NOT be required or synthesized when absent
- **AND** independent installation and explicit Omni allowances SHALL remain intact
- **AND** invalid live turret types or rotation arcs SHALL still be rejected

#### Scenario: Retired cached turret mass API

- **WHEN** creating, loading or editing a vehicle turret configuration
- **THEN** its public configuration contract SHALL expose type and rotation arc without declaring currentWeight
- **AND** neither the vehicle store nor its action module SHALL expose setTurretWeight or its implementation
- **AND** obsolete cached weight in saved editor data SHALL be ignored without changing live turret facts or independent Omni allowances
- **AND** type edits and imported secondary projection SHALL copy only live configuration facts, preserving rotation arc without carrying obsolete cached mass
- **AND** resolved construction owners SHALL remain authoritative for mechanism and mounted mass

### Requirement: Vehicle Equipment Management

The system SHALL manage equipment mounting with vehicle-specific options.

#### Scenario: Equipment mount properties

- **WHEN** mounting equipment on a vehicle
- **THEN** each mount SHALL track:
  - `id`: unique mount identifier
  - `equipmentId`: reference to equipment definition
  - `name`: display name
  - `location`: VehicleLocation or VTOLLocation
  - `isRearMounted`: whether the equipment faces rear
  - `isTurretMounted`: whether mounted in turret
  - `isSponsonMounted`: whether in sponson mount
  - `linkedAmmoId`: optional linked ammunition

#### Scenario: Default equipment placement

- **WHEN** adding equipment without specifying a location
- **THEN** the equipment SHALL default to the Body location
- **AND** `isTurretMounted` SHALL default to `false`

#### Scenario: Moving equipment to turret

- **WHEN** changing equipment location to Turret
- **THEN** `isTurretMounted` SHALL be set to `true`
- **AND** the equipment SHALL count toward the vehicle's total weight and toward the mass its turret
  mechanism weighs (10% of the equipment it carries)

#### Scenario: Removing equipment from turret

- **WHEN** removing equipment from turret
- **THEN** the equipment SHALL be moved to Body location
- **AND** `isTurretMounted` SHALL be set to `false`

#### Scenario: Equipment location options by vehicle type

- **WHEN** displaying equipment location options for a ground vehicle
- **THEN** options SHALL include: Front, Left, Right, Rear, Turret (if configured), Body
- **WHEN** displaying equipment location options for a VTOL
- **THEN** options SHALL include: Front, Left, Right, Rear, Chin Turret (if configured), Body, Rotor

### Requirement: Customizer UI Workflow

The system SHALL provide a tabbed customizer interface for vehicles.

#### Scenario: Tab layout

- **WHEN** opening the vehicle customizer
- **THEN** the system SHALL display four tabs:
  1. **Structure & Engine** — tonnage, motion type, engine, turret type, special features
  2. **Armor Configuration** — armor type, tonnage, per-location allocation with diagram
  3. **Equipment** — equipment browser with mounted equipment management
  4. **Turret** — turret type config, turret weapon management, move-to/from-turret

#### Scenario: Status bar

- **WHEN** the vehicle customizer is open
- **THEN** a status bar SHALL display: tonnage, weight free, movement (cruise/flank), armor allocated, turret-mounted equipment mass (if applicable), equipment count
- **AND** turret mass SHALL NOT use a capacity denominator
- **AND** weight overages SHALL show in red
- **AND** unallocated armor SHALL show in amber

#### Scenario: Vehicle diagram sidebar

- **WHEN** on large screens
- **THEN** a vehicle diagram sidebar SHALL show an SVG top-down view
- **AND** the diagram SHALL display armor values per location color-coded by fill percentage
- **AND** the diagram SHALL show motion-type-specific visual indicators (tracks, wheels, rotors)

#### Scenario: Unavailable weight during catalog startup

- **GIVEN** mounted definitions that are still awaiting catalog readiness
- **WHEN** their dependent weight budget is unavailable
- **THEN** Weight Free SHALL show Loading without a numeric fallback or percentage
- **AND** after readiness, a still-unresolved budget SHALL show Unknown
- **AND** invalid source mass without catalog-dependent mounts SHALL remain Unknown rather than Loading
- **AND** empty loads and resolved zero masses SHALL retain known numeric budgets

#### Scenario: Reactive independent construction context

- **GIVEN** Omni identity, independent primary/secondary allowances, explicit secondary installation and structural tech context
- **WHEN** those source facts change in the store
- **THEN** the status bar SHALL recompute through the existing owners with every applicable field, retaining explicit zero
- **AND** validation SHALL receive the actual secondary type and both raw allowances
- **AND** changing raw allowance overload at the same rounded charge SHALL update validity without inventing a weight change

#### Scenario: Incomplete validation status retains known errors

- **GIVEN** incomplete represented mass
- **WHEN** validation has no known independent errors
- **THEN** the bar SHALL show Incomplete, or Loading while waiting for mounted definitions, rather than OK or a misleading zero-error certification
- **AND** known independent errors SHALL retain their count, rule identifier and error colour

#### Scenario: Numeric and unavailable status colours

- **GIVEN** compact or normal status presentation
- **WHEN** mass is unavailable
- **THEN** its status SHALL use the existing warning colour
- **AND** known overweight budgets SHALL retain error colour and a real balanced zero SHALL retain success status
- **AND** mounted turret mass SHALL keep units and SHALL NOT regain a capacity denominator

#### Scenario: Independent resolved turret figures

- **WHEN** viewing the decomposed Turret tab
- **THEN** primary and secondary panels SHALL display mounted equipment, qualifying non-ammunition equipment and charged mechanism weight from the existing construction owner
- **AND** VTOLs SHALL display the chin panel without a secondary panel
- **AND** each Omni allowance SHALL retain its explicit raw value, including zero, fractional and negative source values, independently of installation
- **AND** absent installed turrets SHALL NOT hide known assigned charges
- **AND** no capacity bar or denominator SHALL be displayed

#### Scenario: Unavailable independent turret figures

- **WHEN** an individual mounted or qualifying figure awaits catalog readiness
- **THEN** that dependent unavailable figure SHALL show Loading, then Unknown if unresolved after readiness
- **AND** independently known figures, empty-load zero and known assigned charges SHALL remain numeric
- **AND** invalid source allowances SHALL show Unknown rather than a numeric fallback
- **AND** editing source context or equipment SHALL recompute the displayed figures

#### Scenario: Turret figure colours and responsive rendering

- **WHEN** turret figures render at narrow or wide widths
- **THEN** labels SHALL use Title Case and sentences SHALL use sentence case
- **AND** unavailable figures SHALL keep warning colour and independent known allowance overloads SHALL keep error colour
- **AND** panels SHALL remain readable without horizontal overflow

## ADDED Requirements

### Requirement: Native Tank complete-weight validation transport

The Tank source handler SHALL reuse the existing construction weight owner and
transport only complete finite native weight into construction validation.
It SHALL preserve source loadability independently of construction validity.

#### Scenario: Complete genuine overweight source

- **GIVEN** a native Tank whose supported source facts resolve to a complete weight
- **WHEN** the handler parses and validates it
- **THEN** total and remaining weight SHALL reflect the shared construction result
- **AND** an overweight design SHALL load successfully with the existing construction error
- **AND** Ajax C, Lightning CX-3 and SturmFeur Kalki SHALL retain independently correct component quantities and totals of 92.5, 39 and 137.5 tons

#### Scenario: Unavailable native mass is not a subtotal

- **GIVEN** an unresolved mount or unsupported native construction fact
- **WHEN** native construction weight is requested
- **THEN** its complete result SHALL remain unavailable rather than zero or a partial total
- **AND** the source SHALL remain loadable for inspection
- **AND** the legacy number-only combat handler weight API SHALL retain its unavailable error

#### Scenario: Explicit armor technology overrides chassis side

- **GIVEN** a mixed-tech IS-chassis Tank with explicit Clan armor technology
- **WHEN** native weight is transported to the existing construction owner
- **THEN** the existing parsed armor technology SHALL select armor side independently of chassis
- **AND** concrete Clan levels 2, 6, 8 and 10 SHALL use Clan armor; absent or unknown (-1) SHALL fall back to chassis
- **AND** explicit IS armor technology SHALL retain IS armor even on a Clan chassis
- **AND** pinned Zephyr EC and Tokugawa Yumi SHALL retain 7.5 and 8.5 tons of armor and remain valid at 40 and 60 tons
- **AND** armor formulas, catalogs and unrelated technology-side consumers SHALL remain unchanged

#### Scenario: No-controls source presence

- **GIVEN** a native Tank with the hasNoControlSystems tag
- **WHEN** construction facts are transported
- **THEN** the existing controls owner SHALL receive tag presence independently of its payload

#### Scenario: Cohort safety before enabling rejection

- **GIVEN** fresh guarded pinned inputs on the committed integrated candidate
- **WHEN** the full vehicle cohort and all-family BV are compared against the integrated-main baseline
- **THEN** only the three known genuine overweight validity corrections SHALL occur
- **AND** no native-valid source SHALL newly fail construction and no source SHALL lose loadability
- **AND** all 9815 BV report rows SHALL remain byte-identical under the approved blocking-trust invocation

### Requirement: Native vehicle equipment introduction diagnostics

The Tank and ground-support vehicle source handlers SHALL use the shared equipment
introduction owner and its catalog date facts. The owner SHALL retain the
existing five-year margin, ammunition exclusion, technology-side guard and
resolved-identity deduplication. A native construction-invalid design SHALL
remain loadable and carry its validation diagnostics.

#### Scenario: Early torpedoes remain loadable but invalid

- **GIVEN** the pinned Moray Heavy Attack Submarine (Original) and Silverfin Coastal Cutter sources
- **WHEN** parsed and validated through their native vehicle handlers
- **THEN** parsing SHALL succeed and construction validity SHALL be false
- **AND** validation SHALL report their torpedo introduction dates
- **AND** a matching final BV SHALL NOT establish construction validity

#### Scenario: Source years preserve the introduction margin

- **GIVEN** a native vehicle mounting SRT 6 introduced in 2660
- **WHEN** its source year or explicit original build year is 2655
- **THEN** equipment introduction validation SHALL accept that year
- **AND** when both applicable years are earlier than 2655 it SHALL report SRT 6 once
- **AND** the parsed vehicle SHALL retain an explicit original build year

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestEntity.java:1487-1512,1611-1618`, `TestTank.java:426-428` and
`TestSupportVehicle.java:1221-1223`.

### Requirement: Shared variable vehicle equipment mass

The combat editor SHALL call the existing shared support variable-mass owner.
The status total and turret figures SHALL supply the same engine and weapon
context, with no second formula copy.

#### Scenario: Source-sized MASH equipment

- **WHEN** MASH Truck (Small) is opened from its canonical definition
- **THEN** its unchanged source `:size:1.0` SHALL produce 3.5 tons of MASH equipment
- **AND** its equipment subtotal SHALL be Java's 4.5 tons
- **AND** replacing a resolved mount identity SHALL expire its source size

#### Scenario: Armored motive and engine-dependent equipment

- **WHEN** a vehicle mounts an armored motive system or supercharger
- **THEN** shared rules SHALL use vehicle tonnage and installed engine mass
- **AND** support kilogram and combat half-ton rounding SHALL remain distinct

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
MiscType.java:607-613,724-730,820-842 and RoundWeight.java:58-68.

### Requirement: Linked combat-vehicle thermal load

The combat weight owner SHALL use shared native equipment pairing before
subtracting engine-free sinks. BV consumers SHALL retain their existing results.

#### Scenario: Laser insulator pairing and heat

- **WHEN** an insulator is installed
- **THEN** it SHALL prefer the preceding eligible unlinked laser at the same location, then the first eligible unlinked laser there
- **AND** RISC laser pulse modules SHALL occupy the same native link slot
- **AND** the running weapon-heat sum SHALL subtract one for each linked insulator and restore one when the sum reaches zero
- **AND** Pandion Combat WiGE (3140 Upgrade) SHALL retain its pinned 20-ton total

#### Scenario: PPC capacitor pairing and heat

- **WHEN** a capacitor is installed
- **THEN** it SHALL pair with the first compatible unlinked PPC at the same location using the existing compatibility and year owner
- **AND** each linked capacitor SHALL add five heat before the engine allowance
- **AND** unpaired equipment SHALL NOT modify thermal load

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
MekFileParser.java:360-388,472-495 and TestEntity.java:945-966.

### Requirement: Vehicle turret armor lifecycle

Selecting no turret SHALL remove both turret configurations and zero both
turret armor allocations while retaining hull, body and rotor allocations.
Installing a previously absent primary or secondary turret SHALL begin with
zero armor; editing an already installed turret SHALL retain its armor.
The actual store persistence and registry reopening SHALL preserve removal.
Armor totals and BV armor inputs SHALL exclude the removed allocations.

Source: MegaMekLab `62bf19360382049e2e6a1e8f24e859e27bdc5878`,
`CVStructureTab.java:272-292,769-793`. Upstream removes both turret locations
for None and initializes reinstalled armor to zero. Clearing stored values
implements that lifecycle for MekStation's fixed-key allocation map.

#### Scenario: Removing a dual turret and reopening

- **GIVEN** installed primary and secondary turrets with unequal armor
- **WHEN** no turret is selected, saved and reopened through the registry
- **THEN** both configurations SHALL be null and both armor values SHALL be zero
- **AND** unrelated allocations SHALL remain unchanged
- **AND** armor totals and BV armor inputs SHALL contain only remaining armor

#### Scenario: Installation does not revive stale armor

- **GIVEN** an absent turret with stale armor in a legacy allocation
- **WHEN** that primary or secondary turret is installed
- **THEN** its armor SHALL be zero
- **AND** editing an already installed turret SHALL preserve its armor

This bounded correction does not implement equipment unallocation. Upstream
keeps removed mounts at `Entity.LOC_NONE`; the canonical Turret System scenario
currently says Body. That obsolete relocation scenario must be replaced when
the mount model can preserve unallocated identity. This slice changes neither
equipment identities nor locations and establishes no equipment/BV parity claim.

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

### Requirement: Unavailable mounted vehicle weight composition

The mounted-weight owner SHALL resolve each mounted instance once and compose only quantities with known finite nonnegative inputs. It SHALL report unresolved or invalid instance IDs, retain zero as a known mass, and preserve the existing primary-flag, secondary-location, ammunition and amplifier classification owners. Unknown mass SHALL NOT become zero. Separate groups SHALL remain independently available. Full composition SHALL use the existing engine, support chassis, controls, lift and armor owners and the explicit Omni mechanism owner; it SHALL NOT introduce a turret capacity denominator or a substitute support total.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, `TestTank.java:178-226,237-239,841-888`. Retained projected Java mass/classification fixtures establish mechanism terms only; they do not establish complete source, armor-mount, amplifier-identity or BV parity.

#### Scenario: Missing and invalid instances preserve other groups

- **GIVEN** known primary mounts and an unresolved, negative or nonfinite secondary mount
- **WHEN** mounted mass is composed
- **THEN** total equipment, secondary mounted/mechanism basis and dependent ordinary secondary mechanism mass SHALL be null
- **AND** known primary quantities SHALL remain available
- **AND** unresolved IDs SHALL identify mounted instances independently even when they share one definition

#### Scenario: Ammunition and known classification remain independent

- **GIVEN** an ammunition definition whose mass is invalid
- **WHEN** grouped quantities are computed
- **THEN** its mounted and total equipment mass SHALL be unavailable without poisoning the non-ammunition mechanism basis
- **AND** a known non-energy classification SHALL NOT make amplifier basis unknown merely because its mass is invalid
- **AND** an unresolved definition SHALL keep its possible amplifier contribution unknown

#### Scenario: Empty, zero and overflowing groups

- **GIVEN** an empty group or resolved zero-weight mount
- **WHEN** its group is summed
- **THEN** the quantity SHALL be known zero
- **AND** finite inputs whose sum overflows SHALL produce null with a diagnostic instead of a nonfinite quantity

#### Scenario: Independent Omni context reaches composition

- **GIVEN** independent explicit primary and secondary Omni allowances
- **WHEN** mounted and full weights are composed
- **THEN** each SHALL use the existing assigned/required mechanism owner without reading legacy capacity or usage estimates
- **AND** an assigned charge SHALL remain known while its required-basis overload is unknown
- **AND** absent turrets SHALL retain explicit nonnegative charges without being installed

#### Scenario: Amplifier and remaining budgets remain unavailable

- **GIVEN** unavailable equipment, mechanism or required amplifier mass, or an invalid declared amplifier floor
- **WHEN** the full weight budget is calculated
- **THEN** dependent remaining mass SHALL be null and full calculation completeness false
- **AND** a declared amplifier floor SHALL NOT certify an unknown required contribution
- **AND** an engine that needs no amplifier SHALL retain a known amplifier term when its unrelated energy basis is unknown
- **AND** valid resolved inputs SHALL retain their existing numerical results, including negative overweight budgets

#### Scenario: Completeness reaches validation and the status boundary

- **GIVEN** an unavailable or nonfinite remaining budget
- **WHEN** its result reaches construction validation and the existing status consumer
- **THEN** validation SHALL remain incomplete and invalid while retaining known independent errors
- **AND** the status boundary SHALL display an unavailable value without arithmetic on null, a false zero, or a synthetic turret capacity denominator
- **AND** resolved input figures SHALL retain their existing numerical values

### Requirement: Environmental sealing mounted mass identity

The vehicle mounted-equipment mass owner SHALL apply the same environmental
sealing rule to the legacy catalog identity and its generated registry identity.
Non-support mounted sealing SHALL weigh one tenth of declared tonnage using
standard upward half-ton rounding. Support sealing SHALL add zero mounted mass
because its structure accounts for the chassis modification. Missing context
SHALL remain unavailable. Native mount identities, catalog values and inherent
submarine sealing SHALL remain unchanged.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MiscType.java:660-666,10270-10281`, `RoundWeight.java:56-68`,
`TestEntity.java:631-667`, `Tank.java:1878-1879` and
`TestTank.java:469-471`.

#### Scenario: Native registry identity reaches mounted mass

- **GIVEN** a 55-ton combat vehicle mounting Environmental Sealed Chassis
- **WHEN** its native name resolves to environmental-sealed-chassis-registry
- **THEN** the mounted-equipment owner SHALL charge 5.5 tons
- **AND** the legacy environmental-sealed-chassis identity SHALL charge the same
- **AND** a 55.01-ton combat vehicle SHALL charge 6 tons

#### Scenario: Support and unavailable construction context

- **GIVEN** either sealing catalog identity on a 1.3-ton or 55-ton support vehicle
- **WHEN** mounted mass is resolved with explicit support context
- **THEN** its mounted sealing mass SHALL be zero
- **AND** either identity without construction context SHALL remain unavailable
- **AND** an unmounted inherent submarine sealing capability SHALL NOT add a mount

### Requirement: Native Tank armor technology and decorated array identity

Native Tank construction weight SHALL select armor technology through the shared
armor owner using the pinned weight verifier's technology-level semantics.
Only an absent armor technology tag SHALL inherit the chassis side; explicit
unknown level -1 SHALL select IS density. Native Tank weight transport SHALL
reuse the guarded lookup-token owner only for decorated Inner Sphere arrays,
retaining original source identity and mount flags. Public equipment lookup
identities SHALL remain unchanged, including the legacy lmga target for these
decorated inputs. Existing catalog
IDs, ammunition namespace guards and unresolved-equipment behavior SHALL remain
unchanged.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`ArmorType.java:96-101`, `TechConstants.java:394-398`,
`BLKTankFile.java:284-304`, `ISLightMGA.java:67-83` and
`MiscType.java:563-591`.

#### Scenario: Explicit unknown armor technology differs from an absent tag

- **GIVEN** the base and Bombast Chalchiuhtotolin sources with explicit armor technology -1
- **WHEN** native construction weight is calculated
- **THEN** their armor SHALL weigh 7 and 7.5 tons respectively and their complete totals SHALL each equal 50 tons
- **AND** an absent armor technology tag SHALL retain the chassis-side fallback
- **AND** explicit Clan levels 2, 6, 8, 10 and 12 SHALL select Clan technology

#### Scenario: Decorated IS arrays retain their technology and sponson charge

- **GIVEN** Myrmidon P (Tate) with two ISLMGA(ST) arrays
- **WHEN** native Tank construction weight is calculated
- **THEN** each array SHALL weigh 0.5 tons like ISLMGA and converted islmgast
- **AND** the existing sponson mechanism SHALL remain 0.5 tons, equipment SHALL total 11.5 tons and complete weight SHALL equal 40 tons
- **AND** the original source tokens and sponson flags SHALL remain intact
- **AND** Omni decorators SHALL retain the IS identity and Clan arrays SHALL remain 0.25 tons

#### Scenario: Unrelated body-decorated identities retain their compatibility targets

- **GIVEN** (B) CLArrowIV, (B) CLLBXAC10 and (B) CLLBXAC20
- **WHEN** resolved through the IS or Mixed unit-loader API
- **THEN** their established targets SHALL remain arrow-iv-launcher, lb-10-x-ac and lb-20-x-ac respectively
- **AND** the ISLMGA decorator correction SHALL NOT reroute other decorated inputs

### Requirement: Native Tank unknown structure type

Native Tank construction weight SHALL treat an explicit unknown structure type
(`internal_type` -1, MegaMek `T_STRUCTURE_UNKNOWN`) as Standard structure, as the
pinned weight verifier does. Any other non-Standard structure type SHALL remain
unavailable instead of being approximated.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`EquipmentType.java:138`, `BLKTankFile.java:169-172`, `TestTank.java:87-95` and
`Structure.java:65-103`.

#### Scenario: Unknown structure weighs as Standard

- **GIVEN** a native Tank source with `internal_type` -1
- **WHEN** native construction weight is calculated
- **THEN** structure SHALL weigh tonnage / 10 rounded up to a half ton
- **AND** every component and the complete total SHALL equal the pinned verifier's values
- **AND** the handler SHALL publish that total without changing validity

#### Scenario: Other structure types stay unavailable

- **GIVEN** a native Tank source with `internal_type` 1 (Endo Steel in the pinned verifier) or any value other than 0 and -1
- **WHEN** native construction weight is calculated
- **THEN** no complete total SHALL be published

### Requirement: Native IS Mech Mortar-8 identity

Native equipment resolution SHALL map the Java internal name `IS Mech Mortar-8`
to the catalog record `mech-mortar-8` (10 t), whatever the unit's tech base, so
that mounts carrying it have mass.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`ISMekMortar8.java`.

#### Scenario: Mortar Carrier complete weight

- **GIVEN** the Mortar Carrier source with three `IS Mech Mortar-8` mounts
- **WHEN** native construction weight is calculated
- **THEN** each mortar SHALL weigh 10 tons and the complete total SHALL equal the pinned verifier's 60 tons
- **AND** the handler SHALL publish that total without changing validity

#### Scenario: Other mech mortar identities are unchanged

- **GIVEN** `IS Mech Mortar-1`, `IS Mech Mortar-2`, `Clan Mech Mortar-4` and `Clan Mech Mortar-8`
- **WHEN** resolved
- **THEN** each SHALL resolve to the same record as before

### Requirement: Native combat VTOL construction weight

Combat VTOLs SHALL expose a complete typed `VehicleWeightBreakdown` through the
same construction owners as Tanks. Rotor mass SHALL be the existing lifting
term, counted once. Native chin turret, engine, armor and transporter facts SHALL
reach those owners. Only complete parses SHALL publish computed `totalWeight`
and `remainingTonnage`; incomplete mass SHALL remain unavailable through the
typed API. The legacy number-only handler API SHALL retain its explicit failure.

Source: MegaMek `48fcb2f64`, `TestTank.java:178-270`, `VTOL.java:729-731`,
`BLKVTOLFile.java:90-195` and `TestEntity.java:1011-1032`.

#### Scenario: Native components determine the VTOL total

- **GIVEN** Skadi Swift, Garuda Heavy and Onuris A sources
- **WHEN** the native VTOL breakdown is requested
- **THEN** their totals SHALL equal the pinned verifier's 30, 40 and 30 tons
- **AND** Skadi's chin SHALL weigh 1 ton, Garuda's structure SHALL weigh 8 tons and Onuris's engine-based booster SHALL weigh 0.5 tons
- **AND** rotor mass SHALL use each source's lifting term without a second charge

#### Scenario: Computed mass differs from design tonnage

- **GIVEN** Marten Scout, Balac Hybrid, Hawk Moth II, Warrior H-7F and Warrior HX-9 sources
- **WHEN** their complete construction mass is published
- **THEN** their totals SHALL equal 13.5, 24.5, 24, 20.5 and 20.5 tons respectively
- **AND** remaining tonnage SHALL equal design tonnage minus that computed mass

#### Scenario: Incomplete mass remains unavailable

- **GIVEN** a loadable VTOL with unresolved mounted mass or unsupported construction
- **WHEN** the native breakdown is requested
- **THEN** it SHALL return unavailable and SHALL NOT publish a computed subtotal
- **AND** the legacy number-only API SHALL still throw its incomplete-weight error

#### Scenario: VTOL loader controls and Omni allowance reach the shared owners

- **GIVEN** a Ferret with a no-controls tag and an Omni Skadi with a 2-ton chin allowance
- **WHEN** their complete native mass is calculated
- **THEN** Ferret SHALL retain 0.5 tons of controls because its loader ignores that Tank-only tag
- **AND** Skadi SHALL weigh 31 tons and SHALL receive an overweight diagnostic

### Requirement: Pinned vehicle armor limits and allocation

Vehicle armor editing SHALL follow the pinned MegaMekLab location limits and
MegaMek class-total limits. Installed armored hull and turret locations SHALL
have no individual point maximum, except that a VTOL rotor SHALL allow at most
two points. Unavailable and unarmored locations SHALL remain unavailable.
Combat, VTOL and superheavy vehicle totals SHALL use the pinned Tank formula;
support and large-support totals SHALL use the pinned support movement and size
rules. Forms, store allocation and status diagnostics SHALL consume the same
domain rules without changing serialized armor allocations on open.

#### Scenario: Edit canonical Ajax armor above the former location cap

- **GIVEN** canonical Ajax Assault Tank Prime with 76 Front armor and 304 total armor
- **WHEN** it opens and Front armor is edited to 80 through the tab or diagram
- **THEN** opening SHALL preserve every stored armor value
- **AND** the edit SHALL retain 80 rather than clamp it to 40
- **AND** its class total SHALL be 355 with no individual Front maximum
- **AND** any purchased-point deficit SHALL be reported independently of location limits

#### Scenario: Diagnose the pinned rotor and class-total boundaries

- **GIVEN** a combat, VTOL, superheavy, support or large-support vehicle
- **WHEN** armor diagnostics run
- **THEN** concentrated armor within its class total SHALL NOT receive an invented location-limit error
- **AND** rotor armor above two SHALL receive a rotor-limit error
- **AND** armor above the applicable class total SHALL receive a total-limit error
- **AND** Jonah Submarine JN-002 with five armor against its four-point support limit SHALL retain that legitimate error

#### Scenario: Automatically allocate the purchased class-limited armor budget

- **GIVEN** a vehicle using combat armor or BAR armor, including a six-side or dual-turret layout
- **WHEN** automatic allocation is requested
- **THEN** allocation SHALL use its armor type or BAR table and SHALL NOT exceed purchased points or the class total
- **AND** a rotor SHALL receive at most two available points before the remaining distribution
- **AND** Body SHALL remain unarmored and every installed armored face and turret SHALL participate
- **AND** the front/rear weighting and rounding remainder SHALL follow the pinned MegaMekLab allocator
- **AND** zero- and one-point budgets SHALL NOT create negative armor

### Requirement: Pinned vehicle armor Body presentation

Vehicle armor forms and diagrams SHALL omit Body for combat, support,
large-support and VTOL layouts, matching MML 62bf193
ArmorAllocationView.java:91-110,321-343 and SVArmorTab.java:304,329.
Body SHALL remain unarmored independently of BAR and armor tech rating.

#### Scenario: Support Body is an equipment location without an armor control

- **GIVEN** a support tank, support VTOL or large support vehicle using BAR or combat armor
- **WHEN** its armor tab or diagram opens
- **THEN** no Body armor input or disabled Body armor row SHALL be rendered
- **AND** manual allocation SHALL NOT assign armor to Body
- **AND** automatic allocation SHALL keep Body at zero
- **AND** Body equipment placement SHALL remain available under its existing construction rules

### Requirement: Pinned vehicle armor diagnostic identities

Vehicle armor validation SHALL use VAL-VEHICLE-ARMOR-LOC for rotor and
unavailable-location violations, and VAL-VEHICLE-ARMOR-TOTAL for the separate
class-total ceiling. Ordinary installed hull and turret armor SHALL NOT
receive a location error based on internal structure. This supersedes the
structure-based vehicle location scenario in archived add-vehicle-construction,
following MML 62bf193 UnitUtil.java:900-916 and MegaMek 48fcb2f64 TestTank.java:338.

#### Scenario: Former per-location overrun is legal within the class total

- **GIVEN** a 50-ton Tank with Front 30, Left 16, Right 16, Rear 10 and Turret 10 armor
- **WHEN** construction validation runs
- **THEN** neither VAL-VEHICLE-ARMOR-LOC nor VAL-VEHICLE-ARMOR-TOTAL SHALL be emitted for its 82 points

#### Scenario: Concentrated armor exceeds only the class-total ceiling

- **GIVEN** a 50-ton Tank with Front 216 armor and no armor elsewhere
- **WHEN** construction validation runs
- **THEN** VAL-VEHICLE-ARMOR-TOTAL SHALL report 216 against maximum 215
- **AND** VAL-VEHICLE-ARMOR-LOC SHALL NOT be emitted for Front

#### Scenario: Pending catalog loading preserves the pinned vehicle representation

- **GIVEN** a tracked superheavy or large-support vehicle with native tonnage and geometry
- **WHEN** its equipment catalog is pending
- **THEN** its inert loading diagram SHALL render the six-side armored hull
- **AND** support loading diagrams SHALL omit Body armor controls

### Requirement: Support-vehicle heat sink mass

Support-vehicle heat-sink mass SHALL equal the pinned verifier's heat-neutral
requirement with no free engine sinks, and zero for a support vehicle under
5 tons. The editor figure and the construction-handler total SHALL read one
shared linked-heat sum, so laser insulators and PPC capacitors apply to a
support chassis as they do to a combat one. Support `remaining` tonnage SHALL
include this mass; it SHALL NOT be treated as a Java total because source fuel
remains outside the editor composition.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestSupportVehicle.java:917-931` and `TestEntity.java:945-984`.

#### Scenario: Corpus support vehicles carry Java heat

- **GIVEN** the 19 corpus support vehicles with positive pinned-Java heat, among them Jifty JI-50 (ML), Wayland Mobile Base and White Tip Submarine
- **WHEN** the editor weight is composed
- **THEN** each SHALL report the pinned count as its heat-sink mass, with no engine allowance subtracted
- **AND** Hoverbike (Laser) and Harpoon ParaSub, under 5 tons, SHALL report zero

#### Scenario: Insulator and capacitor apply to a support chassis

- **GIVEN** a support Jifty chassis with two medium lasers and a laser insulator, and another with a PPC and a PPC capacitor
- **WHEN** heat is composed by the editor or by the construction handler
- **THEN** the sink masses SHALL be 5 and 15 tons
- **AND** an insulated small laser SHALL keep the running-total minimum of one
- **AND** an insulator in another location SHALL link no laser

### Requirement: Support torpedo launcher mass identity

A support vehicle's torpedo launcher (LRT and SRT) SHALL weigh the pinned launcher
mass, taken from the Java-derived registry entry the unit loader resolves for the
BLK token, not from the legacy name stub the BV catalog matches. Only a
definition that the registry owner identifies as a registry entry SHALL supply
mass this way; other resolver answers (cargo, flail, wrecking ball) and
ammunition SHALL keep their existing mass source.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`, `TestSupportVehicle`
verifier weapon and ammunition terms.

#### Scenario: Torpedo launchers weigh the Java mass

- **GIVEN** a support chassis mounting LRT 5, 10, 15 or 20, or SRT 2, 4 or 6
- **WHEN** the construction handler weighs it
- **THEN** the launchers SHALL weigh 2, 5, 7, 10, 1, 2 and 3 tons respectively
- **AND** LRT 10, LRT 15, SRT 2 and SRT 4 together SHALL weigh 15 tons

#### Scenario: Corpus torpedo boats equal Java

- **GIVEN** Seahorse Cargo Sub, Silverfin Coastal Cutter and White Tip Submarine
- **WHEN** their support weight is calculated
- **THEN** it SHALL equal the pinned verifier's 250, 40 and 249.5 tons

#### Scenario: Non-registry answers keep their mass source

- **GIVEN** a support chassis mounting a wrecking ball, a flail or a sized cargo bay
- **WHEN** the construction handler weighs it
- **THEN** they SHALL weigh 4, 5 and 20 tons and the torpedo ammunition bin SHALL weigh 1 ton

### Requirement: Small support vehicle weapon mass

A support vehicle under 5 tons SHALL weigh its weapons at their pinned type
tonnage, SHALL take an Omni chassis's fixed fire-control mass when positive, and
SHALL report as unresolved, never guess, a weapon beyond its first clip (its
ammunition weight is not carried) and a weapon whose identity is not a legal
support-vehicle weapon. A support structure mass SHALL NOT read the structure
type.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`TestSupportVehicle.java:760-788,980-988` and `MiscType.java:707-711`.

#### Scenario: Small support vehicles equal the pinned Java terms

- **GIVEN** Hoverbike, Assuan Armored Bike, Harpoon ParaSub, Beast Riot Car, TrackBike, Rumbler-HT and the Omni Boreas Cavalry Hovercraft A and Prime
- **WHEN** their support weight is calculated
- **THEN** weapons, miscellaneous equipment and total SHALL equal the pinned verifier terms and nothing SHALL be reported unresolved
- **AND** the Boreas fire control SHALL weigh its fixed chassis 0.01 tons

#### Scenario: Unmodelled terms are reported, not guessed

- **GIVEN** Rock Rover RRV (Speed) with a size-2 Support Laser, and Ibex RV (Militarized MG) with `Machine Gun (Light)(PT)`
- **WHEN** their support weight is calculated
- **THEN** the first SHALL report its clip ammunition mass unresolved and fall short of Java by exactly 0.003 tons
- **AND** the second SHALL report the battle-armor gun as not a support-vehicle weapon and SHALL NOT charge its 0.075 tons

#### Scenario: An unknown structure type does not move a support structure mass

- **GIVEN** a support chassis with internal type -1, 0 or none
- **WHEN** its structure mass is calculated
- **THEN** it SHALL be 13.5 tons and the total 59.5 tons in each case

### Requirement: Support pintle and sponson mechanisms follow the pinned weight rule

A support vehicle's sponson pair SHALL weigh 10% of its sponson-mounted equipment
(excluding ammunition, heat sinks and armor), and each pintle SHALL weigh 5% of
the pintle-mounted weapons in its own location, both rounded up (kilograms under
5 tons, half tons otherwise); a fixed chassis weight, even zero, SHALL replace the
pintle figure and be split over the pintles. A mechanism whose weapons or payload
have an unresolved mass SHALL be reported unresolved, never weighed as if they
weighed nothing. The editor and the support handler SHALL share one owner.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MiscType.java:563-603` and `Tank.getBaseChassisSponsonPintleWeight`.

#### Scenario: Pintle and sponson sources equal the pinned Java terms

- **GIVEN** Apocalypse World Rover, Heavy Combat ATV, Ibex RV (Militarized LDGR) and Outrider
- **WHEN** their support weight is calculated
- **THEN** weapons, miscellaneous equipment and total SHALL equal the pinned verifier terms and nothing SHALL be reported unresolved
- **AND** the Apocalypse pintle SHALL weigh its fixed chassis weight 0.08 tons

#### Scenario: An unresolved weapon leaves its pintle unresolved

- **GIVEN** Ibex RV (Militarized MG) whose pintle weapon is reported as not a support-vehicle weapon
- **WHEN** its support weight is calculated
- **THEN** its pintles SHALL be reported unresolved and SHALL NOT be weighed as zero

### Requirement: Decorated Inner Sphere arrays weigh as the plain array in every weight owner

A decorated Inner Sphere machine-gun array (ISMGA, ISLMGA or ISHMGA with `(ST)`,
`(ST):OMNI` or `:OMNI`) SHALL weigh 0.5 tons in both the combat vehicle weight
transport and the support vehicle weight, through one shared lookup-token owner.
Clan arrays SHALL remain 0.25 tons, every other source token SHALL keep its
ordinary lookup, and public equipment lookup identities SHALL remain unchanged.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`ISMGA.java:70-83`, `ISLightMGA.java:69-82` and `ISHeavyMGA.java:70-83`.

#### Scenario: The array family shares one token

- **GIVEN** the decorated tokens ISMGA(ST), ISLMGA(ST), ISHMGA(ST), their `:OMNI` forms and ISMGA:OMNI
- **WHEN** the native weight lookup token is selected
- **THEN** each SHALL select the plain array identity and a Clan or plain array token SHALL be left unchanged

#### Scenario: The Dreadnought Land Train equals the pinned Java total

- **GIVEN** the Dreadnought Mk II Land Train with two ISMGA(ST) arrays on its sponsons
- **WHEN** its support weight is calculated
- **THEN** weapons SHALL be 32 tons, miscellaneous equipment 10 tons and the total 200 tons, equal to the pinned verifier

### Requirement: Support ladders, dumpers, fluid suction and the fire-control basis follow the pinned rules

A ladder SHALL weigh its size divided by 200, rounded to the nearest kilogram. A
Fluid Suction System (Standard) SHALL weigh 1 ton. A dumper SHALL weigh 5% of the
size of the first unlinked variable Cargo in its own location, rounded up to the
kilogram on a small support vehicle and to the half ton otherwise, and zero when
no cargo is linked. The advanced and basic fire controls SHALL be sized from the
weapon tonnage excluding anti-missile systems and non-support infantry weapons.
The editor and the support handler SHALL use the same owner functions.

Source: MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`,
`MiscType.java:707-725,841-843,7578-7583`, `Mounted.java:729-738` and
`MekFileParser.java:854-885`.

#### Scenario: Dump trucks and the fire engine equal the pinned Java terms

- **GIVEN** the Brunel and Lesseps Dump Trucks and the Saurer-Bucher Fire Engine
- **WHEN** their support weight is calculated
- **THEN** their dumpers SHALL weigh 2.5 and 1 tons, their ladders 0.5 tons each, and miscellaneous equipment SHALL equal the pinned verifier
- **AND** a second dumper, a cargo in another location or Liquid Storage SHALL NOT link

#### Scenario: Anti-missile systems and non-support infantry weapons are not fire-control basis

- **GIVEN** an advanced fire control with an assault rifle and a standard infantry SRM, and another with an anti-missile system and a medium laser
- **WHEN** the support weight is calculated
- **THEN** the first SHALL be sized from the SRM alone (0.003 tons on a small vehicle) and the second from the medium laser alone
