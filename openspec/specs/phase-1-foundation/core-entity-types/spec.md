# Core Entity Types Specification

**Status**: Active
**Version**: 1.1
**Last Updated**: 2025-11-28
**Dependencies**: None (Foundation)
**Affects**: All other specifications

---

## Overview

### Purpose
Defines the foundational interface hierarchy for all entities in the BattleTech Editor. These base interfaces establish common properties and patterns used across all subsystems through composition.

### Scope
**In Scope:**
- Base entity interfaces (IEntity, ITechBaseEntity)
- Physical property interfaces (IWeightedComponent, ISlottedComponent, IPlaceableComponent)
- Economic property interfaces (IValuedComponent)
- Temporal property interfaces (ITemporalEntity)
- Documentation property interfaces (IDocumentedEntity)
- Composition patterns for combining interfaces
- Type guards for runtime validation

**Out of Scope:**
- Specific equipment or component implementations
- Validation logic (covered in Validation Interfaces spec)
- Calculation formulas (covered in subsystem specs)
- UI-specific types (covered in UI Integration spec)

### Key Concepts
- **Entity**: Any identifiable object in the system with an ID and name
- **Tech Base Entity**: Entity with technology base classification (Inner Sphere or Clan)
- **Composition**: Combining multiple interfaces using TypeScript intersection types
- **Type Guard**: Runtime function to validate object shape matches interface

---

## Requirements

### Requirement: Base Entity Interface
All entities in the system SHALL extend from IEntity, providing universal identification.

**Rationale**: Every object needs unique identification and human-readable name for referencing and display.

**Priority**: Critical

#### Scenario: Component creation
**GIVEN** a new component is being created
**WHEN** the component interface is defined
**THEN** it MUST extend IEntity
**AND** provide unique id property
**AND** provide name property

#### Scenario: Entity lookup
**GIVEN** a collection of entities
**WHEN** searching for a specific entity
**THEN** the id property SHALL be used for unique identification
**AND** the name property SHALL be used for display

### Requirement: Tech Base Classification
All components and equipment SHALL implement ITechBaseEntity to declare their technology base.

**Rationale**: Technology base is fundamental to BattleTech rules, affecting availability, compatibility, and construction constraints.

**Priority**: Critical

#### Scenario: Tech base declaration
**GIVEN** a component is defined
**WHEN** implementing the interface
**THEN** techBase MUST be TechBase.INNER_SPHERE or TechBase.CLAN
**AND** rulesLevel MUST be specified
**AND** techBase SHALL be immutable

#### Scenario: Component filtering
**GIVEN** a list of available components
**WHEN** filtering by tech base
**THEN** ITechBaseEntity.techBase SHALL be used for filtering
**AND** components without techBase SHALL be excluded

### Requirement: Physical Properties
Components with physical characteristics SHALL implement appropriate interfaces (IWeightedComponent, ISlottedComponent).

**Rationale**: Weight and critical slot usage are fundamental to construction rules and must be tracked consistently.

**Priority**: Critical

#### Scenario: Weight calculation
**GIVEN** a component with weight
**WHEN** implementing the interface
**THEN** it MUST implement IWeightedComponent
**AND** provide weight in tons as a number
**AND** weight MUST be greater than or equal to 0

#### Scenario: Slot allocation
**GIVEN** a component requiring critical slots
**WHEN** implementing the interface
**THEN** it MUST implement ISlottedComponent
**AND** provide criticalSlots as a number
**AND** criticalSlots MUST be an integer >= 0

### Requirement: Composition Pattern
Components with both weight and slots SHALL use IPlaceableComponent composition.

**Rationale**: Many components have both weight and slot requirements. Composition avoids interface duplication.

**Priority**: High

#### Scenario: Equipment definition
**GIVEN** equipment requires both weight and slots
**WHEN** defining the interface
**THEN** it SHALL extend IPlaceableComponent
**AND** automatically inherit weight and criticalSlots
**AND** not redefine these properties

### Requirement: Economic Properties
Components with economic value SHALL implement IValuedComponent.

**Rationale**: Cost and Battle Value are tracked for construction budgets and game balance.

**Priority**: High

#### Scenario: Component pricing
**GIVEN** a component has monetary cost
**WHEN** implementing the interface
**THEN** it MUST provide cost in C-Bills
**AND** cost MUST be >= 0
**AND** battleValue MUST be >= 0

### Requirement: Temporal Properties
Components with introduction dates SHALL implement ITemporalEntity.

**Rationale**: Technology availability varies by timeline era. Temporal properties enable era-based filtering.

**Priority**: High

#### Scenario: Era filtering
**GIVEN** a component introduced in a specific year
**WHEN** implementing the interface
**THEN** it MUST provide introductionYear
**AND** MAY provide extinctionYear
**AND** MUST provide era classification

### Requirement: Documentation Properties
Components with source references SHALL implement IDocumentedEntity.

**Rationale**: Traceability to official rulebooks ensures accuracy and enables verification.

**Priority**: Medium

#### Scenario: Source tracking
**GIVEN** a component from official source material
**WHEN** implementing the interface
**THEN** it SHOULD provide sourceBook
**AND** SHOULD provide pageReference
**AND** MAY provide description

---

## Data Model Requirements

### Required Interfaces

```typescript
/**
 * Base interface for all identifiable entities
 */
interface IEntity {
  /**
   * Unique identifier for this entity
   * @example "med-laser-pulse-is"
   */
  readonly id: string;

  /**
   * Human-readable name
   * @example "Medium Pulse Laser"
   */
  readonly name: string;
}

/**
 * Entity with technology base classification
 */
interface ITechBaseEntity extends IEntity {
  /**
   * Technology base (Inner Sphere or Clan)
   */
  readonly techBase: TechBase;

  /**
   * Rules complexity level
   */
  readonly rulesLevel: RulesLevel;
}

/**
 * Component with physical mass
 */
interface IWeightedComponent {
  /**
   * Weight in tons
   * @minimum 0
   */
  readonly weight: number;
}

/**
 * Component requiring critical slot space
 */
interface ISlottedComponent {
  /**
   * Number of critical slots required
   * @minimum 0
   * @integer
   */
  readonly criticalSlots: number;
}

/**
 * Component with both weight and slot requirements
 * Composition of IWeightedComponent and ISlottedComponent
 */
interface IPlaceableComponent extends IWeightedComponent, ISlottedComponent {}

/**
 * Component with economic value
 */
interface IValuedComponent {
  /**
   * Cost in C-Bills
   * @minimum 0
   */
  readonly cost: number;

  /**
   * Battle Value for game balance
   * @minimum 0
   */
  readonly battleValue: number;
}

/**
 * Entity with temporal availability
 */
interface ITemporalEntity {
  /**
   * Year technology was introduced
   * @example 3025
   */
  readonly introductionYear: number;

  /**
   * Year technology became extinct (optional)
   * @example 3067
   */
  readonly extinctionYear?: number;

  /**
   * Era classification
   */
  readonly era: Era;
}

/**
 * Entity with source documentation
 */
interface IDocumentedEntity {
  /**
   * Description of the component
   */
  readonly description?: string;

  /**
   * Source book reference
   * @example "TechManual"
   */
  readonly sourceBook?: string;

  /**
   * Page number in source book
   * @example 227
   */
  readonly pageReference?: number;
}
```

### Required Properties

| Property | Type | Required | Description | Valid Values | Default |
|----------|------|----------|-------------|--------------|---------|
| `id` | `string` | Yes | Unique identifier | Non-empty string | - |
| `name` | `string` | Yes | Human-readable name | Non-empty string | - |
| `techBase` | `TechBase` | Yes* | Technology base | INNER_SPHERE, CLAN | - |
| `rulesLevel` | `RulesLevel` | Yes* | Rules complexity | Enum value | - |
| `weight` | `number` | Yes** | Weight in tons | >= 0 | - |
| `criticalSlots` | `number` | Yes** | Critical slots | Integer >= 0 | - |
| `cost` | `number` | Yes*** | Cost in C-Bills | >= 0 | - |
| `battleValue` | `number` | Yes*** | Battle Value | >= 0 | - |
| `introductionYear` | `number` | Yes**** | Introduction year | Valid year | - |
| `extinctionYear` | `number` | No | Extinction year | Valid year | undefined |
| `era` | `Era` | Yes**** | Era classification | Enum value | - |
| `description` | `string` | No | Description text | Any string | undefined |
| `sourceBook` | `string` | No | Source book name | Any string | undefined |
| `pageReference` | `number` | No | Page number | Positive integer | undefined |

\* Required for ITechBaseEntity
\** Required for IWeightedComponent/ISlottedComponent/IPlaceableComponent
\*** Required for IValuedComponent
\**** Required for ITemporalEntity

### Type Constraints

- `id` MUST be unique across all entities of the same type
- `name` MUST NOT be empty string
- `weight` MUST be a finite number >= 0
- `criticalSlots` MUST be an integer >= 0
- `cost` MUST be a finite number >= 0
- `battleValue` MUST be a finite number >= 0
- `introductionYear` MUST be a valid year (e.g., 2750-3250)
- When `extinctionYear` is present, it MUST be >= `introductionYear`
- `pageReference` MUST be a positive integer if present

---

## Validation Rules

### Validation: Entity Identification
**Rule**: All entities must have unique, non-empty identifiers

**Severity**: Error

**Condition**:
```typescript
if (!entity.id || entity.id.trim() === '') {
  // invalid - emit error
}
if (!entity.name || entity.name.trim() === '') {
  // invalid - emit error
}
```

**Error Message**: "Entity must have non-empty id and name"

**User Action**: Provide valid id and name for the entity

### Validation: Weight Constraints
**Rule**: Weight must be non-negative finite number

**Severity**: Error

**Condition**:
```typescript
if (!Number.isFinite(component.weight) || component.weight < 0) {
  // invalid - emit error
}
```

**Error Message**: "Component weight must be a non-negative number"

**User Action**: Provide valid weight >= 0

### Validation: Critical Slots Constraints
**Rule**: Critical slots must be non-negative integer

**Severity**: Error

**Condition**:
```typescript
if (!Number.isInteger(component.criticalSlots) || component.criticalSlots < 0) {
  // invalid - emit error
}
```

**Error Message**: "Critical slots must be a non-negative integer"

**User Action**: Provide valid integer slots >= 0

### Validation: Temporal Consistency
**Rule**: Extinction year must be after or equal to introduction year

**Severity**: Error

**Condition**:
```typescript
if (entity.extinctionYear !== undefined &&
    entity.extinctionYear < entity.introductionYear) {
  // invalid - emit error
}
```

**Error Message**: "Extinction year must be after introduction year"

**User Action**: Correct the year values to maintain temporal consistency

---

## Technology Base Variants

### Inner Sphere Implementation
**No special rules** - Inner Sphere entities use base interface definitions as specified.

### Clan Implementation
**No special rules** - Clan entities use base interface definitions as specified.

### Mixed Tech Rules
**Not applicable** - These are foundational interfaces. Mixed tech rules apply at the unit and component level (see Tech Base System spec).

---

## Dependencies

### Defines
- **IEntity**: Base interface for all identifiable entities (id, name)
- **ITechBaseEntity**: Entity with technology base classification (extends IEntity, adds techBase, rulesLevel)
- **IWeightedComponent**: Component with physical mass (weight property)
- **ISlottedComponent**: Component requiring critical slot space (criticalSlots property)
- **IPlaceableComponent**: Composition interface with both weight and slots (extends IWeightedComponent + ISlottedComponent)
- **IValuedComponent**: Component with economic value (cost, battleValue properties)
- **ITemporalEntity**: Entity with temporal availability (introductionYear, extinctionYear, era properties)
- **IDocumentedEntity**: Entity with source documentation (description, sourceBook, pageReference properties)

### Depends On
- None (Foundation spec - no dependencies)

Note: While this spec references TechBase, RulesLevel, and Era enums in examples, those enums are defined in their respective domain specs (Tech Base System, Rules Level System, Era & Temporal System). The interfaces themselves don't require those enums to be defined.

### Used By
- [Rules Level System](../rules-level-system/spec.md) - Uses ITechBaseEntity for rulesLevel classification
- [Era & Temporal System](../era-temporal-system/spec.md) - Uses ITemporalEntity for temporal availability
- [Physical Properties System](../physical-properties-system/spec.md) - Uses IWeightedComponent, ISlottedComponent, IPlaceableComponent
- [Engine System](../../phase-2-construction/engine-system/spec.md) - Extends ITechBaseEntity and IPlaceableComponent
- [Gyro System](../../phase-2-construction/gyro-system/spec.md) - Extends ITechBaseEntity and ITemporalEntity
- [Heat Sink System](../../phase-2-construction/heat-sink-system/spec.md) - Extends ITechBaseEntity, IPlaceableComponent, IValuedComponent, ITemporalEntity
- [Internal Structure System](../../phase-2-construction/internal-structure-system/spec.md) - Extends ITechBaseEntity and ITemporalEntity
- [Armor System](../../phase-2-construction/armor-system/spec.md) - Extends ITechBaseEntity and ITemporalEntity
- [Cockpit System](../../phase-2-construction/cockpit-system/spec.md) - Extends ITechBaseEntity
- [Movement System](../../phase-2-construction/movement-system/spec.md) - Extends ITechBaseEntity and IPlaceableComponent
- [Critical Slot Allocation](../../phase-2-construction/critical-slot-allocation/spec.md) - Uses IEntity and IPlaceableComponent
- [Tech Base Integration](../../phase-2-construction/tech-base-integration/spec.md) - Uses ITechBaseEntity
- [Construction Rules Core](../../phase-2-construction/construction-rules-core/spec.md) - Uses all entity interfaces
- **All equipment and component specifications**: Every component type extends these base interfaces

### Construction Sequence
1. Define base enums (TechBase, RulesLevel, Era) in their respective domain specs
2. Define core entity interfaces (this spec)
3. Define specific component interfaces (extend from these)
4. Implement component data (conform to interfaces)

---

## Implementation Notes

### Performance Considerations
- Interfaces have zero runtime cost (compile-time only)
- Type guards add minimal runtime overhead
- Use type guards only at system boundaries (user input, API responses, file loading)
- Internal code can rely on compile-time type safety

### Edge Cases
- **Empty strings**: Use `trim()` to detect empty strings in id and name
- **Zero values**: Zero is valid for weight, slots, cost, battleValue
- **Undefined vs null**: Use `undefined` for optional properties, not `null`
- **Floating point weight**: Weight can be fractional (e.g., 0.5 tons)
- **Integer slots**: Slots must always be whole numbers

### Common Pitfalls
- **Pitfall**: Using `any` to bypass interface requirements
  - **Solution**: Always use proper interfaces, create new ones if needed
- **Pitfall**: Redefining properties from composed interfaces
  - **Solution**: Use `extends` to inherit, don't redeclare properties
- **Pitfall**: Mutable properties
  - **Solution**: Always use `readonly` for interface properties
- **Pitfall**: Using `null` for optional properties
  - **Solution**: Use `undefined` or omit the property entirely

---

## Examples

### Example 1: Simple Entity
```typescript
interface IWeapon extends ITechBaseEntity {
  readonly damage: number;
  readonly range: number;
}

const mediumLaser: IWeapon = {
  id: 'med-laser-is',
  name: 'Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  damage: 5,
  range: 9
};
```

### Example 2: Composition Pattern
```typescript
// Component with weight, slots, and value
interface IEngine extends
  ITechBaseEntity,
  IPlaceableComponent,  // Provides weight + criticalSlots
  IValuedComponent {     // Provides cost + battleValue
  readonly rating: number;
  readonly engineType: EngineType;
}

const engineXL300: IEngine = {
  id: 'engine-xl-300-is',
  name: 'XL Engine 300',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  weight: 9.5,
  criticalSlots: 6,
  cost: 1800000,
  battleValue: 0,
  rating: 300,
  engineType: EngineType.XL
};
```

### Example 3: Full Documentation
```typescript
interface IWeaponFull extends
  ITechBaseEntity,
  IPlaceableComponent,
  IValuedComponent,
  ITemporalEntity,
  IDocumentedEntity {
  readonly damage: number;
}

const erMediumLaser: IWeaponFull = {
  id: 'er-med-laser-is',
  name: 'ER Medium Laser',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.ADVANCED,
  weight: 1,
  criticalSlots: 1,
  cost: 80000,
  battleValue: 46,
  damage: 5,
  introductionYear: 3058,
  era: Era.CIVIL_WAR,
  description: 'Extended range variant of the Medium Laser',
  sourceBook: 'TechManual',
  pageReference: 227
};
```

### Example 4: Type Guard
```typescript
function isWeightedComponent(obj: unknown): obj is IWeightedComponent {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'weight' in obj &&
    typeof (obj as IWeightedComponent).weight === 'number' &&
    Number.isFinite((obj as IWeightedComponent).weight) &&
    (obj as IWeightedComponent).weight >= 0
  );
}

// Usage
if (isWeightedComponent(unknownData)) {
  // TypeScript knows unknownData has weight property
  console.log(`Weight: ${unknownData.weight} tons`);
}
```

### Example 5: Conditional Properties
```typescript
interface IAmmunition extends
  ITechBaseEntity,
  IPlaceableComponent,
  IValuedComponent,
  ITemporalEntity {
  readonly shotsPerTon: number;
  readonly weaponType: string;
  // Extinction year is optional
  readonly extinctionYear?: number;
}

const standardAC10Ammo: IAmmunition = {
  id: 'ammo-ac10-standard',
  name: 'AC/10 Ammo',
  techBase: TechBase.INNER_SPHERE,
  rulesLevel: RulesLevel.STANDARD,
  weight: 1,
  criticalSlots: 1,
  cost: 6000,
  battleValue: 0,
  shotsPerTon: 10,
  weaponType: 'AC/10',
  introductionYear: 2443,
  era: Era.AGE_OF_WAR
  // No extinctionYear - still in production
};
```

---

## References

### Official BattleTech Rules
- **TechManual**: Various pages - component specifications
- **Total Warfare**: Various pages - construction rules

### Related Documentation
- `openspec/specs/tech-base-system/spec.md` - Tech Base classification
- `openspec/specs/rules-level-system/spec.md` - Rules Level definitions
- `openspec/specs/era-temporal-system/spec.md` - Era and timeline
- `openspec/templates/spec-template.md` - Specification template

### Code References
- Types: `src/types/core/BaseTypes.ts`
- Type guards: `src/utils/typeGuards.ts`

---

## Changelog

### Version 1.1 (2025-11-28)
- Fixed terminology: Changed "component with mass" to "component with weight" (line 90)
- Aligned with canonical standard from TERMINOLOGY_GLOSSARY.md

### Version 1.0 (2025-11-27)
- Initial specification
- Defined 8 core interfaces: IEntity, ITechBaseEntity, IWeightedComponent, ISlottedComponent, IPlaceableComponent, IValuedComponent, ITemporalEntity, IDocumentedEntity
- Established composition patterns
- Added validation rules and type guard examples
