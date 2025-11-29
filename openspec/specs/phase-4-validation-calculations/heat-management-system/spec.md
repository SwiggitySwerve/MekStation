# Heat Management System Specification

**Status**: Draft
**Version**: 1.0
**Last Updated**: 2025-11-28
**Dependencies**: Phase 1-3 specifications (Core Entity Types, Construction Systems, Equipment Systems)
**Affects**: Construction Rules Core, Validation System, Unit Entity Model

---

## Overview

### Purpose
The Heat Management system calculates, validates, and analyzes heat generation and dissipation for BattleTech units, ensuring proper thermal balance and combat effectiveness assessment.

### Scope
**In Scope:**
- Heat generation calculations from weapons, equipment, and movement
- Heat dissipation calculations for all heat sink types
- Engine heat sink integration and compatibility
- Heat scale effects and penalties
- Heat efficiency analysis and optimization
- Environmental heat modifiers
- Technology base heat management differences

**Out of Scope:**
- Battle value heat adjustments (handled by Battle Value System)
- Heat-related critical hits (handled by Critical Hit System)
- Scenario-specific heat rules
- Advanced thermal management equipment (plasma reactors, etc.)

### Key Concepts
- **Heat Generation**: Total heat produced by weapons, equipment, and movement
- **Heat Dissipation**: Total heat removal capacity from all heat sinks
- **Heat Balance**: Net heat gain or loss (generation - dissipation)
- **Heat Scale**: Progressive penalties and risks at different heat levels
- **Heat Efficiency**: Measurement of sustainable vs. maximum heat output
- **Engine Heat Sinks**: Free heat sinks provided by fusion engines
- **External Heat Sinks**: Additional heat sinks beyond engine capacity
- **Technology Base Compatibility**: Heat sink types compatible with different tech bases

---

## Requirements

### Requirement: Calculate Heat Generation
The system SHALL calculate total heat generation from all sources including weapons, equipment, and movement.

**Rationale**: Accurate heat generation calculations are essential for heat balance validation and combat effectiveness assessment.

**Priority**: Critical

#### Scenario: Weapon heat generation calculation
**GIVEN** a unit equipped with weapons with defined heat values
**WHEN** calculating total heat generation
**THEN** sum heat values from all weapons based on their fire modes
**AND** include weapon-specific heat modifiers (pulse, ultra, etc.)
**AND** account for ammunition-based weapon heat patterns

#### Scenario: Equipment heat generation calculation
**GIVEN** a unit with electronic equipment (ECM, Active Probe, etc.)
**WHEN** calculating total heat generation
**THEN** add continuous heat generation from active equipment
**AND** include activation-based heat from special equipment
**AND** account for equipment interaction heat effects

#### Scenario: Movement heat calculation
**GIVEN** a unit with specified movement capabilities
**WHEN** calculating movement heat
**THEN** calculate walking heat based on tonnage
**AND** add running heat (walking + 1 heat per 5 MP over walk)
**AND** calculate jumping heat (1 heat per hex jumped)
**AND** include jump jet activation heat if applicable

#### Scenario: Environmental heat modifiers
**GIVEN** specific environmental conditions (temperature, atmosphere)
**WHEN** calculating heat generation
**THEN** apply environmental heat modifiers
**AND** adjust for extreme temperature effects
**AND** include atmospheric pressure heat adjustments

### Requirement: Calculate Heat Dissipation
The system SHALL calculate total heat dissipation capacity from engine and external heat sinks.

**Rationale**: Heat dissipation capacity determines a unit's ability to sustain combat operations and manage thermal load.

**Priority**: Critical

#### Scenario: Engine heat sink calculation
**GIVEN** a fusion engine with specified rating
**WHEN** calculating engine heat sinks
**THEN** calculate free heat sinks as engine rating / 25
**AND** limit engine heat sinks to maximum of 10
**AND** handle partial heat sinks for engines under 250 rating

#### Scenario: External heat sink calculation
**GIVEN** additional heat sinks beyond engine capacity
**WHEN** calculating external heat dissipation
**THEN** sum heat dissipation from all external heat sinks
**AND** apply type-specific dissipation values (Single/Double/Compact/Laser)
**AND** account for technology base compatibility

#### Scenario: Heat sink type validation
**GIVEN** specific heat sink types installed
**WHEN** validating heat sink configuration
**THEN** ensure compatibility with engine type
**AND** validate technology base restrictions
**AND** check critical slot capacity requirements
**AND** verify weight distribution and tonnage limits

#### Scenario: Double heat sink effectiveness
**GIVEN** double heat sinks in the configuration
**WHEN** calculating heat dissipation
**THEN** apply 2x dissipation for Inner Sphere double heat sinks
**AND** apply 2x dissipation for Clan double heat sinks
**AND** account for different critical slot requirements
**AND** handle mixed technology base configurations

### Requirement: Apply Heat Scale Effects
The system SHALL apply progressive penalties and risks at different heat levels according to BattleTech rules.

**Rationale**: Heat scale effects directly impact combat performance and represent critical tactical considerations.

**Priority**: High

#### Scenario: Movement penalty calculation
**GIVEN** a unit at specific heat level
**WHEN** applying heat scale effects
**THEN** apply +1 to-hit modifier at 8+ heat
**AND** apply +2 to-hit modifier at 17+ heat
**AND** apply +3 to-hit modifier at 25+ heat
**AND** include all cumulative movement penalties

#### Scenario: Ammunition explosion risk
**GIVEN** a unit with ammunition at critical heat levels
**WHEN** assessing ammunition explosion risk
**THEN** calculate explosion probability at 14+ heat (2+ on 2d6)
**AND** increase explosion probability at 19+ heat (3+ on 2d6)
**AND** apply CASE protection effects where applicable
**AND** calculate explosion radius and damage effects

#### Scenario: Automatic shutdown calculation
**GIVEN** a unit approaching critical heat levels
**WHEN** calculating shutdown risk
**THEN** trigger automatic shutdown at 30+ heat
**AND** calculate shutdown probability at 25+ heat (4+ on 2d6)
**AND** include pilot skill modifiers for shutdown avoidance
**AND** account for additional heat during shutdown sequence

#### Scenario: Engine damage from heat
**GIVEN** extreme heat conditions
**WHEN** calculating engine damage risk
**THEN** apply engine damage at 35+ heat (5+ on 2d6)
**AND** calculate damage severity based on heat level
**AND** include cumulative engine damage effects
**AND** handle engine destruction scenarios

### Requirement: Analyze Heat Efficiency
The system SHALL analyze heat efficiency and provide recommendations for optimal thermal management.

**Rationale**: Heat efficiency analysis helps players optimize weapon selection and firing patterns for sustained combat effectiveness.

**Priority**: High

#### Scenario: Sustainable fire pattern calculation
**GIVEN** a unit's weapon loadout and heat dissipation
**WHEN** calculating sustainable fire patterns
**THEN** identify combinations that can be fired continuously
**AND** calculate maximum sustainable heat output
**AND** recommend optimal weapon groupings
**AND** account for ammunition constraints

#### Scenario: Alpha strike capacity analysis
**GIVEN** all weapons on a unit
**WHEN** analyzing alpha strike capacity
**THEN** calculate total heat from all weapons firing
**AND** compare against total heat dissipation
**AND** determine heat recovery time requirements
**AND** assess tactical viability of alpha strikes

#### Scenario: Heat balance optimization
**GIVEN** a unit configuration with heat management issues
**WHEN** optimizing heat balance
**THEN** identify primary heat generation sources
**AND** recommend heat sink upgrades or additions
**AND** suggest weapon firing sequence optimizations
**AND** provide alternative loadout recommendations

#### Scenario: Technology base heat efficiency comparison
**GIVEN** equivalent units from different technology bases
**WHEN** comparing heat efficiency
**THEN** analyze Clan vs Inner Sphere heat management differences
**AND** calculate efficiency advantages/disadvantages
**AND** assess technology trade-offs for heat capacity
**AND** provide technology-specific optimization recommendations

### Requirement: Validate Heat Management Compliance
The system SHALL validate that heat management configurations comply with construction rules and technology restrictions.

**Rationale**: Compliance validation ensures units follow official BattleTech construction rules and maintain game balance.

**Priority**: Critical

#### Scenario: Minimum heat sink validation
**GIVEN** a unit with specific engine and equipment
**WHEN** validating minimum heat sink requirements
**THEN** calculate required heat sinks for engine rating
**AND** add heat sinks for heat-generating equipment
**AND** ensure total heat sinks meet or exceed minimum requirements
**AND** flag violations with specific remediation requirements

#### Scenario: Heat sink placement validation
**GIVEN** a unit's critical slot configuration
**WHEN** validating heat sink placement
**THEN** verify critical slot availability for heat sink types
**AND** validate engine heat sink capacity utilization
**AND** check for placement restrictions and limitations
**AND** ensure heat sink accessibility for damage assessment

#### Scenario: Technology base compatibility validation
**GIVEN** mixed technology base heat sink configurations
**WHEN** validating technology base compliance
**THEN** ensure heat sink types match unit technology base
**AND** handle Inner Sphere/Clan mixed configurations
**AND** apply appropriate technology level restrictions
**AND** validate era-appropriate heat sink availability

#### Scenario: Weight and tonnage validation
**GIVEN** a unit's heat sink configuration
**WHEN** validating weight distribution
**THEN** calculate total weight of all heat sinks
**AND** verify against available tonnage capacity
**AND** check for critical slot weight distribution issues
**AND** validate heat sink weight allocation efficiency

---

## Interface Definitions

### Heat Generation Interface
```typescript
interface HeatGenerationCalculator {
  calculateWeaponHeat(weapons: Weapon[], fireMode?: string): number;
  calculateEquipmentHeat(equipment: Equipment[], activeSystems: string[]): number;
  calculateMovementHeat(config: UnitConfiguration, movementType: 'walk' | 'run' | 'jump'): number;
  calculateEnvironmentalHeat(environment: EnvironmentalConditions): number;
  getTotalHeatGeneration(config: UnitConfiguration, equipment: Equipment[],
                          movementType: string, environment: EnvironmentalConditions): number;
}
```

### Heat Dissipation Interface
```typescript
interface HeatDissipationCalculator {
  calculateEngineHeatSinks(engine: Engine): number;
  calculateExternalHeatSinks(heatSinks: HeatSink[]): number;
  calculateTotalDissipation(engine: Engine, externalHeatSinks: HeatSink[]): HeatDissipation;
  validateHeatSinkCompatibility(engine: Engine, heatSinks: HeatSink[]): HeatCompatibilityResult;
  analyzeHeatSinkEfficiency(engine: Engine, externalHeatSinks: HeatSink[]): HeatEfficiencyAnalysis;
}
```

### Heat Scale Interface
```typescript
interface HeatScaleCalculator {
  calculateMovementPenalties(heatLevel: number): MovementPenalty[];
  calculateAmmunitionExplosionRisk(heatLevel: number, hasAmmo: boolean): ExplosionRisk;
  calculateShutdownRisk(heatLevel: number, pilotSkill: number): ShutdownRisk;
  calculateEngineDamageRisk(heatLevel: number): EngineDamageRisk;
  applyHeatScaleEffects(heatLevel: number, unit: Unit): HeatScaleEffects;
}
```

### Heat Analysis Interface
```typescript
interface HeatEfficiencyAnalyzer {
  calculateSustainableFirePatterns(weapons: Weapon[], dissipation: number): FirePattern[];
  analyzeAlphaStrikeCapacity(weapons: Weapon[], dissipation: number): AlphaStrikeAnalysis;
  optimizeHeatBalance(config: UnitConfiguration): HeatOptimizationRecommendations;
  compareTechnologyEfficiency(units: Unit[]): TechnologyEfficiencyComparison;
  generateHeatReport(config: UnitConfiguration): HeatEfficiencyReport;
}
```

### Validation Interface
```typescript
interface HeatManagementValidator {
  validateMinimumHeatSinks(config: UnitConfiguration): HeatSinkValidationResult;
  validateHeatSinkPlacement(config: UnitConfiguration): PlacementValidationResult;
  validateTechnologyBaseCompatibility(config: UnitConfiguration): TechBaseValidationResult;
  validateWeightAndTonnage(config: UnitConfiguration): TonnageValidationResult;
  performCompleteHeatValidation(config: UnitConfiguration): HeatValidationResult;
}
```

---

## Data Models

### Heat Generation Models
```typescript
interface HeatGenerationProfile {
  total: number;
  weapons: number;
  equipment: number;
  movement: number;
  environmental: number;
  breakdown: {
    byWeapon: WeaponHeatBreakdown[];
    byEquipment: EquipmentHeatBreakdown[];
    byMovement: MovementHeatBreakdown[];
  };
}

interface WeaponHeatBreakdown {
  weaponId: string;
  weaponName: string;
  baseHeat: number;
  modeModifiers: number;
  totalHeat: number;
}

interface EquipmentHeatBreakdown {
  equipmentId: string;
  equipmentName: string;
  continuousHeat: number;
  activationHeat: number;
  totalHeat: number;
}
```

### Heat Dissipation Models
```typescript
interface HeatDissipationProfile {
  total: number;
  engine: EngineHeatSinks;
  external: ExternalHeatSinks;
  efficiency: number;
  capacity: {
    current: number;
    maximum: number;
    utilization: number;
  };
}

interface EngineHeatSinks {
  count: number;
  type: HeatSinkType;
  dissipation: number;
  freeFromEngine: number;
  additionalCapacity: number;
}

interface ExternalHeatSinks {
  byType: Record<HeatSinkType, ExternalHeatSinkGroup>;
  totalWeight: number;
  totalCriticalSlots: number;
  efficiency: number;
}
```

### Heat Scale Models
```typescript
interface HeatScaleProfile {
  currentHeat: number;
  movementPenalties: MovementPenalty[];
  ammunitionExplosionRisk: ExplosionRisk;
  shutdownRisk: ShutdownRisk;
  engineDamageRisk: EngineDamageRisk;
  criticalThresholds: {
    movementPenalty: number;
    ammoExplosion: number;
    shutdown: number;
    engineDamage: number;
  };
}

interface MovementPenalty {
  threshold: number;
  modifier: number;
  type: 'to_hit' | 'piloting' | 'physical_attack';
  description: string;
}

interface ExplosionRisk {
  threshold: number;
  probability: number;
  rollRequired: string;
  caseProtection: boolean;
  affectedAmmoLocations: string[];
}
```

---

## Validation Rules

### Heat Generation Validation
- **Critical**: Total heat generation must not exceed equipment specifications
- **Critical**: Movement heat calculations must follow tonnage-based formulas
- **Major**: Environmental modifiers must be applied correctly
- **Minor**: Heat generation breakdown must be accurate and complete

### Heat Dissipation Validation
- **Critical**: Engine heat sink calculations must follow official BattleTech rules
- **Critical**: Heat sink capacity cannot exceed critical slot limitations
- **Major**: Heat sink type compatibility must be validated
- **Minor**: Heat efficiency calculations must be accurate

### Heat Scale Validation
- **Critical**: Movement penalties must match official BattleTech tables
- **Critical**: Ammunition explosion probabilities must use correct dice rolls
- **Major**: Shutdown and engine damage risks must be calculated accurately
- **Minor: Penalty descriptions must be clear and descriptive

### Efficiency Analysis Validation
- **Major**: Sustainable fire pattern calculations must be mathematically correct
- **Major**: Alpha strike analysis must account for all heat sources
- **Minor**: Optimization recommendations must be practical and achievable
- **Minor**: Technology base comparisons must be fair and balanced

---

## Error Handling

### Critical Errors
- Heat generation exceeds maximum possible values
- Heat dissipation calculation fails due to invalid configuration
- Engine heat sink calculation errors
- Critical memory or performance issues during calculation

### Major Errors
- Heat sink type incompatibility detected
- Heat scale calculation inconsistencies
- Efficiency analysis calculation failures
- Data integrity issues in heat profiles

### Minor Errors
- Rounding precision issues in calculations
- Missing data for optional heat components
- Warnings for suboptimal heat configurations
- Deprecated equipment heat values

### Recovery Mechanisms
- Fallback to default heat sink calculations
- Conservative heat generation estimates
- Graceful degradation for missing environmental data
- Automatic correction for minor data inconsistencies

---

## Performance Requirements

### Calculation Performance
- Heat generation calculations: < 10ms for standard unit configurations
- Heat dissipation calculations: < 5ms for typical heat sink configurations
- Heat scale effects: < 2ms for immediate application
- Efficiency analysis: < 50ms for comprehensive analysis

### Memory Usage
- Heat generation profiles: < 100KB per unit
- Heat dissipation data: < 50KB per unit
- Heat scale calculations: < 10KB per unit
- Efficiency analysis results: < 200KB per unit

### Caching Strategy
- Cache heat generation calculations for identical equipment configurations
- Cache heat dissipation results for common heat sink setups
- Cache efficiency analysis for repeated unit comparisons
- Cache environmental heat modifiers for standard conditions

---

## Testing Requirements

### Unit Tests
- Heat generation calculation accuracy for all weapon types
- Heat dissipation calculation for all heat sink combinations
- Heat scale effect application for all heat levels
- Efficiency analysis algorithm correctness

### Integration Tests
- Heat management system integration with validation framework
- Construction calculator integration for heat-related checks
- Equipment database integration for heat data consistency
- Critical slot system integration for heat sink placement

### Performance Tests
- Heat calculation performance under heavy load
- Memory usage optimization for large unit databases
- Caching effectiveness for repeated calculations
- Concurrent heat validation for multiple units

### Scenario Tests
- Standard BattleMech heat management scenarios
- Extreme heat situation handling
- Mixed technology base heat configurations
- Environmental heat condition variations

---

## Examples

### Example 1: Standard BattleMech Heat Balance
**GIVEN** a 70-ton Inner Sphere BattleMech with:
- Engine: 280 Fusion (11 free heat sinks)
- External: 9 double heat sinks
- Weapons: PPC (10 heat), Medium Laser (3 heat), LRM-15 (4 heat)
- Equipment: ECM (0 heat), Active Probe (2 heat)

**WHEN** calculating heat balance

**THEN** results should be:
- **Total Heat Dissipation**: 31 (11 engine × 1 + 20 external × 2)
- **Maximum Heat Generation**: 17 (10 + 3 + 4)
- **Heat Balance**: +14 surplus
- **Movement Penalties**: None at normal heat levels
- **Efficiency Rating**: 85% (excellent heat management)

### Example 2: Alpha Strike Heat Analysis
**GIVEN** the same BattleMech firing all weapons simultaneously

**WHEN** analyzing alpha strike capacity

**THEN** results should be:
- **Alpha Strike Heat**: 17 (all weapons + 2 for equipment)
- **Heat Deficit**: -14 (17 - 31 dissipation capacity)
- **Recovery Time**: 1 turn to cool to safe levels
- **Tactical Viability**: Sustainable for continuous combat

### Example 3: Heat Scale Emergency
**GIVEN** the BattleMech at 28 heat due to damage and sustained fire

**WHEN** applying heat scale effects

**THEN** results should be:
- **Movement Penalty**: +3 to-hit modifier
- **Shutdown Risk**: 50% (4+ on 2d6)
- **Ammunition Explosion Risk**: 83% (5+ on 2d6)
- **Engine Damage Risk**: 28% (4+ on 2d6)
- **Tactical Recommendations**: Cease fire, seek cover, emergency cooling

### Example 4: Technology Base Comparison
**GIVEN** equivalent 55-ton Inner Sphere and Clan BattleMechs

**WHEN** comparing heat efficiency

**THEN** results should be:
- **Inner Sphere**: 25 heat dissipation, less efficient heat sinks
- **Clan**: 26 heat dissipation, more efficient heat sink placement
- **Efficiency Advantage**: Clan +4% heat efficiency
- **Tactical Impact**: Clan can maintain higher sustained fire rates

---

## Implementation Notes

### Integration with Existing Systems
The Heat Management system integrates with:
- **ValidationManager**: Extended to include heat validation
- **IHeatValidator**: Implementation of heat validation interface
- **HeatRulesValidator**: Existing heat rule validation service
- **BattleTechConstructionCalculator**: Tonnage and slot integration
- **EquipmentDatabase**: Heat generation data source

### Data Sources
Heat generation and dissipation data sourced from:
- Official BattleTech Master Rules
- Technical Readout publications
- Era-specific equipment databases
- Environmental condition tables
- Technology base specifications

### Compatibility Considerations
- Backward compatible with existing validation framework
- Technology base neutral where possible
- Era-aware for equipment availability
- Extensible for future heat management technologies
- Performance optimized for real-time validation

---

## Version History

**v1.0 (2025-11-28)**: Initial specification draft
- Complete heat generation and dissipation requirements
- Heat scale effects and penalties
- Efficiency analysis framework
- Integration interface definitions
- Comprehensive examples and validation rules