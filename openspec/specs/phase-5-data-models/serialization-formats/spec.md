# Serialization & Format Specifications

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Phase 1-5 specifications (Foundation, Construction, Equipment, Validation & Calculations, Unit Entity Model)
**Affects**: Unit Entity Model, Database Schema, Data Integrity & Validation, External Tool Integration

---

## Overview

### Purpose
The Serialization & Format specifications define canonical data exchange and persistence formats for BattleTech units, enabling seamless data transfer between the OpenSpec system and external tools while maintaining data integrity and supporting version evolution.

### Scope
**In Scope:**
- Canonical JSON save/load format with versioning strategy
- MegaMekLab format compatibility and transformation rules
- Data compression and optimization strategies
- Format negotiation and capability detection
- Schema validation and error handling
- Legacy data support and migration pathways
- External tool format specifications (MML, HMME, etc.)

**Out of Scope:**
- Real-time data streaming protocols
- Network communication specifications
- Cloud storage integration protocols
- Database-specific implementation details
- UI serialization requirements
- Custom file format definitions

### Key Concepts
- **Canonical Format**: Standardized JSON format representing complete unit entities
- **Versioning Strategy**: Approach for schema evolution while maintaining backward compatibility
- **Format Negotiation**: Automatic detection and adaptation between different format versions
- **Data Compression**: Optimization strategies for large unit configurations
- **Format Transformation**: Rules for converting between canonical and external formats
- **Schema Validation**: Validation rules ensuring data integrity across format operations
- **Legacy Support**: Migration pathways for older or non-standard data formats
- **Lossless Conversion**: Transformation rules preserving all calculated and assigned properties
- **Extensibility Framework**: Extension points for custom properties and specialized formats

---

## Requirements

### Requirement: Define Canonical Serialization Format
The system SHALL define a canonical JSON format that represents complete unit entities with all calculated and assigned properties.

**Rationale**: A canonical serialization format provides the foundation for all data persistence, exchange, and transformation operations.

**Priority**: Critical

#### Scenario: Standard unit serialization
**GIVEN** a complete unit entity with all Phase 1-4 properties
**WHEN** serializing to canonical format
**THEN** JSON SHALL contain identification, physical properties, calculated properties, component composition, and metadata
**AND** structure SHALL be versioned and support extensible properties
**AND** all values SHALL be type-validated and follow BattleTech construction rules
**AND** format SHALL be efficient for storage and network transmission

#### Scenario: Partial unit serialization
**GIVEN** a unit entity with missing or invalid properties
**WHEN** serializing to canonical format
**THEN** JSON SHALL include warnings for missing required properties
**AND** invalid properties SHALL be excluded or corrected with default values
**AND** validation errors SHALL be preserved in serialization output
**AND** format SHALL support graceful degradation for incomplete data

#### Scenario: Custom property serialization
**GIVEN** a unit entity with extended properties from Phase 5 extensions
**WHEN** serializing to canonical format
**THEN** JSON SHALL include custom properties with proper type information
**AND** custom properties SHALL include extension metadata and validation rules
**AND** format SHALL support property filtering and selective serialization
**AND** extension properties SHALL maintain backward compatibility with standard format

#### Scenario: Multi-version format support
**GIVEN** different versions of unit entities in system
**WHEN** serializing to canonical format
**THEN** JSON SHALL include version information for both entity and schema
**AND** format SHALL support version negotiation during deserialization
**AND** older format versions SHALL be gracefully migrated to current version
**AND** schema evolution SHALL be supported through backward-compatible extensions

### Requirement: Support External Format Compatibility
The system SHALL provide compatibility and transformation rules for external BattleTech tool formats.

**Rationale**: External format compatibility enables data exchange with MegaMekLab, HeavyMetal, and other BattleTech applications.

**Priority**: Critical

#### Scenario: MegaMekLab format support
**GIVEN** canonical unit data in OpenSpec system
**WHEN** exporting to MegaMekLab format
**THEN** transformation SHALL map OpenSpec properties to MegaMekLab equivalents
**AND** format SHALL preserve all calculated properties and equipment configurations
**AND** mapping SHALL handle tech base differences and era restrictions
**AND** specialized equipment SHALL be converted to equivalent MegaMekLab types
**AND** format SHALL include proper version and compatibility information

#### Scenario: HeavyMetal format support
**GIVEN** unit entity with calculated properties and component configurations
**WHEN** exporting to HeavyMetal format
**THEN** transformation SHALL preserve all unit structure and calculations
**AND** format SHALL support HeavyMetal-specific property definitions
**AND** equipment compatibility SHALL be validated against HeavyMetal rules
**AND** specialized OpenSpec extensions SHALL be mapped where possible
**AND** warnings SHALL be generated for unsupported property conversions

#### Scenario: MML/HMME format support
**GIVEN** unit entities with multiple equipment and configuration options
**WHEN** exporting to MML or HMME format
**THEN** transformation SHALL preserve complete unit configuration
**AND** format SHALL support multiple units and variant configurations
**AND** equipment and weapon configurations SHALL be properly represented
**AND** format SHALL include calculated properties and threat assessments
**AND** format SHALL support tool-specific optimization and features

#### Scenario: Custom format definition
**GIVEN** specialized requirements for unit data exchange
**WHEN** defining custom serialization format
**THEN** system SHALL support extensible format definition framework
**AND** custom formats SHALL follow canonical format structure with extensions
**AND** format SHALL include proper validation and transformation rules
**AND** custom format SHALL support lossless conversion from canonical format
**AND** extension properties SHALL be properly handled in custom serialization

### Requirement: Implement Data Compression Strategies
The system SHALL define compression and optimization strategies for large unit datasets and efficient network transmission.

**Rationale**: Data compression reduces storage requirements and transmission time while maintaining data integrity.

**Priority**: High

#### Scenario: Basic JSON compression
**GIVEN** unit data with repetitive structures and large equipment lists
**WHEN** applying compression
**THEN** system SHALL use standard JSON compression (gzip, deflate) for network transmission
**AND** compression SHALL be transparent to serialization/deserialization process
**AND** compressed data SHALL maintain full data integrity
**AND** compression metadata SHALL be included for decompression requirements
**AND** system SHALL support compression level negotiation

#### Scenario: Structure-aware compression
**GIVEN** unit data with regular patterns and predictable structures
**WHEN** optimizing for storage
**THEN** system SHALL implement structure-aware compression algorithms
**AND** repetitive patterns SHALL be eliminated through deduplication
**AND** common equipment configurations SHALL be compressed through reference sharing
**AND** calculated properties SHALL be derived rather than stored where possible
**AND** compression SHALL preserve complete data reconstruction capability

#### Scenario: Selective property compression
**GIVEN** units with extensive equipment lists and calculated properties
**WHEN** optimizing for specific use cases
**WHEN** compression
**THEN** system SHALL support selective inclusion of properties based on use case
**AND** commonly used properties SHALL be prioritized in compression
**AND** optional properties SHALL be excluded or compressed separately
**AND** compression metadata SHALL indicate property inclusion levels
**AND** decompression SHALL support property-level reconstruction

#### Scenario: Progressive compression
**GIVEN** extremely large unit datasets with multiple variants and configurations
**WHEN** applying advanced compression
**THEN** system SHALL implement progressive compression with multiple quality levels
**AND** compression SHALL adapt based on available bandwidth and storage constraints
**AND** system SHALL support streaming compression for large datasets
**AND** progressive compression SHALL maintain data accessibility at different quality levels
**AND** compression artifacts SHALL be minimal and predictable

### Requirement: Provide Schema Validation and Error Handling
The system SHALL validate serialized data against schema definitions and provide comprehensive error handling.

**Rationale**: Schema validation ensures data integrity and provides clear error reporting for debugging and data correction.

**Priority**: Critical

#### Scenario: Format validation
**GIVEN** serialized unit data in canonical format
**WHEN** validating against schema
**THEN** system SHALL verify JSON structure compliance
**AND** validate all required properties are present with correct types
**AND** check for forbidden properties and structural violations
**AND** validate calculated property consistency and mathematical correctness
**AND** validate component composition against construction rules
**AND** provide detailed error messages for validation failures

#### Scenario: Version compatibility validation
**GIVEN** unit data from different format versions
**WHEN** validating schema compatibility
**THEN** system SHALL check version compatibility matrix
**AND** validate required properties are available for target version
**AND** check for deprecated properties and migration requirements
**AND** validate property type changes and structure modifications
**AND** provide migration suggestions when compatibility issues are detected

#### Scenario: Custom format validation
**GIVEN** unit data with extensions or custom properties
**WHEN** validating extended schema
**THEN** system SHALL validate custom properties against extension definitions
**AND** check for property conflicts and naming convention violations
**AND** validate custom property types and value constraints
**AND** ensure extension properties do not violate core schema requirements
**AND** provide warnings for unsupported or deprecated custom properties

#### Scenario: Error handling and recovery
**GIVEN** validation errors or serialization failures
**WHEN** processing invalid data
**THEN** system SHALL provide detailed error categorization and recovery suggestions
**AND** errors SHALL be grouped by severity and affected components
**AND** recovery options SHALL include automatic correction, manual intervention, and data exclusion
**AND** system SHALL support partial validation with error continuation
**AND** provide context-specific error messages and resolution guidance

---

## Interface Definitions

### Serialization Interface
```typescript
interface ISerializationManager {
  // Core serialization operations
  serializeUnit(entity: IUnitEntity, options?: SerializationOptions): SerializationResult;
  deserializeUnit(data: string, options?: DeserializationOptions): DeserializationResult;
  validateSerialization(data: string, schemaVersion?: string): ValidationResult;
  transformFormat(data: string, targetFormat: ExternalFormat): TransformationResult;
  getSupportedFormats(): ExternalFormat[];
  negotiateFormat(requestedFormat: string, availableFormats: ExternalFormat[]): FormatNegotiationResult;
}

interface SerializationOptions {
  format: SerializationFormat;
  version: string;
  compression: CompressionOptions;
  propertyFilter: PropertyFilter;
  includeMetadata: boolean;
  includeValidation: boolean;
  customExtensions?: ExtensionOptions;
}

interface SerializationResult {
  success: boolean;
  data: string;
  format: SerializationFormat;
  version: string;
  compression: CompressionResult;
  size: number;
  compressionRatio: number;
  warnings: ValidationWarning[];
  metadata: SerializationMetadata;
}
```

### Deserialization Interface
```typescript
interface IDeserializationManager {
  // Core deserialization operations
  deserializeUnit(data: string, options?: DeserializationOptions): DeserializationResult;
  validateDeserialization(entity: IUnitEntity, schemaVersion?: string): ValidationResult;
  migrateFormat(data: any, fromVersion: string, toVersion: string): MigrationResult;
  getSupportedVersions(): FormatVersion[];
  detectFormat(data: string): FormatDetectionResult;
}

interface DeserializationOptions {
  format: SerializationFormat;
  version: string;
  strictValidation: boolean;
  allowPartialData: boolean;
  migrationHandler?: MigrationHandler;
  customExtensions?: ExtensionOptions;
}

interface DeserializationResult {
  success: boolean;
  entity?: IUnitEntity;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: DeserializationMetadata;
  migration?: MigrationResult;
}
```

### External Format Interface
```typescript
interface IExternalFormatManager {
  // External tool format support
  exportToMegaMekLab(entity: IUnitEntity, options?: MMLExportOptions): MMLExportResult;
  exportToHeavyMetal(entity: IUnitEntity, options?: HMExportOptions): HMExportResult;
  exportToMML(entity: IUnitEntity, options?: MMLExportOptions): MMLExportResult;
  importFromMegaMekLab(data: string): ImportResult<IUnitEntity>;
  importFromHeavyMetal(data: string): ImportResult<IUnitEntity>;
  importFromMML(data: string): ImportResult<IUnitEntity>;
  transformToCanonical(data: any, sourceFormat: ExternalFormat): TransformationResult;
}

interface ExternalFormatOptions {
  includeCalculatedProperties: boolean;
  includeVariants: boolean;
  optimizeForTool: string;
  customPropertyMapping: PropertyMapping;
  versioning: VersioningOptions;
}
```

### Compression Interface
```typescript
interface ICompressionManager {
  // Data compression and optimization
  compressData(data: string, options?: CompressionOptions): CompressionResult;
  decompressData(data: string, options?: DecompressionOptions): DecompressionResult;
  analyzeCompressionEfficiency(entity: IUnitEntity): CompressionAnalysisResult;
  optimizeCompressionStrategy(entity: IUnitEntity): CompressionOptimizationResult;
}

interface CompressionOptions {
  algorithm: CompressionAlgorithm;
  level: CompressionLevel;
  strategy: CompressionStrategy;
  streaming: boolean;
  chunkSize?: number;
}

interface CompressionResult {
  success: boolean;
  compressedData: string;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: string;
  metadata: CompressionMetadata;
}
```

### Validation Interface
```typescript
interface IFormatValidator {
  // Schema validation and compliance
  validateFormat(data: string, format: SerializationFormat): ValidationResult;
  validateSchema(schema: SchemaDefinition): SchemaValidationResult;
  validateCompatibility(data: IUnitEntity, targetFormat: ExternalFormat): CompatibilityResult;
  validateCustomProperties(data: IUnitEntity, extensions: EntityExtension[]): CustomValidationResult;
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  metadata: ValidationMetadata;
  performance: PerformanceMetrics;
}
```

---

## Data Models

### Canonical Format Models
```typescript
interface CanonicalUnitFormat {
  // Format identification and versioning
  format: "openspec-unit-v1";
  version: string;
  schemaVersion: string;
  lastModified: string;

  // Core unit identification
  unit: {
    id: string;
    name: string;
    type: UnitType;
    techBase: TechBase;
    variant?: string;
    customization?: string;
    source: string;
    description?: string;
  };

  // Physical properties
  physical: {
    tonnage: number;
    battleValue: number;
    techRating: string;
    rulesLevel: RulesLevel;
    engine: {
      type: string;
      rating: number;
      manufacturer?: string;
    };
    gyro: {
      type: string;
      rating: number;
    };
    structure: {
      type: string;
      points: Record<string, number>;
      type: string;
    };
    armor: {
      type: string;
      points: Record<string, number>;
      type: string;
    };
    movement: {
      walk: number;
      run: number;
      jump?: number;
      type: MovementType;
    };
  };

  // Calculated properties
  calculated: {
    battleValue: {
      offensive: number;
      defensive: number;
      total: number;
      speedFactor: number;
    };
    heatManagement: {
      capacity: number;
      generation: {
        weapons: number;
        equipment: number;
        movement: number;
      };
      dissipation: {
        engine: number;
        external: number;
        total: number;
      };
      efficiency: number;
      heatScaleEffects: HeatScaleEffects;
    };
    threatAssessment: {
      weaponryRating: WeaponThreatRating;
      armorRating: ArmorRating;
      mobilityRating: MobilityRating;
      overall: OverallThreatLevel;
    };
    effectiveness: {
      combat: number;
      reconnaissance: number;
      support: number;
      transport: number;
      overall: number;
    };
  };

  // Equipment composition
  equipment: {
    weapons: WeaponComponent[];
    ammunition: AmmunitionComponent[];
    electronics: ElectronicComponent[];
    physical: PhysicalComponent[];
    systems: EquipmentSystem[];
    customComponents: CustomComponent[];
  };

  // Component relationships and constraints
  composition: {
    totalWeight: number;
    usedCriticalSlots: number;
    availableCriticalSlots: number;
    weightDistribution: Record<string, number>;
    centerOfGravity: Record<string, number>;
  };

  // Metadata and extensions
  metadata: {
    created: string;
    lastModified: string;
    version: string;
    schema: string;
    format: string;
    compression?: string;
    checksum?: string;
    tags: string[];
  };

  extensions: CustomProperty[];

  // Validation and integrity
  validation: {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    rulesApplied: string[];
    checksum: string;
  };
}
```

### External Format Models
```typescript
interface ExternalFormatDefinition {
  // External tool format specifications
  formatId: string;
  name: string;
  version: string;
  capabilities: FormatCapabilities;
  propertyMapping: PropertyMapping[];
  limitations: FormatLimitation[];
  transformation: TransformationRule[];
  supportLevel: SupportLevel;
}

interface FormatCapabilities {
  // Supported features and operations
  readSupport: boolean;
  writeSupport: boolean;
  variantSupport: boolean;
  calculatedProperties: boolean;
  customProperties: boolean;
  compressionSupport: CompressionSupport;
  versioningSupport: VersioningSupport;
  encryptionSupport: EncryptionSupport;
}

interface PropertyMapping {
  // Property name and type conversions
  sourceProperty: string;
  targetProperty: string;
  conversionRule: ConversionRule;
  defaultValue?: any;
  required: boolean;
}
```

### Compression Models
```typescript
interface CompressionProfile {
  // Compression strategy and optimization
  algorithm: CompressionAlgorithm;
  level: CompressionLevel;
  strategy: CompressionStrategy;
  targetRatio: number;
  processingOverhead: number;
  memoryRequirement: number;
}

interface CompressionAnalysis {
  // Analysis of compression effectiveness
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  algorithm: CompressionAlgorithm;
  processingTime: number;
  memoryUsage: number;
  recommendations: CompressionOptimization[];
}
```

### Validation Models
```typescript
interface FormatValidationResult {
  // Complete validation result
  isValid: boolean;
  format: SerializationFormat;
  version: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  performance: ValidationPerformance;
  recommendations: ValidationRecommendation[];
}

interface ValidationError {
  // Detailed error information
  code: string;
  message: string;
  property?: string;
  expectedType?: string;
  actualType?: string;
  severity: ErrorSeverity;
  suggestion?: string;
  rule?: string;
}

interface ValidationWarning {
  // Non-critical validation issues
  code: string;
  message: string;
  property?: string;
  category: WarningCategory;
  suggestion?: string;
}
```

---

## Validation Rules

### Canonical Format Validation
- **Critical**: All required properties must be present with correct data types
- **Critical**: JSON structure must conform to schema specification exactly
- **Critical**: Calculated properties must be consistent with Phase 1-4 calculations
- **Major**: Optional properties must have valid values or appropriate defaults
- **Minor**: Warnings should be provided for missing or incomplete data

### External Format Validation
- **Critical**: Transformation rules must preserve all essential unit properties
- **Critical**: Format compatibility must be validated against target tool specifications
- **Major**: Property mapping must handle type conversions correctly
- **Major**: Lossy transformations must be clearly documented
- **Minor**: Optimization settings should be appropriate for use case

### Compression Validation
- **Critical**: Compression must be lossless for all critical unit data
- **Critical**: Decompression must reproduce original data exactly
- **Major**: Compression ratios must be achieved with reasonable processing overhead
- **Minor**: Compression metadata must be accurate and complete

### Error Handling Validation
- **Critical**: All validation errors must be categorized and provide actionable feedback
- **Critical**: Error recovery must preserve data integrity and provide correction options
- **Major**: Partial data must be handled gracefully with clear warnings
- **Minor**: Performance metrics must be provided for optimization guidance

---

## Error Handling

### Critical Errors
- JSON syntax errors or structural violations
- Invalid data types or value ranges
- Missing required properties for unit functionality
- Compression/decompression failures with data loss

### Major Errors
- Unsupported external format versions or capabilities
- Property mapping failures between formats
- Excessive compression overhead or memory usage
- Schema version compatibility failures

### Minor Errors
- Missing optional properties or metadata
- Non-optimal compression settings or strategies
- Performance warnings for large data operations
- Formatting inconsistencies in custom properties

### Recovery Mechanisms
- Fallback to canonical format when external format fails
- Default value insertion for missing optional properties
- Progressive property loading for large datasets
- Automatic data repair for common validation errors
- Graceful degradation for unsupported or partial data

---

## Performance Requirements

### Serialization Performance
- Unit serialization: < 50ms for standard configurations
- Large unit serialization: < 500ms for complex equipment
- Compression processing: < 200ms for standard datasets
- Format transformation: < 100ms for external tool compatibility

### Memory Usage
- Canonical format data: < 200KB per unit in memory
- Compression working buffer: < 100KB for standard operations
- Format transformation mapping: < 50KB for all supported formats
- Validation schema storage: < 25KB for complete validation rules

### Caching Strategy
- Cache serialization results for identical unit configurations
- Cache compression profiles for common equipment patterns
- Cache format transformation rules for external tool compatibility
- Cache validation results for repeated data operations
- Optimize memory usage for large batch operations

---

## Testing Requirements

### Unit Tests
- Canonical format serialization accuracy for all unit types
- External format transformation completeness for supported tools
- Compression algorithm correctness and lossless verification
- Schema validation rule compliance and error reporting
- Version compatibility and migration pathway accuracy

### Integration Tests
- Integration with Unit Entity Model for data consistency
- Compatibility with Phase 1-4 calculation systems
- External tool format export/import validation
- Compression performance under real-world usage scenarios
- Error handling and recovery mechanism effectiveness

### Performance Tests
- Serialization performance with large and complex unit configurations
- Memory usage optimization for batch operations
- Network transmission efficiency with compression
- Compression/decompression speed comparison across algorithms
- Scalability testing with concurrent serialization operations

### Scenario Tests
- Complete unit lifecycle from creation to external format export
- Format negotiation between different OpenSpec versions
- Custom property handling with various extension scenarios
- Error recovery and data repair in real-world situations
- Cross-platform compatibility and format transformation accuracy

---

## Examples

### Example 1: Standard BattleMech Serialization
**GIVEN** a 70-ton Inner Sphere BattleMech with:
- Standard equipment loadout
- Complete calculated properties (BV, tech rating, heat management)
- No custom extensions

**WHEN** serializing to canonical format

**THEN** JSON structure should be:
```json
{
  "format": "openspec-unit-v1",
  "version": "1.0.0",
  "schema": "unit-entity-v1",
  "unit": {
    "id": "mech-abc-123",
    "name": "Atlas AS7-D",
    "type": "BATTLEMECH",
    "techBase": "INNER_SPHERE",
    "physical": {
      "tonnage": 70,
      "battleValue": 1847,
      "techRating": "C",
      "rulesLevel": "STANDARD"
    },
    "equipment": [
      {
        "id": "medium-laser-1",
        "type": "weapon",
        "installed": true
      }
    ],
    "validation": {
      "isValid": true,
      "errors": [],
      "warnings": []
    }
  }
}
```

### Example 2: Custom Property Serialization
**GIVEN** a Clan OmniMech with:
- Standard configuration plus experimental targeting system
- Custom weapons configurations
- Performance optimizations

**WHEN** serializing with custom properties

**THEN** JSON structure should include:
```json
{
  "unit": {
    "customProperties": [
      {
        "name": "targetingComputer",
        "type": "object",
        "value": {
          "type": "advanced",
          "rangeBonus": 2,
          "antimissileSupport": true
        }
      }
    ]
  },
  "extensions": {
    "id": "omni-configurator",
    "version": "1.0",
    "properties": ["targetingComputer", "weaponGroupings"]
  }
}
```

### Example 3: External Format Export
**GIVEN** canonical unit data
**WHEN** exporting to MegaMekLab format

**THEN** transformation should:
```typescript
// Map OpenSpec calculated properties to MegaMekLab equivalents
const megemekMap = {
  'battleValue': openSpecUnit.calculated.battleValue.total,
  'techLevel': mapOpenSpecTechToMML(openSpecUnit.physical.techRating),
  'heatSinks': calculateMMLHeatSinks(openSpecUnit.physical.heatManagement)
};

// Transform equipment list to MML format
const mmlEquipment = openSpecUnit.equipment.weapons.map(weapon =>
  convertWeaponToMML(weapon)
);
```

### Example 4: Compression Optimization
**GIVEN** a unit with large equipment list
**WHEN** applying structure-aware compression

**THEN** compression should:
```typescript
// Analyze repetitive patterns
const compressionProfile = analyzeCompressionPatterns(unit);

// Apply optimal strategy
const options = {
  algorithm: CompressionAlgorithm.STRUCTURE_AWARE,
  strategy: CompressionStrategy.PATTERN_RECOGNITION,
  level: CompressionLevel.BALANCED
};

// Achieve 40% reduction in size with minimal quality loss
const result = await compressionManager.compress(data, options);
```

### Example 5: Version Compatibility
**GIVEN** unit data from OpenSpec v1.0
**WHEN** importing into system expecting v1.1

**THEN** migration should:
```typescript
// Detect version incompatibility
if (data.schemaVersion < "1.1") {
  // Apply migration rules
  const migratedUnit = applyV1ToV1Migration(entity);

  return {
    entity: migratedUnit,
    warnings: [
      {
        code: "SCHEMA_VERSION_DEPRECATED",
        message: "Upgrading from schema v1.0 to v1.1",
        suggestion: "Review migration notes for new properties"
      }
    ]
  };
}
```

---

## Implementation Notes

### Integration with Existing Systems
Serialization & Formats integrates with:
- **Unit Entity Model**: Provides the canonical data structure for serialization
- **Phase 1-4 Calculations**: Supplies calculated properties for persistence
- **Equipment Database**: Provides component and equipment definitions
- **Validation Framework**: Supplies validation rules and error handling
- **Critical Slot System**: Provides component composition for serialization

### External Tool Support
Supported external formats and their capabilities:
- **MegaMekLab (.mml)**: Complete unit export with calculated properties
- **HeavyMetal (.hmme)**: Unit configuration with limited calculated properties
- **MML (.mml)**: Multi-unit and variant configuration support
- **Custom Formats**: Extensible framework for specialized requirements

### Data Sources
Format specifications and transformation rules based on:
- Official BattleTech record sheets and construction rules
- External tool documentation and format specifications
- Community format standards and compatibility matrices
- Equipment database specifications and property definitions
- Compression algorithm standards and optimization guidelines

### Tech Base Considerations
- **Inner Sphere**: Standard format support with basic compression
- **Clan**: Enhanced format support with advanced optimization
- **Mixed**: Dual format compatibility with proper transformation
- **Experimental**: Progressive feature support with version negotiation

### Performance Optimizations
- Lazy loading for large equipment lists
- Streaming serialization for memory efficiency
- Progressive compression with quality levels
- Caching of transformation rules and format mappings
- Batch processing for multiple unit operations

---

## Version History

**v1.0 (2025-11-28)**: Initial specification draft
- Complete canonical format definition
- External format compatibility framework
- Compression and optimization strategies
- Comprehensive validation rules and error handling
- Extensible architecture for custom properties and formats