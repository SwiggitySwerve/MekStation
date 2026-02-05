# OpenSpec Specifications

This directory contains all OpenSpec specifications for the MekStation, organized by development phase.

## Directory Structure

```
specs/
├── phase-1-foundation/      # Foundational type system and properties
├── phase-2-construction/    # BattleMech construction systems
└── README.md               # This file
```

---

## Phase 1: Foundation (4 specs)

Foundational interfaces, enumerations, and property standards that all other specifications depend on.

### Core Entity Types

**Path**: `phase-1-foundation/core-entity-types/spec.md`

Defines 8 foundational interfaces used across all components:

- `IEntity` - Base identification (id, name)
- `ITechBaseEntity` - Tech base classification (IS/Clan)
- `IWeightedComponent` - Physical mass
- `ISlottedComponent` - Critical slot requirements
- `IPlaceableComponent` - Composition of weighted + slotted
- `IValuedComponent` - Economic properties (cost, BV)
- `ITemporalEntity` - Timeline availability
- `IDocumentedEntity` - Source documentation

**Dependencies**: None (foundation)
**Used By**: All other specifications

---

### Rules Level System

**Path**: `phase-1-foundation/rules-level-system/spec.md`

Defines technology complexity classification:

- Introductory (basic components)
- Standard (common technology)
- Advanced (complex systems)
- Experimental (bleeding edge)

**Dependencies**: Core Entity Types
**Used By**: All component specifications

---

### Era & Temporal Availability

**Path**: `phase-1-foundation/era-temporal-system/spec.md`

Defines BattleTech timeline and technology availability:

- 8 canonical eras (Age of War → Dark Age)
- Introduction/extinction year tracking
- Temporal filtering and validation

**Dependencies**: Core Entity Types
**Used By**: All component specifications, campaign rules

---

### Physical Properties System

**Path**: `phase-1-foundation/physical-properties-system/spec.md`

Standardizes physical component properties:

- Property naming: "weight" (never "tons"), "criticalSlots" (never "slots")
- Weight validation (finite, >= 0, fractional allowed)
- Critical slots validation (integer, >= 0)
- Calculation and rounding rules

**Dependencies**: Core Entity Types
**Used By**: All physical components

---

## Phase 2: Construction Systems (10 specs)

BattleMech construction rules, component systems, and validation.

### Engine System

**Path**: `phase-2-construction/engine-system/spec.md`

10 engine types with weight/slot formulas:

- Standard Fusion, XL (IS/Clan), Light, XXL, Compact
- ICE, Fuel Cell, Fission
- Critical slot placement (CT + side torsos)
- Integral heat sink capacity

**Dependencies**: Phase 1 foundation
**Used By**: Gyro, Movement, Construction Rules

---

### Gyro System

**Path**: `phase-2-construction/gyro-system/spec.md`

4 gyro types with weight formulas:

- Standard (4 slots, 1.0× weight)
- XL (6 slots, 0.5× weight)
- Compact (2 slots, 1.5× weight)
- Heavy-Duty (4 slots, 2.0× weight)
- Placement immediately after engine

**Dependencies**: Phase 1 foundation, Engine System
**Used By**: Construction Rules, Critical Slot Allocation

---

### Heat Sink System

**Path**: `phase-2-construction/heat-sink-system/spec.md`

5 heat sink types and integration rules:

- Single (1 heat/turn)
- Double IS (2 heat/turn, 3 slots external)
- Double Clan (2 heat/turn, 2 slots external)
- Compact, Laser
- Engine integration: floor(rating / 25)
- Placement after gyro in CT

**Dependencies**: Phase 1 foundation, Engine System, Gyro System
**Used By**: Construction Rules, Thermal Management

---

### Critical Slot Allocation

**Path**: `phase-2-construction/critical-slot-allocation/spec.md`

Location slot counts and placement rules:

- Head: 6 slots
- Center Torso: 12 slots
- Side Torsos: 12 slots each
- Arms: 12 slots each
- Legs: 6 slots each
- Fixed component placement order
- Validation rules

**Dependencies**: Phase 1 foundation, Engine System, Gyro System, Heat Sink System
**Used By**: Construction Rules, Equipment Placement

---

### Internal Structure System

**Path**: `phase-2-construction/internal-structure-system/spec.md`

7 structure types and hit point tables:

- Standard (10% weight, 0 slots)
- Endo Steel IS (5% weight, 14 slots)
- Endo Steel Clan (5% weight, 7 slots)
- Reinforced (20% weight, 2× hit points)
- Composite (5% weight, 0.5× hit points)
- Endo-Composite, Industrial
- Complete structure point table (20-100 tons)

**Dependencies**: Phase 1 foundation
**Used By**: Armor System, Construction Rules

---

### Cockpit System

**Path**: `phase-2-construction/cockpit-system/spec.md`

5 cockpit types and placement:

- Standard (3 tons, head slots)
- Small (2 tons, +1 piloting penalty)
- Command Console (3 tons, +1 slot, -2 initiative)
- Torso-Mounted (4 tons, CT slot, incompatible with XL Gyro)
- Primitive (5 tons, +1 piloting penalty)
- Head slot layout with life support and sensors

**Dependencies**: Phase 1 foundation, Gyro System (compatibility)
**Used By**: Construction Rules, Pilot System

---

### Armor System

**Path**: `phase-2-construction/armor-system/spec.md`

14 armor types with points-per-ton ratios:

- Standard (16 pts/ton, 0 slots)
- Ferro-Fibrous IS (17.92 pts/ton, 14 slots)
- Ferro-Fibrous Clan (19.2 pts/ton, 7 slots)
- Stealth (16 pts/ton, requires ECM)
- Reactive, Reflective, Hardened
- Light/Heavy Ferro-Fibrous variants
- Maximum armor: 2× structure (head = 9)
- Rear armor rules (torsos only)

**Dependencies**: Phase 1 foundation, Internal Structure System
**Used By**: Construction Rules, Damage System

---

### Movement System

**Path**: `phase-2-construction/movement-system/spec.md`

Movement formulas and jump jet mechanics:

- Walk MP = floor(rating / tonnage)
- Run MP = floor(walk × 1.5)
- 8 jump jet types (Standard, Improved, Extended, Mechanical, Partial Wing, etc.)
- Jump jet weight by tonnage class
- MASC, Supercharger, TSM enhancements

**Dependencies**: Phase 1 foundation, Engine System
**Used By**: Construction Rules, Battle Value

---

### Tech Base Integration

**Path**: `phase-2-construction/tech-base-integration/spec.md`

Tech base declaration and constraints:

- Unit types: Inner Sphere, Clan, Mixed Tech
- 8 structural component categories
- Structural vs Equipment distinction
- Mixed Tech toggle mechanics
- Tech rating effects

**Dependencies**: Phase 1 foundation, Tech Base System (Phase 1)
**Used By**: Construction Rules, Validation, Component Availability

---

### Construction Rules Core

**Path**: `phase-2-construction/construction-rules-core/spec.md`

Overall construction rules and validation:

- 12-step construction sequence
- Weight budget calculation
- Exact weight matching requirement
- Minimum requirements (10 heat sinks, actuators, etc.)
- Maximum limits (armor, slots, tonnage)
- Tech rating calculation
- Battle value overview

**Dependencies**: All Phase 1 & Phase 2 specs
**Used By**: Unit Construction UI, Validation System

---

## Usage

Each specification follows the OpenSpec template structure:

- Overview (purpose, scope, key concepts)
- Requirements (with GIVEN/WHEN/THEN scenarios)
- Data Model Requirements (TypeScript interfaces)
- Calculation Formulas (with examples)
- Validation Rules (with error messages)
- tech base Variants (IS vs Clan differences)
- Dependencies (what it depends on and what depends on it)
- Implementation Notes (performance, edge cases, pitfalls)
- Examples (comprehensive code examples)
- References (official rules, related specs)

## Future Phases

**Phase 3: Equipment Systems** (planned)

- Weapon System
- Ammunition System
- Electronics System
- Physical Weapons System
- Equipment Placement
- Equipment Database
- Hardpoint System

**Phase 4: Validation & Calculations** (planned)

- Battle Value System
- Tech Rating System
- Heat Management System
- Damage System
- Critical Hit System

**Phase 5: Data Models** (planned)

- Unit Entity Model
- Component Database Schema
- Save/Load Format
- Import/Export Formats

**Phase 6: UI & Integration** (planned)

- UI Data Adapters
- State Management
- Component Selection
- Validation Display
- Error Handling

---

## Development Workflow

### Creating New Specs

1. Use templates in `openspec/templates/`
2. Follow GIVEN/WHEN/THEN scenario format
3. Define complete TypeScript interfaces
4. Include comprehensive examples
5. Document dependencies clearly

### Updating Existing Specs

1. Update version number in header
2. Add changelog entry at bottom
3. Update dependent specs if interfaces change
4. Maintain backwards compatibility when possible

### Validation

- Follow spec-template.md structure exactly
- Include all required sections
- Provide testable scenarios
- Reference official BattleTech rules

---

## Contributing

When adding new specifications:

1. Determine which phase it belongs to
2. Create directory: `phase-N-category/system-name/`
3. Create `spec.md` following template
4. Update this README with entry
5. Update dependent specs with new dependency

---

## References

- Template: `../templates/spec-template.md`
- Design Template: `../templates/design-template.md`
- Example: `../templates/example-tech-base-spec.md`
- Guide: `../templates/TEMPLATE_GUIDE.md`
