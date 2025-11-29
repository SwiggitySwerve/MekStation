# Unit Entity Model Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Phase 1-4 specifications (Foundation, Construction, Equipment, Validation & Calculations)
**Affects**: All Phase 5 specifications, Serialization & Formats, Database Schema, Data Integrity & Validation

---

## Overview

### Purpose
The Unit Entity Model specification defines the canonical data structure for BattleTech units, providing a unified foundation that incorporates all calculated properties from Phases 1-4 while supporting extensible data persistence, interchange, and validation.

### Scope
**In Scope:**
- Comprehensive unit data structure incorporating all Phase 1-4 systems
- Canonical property definitions for calculated and assigned values
- Component relationship modeling and constraint enforcement
- Versioning strategy and backward compatibility requirements
- Extensibility framework for future phases and custom properties
- Integration patterns with existing TypeScript interfaces
- Validation rules ensuring data model integrity
- Reference implementations and mapping guidelines

**Out of Scope:**
- Specific UI component implementations (covered by Phase 6 specifications)
- Database implementation details (covered by Database Schema specification)
- Format-specific transformation rules (covered by Serialization & Formats)
- External tool integration protocols (covered by Format Specifications)
- Runtime validation logic (covered by Data Integrity specification)

### Key Concepts
- **Canonical Unit Entity**: Unified data structure representing complete BattleTech unit
- **Calculated Properties**: Values derived from Phases 1-4 calculations (BV, tech rating, heat capacity)
- **Component Composition**: Equipment and system configuration within the unit
- **Property Invariants**: Validation rules and constraints maintaining data integrity
- **Versioning Strategy**: Approach for schema evolution while maintaining backward compatibility
- **Extension Points**: Defined mechanisms for adding future properties and capabilities
- **Reference Mapping**: Connections between entity model and existing implementation types
- **Serialization Boundaries**: Definition of what constitutes complete vs. partial unit data
- **Data Transfer**: Rules for converting between different format versions and states

---

## Requirements

### Requirement: Define Canonical Unit Entity Structure
The system SHALL define a comprehensive unit entity structure that incorporates all properties required for complete BattleTech unit representation.

**Rationale**: A canonical unit entity provides the foundation for all data operations including persistence, validation, calculation, and interchange.

**Priority**: Critical

#### Scenario: Basic unit entity structure
**GIVEN** a BattleTech unit requiring complete representation
**WHEN** defining the unit entity structure
**THEN** entity SHALL include identification, properties, components, and calculated values
**AND** each property SHALL have defined type and validation rules
**AND** structure SHALL support all BattleTech unit types (BattleMech, vehicles, etc.)
**AND** maintain compatibility with existing TypeScript interfaces

#### Scenario: Property type definitions
**GIVEN** unit properties from different categories and calculations
**WHEN** defining property types in the entity model
**THEN** each property SHALL have appropriate TypeScript type definition
**AND** include validation constraints and value ranges where applicable
**AND** provide clear documentation for property purpose and usage
**AND** maintain consistency with existing property naming conventions

#### Scenario: Component composition modeling
**GIVEN** a unit with multiple equipment items and systems
**WHEN** modeling component composition in the entity
**THEN** entity SHALL provide structured access to all installed components
**AND** maintain component relationships and hierarchy
**AND** support component addition, removal, and modification operations
**AND** validate component configuration against construction rules

#### Scenario: Calculated property integration
**GIVEN** calculated properties from battle value, tech rating, and heat management systems
**WHEN** integrating calculated properties into the unit entity
**THEN** entity SHALL provide direct access to all calculated values
**AND** maintain calculation metadata for audit and validation purposes
**AND** support property recalculation when component configuration changes
**AND** provide efficiency analysis and optimization recommendations

#### Scenario: Tech base and era integration
**GIVEN** units with different tech bases and era restrictions
**WHEN** modeling tech base and era in the entity structure
**THEN** entity SHALL include immutable tech base classification
**AND** provide era availability information for technology restrictions
**AND** validate component compatibility against tech base requirements
**AND** support mixed technology configurations with proper validation

### Requirement: Define Data Validation and Invariants
The system SHALL define validation rules and invariants that maintain data integrity and consistency with BattleTech construction rules.

**Rationale**: Data validation ensures reliable unit representations and prevents invalid states that could corrupt calculations or violate construction rules.

**Priority**: Critical

#### Scenario: Property value validation
**GIVEN** a unit entity with property values assigned
**WHEN** validating property values
**THEN** validation SHALL check type compliance and value ranges
**AND** enforce construction rule compliance for weight, critical slots, and equipment
**AND** validate calculated property consistency and mathematical correctness
**AND** provide clear error messages for validation failures
**AND** support partial validation for incomplete unit configurations

#### Scenario: Component relationship validation
**GIVEN** a unit with multiple installed components
**WHEN** validating component relationships
**THEN** validation SHALL check critical slot availability and allocation
**AND** validate equipment compatibility and tech base consistency
**AND** enforce component installation requirements and prerequisites
**AND** validate system component integration and dependencies
**AND** check for conflicts between installed components

#### Scenario: Calculated property consistency
**GIVEN** calculated properties from multiple calculation systems
**WHEN** validating calculated property consistency
**THEN** validation SHALL ensure mathematical consistency across calculations
**AND** validate dependency relationships between calculated values
**AND** check for logical contradictions in calculated properties
**AND** validate efficiency calculations and optimization recommendations
**AND** ensure compliance with BattleTech rulebook formulas

#### Scenario: Cross-system validation
**GIVEN** a unit entity with properties from multiple systems
**WHEN** performing cross-system validation
**THEN** validation SHALL check integration consistency across systems
**AND** validate total tonnage and weight distribution
**AND** ensure heat capacity aligns with weapon and equipment heat generation
**AND** validate battle value calculations against official formulas
**AND** check tech rating consistency with component technology levels

### Requirement: Define Versioning and Compatibility Strategy
The system SHALL define a versioning strategy that supports schema evolution while maintaining backward compatibility.

**Rationale**: Versioning enables the OpenSpec system to evolve and support new BattleTech content while ensuring existing data remains accessible and usable.

**Priority**: High

#### Scenario: Schema version identification
**GIVEN** a unit entity structure with potential evolution
**WHEN** defining versioning strategy
**THEN** each entity version SHALL have unique version identifier
**AND** include schema version compatibility information
**AND** provide migration paths between different versions
**AND** support backward compatibility requirements for existing data
**AND** define deprecation strategies for obsolete properties

#### Scenario: Property addition and modification
**GIVEN** requirements for new unit properties or calculations
**WHEN** extending the entity schema
**THEN** additions SHALL follow established extension patterns
**AND** maintain compatibility with existing property definitions
**AND** provide default values and validation rules for new properties
**AND** include clear documentation for property purpose and usage
**AND** support optional properties for specialized use cases

#### Scenario: Backward compatibility maintenance
**GIVEN** existing unit data in previous schema versions
**WHEN** evolving the entity structure
**THEN** schema changes SHALL maintain backward compatibility where possible
**AND** provide automatic data migration for compatible schema changes
**AND** include fallback handling for unsupported properties in older data
**AND** define clear upgrade paths for different schema versions
**AND** document compatibility requirements and limitations

#### Scenario: Format evolution support
**GIVEN** changing BattleTech rules or new equipment types
**WHEN** updating the entity structure
**THEN** versioning SHALL support gradual feature introduction
**AND** provide format negotiation for different tool compatibility
**AND** maintain data integrity across format transitions
**AND** support both complete and partial unit representations
**AND** include feature detection and capability negotiation

### Requirement: Define Extension Framework
The system SHALL provide a defined framework for extending the unit entity model with custom properties and capabilities.

**Rationale**: An extension framework enables specialized scenarios, custom BattleTech content, and future feature development while maintaining system integrity.

**Priority**: High

#### Scenario: Custom property extensions
**GIVEN** specialized requirements for custom unit properties
**WHEN** extending the entity model
**THEN** framework SHALL support custom property addition with type safety
**AND** provide validation rules for custom property constraints
**AND** include metadata for property origin and purpose
**AND** support custom property serialization and deserialization
**AND** maintain compatibility with core validation systems

#### Scenario: Specialized component integration
**GIVEN** custom equipment types or specialized BattleTech units
**WHEN** extending component support
**THEN** framework SHALL allow custom component type definitions
**AND** provide integration points for custom component validation
**AND** support custom calculation methods for specialized components
**AND** maintain proper component relationship modeling
**AND** include custom property mapping for serialization

#### Scenario: Legacy data support
**GIVEN** existing unit data with non-standard or legacy properties
**WHEN** handling legacy data in the entity model
**THEN** framework SHALL provide migration paths for legacy properties
**AND** support data transformation from legacy to canonical format
**AND** include backward compatibility handling for legacy data
**AND** provide legacy data preservation during schema transitions
**AND** support gradual migration and data cleanup strategies

#### Scenario: Plugin and module support
**GIVEN** modular requirements for unit functionality extensions
**WHEN** implementing plugin support
**THEN** framework SHALL support dynamic property addition
**AND** provide validation interfaces for plugin-defined properties
**AND** maintain isolation between core and plugin-defined properties
**AND** support plugin discovery and capability negotiation
**AND** include plugin versioning and compatibility checking

---

## Interface Definitions

### Core Entity Interface
```typescript
interface IUnitEntity {
  // Primary identification
  readonly id: string;
  readonly name: string;
  readonly type: UnitType;
  readonly techBase: TechBase;

  // Physical properties
  readonly tonnage: number;
  readonly battleValue: number;
  readonly techRating: string;
  readonly rulesLevel: RulesLevel;

  // Core systems
  readonly engine: IEngineSystem;
  readonly gyro: IGyroSystem;
  readonly structure: IStructureSystem;
  readonly armor: IArmorSystem;
  readonly heatSinks: IHeatSinkSystem;

  // Movement systems
  readonly actuators: IActuatorSystem[];
  readonly jumpJets: IJumpJetSystem[];
  readonly movementType: MovementType;

  // Equipment composition
  readonly equipment: IEquipmentComponent[];
  readonly weapons: IWeaponComponent[];
  readonly ammunition: IAmmunitionComponent[];
  readonly electronics: IElectronicComponent[];

  // Calculated properties
  readonly calculatedProperties: ICalculatedProperties;
  readonly efficiencyMetrics: IEfficiencyMetrics;
  readonly threatAssessment: IThreatAssessment;

  // Metadata and versioning
  readonly version: string;
  readonly lastModified: Date;
  readonly schemaVersion: string;
  readonly customProperties: ICustomProperty[];

  // Validation state
  isValid: boolean;
  validationErrors: IValidationError[];
  warnings: IValidationWarning[];
}
```

### Property Access Interface
```typescript
interface IPropertyAccess<T> {
  get<K extends keyof IUnitEntity>(key: K): T;
  set<K extends keyof IUnitEntity>(key: K, value: IUnitEntity[K]): void;
  has<K extends keyof IUnitEntity>(key: K): boolean;
  validate(): IValidationResult<IUnitEntity>;
  getMetadata(): IPropertyMetadata;
}
```

### Validation Interface
```typescript
interface IUnitEntityValidator {
  validateStructure(entity: IUnitEntity): IValidationResult<IUnitEntity>;
  validateProperties(entity: IUnitEntity): IValidationResult<IUnitEntity>;
  validateCalculatedProperties(entity: IUnitEntity): IValidationResult<IUnitEntity>;
  validateComponentCompatibility(entity: IUnitEntity): IValidationResult<IUnitEntity>;
  validateBusinessRules(entity: IUnitEntity): IValidationResult<IUnitEntity>;
  validateCustomProperties(entity: IUnitEntity): IValidationResult<IUnitEntity>;
}
```

### Extension Framework Interface
```typescript
interface IEntityExtension {
  extensionId: string;
  version: string;
  propertyDefinitions: ICustomPropertyDefinition[];
  validationRules: IExtensionValidationRule[];
  migrationHandlers: IMigrationHandler[];
  serializationHandlers: ISerializationHandler[];
}

interface ICustomPropertyDefinition {
  name: string;
  type: PropertyType;
  required: boolean;
  defaultValue?: any;
  validationRule?: IValidationRule;
  documentation?: string;
  category?: string;
}

interface IMigrationHandler {
  fromVersion: string;
  toVersion: string;
  migrate: (data: any) => any;
  validate: (data: any) => IValidationResult<any>;
}
```

---

## Data Models

### Core Entity Structure
```typescript
interface UnitEntity implements IUnitEntity {
  // Primary identification
  id: string;                    // Unique identifier (UUID or generated)
  name: string;                  // Human-readable name
  type: UnitType;                 // BattleMech, Vehicle, Infantry, etc.
  techBase: TechBase;              // Inner Sphere, Clan, Mixed

  // Physical characteristics
  tonnage: number;                // Weight in tons
  battleValue: number;            // Calculated combat effectiveness
  techRating: string;              // Technology complexity rating (A-F)
  rulesLevel: RulesLevel;           // Construction rules level (1-4)

  // Combat systems
  engine: EngineSystem;           // Engine type and rating
  gyro: GyroSystem;             // Gyro type and rating
  structure: StructureSystem;      // Internal structure type and points
  armor: ArmorSystem;           // Armor type and distribution

  // Movement systems
  actuators: ActuatorSystem[];  // Movement actuators by location
  jumpJets: JumpJetSystem[];     // Jump jet systems
  movementType: MovementType;     // Biped, Quad, Tracked, etc.

  // Equipment composition
  equipment: EquipmentComponent[];  // All non-weapon equipment
  weapons: WeaponComponent[];      // All weapon systems
  ammunition: AmmunitionComponent[]; // Ammunition storage
  electronics: ElectronicComponent[]; // ECM, targeting, communication

  // Calculated properties (from Phases 1-4)
  calculatedProperties: CalculatedProperties;
  efficiencyMetrics: EfficiencyMetrics;
  threatAssessment: ThreatAssessment;

  // Metadata
  version: string;               // Entity format version
  lastModified: Date;          // Last modification timestamp
  schemaVersion: string;         // Schema specification version
  customProperties: CustomProperty[]; // Extension properties

  // Validation state
  isValid: boolean;              // Overall validity flag
  validationErrors: ValidationError[];  // Critical validation failures
  warnings: ValidationWarning[];    // Non-critical issues
}
```

### Calculated Properties Structure
```typescript
interface CalculatedProperties {
  // From Phase 4: Battle Value System
  battleValueBreakdown: BattleValueBreakdown;
  offensiveBV: number;
  defensiveBV: number;
  speedFactor: number;

  // From Phase 4: Tech Rating System
  techRatingBreakdown: TechRatingBreakdown;
  componentTechLevels: ComponentTechLevel[];
  overallTechRating: string;
  techComplexity: number;

  // From Phase 4: Heat Management System
  heatCapacity: HeatCapacity;
  heatGeneration: HeatGenerationProfile;
  heatDissipation: HeatDissipationProfile;
  heatEfficiency: number;
  heatScaleEffects: HeatScaleEffects;

  // From Phase 4: Damage System
  damageProfile: DamageProfile;
  rangeEffectiveness: RangeEffectivenessProfile;
  criticalHitVulnerability: CriticalHitVulnerability;
  weaponEffectiveness: WeaponEffectivenessProfile;

  // From Phases 1-3: Integrated calculations
  totalWeight: number;           // From construction system
  criticalSlotsUsed: number;        // From critical slot system
  movementProfile: MovementProfile;     // From movement system
  structuralIntegrity: number;       // From structure system
  repairComplexity: number;          // Calculated repair difficulty
}
```

### Component Composition Models
```typescript
interface ComponentBase {
  id: string;
  name: string;
  type: ComponentType;
  techBase: TechBase;
  techLevel: TechLevel;
  weight: number;
  criticalSlots: number;
  location: string;
  installed: boolean;
  condition: ComponentCondition;
}

interface WeaponComponent extends ComponentBase {
  damage: number | DamageRange;
  heat: number;
  range: string;              // "short/medium/long" format
  minRange: number;
  ammoType?: string;
  fireMode?: string;
  specialAbilities: string[];
  effectiveness: WeaponEffectiveness;
}

interface EquipmentComponent extends ComponentBase {
  effect: EquipmentEffect;
  powerRequirement: number;
  operationalState: EquipmentState;
  integrationPoints: string[];
  dependencies: string[];
}

interface AmmunitionComponent extends ComponentBase {
  ammunitionType: string;
  quantity: number;
  shotsPerTon: number;
  explosionRisk: ExplosionRisk;
  protectedByCase: boolean;
  location: string;
}
```

### Validation Result Models
```typescript
interface ValidationError {
  property: string;
  code: ValidationErrorCode;
  message: string;
  severity: 'critical' | 'major' | 'minor';
  rule: string;
  suggestion?: string;
}

interface ValidationWarning {
  property: string;
  code: ValidationWarningCode;
  message: string;
  category: 'performance' | 'compatibility' | 'optimization';
  suggestion?: string;
}

interface ValidationResult<T> {
  isValid: boolean;
  entity?: T;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
}
```

### Extension Framework Models
```typescript
interface CustomProperty {
  name: string;
  type: PropertyType;
  value: any;
  metadata: PropertyMetadata;
  valid: boolean;
}

interface PropertyMetadata {
  category: string;
  source: string;
  version: string;
  documentation?: string;
  validationRule?: ValidationRule;
}

interface EntityExtension {
  id: string;
  version: string;
  properties: CustomProperty[];
  validationRule: ExtensionValidationRule;
  compatibilityMatrix: CompatibilityInfo;
}
```

---

## Validation Rules

### Core Entity Validation
- **Critical**: All required identification properties must be present and valid
- **Critical**: Physical properties must be within valid BattleTech ranges
- **Critical**: Component composition must not exceed critical slot capacity
- **Major**: Calculated properties must be mathematically consistent
- **Minor**: Optional properties should have sensible defaults

### Component Validation
- **Critical**: Component installation must respect critical slot limitations
- **Critical**: Component tech base must match unit tech base
- **Major**: Component weight must not exceed available tonnage
- **Minor**: Component condition must be consistent with usage

### Calculated Property Validation
- **Critical**: Battle value calculations must use official formulas
- **Critical**: Tech rating must follow technology progression rules
- **Major**: Heat capacity calculations must use correct heat sink formulas
- **Minor**: Efficiency metrics should be realistic and achievable

### Extension Validation
- **Critical**: Custom properties must not conflict with core schema
- **Major**: Extension validation rules must be consistently applied
- **Minor**: Custom properties should follow naming conventions

---

## Error Handling

### Critical Errors
- Missing required identification properties
- Invalid unit type or tech base
- Physical property values outside BattleTech ranges
- Component weight exceeding available tonnage

### Major Errors
- Validation rule failures with unclear causes
- Calculated property inconsistencies
- Component tech base mismatches

### Minor Errors
- Optional properties with missing documentation
- Validation warnings for optimization opportunities
- Formatting inconsistencies in custom properties

### Recovery Mechanisms
- Fallback to default values for missing optional properties
- Automatic correction of common data entry errors
- Graceful degradation for complex validation failures
- Data repair and cleanup utilities

---

## Performance Requirements

### Entity Access Performance
- Property access: < 1ms per property
- Validation: < 10ms for complete entity
- Component lookup: < 5ms per component query
- Calculated property updates: < 20ms for recalculation

### Memory Usage
- Base entity structure: < 50KB per unit
- Component composition: < 200KB for complex configurations
- Validation results: < 10KB per validation cycle
- Extension data: < 100KB for custom properties

### Caching Strategy
- Cache validation results for identical entity structures
- Cache calculated properties for unchanged component configurations
- Pre-validate common property combinations
- Optimize serialization for repeated access patterns

---

## Testing Requirements

### Unit Tests
- Entity creation and property access accuracy
- Validation rule compliance for all property types
- Component composition modeling correctness
- Calculated property integration accuracy
- Extension framework flexibility

### Integration Tests
- Compatibility with existing Phase 1-4 specifications
- Integration with validation and calculation systems
- Serialization round-trip accuracy and compatibility
- Performance under large unit datasets

### Performance Tests
- Entity validation performance with complex configurations
- Memory usage optimization for large unit collections
- Serialization performance for complete units
- Concurrent access patterns for multi-user scenarios

### Scenario Tests
- Complete unit creation for all BattleTech unit types
- Validation error handling and reporting accuracy
- Extension and customization scenario testing
- Backward compatibility testing across schema versions

---

## Examples

### Example 1: Standard BattleMech Unit Entity
**GIVEN** a 70-ton Inner Sphere BattleMech with:
- Standard Fusion engine, XXL gyro
- 13 double heat sinks, Endo Steel structure
- Medium Laser, LRM-15, SRM-4
- Rules Level: Standard, Rules Level: 2

**WHEN** creating the unit entity

**THEN** entity should be:
```typescript
{
  id: "mech-abc-123",
  name: "Atlas AS7-D",
  type: UnitType.BATTLEMECH,
  techBase: TechBase.INNER_SPHERE,
  tonnage: 70,
  battleValue: 1847,
  techRating: "C",
  rulesLevel: RulesLevel.STANDARD,

  engine: {
    type: EngineType.XXL_FUSION,
    rating: 280,
    manufacturer: "Vehronics"
  },

  calculatedProperties: {
    battleValueBreakdown: {
      offensiveBV: 1247,
      defensiveBV: 600,
      speedFactor: 1.4
    },
    heatCapacity: {
      totalDissipation: 26,
      heatGeneration: 18,
      heatEfficiency: 0.69
    },
    totalWeight: 68
  },

  weapons: [
    {
      id: "medium-laser-1",
      name: "Medium Laser",
      damage: 5,
      heat: 3,
      range: "3/6/9",
      location: "right_arm",
      installed: true
    },
    {
      id: "lrm-15-1",
      name: "LRM-15",
      damage: "1d6", // Cluster hit pattern
      heat: 4,
      range: "7/21/42",
      location: "left_torso",
      installed: true
    }
  ],

  isValid: true,
  validationErrors: [],
  warnings: [
    {
      property: "heatEfficiency",
      message: "Heat capacity exceeds weapon heat generation",
      category: "optimization"
    }
  ]
}
```

### Example 2: Clan OmniMech with Custom Properties
**GIVEN** a 75-ton Clan OmniMech with:
- XL Engine, Clan Double Heat Sinks
- Omnimech configuration with multiple configurations
- Experimental PPC, Streak LRM-6
- Rules Level: Advanced, Rules Level: 3

**WHEN** creating the unit entity with custom properties

**THEN** entity should be:
```typescript
{
  id: "clan-omni-madcat-ii-prime-456",
  name: "Mad Cat II Prime",
  type: UnitType.OMNIMECH,
  techBase: TechBase.CLAN,
  tonnage: 75,
  battleValue: 2234,
  techRating: "A",
  rulesLevel: RulesLevel.ADVANCED,

  customProperties: [
    {
      name: "omniConfigurations",
      type: PropertyType.ARRAY,
      value: [
        {
          configuration: "A",
          weapons: ["ppc", "streak-lrm-6"],
          equipment: ["ecm-suite"]
        },
        {
          configuration: "B",
          weapons: ["large-laser", "medium-pulse-laser"],
          equipment: ["targeting-computer"]
        }
      ],
      metadata: {
        category: "omni-configuration",
        source: "clan-omni-system",
        documentation: "Available weapon loadouts for this omnimech"
      }
    },
    {
      name: "chassisModifications",
      type: PropertyType.OBJECT,
      value: {
        enhancedSensors: true,
        commandConsole: "clan-command",
        emergencyEject: true
      },
      metadata: {
        category: "customization",
        source: "field-modification-package"
      }
    }
  ],

  weapons: [
    {
      id: "experimental-ppc-1",
      name: "Experimental PPC",
      damage: 15,
      heat: 12,
      range: "6/15/30",
      specialAbilities: ["capital-weapon", "ion-field"],
      location: "right_arm",
      installed: true
    }
  ],

  isValid: true,
  validationErrors: [],
  warnings: [
    {
      property: "techRating",
      message: "Advanced technology may have limited availability",
      category: "compatibility"
    }
  ]
}
```

### Example 3: Validation Error Handling
**GIVEN** a unit entity with invalid data:
- Invalid tonnage (-5 tons)
- Missing required engine property
- Component exceeding critical slot limits

**WHEN** validating the entity

**THEN** validation result should be:
```typescript
{
  isValid: false,
  errors: [
    {
      property: "tonnage",
      code: "INVALID_RANGE",
      message: "Tonnage must be positive number between 5 and 100",
      severity: "critical",
      suggestion: "Specify valid BattleMech tonnage"
    },
    {
      property: "engine",
      code: "MISSING_REQUIRED",
      message: "Engine system is required for all BattleMechs",
      severity: "critical",
      suggestion: "Add engine configuration to unit"
    },
    {
      property: "criticalSlotsUsed",
      code: "CAPACITY_EXCEEDED",
      message: "Component allocation exceeds available critical slots",
      severity: "major",
      suggestion: "Reduce component count or increase critical slot capacity"
    }
  ],
  warnings: [
    {
      property: "efficiencyMetrics",
      message: "Unable to calculate efficiency metrics due to validation errors",
      category: "performance"
    }
  ]
}
```

---

## Implementation Notes

### Integration with Existing Systems
The Unit Entity Model integrates with:
- **Phase 1-4 Specifications**: Uses calculated properties from all previous phases
- **TypeScript Type System**: Extends existing interfaces and type definitions
- **Critical Slot System**: Models component placement and allocation
- **Construction Calculator**: Uses physical property calculations
- **Validation Framework**: Provides validation rules and error handling
- **Equipment Database**: Supplies component and equipment definitions

### Migration Strategy
- Support existing unit configurations through automatic property mapping
- Provide validation for legacy data during migration
- Maintain backward compatibility with previous entity versions
- Support gradual transition between schema versions

### Extension Implementation
- Custom properties integrate with core validation system
- Extensions maintain versioning and compatibility information
- Plugin-defined properties follow same validation patterns as core properties
- Extension framework supports dynamic property addition and removal

### Performance Optimizations
- Lazy loading of component details and calculated properties
- Efficient validation with early termination on critical errors
- Optimized serialization with selective property inclusion
- Memory-efficient storage for large unit collections

---

## Version History

**v1.0 (2025-11-28)**: Initial specification draft
- Complete unit entity structure definition
- Integration with all Phase 1-4 specifications
- Comprehensive validation rules and error handling
- Extension framework for custom properties
- TypeScript interface definitions and data models
- Performance requirements and optimization guidelines