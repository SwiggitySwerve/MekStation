# Construction Rules Core Specification

**Status**: Active
**Version**: 1.0
**Last Updated**: 2025-11-27
**Dependencies**: All Phase 1 & Phase 2 specs
**Affects**: Unit construction, validation, import/export

---

## Overview

### Purpose
Defines the comprehensive construction rules for BattleMech design. Establishes weight budgeting, construction sequence, validation requirements, and minimum/maximum constraints that tie together all component specifications.

### Scope
**In Scope:**
- Construction sequence and order of operations
- Weight budget calculation and allocation
- Total weight validation (must equal tonnage exactly)
- Critical slot budget and validation
- Minimum component requirements (heat sinks, actuators, etc.)
- Maximum component limits (armor, tonnage, slots)
- Construction validation checklist
- Tech rating calculation
- Battle value calculation overview

**Out of Scope:**
- Specific component formulas (covered in component specs)
- Detailed battle value formulas (covered in Battle Value spec)
- Campaign-specific house rules
- Custom/non-standard unit types (LAMs, ProtoMechs)
- Weapon damage calculations (covered in Weapon System spec)

### Key Concepts
- **Weight Budget**: Total tonnage allocation across all components
- **Construction Sequence**: Ordered steps for building a valid BattleMech
- **Fixed Weight**: Components with unchanging weight (cockpit)
- **Calculated Weight**: Components with weight derived from other values (engine, gyro, structure)
- **Allocated Weight**: User-assigned weight (armor, equipment)
- **Validation**: Ensuring design meets all construction rules

---

## Requirements

### Requirement: Standard Tonnage Classes
BattleMechs SHALL be constructed using standard tonnage values only.

**Rationale**: Official BattleTech rules define specific valid tonnage classes. Non-standard tonnages are not legal for standard play.

**Priority**: Critical

#### Scenario: Valid tonnage selection
**GIVEN** user is creating a new BattleMech
**WHEN** selecting mech tonnage
**THEN** it MUST be one of: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100 tons
**AND** no other values SHALL be permitted

#### Scenario: Invalid tonnage rejected
**GIVEN** user attempts to create a 47-ton BattleMech
**WHEN** validating the tonnage
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate valid tonnage values

### Requirement: Exact Weight Matching
Total component weight SHALL equal exactly the mech's tonnage.

**Rationale**: BattleMech construction rules require exact weight matching. No overweight or underweight designs are legal.

**Priority**: Critical

#### Scenario: Valid weight total
**GIVEN** a 50-ton BattleMech design
**WHEN** summing all component weights
**THEN** total MUST equal exactly 50.0 tons
**AND** validation SHALL succeed

#### Scenario: Overweight design
**GIVEN** a 50-ton BattleMech with 50.5 tons of components
**WHEN** validating total weight
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate overweight by 0.5 tons

#### Scenario: Underweight design
**GIVEN** a 50-ton BattleMech with 49.5 tons of components
**WHEN** validating total weight
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate underweight by 0.5 tons

### Requirement: Minimum Heat Sink Count
All BattleMechs SHALL have a minimum of 10 heat sinks.

**Rationale**: Official construction rules require minimum 10 heat sinks regardless of weapon load.

**Priority**: Critical

#### Scenario: Sufficient heat sinks
**GIVEN** a BattleMech with 12 heat sinks (5 integrated + 7 external)
**WHEN** validating heat sink count
**THEN** validation SHALL succeed
**AND** count meets minimum requirement

#### Scenario: Insufficient heat sinks
**GIVEN** a BattleMech with 8 heat sinks total
**WHEN** validating heat sink count
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate "Minimum 10 heat sinks required"

### Requirement: Required Components Present
All BattleMechs SHALL have all required structural components.

**Rationale**: These components are essential for a functional BattleMech.

**Priority**: Critical

#### Scenario: All components present
**GIVEN** a BattleMech design
**WHEN** validating required components
**THEN** it MUST have an engine
**AND** it MUST have a gyro
**AND** it MUST have a cockpit
**AND** it MUST have internal structure
**AND** it MUST have armor (may be 0 points but type selected)

#### Scenario: Missing engine
**GIVEN** a BattleMech design without an engine
**WHEN** validating required components
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate "Engine required"

### Requirement: Construction Sequence Order
BattleMech construction SHALL follow a defined sequence for proper dependency resolution.

**Rationale**: Some components depend on others (gyro weight depends on engine rating). Following sequence ensures valid calculations.

**Priority**: High

#### Scenario: Valid construction order
**GIVEN** user is building a BattleMech
**WHEN** following construction sequence
**THEN** tonnage is selected first
**AND** engine is selected before gyro
**AND** structure type is selected before armor allocation
**AND** all fixed components before equipment

### Requirement: Maximum Armor Limits
Armor allocation SHALL not exceed maximum per location.

**Rationale**: Maximum armor is 2× internal structure points per location (except head).

**Priority**: Critical

#### Scenario: Valid armor allocation
**GIVEN** a location with 16 structure points
**WHEN** allocating armor to that location
**THEN** maximum front armor SHALL be 32 points
**AND** combined front + rear SHALL not exceed 32 points

#### Scenario: Excessive armor
**GIVEN** a location with 16 structure points and 35 armor points
**WHEN** validating armor allocation
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate exceeded maximum

#### Scenario: Head armor special case
**GIVEN** head location
**WHEN** allocating armor
**THEN** maximum armor SHALL be 9 points
**AND** this applies regardless of structure type

### Requirement: Critical Slot Capacity
Component placement SHALL not exceed available critical slots per location.

**Rationale**: Each location has fixed slot count. Exceeding this is physically impossible.

**Priority**: Critical

#### Scenario: Valid slot allocation
**GIVEN** center torso with 12 slots
**WHEN** placing engine (6) + gyro (4) + heat sinks (2)
**THEN** total slots = 12
**AND** validation SHALL succeed

#### Scenario: Exceeded slot capacity
**GIVEN** center torso with 12 slots
**WHEN** attempting to place 13 slots of components
**THEN** validation SHALL fail with error
**AND** error message SHALL indicate location and excess slots

### Requirement: Actuator Requirements
BattleMechs SHALL have all required actuators in proper locations.

**Rationale**: Actuators are essential for limb function and cannot be omitted (except optional hand/lower arm).

**Priority**: High

#### Scenario: Complete arm actuators
**GIVEN** arm location
**WHEN** validating actuators
**THEN** shoulder actuator MUST be present
**AND** upper arm actuator MUST be present
**AND** lower arm actuator MAY be present
**AND** hand actuator MAY be present (requires lower arm)

#### Scenario: Complete leg actuators
**GIVEN** leg location
**WHEN** validating actuators
**THEN** hip actuator MUST be present
**AND** upper leg actuator MUST be present
**AND** lower leg actuator MUST be present
**AND** foot actuator MUST be present

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Complete BattleMech construction configuration
 */
interface IBattleMechConstruction {
  /** Basic identification */
  readonly id: string;
  readonly name: string;
  readonly tonnage: MechTonnage;

  /** Tech classification */
  readonly techBase: UnitTechBase;
  readonly rulesLevel: RulesLevel;
  readonly constructionYear: number;

  /** Core components */
  readonly engine: IEngine;
  readonly gyro: IGyro;
  readonly cockpit: ICockpit;
  readonly structure: IStructure;
  readonly armor: IArmorConfiguration;
  readonly heatSinks: IHeatSinkConfiguration;
  readonly movement: IMovementProfile;

  /** Equipment */
  readonly equipment: IEquipment[];
  readonly weapons: IWeapon[];

  /** Critical slot allocation */
  readonly criticalSlots: ICriticalAllocationMap;

  /** Calculated properties */
  readonly weightBudget: IWeightBudget;
  readonly validation: IConstructionValidation;
}

/**
 * Weight budget breakdown
 */
interface IWeightBudget {
  /** Target tonnage */
  readonly tonnage: number;

  /** Fixed weight components */
  readonly cockpitWeight: number;

  /** Calculated weight components */
  readonly engineWeight: number;
  readonly gyroWeight: number;
  readonly structureWeight: number;

  /** Allocated weight components */
  readonly armorWeight: number;
  readonly heatSinkWeight: number;
  readonly actuatorWeight: number;
  readonly equipmentWeight: number;
  readonly weaponWeight: number;

  /** Totals */
  readonly totalAllocated: number;
  readonly remaining: number;
  readonly isValid: boolean;
}

/**
 * Construction validation result
 */
interface IConstructionValidation {
  readonly isValid: boolean;
  readonly errors: IValidationError[];
  readonly warnings: IValidationWarning[];
  readonly info: IValidationInfo[];
}

/**
 * Construction sequence state
 */
interface IConstructionSequence {
  readonly currentStep: ConstructionStep;
  readonly completedSteps: ConstructionStep[];
  readonly nextAvailableSteps: ConstructionStep[];
  readonly canProceed: boolean;
}

/**
 * Valid BattleMech tonnages
 */
type MechTonnage =
  | 20 | 25 | 30 | 35 | 40 | 45 | 50 | 55 | 60 | 65
  | 70 | 75 | 80 | 85 | 90 | 95 | 100;

/**
 * Construction steps
 */
enum ConstructionStep {
  SELECT_TONNAGE = 'select_tonnage',
  SELECT_TECH_BASE = 'select_tech_base',
  SELECT_ENGINE = 'select_engine',
  SELECT_STRUCTURE = 'select_structure',
  SELECT_GYRO = 'select_gyro',
  SELECT_COCKPIT = 'select_cockpit',
  ALLOCATE_ARMOR = 'allocate_armor',
  ADD_HEAT_SINKS = 'add_heat_sinks',
  CONFIGURE_ACTUATORS = 'configure_actuators',
  ADD_EQUIPMENT = 'add_equipment',
  VALIDATE = 'validate',
  COMPLETE = 'complete'
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values |
|----------|------|----------|-------------|--------------|
| `tonnage` | `MechTonnage` | Yes | Mech weight class | 20-100 in 5-ton increments |
| `techBase` | `UnitTechBase` | Yes | Technology classification | IS, Clan, Mixed |
| `engine` | `IEngine` | Yes | Engine configuration | Valid engine |
| `gyro` | `IGyro` | Yes | Gyro configuration | Valid gyro |
| `cockpit` | `ICockpit` | Yes | Cockpit type | Valid cockpit |
| `structure` | `IStructure` | Yes | Internal structure | Valid structure |
| `totalAllocated` | `number` | Yes | Sum of all weights | Must equal tonnage |
| `remaining` | `number` | Yes | Unallocated weight | Must be 0.0 |

---

## Construction Sequence

### Step 1: Select Tonnage
**Action**: Choose from valid tonnage values (20-100 tons)

**Dependencies**: None

**Validation**:
- Tonnage must be standard value (20, 25, 30, etc.)

**Example**:
```typescript
const tonnage: MechTonnage = 50;
```

### Step 2: Select Tech Base
**Action**: Declare unit as Inner Sphere, Clan, or Mixed Tech

**Dependencies**: None

**Validation**:
- Must be valid UnitTechBase enum value

**Impact**:
- Determines available structural components
- Affects tech rating

**Example**:
```typescript
const techBase: UnitTechBase = UnitTechBase.INNER_SPHERE;
```

### Step 3: Select Engine
**Action**: Choose engine rating and type

**Dependencies**: Tonnage selected

**Validation**:
- Engine weight must not exceed tonnage
- Rating determines walk MP: floor(rating / tonnage)

**Calculations**:
- Engine weight = f(rating, engine type)
- Integral heat sinks = min(10, floor(rating / 25))
- Walk MP = floor(rating / tonnage)
- Run MP = floor(walk MP × 1.5)

**Example**:
```typescript
const engine: IEngine = {
  id: 'engine-300-std',
  name: 'Fusion Engine 300',
  rating: 300,
  engineType: EngineType.STANDARD,
  weight: 19.0, // Calculated from rating
  criticalSlots: 6 // CT slots
};
// Walk MP = floor(300 / 50) = 6
// Run MP = floor(6 × 1.5) = 9
```

### Step 4: Select Structure Type
**Action**: Choose internal structure type

**Dependencies**: Tonnage selected

**Calculations**:
- Standard: tonnage × 0.10
- Endo Steel: CEIL(tonnage × 0.05, 0.5)
- Reinforced: tonnage × 0.20
- Composite: CEIL(tonnage × 0.05, 0.5)

**Example**:
```typescript
const structure: IStructure = {
  structureType: StructureType.STANDARD,
  weight: 5.0, // 50 × 0.10
  criticalSlots: 0,
  points: {
    head: 3,
    centerTorso: 16,
    leftTorso: 12,
    rightTorso: 12,
    leftArm: 8,
    rightArm: 8,
    leftLeg: 12,
    rightLeg: 12
  }
};
```

### Step 5: Select Gyro Type
**Action**: Choose gyro type

**Dependencies**: Engine rating selected

**Calculations**:
- Weight = CEIL(engine.rating / 100) × gyro multiplier
- Standard: multiplier 1.0, 4 slots
- XL: multiplier 0.5, 6 slots
- Compact: multiplier 1.5, 2 slots
- Heavy-Duty: multiplier 2.0, 4 slots

**Example**:
```typescript
const gyro: IGyro = {
  gyroType: GyroType.STANDARD,
  weight: 3.0, // CEIL(300 / 100) × 1.0 = 3
  criticalSlots: 4 // CT slots 7-10
};
```

### Step 6: Select Cockpit Type
**Action**: Choose cockpit type

**Dependencies**: None (though Torso-Mounted incompatible with XL Gyro)

**Calculations**:
- Most cockpits: 3 tons fixed
- Small: 2 tons
- Torso-Mounted: 4 tons

**Example**:
```typescript
const cockpit: ICockpit = {
  cockpitType: CockpitType.STANDARD,
  weight: 3.0, // Fixed
  criticalSlots: 1 // In head
};
```

### Step 7: Allocate Armor
**Action**: Distribute armor points across locations

**Dependencies**: Structure selected (determines max armor)

**Constraints**:
- Max per location: 2× structure points
- Head max: 9 points (special rule)
- Rear armor only on CT, LT, RT

**Calculations**:
- Armor weight = total points / points-per-ton
- Standard: 16 points/ton
- Ferro-Fibrous IS: 17.92 points/ton
- Ferro-Fibrous Clan: 19.2 points/ton

**Example**:
```typescript
const armor: IArmorConfiguration = {
  armorType: ArmorType.STANDARD,
  allocation: {
    head: 9, // Max for head
    centerTorso: { front: 20, rear: 10 }, // Total 30 (max 32)
    leftTorso: { front: 16, rear: 8 }, // Total 24 (max 24)
    rightTorso: { front: 16, rear: 8 },
    leftArm: 14, // Max 16
    rightArm: 14,
    leftLeg: 18, // Max 24
    rightLeg: 18
  },
  totalPoints: 151,
  weight: 9.5 // 151 / 16 = 9.4375 → rounds to 9.5
};
```

### Step 8: Add Heat Sinks
**Action**: Add heat sinks to meet minimum 10

**Dependencies**: Engine selected (determines integral capacity)

**Calculations**:
- Integral = min(10, floor(engine.rating / 25))
- External needed = max(0, 10 - integral)
- External weight = external count × 1.0 ton (for Double HS)
- External slots = external count × 3 (IS DHS) or × 2 (Clan DHS)

**Example**:
```typescript
const heatSinks: IHeatSinkConfiguration = {
  heatSinkType: HeatSinkType.DOUBLE,
  totalCount: 10,
  integralCount: 10, // floor(300 / 25) = 12, capped at 10
  externalCount: 0,
  weight: 0, // All integral
  criticalSlots: 0 // Integral take 0 additional slots
};
```

### Step 9: Configure Actuators
**Action**: Set up limb actuators (optionally remove hand/lower arm for weapons)

**Dependencies**: None

**Calculations**:
- Arm actuators: shoulder (1 slot), upper arm (1), lower arm (1), hand (1)
- Leg actuators: hip (1), upper leg (1), lower leg (1), foot (1)
- Actuator weights vary by tonnage class

**Example**:
```typescript
const actuators = {
  leftArm: {
    shoulder: required,
    upperArm: required,
    lowerArm: present,
    hand: present
  },
  rightArm: {
    shoulder: required,
    upperArm: required,
    lowerArm: removed, // For weapon
    hand: removed
  },
  leftLeg: { hip: required, upperLeg: required, lowerLeg: required, foot: required },
  rightLeg: { hip: required, upperLeg: required, lowerLeg: required, foot: required }
};
```

### Step 10: Add Equipment and Weapons
**Action**: Add weapons, ammunition, and equipment with remaining tonnage

**Dependencies**: All previous components selected

**Constraints**:
- Must fit within remaining weight
- Must fit within available critical slots
- Must respect location restrictions

**Example**:
```typescript
const equipment: IEquipment[] = [
  { name: 'Medium Laser', weight: 1.0, slots: 1, location: 'RA' },
  { name: 'Medium Laser', weight: 1.0, slots: 1, location: 'LA' },
  { name: 'SRM 6', weight: 3.0, slots: 2, location: 'CT' },
  { name: 'SRM 6 Ammo', weight: 1.0, slots: 1, location: 'LT' }
];
```

### Step 11: Validate
**Action**: Run complete validation checks

**Dependencies**: All components configured

**Checks**:
- Total weight = tonnage exactly
- Minimum 10 heat sinks
- All required components present
- No slot overflows
- Armor within limits
- Tech base consistency
- Era availability

### Step 12: Complete
**Action**: Mark design as complete and valid

**Dependencies**: Validation passed

**Result**: BattleMech ready for play/export

---

## Weight Budget Calculation

### Formula

```typescript
totalWeight =
  engineWeight +
  gyroWeight +
  cockpitWeight +
  structureWeight +
  armorWeight +
  heatSinkWeight +
  actuatorWeight +
  equipmentWeight +
  weaponWeight;

remaining = tonnage - totalWeight;
isValid = (remaining === 0.0);
```

### Component Weight Categories

**Fixed Weight** (unchanging):
- Cockpit: 3 tons (Standard), 2 tons (Small), 4 tons (Torso-Mounted)

**Calculated Weight** (derived from other properties):
- Engine: f(rating, engine type)
- Gyro: CEIL(rating / 100) × gyro multiplier
- Structure: tonnage × structure multiplier
- Actuators: By tonnage class and actuator configuration

**Allocated Weight** (user-assigned):
- Armor: armor points / points-per-ton (rounded to 0.5 ton)
- Heat Sinks: External HS × 1 ton each
- Equipment: Sum of equipment weights
- Weapons: Sum of weapon weights

---

## Validation Rules

### Validation: Total Weight Match
**Rule**: Total weight must equal tonnage exactly

**Severity**: Error

**Condition**:
```typescript
if (Math.abs(totalWeight - tonnage) > 0.001) {
  // Invalid - emit error
  const difference = totalWeight - tonnage;
  if (difference > 0) {
    error = `Design is overweight by ${difference.toFixed(2)} tons`;
  } else {
    error = `Design is underweight by ${Math.abs(difference).toFixed(2)} tons`;
  }
}
```

**Error Message**: "Total weight must equal {tonnage} tons exactly. Current: {totalWeight} tons"

**User Action**: Add or remove components/armor to reach exact tonnage

### Validation: Minimum Heat Sinks
**Rule**: Minimum 10 heat sinks required

**Severity**: Error

**Condition**:
```typescript
if (heatSinks.totalCount < 10) {
  // Invalid - emit error
}
```

**Error Message**: "Minimum 10 heat sinks required. Current: {count}"

**User Action**: Add heat sinks to reach minimum 10

### Validation: Required Components
**Rule**: All essential components must be present

**Severity**: Error

**Condition**:
```typescript
if (!mech.engine) error = 'Engine required';
if (!mech.gyro) error = 'Gyro required';
if (!mech.cockpit) error = 'Cockpit required';
if (!mech.structure) error = 'Internal structure required';
```

**Error Message**: "{Component} required"

**User Action**: Add missing component

### Validation: Maximum Armor
**Rule**: Armor cannot exceed 2× structure per location

**Severity**: Error

**Condition**:
```typescript
for (const location of locations) {
  const maxArmor = location === 'head' ? 9 : structure.points[location] * 2;
  if (armor.allocation[location] > maxArmor) {
    // Invalid - emit error
  }
}
```

**Error Message**: "{Location} armor exceeds maximum of {max} points"

**User Action**: Reduce armor on that location

### Validation: Critical Slot Capacity
**Rule**: Components cannot exceed slot capacity per location

**Severity**: Error

**Condition**:
```typescript
for (const location of locations) {
  const maxSlots = getMaxSlots(location); // 6, 12, or 12
  const usedSlots = countUsedSlots(location);
  if (usedSlots > maxSlots) {
    // Invalid - emit error
  }
}
```

**Error Message**: "{Location} uses {used} slots but only has {max} available"

**User Action**: Remove components or change location

### Validation: Standard Tonnage
**Rule**: Tonnage must be standard value

**Severity**: Error

**Condition**:
```typescript
const validTonnages = [20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100];
if (!validTonnages.includes(tonnage)) {
  // Invalid - emit error
}
```

**Error Message**: "Invalid tonnage. Must be one of: 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100"

**User Action**: Select valid tonnage

---

## Tech Rating Calculation

### Tech Rating Levels
- **A**: Primitive/Common technology
- **B**: Standard technology (Introductory rules)
- **C**: Advanced technology (Standard rules)
- **D**: Tournament/Advanced technology
- **E**: Experimental technology
- **F**: Mixed Tech or multiple experimental systems

### Calculation Method
```typescript
function calculateTechRating(mech: IBattleMechConstruction): TechRating {
  let rating: TechRating = 'A';

  // Check all components
  const components = [
    mech.engine,
    mech.gyro,
    mech.structure,
    mech.cockpit,
    mech.armor,
    ...mech.equipment,
    ...mech.weapons
  ];

  // Find highest tech rating
  for (const component of components) {
    if (component.rulesLevel === RulesLevel.EXPERIMENTAL) {
      rating = max(rating, 'E');
    } else if (component.rulesLevel === RulesLevel.ADVANCED) {
      rating = max(rating, 'D');
    } else if (component.rulesLevel === RulesLevel.STANDARD) {
      rating = max(rating, 'C');
    }
  }

  // Mixed Tech increases rating
  if (mech.techBase === UnitTechBase.MIXED) {
    rating = 'F';
  }

  return rating;
}
```

---

## Battle Value Overview

### Basic Formula
```
BV = Offensive BV + Defensive BV - Excessive Heat Penalty
```

**Offensive BV**:
- Sum of weapon damage × modifiers
- Modified by targeting computers, accuracy systems

**Defensive BV**:
- Based on total armor points
- Modified by movement (faster = higher BV)
- Modified by defensive systems

**Heat Penalty**:
- If heat dissipation < weapon heat, apply penalty
- Penalty increases with heat differential

**Full details**: See Battle Value Specification (Phase 3)

---

## Examples

### Example 1: Valid 50-ton BattleMech

```typescript
const mech: IBattleMechConstruction = {
  id: 'centurion-a',
  name: 'Centurion CN9-A',
  tonnage: 50,
  techBase: UnitTechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.INTRODUCTORY,
  constructionYear: 3025,

  engine: {
    rating: 200,
    type: EngineType.STANDARD,
    weight: 8.5 // ((200/100)² × 5)
  },

  gyro: {
    type: GyroType.STANDARD,
    weight: 2.0 // CEIL(200/100) × 1.0
  },

  cockpit: {
    type: CockpitType.STANDARD,
    weight: 3.0
  },

  structure: {
    type: StructureType.STANDARD,
    weight: 5.0, // 50 × 0.10
    points: {
      head: 3,
      centerTorso: 16,
      leftTorso: 12,
      rightTorso: 12,
      leftArm: 8,
      rightArm: 8,
      leftLeg: 12,
      rightLeg: 12
    }
  },

  armor: {
    type: ArmorType.STANDARD,
    totalPoints: 128,
    weight: 8.0 // 128 / 16
  },

  heatSinks: {
    type: HeatSinkType.SINGLE,
    total: 10,
    integral: 8, // floor(200/25)
    external: 2,
    weight: 2.0 // 2 external × 1 ton
  },

  actuators: {
    weight: 3.0 // Standard arm/leg actuators for 50-ton
  },

  equipment: [
    { name: 'Autocannon/10', weight: 12.0, slots: 7 },
    { name: 'AC/10 Ammo', weight: 1.0, slots: 1 },
    { name: 'AC/10 Ammo', weight: 1.0, slots: 1 },
    { name: 'LRM 10', weight: 5.0, slots: 2 },
    { name: 'LRM Ammo', weight: 1.0, slots: 1 },
    { name: 'Medium Laser', weight: 1.0, slots: 1 },
    { name: 'Medium Laser', weight: 1.0, slots: 1 }
  ],

  weightBudget: {
    tonnage: 50.0,
    engineWeight: 8.5,
    gyroWeight: 2.0,
    cockpitWeight: 3.0,
    structureWeight: 5.0,
    armorWeight: 8.0,
    heatSinkWeight: 2.0,
    actuatorWeight: 3.0,
    equipmentWeight: 22.0,
    weaponWeight: 0.5, // Medium lasers
    totalAllocated: 50.0,
    remaining: 0.0,
    isValid: true
  }
};

// Validation: PASSES
// - Total weight = 50.0 tons ✓
// - Minimum 10 heat sinks ✓
// - All required components ✓
// - Walk MP = floor(200/50) = 4 ✓
// - Run MP = floor(4 × 1.5) = 6 ✓
```

### Example 2: Invalid Design (Overweight)

```typescript
const invalidMech = {
  tonnage: 50,

  engine: { rating: 300, weight: 19.0 },
  gyro: { weight: 3.0 },
  cockpit: { weight: 3.0 },
  structure: { weight: 5.0 },
  armor: { weight: 10.0 },
  heatSinks: { weight: 0 }, // All integral
  actuators: { weight: 3.0 },
  equipment: { weight: 8.0 },

  totalAllocated: 51.0,
  remaining: -1.0
};

// Validation: FAILS
// Error: "Design is overweight by 1.0 tons"
// User must remove 1 ton of armor or equipment
```

### Example 3: Invalid Design (Insufficient Heat Sinks)

```typescript
const invalidMech2 = {
  tonnage: 50,
  heatSinks: {
    total: 7, // Only 7
    integral: 4,
    external: 3
  }
};

// Validation: FAILS
// Error: "Minimum 10 heat sinks required. Current: 7"
// User must add 3 more heat sinks
```

### Example 4: Valid 75-ton Assault Mech

```typescript
const assaultMech = {
  name: 'Marauder MAD-3R',
  tonnage: 75,

  engine: {
    rating: 300,
    type: EngineType.STANDARD,
    weight: 19.0
  },

  gyro: { weight: 3.0 },
  cockpit: { weight: 3.0 },
  structure: { weight: 7.5 }, // 75 × 0.10
  armor: { weight: 11.5 }, // 184 points / 16
  heatSinks: {
    total: 16,
    integral: 10,
    external: 6,
    weight: 6.0 // 6 external × 1 ton
  },
  actuators: { weight: 4.0 },
  equipment: {
    weapons: [
      { name: 'PPC', weight: 7.0 },
      { name: 'PPC', weight: 7.0 },
      { name: 'Autocannon/5', weight: 8.0 },
      { name: 'AC/5 Ammo', weight: 1.0 }
    ],
    totalWeight: 23.0
  },

  totalAllocated: 75.0,
  remaining: 0.0,
  isValid: true
};

// Walk MP = floor(300/75) = 4
// Run MP = floor(4 × 1.5) = 6
```

---

## Technology Base Variants

See [Tech Base Variants Reference](../tech-base-variants-reference/spec.md) for general Inner Sphere vs Clan differences and cross-component patterns.

### Construction Rules Tech Base Impact

**Construction Sequence**:
- Tech base determines available component types at each step
- Weight budget affected by tech base efficiency differences
- Slot budget affected by tech base slot requirement differences
- Construction validation must check tech base compatibility

**Weight Budget Implications**:
- Clan advanced tech generally provides weight savings through better efficiency
- IS advanced tech provides weight savings but at slot cost
- Example: Clan mech saves ~3-5 tons on structure/armor vs equivalent IS mech

**Slot Budget Implications**:
- Clan advanced tech saves significant slots (potentially 20+ slots)
- IS advanced tech consumes more slots for same capability
- Example: IS XL + Endo + Ferro uses ~22 more slots than Clan equivalent

**Validation Rules**:
- Each component's tech base must be valid for unit tech base (or mixed tech allowed)
- Cannot mix incompatible variants (e.g., IS XL and Clan XL in same unit)
- Tech rating escalates based on highest component and mixed tech penalties

**Mixed Tech Construction**:
- Follow standard construction sequence
- Validate each component individually for tech base compatibility
- Calculate cumulative weight and slot usage with appropriate tech base formulas
- Apply tech rating penalties for cross-tech-base components


---

## Dependencies

### Defines
- **Standard tonnage classes**: Valid BattleMech tonnages (20, 25, 30...95, 100)
- **Exact weight matching rule**: Total component weight must equal tonnage exactly
- **Minimum heat sink requirement**: 10 total heat sinks mandatory
- **Construction sequence**: Ordered steps for valid BattleMech construction
- **Weight budget categories**: Fixed, calculated, and allocated weight types
- **Validation checklist**: Complete set of construction validation rules
- **Tech rating calculation**: Overall unit tech rating and tournament legality
- **Construction validation interfaces**: IConstructionValidation, IWeightBudget, etc.

### Depends On
**All Phase 1 Foundation Specs:**
- [Core Entity Types](../../phase-1-foundation/core-entity-types/spec.md) - Uses all entity interfaces
- [Rules Level System](../../phase-1-foundation/rules-level-system/spec.md) - Tournament legality validation
- [Era & Temporal System](../../phase-1-foundation/era-temporal-system/spec.md) - Year-based validation
- [Physical Properties System](../../phase-1-foundation/physical-properties-system/spec.md) - Weight/slot standards

**All Phase 2 Component Specs:**
- [Engine System](../engine-system/spec.md) - Engine weight, slots, rating validation
- [Gyro System](../gyro-system/spec.md) - Gyro weight calculation and placement
- [Heat Sink System](../heat-sink-system/spec.md) - Minimum 10 heat sinks, integration rules
- [Critical Slot Allocation](../critical-slot-allocation/spec.md) - Slot allocation validation
- [Internal Structure System](../internal-structure-system/spec.md) - Structure weight and points
- [Cockpit System](../cockpit-system/spec.md) - Cockpit weight and compatibility
- [Armor System](../armor-system/spec.md) - Armor weight and maximum limits
- [Movement System](../movement-system/spec.md) - Jump jet weight and movement validation
- [Tech Base Integration](../tech-base-integration/spec.md) - Tech base compliance

### Used By
- **Unit Construction UI**: Displays validation errors, weight budgets, construction progress
- **Validation System**: Validates complete mech against all rules
- **Import/Export**: Serializes and validates imported/exported designs
- **Battle Value Calculator**: Uses valid construction for BV calculation
- **Tech Rating Calculator**: Determines overall tech rating
- **Mech lab tools**: Construction assistants, auto-allocation, optimization tools

### Construction Sequence Dependencies
1. Tonnage → (no dependencies)
2. Tech Base → (no dependencies)
3. Engine → Tonnage
4. Structure → Tonnage
5. Gyro → Engine rating
6. Cockpit → (Gyro for compatibility check)
7. Armor → Structure (for max armor)
8. Heat Sinks → Engine (for integral capacity)
9. Actuators → Tonnage (for weight)
10. Equipment → All previous (for remaining weight/slots)

---

## Implementation Notes

### Performance Considerations
- Cache weight calculations when components don't change
- Validate incrementally during construction (not just at end)
- Pre-calculate structure points table (static data)
- Memoize tech rating and BV calculations

### Edge Cases
- **Exactly 0.0 remaining**: Valid (common)
- **Rounding errors**: Use epsilon comparison (0.001) for float equality
- **Half-ton increments**: Armor rounds to 0.5 ton increments
- **Integral heat sink cap**: Always capped at 10, even if engine allows more
- **Head armor**: Special case 9-point maximum regardless of structure

### Common Pitfalls
- **Pitfall**: Allowing non-standard tonnages (47, 52, etc.)
  - **Solution**: Validate tonnage against allowed list
- **Pitfall**: Comparing floats with === for weight matching
  - **Solution**: Use epsilon comparison (Math.abs(a - b) < 0.001)
- **Pitfall**: Forgetting minimum heat sinks
  - **Solution**: Always validate minimum 10 HS
- **Pitfall**: Calculating gyro weight before engine selected
  - **Solution**: Follow construction sequence strictly
- **Pitfall**: Allowing overweight designs "just slightly"
  - **Solution**: Enforce exact weight matching, no exceptions

---

## References

### Official BattleTech Rules
- **TechManual**: Pages 38-52 - Complete construction rules
- **Total Warfare**: Pages 48-56 - Construction overview
- **BattleMech Manual**: Pages 28-42 - Simplified construction

### Related Documentation
- All Phase 1 & Phase 2 OpenSpec documents
- `openspec/specs/battle-value-system/spec.md` - BV calculations (Phase 3)
- `openspec/specs/tech-rating-system/spec.md` - Tech rating details (Phase 3)

### Code References
- Construction: `src/services/construction/mechBuilder.ts`
- Validation: `src/services/validation/constructionValidator.ts`
- Weight Budget: `src/services/construction/weightBudget.ts`

---

## Changelog

### Version 1.0 (2025-11-27)
- Initial specification
- Defined construction sequence (12 steps)
- Established weight budget categories and formulas
- Created comprehensive validation rules (6 major rules)
- Added valid and invalid design examples
- Documented tech rating and battle value overview
- Integrated all Phase 1 & Phase 2 component specs
