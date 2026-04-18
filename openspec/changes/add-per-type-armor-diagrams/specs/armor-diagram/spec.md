# armor-diagram (delta)

## ADDED Requirements

### Requirement: Per-Type Diagram Selection

The customizer's Armor tab SHALL render a diagram component appropriate to the unit's type, selected at render time by `unit.type`.

**Rationale**: Each unit type has fundamentally different armor geometry. A single universal diagram cannot represent all shapes.

**Priority**: Critical

#### Scenario: Vehicle routes to vehicle diagram

- **GIVEN** a vehicle loaded in the customizer
- **WHEN** the Armor tab renders
- **THEN** it SHALL render `VehicleArmorDiagram`, not the mech diagram

#### Scenario: Aerospace routes to aerospace diagram

- **GIVEN** an aerospace unit loaded
- **WHEN** the Armor tab renders
- **THEN** it SHALL render `AerospaceArmorDiagram` with 4 arc labels (Nose/LW/RW/Aft) and the SI bar

#### Scenario: Infantry shows platoon counter, not diagram

- **GIVEN** an infantry unit loaded
- **WHEN** the Armor tab renders
- **THEN** it SHALL render `InfantryPlatoonCounter` — a trooper counter, NOT a per-location diagram

---

### Requirement: Vehicle Diagram Geometry

The vehicle armor diagram SHALL render 4 base locations (Front, Left Side, Right Side, Rear) plus conditional additional locations based on vehicle configuration.

**Priority**: Critical

#### Scenario: VTOL adds Rotor location

- **GIVEN** a VTOL vehicle
- **WHEN** the vehicle diagram renders
- **THEN** a Rotor armor location SHALL appear alongside the 4 base sides

#### Scenario: Support vehicle adds Body location

- **GIVEN** a Support vehicle chassis
- **WHEN** the diagram renders
- **THEN** a Body armor location SHALL appear

#### Scenario: Turret configured shows Turret location

- **GIVEN** a vehicle with `turretConfig: 'Single'`
- **WHEN** the diagram renders
- **THEN** a Turret armor location SHALL appear

#### Scenario: Auto-allocate distributes per TechManual

- **GIVEN** a 50-ton tracked vehicle with armor tonnage 5
- **WHEN** the Auto-allocate button is clicked
- **THEN** points SHALL be distributed: 40% Front, 20% each Side, 10% Rear, remainder Turret — matching TechManual pp.86–87

---

### Requirement: Aerospace Diagram Geometry

The aerospace armor diagram SHALL render 4 arcs (Nose, Left Wing, Right Wing, Aft) plus a separate Structural Integrity bar.

**Priority**: Critical

#### Scenario: Arcs match aerospace-unit-system

- **GIVEN** any aerospace unit
- **WHEN** the aerospace diagram renders
- **THEN** the 4 arcs SHALL be labeled Nose, Left Wing, Right Wing, Aft — matching the `aerospace-unit-system` spec's arc names

#### Scenario: SI bar rendered separately

- **GIVEN** an aerospace fighter with SI 5
- **WHEN** the diagram renders
- **THEN** a horizontal bar above the arcs SHALL show `5 / max` for SI

---

### Requirement: BattleArmor Per-Trooper Grid

The BattleArmor armor diagram SHALL render a per-trooper pip grid with one column per trooper (4–6 troopers) and rows corresponding to the suit's max armor pips per chassis weight class.

**Priority**: Critical

#### Scenario: Elemental point shows 5 columns

- **GIVEN** a 5-trooper Elemental point (medium chassis, 7 pips per suit)
- **WHEN** the diagram renders
- **THEN** exactly 5 trooper columns SHALL appear, each with 7 pip slots

#### Scenario: Damage decrements pips

- **GIVEN** a point where trooper 2 has taken 3 points of damage
- **WHEN** the diagram renders
- **THEN** 3 of trooper 2's pips SHALL render as consumed (filled or crossed-out per theme)

---

### Requirement: Infantry Platoon Counter

An infantry unit's "armor" surface SHALL render a platoon-size counter instead of per-location armor, because infantry damage reduces trooper count (TechManual §infantry damage).

**Priority**: Critical

#### Scenario: Counter reflects trooper count

- **GIVEN** a 28-trooper foot rifle platoon at full strength
- **WHEN** the Armor tab renders
- **THEN** the counter SHALL show `28 / 28` in green styling

#### Scenario: Threshold color changes on damage

- **GIVEN** a platoon reduced to 6 troopers out of 28
- **WHEN** the counter renders
- **THEN** the counter styling SHALL use the red threshold (≤25%)

---

### Requirement: ProtoMech 5-Location Compact Diagram

The ProtoMech armor diagram SHALL render 5 locations (Head, Torso, Left Arm, Right Arm, Legs) plus an optional Main Gun location when the unit has a main gun designated.

**Priority**: Critical

#### Scenario: Standard ProtoMech shows 5 locations

- **GIVEN** a standard ProtoMech with no main gun
- **WHEN** the diagram renders
- **THEN** exactly 5 armor locations SHALL appear (Head, Torso, LA, RA, Legs)

#### Scenario: Main-gun ProtoMech shows 6 locations

- **GIVEN** a ProtoMech with a designated Main Gun
- **WHEN** the diagram renders
- **THEN** a 6th Main Gun armor location SHALL appear

#### Scenario: Compact layout fits 5 protos

- **GIVEN** a point of 5 ProtoMechs displayed together
- **WHEN** the layout renders
- **THEN** all 5 diagrams SHALL be visible without horizontal scroll on a standard desktop viewport

---

### Requirement: Shared Armor Pip Primitive

All per-type diagrams SHALL use the shared `<ArmorPipRow>` primitive for rendering individual armor pips. Unit-type-specific layouts compose from this primitive.

**Rationale**: Ensures visual consistency and centralizes damage-state rendering logic.

**Priority**: Medium

#### Scenario: Pip primitive used across types

- **GIVEN** the vehicle, aerospace, BA, and protomech diagrams
- **WHEN** any one renders armor pips
- **THEN** it SHALL delegate to `<ArmorPipRow>` for the pip strip — no per-type pip implementations
