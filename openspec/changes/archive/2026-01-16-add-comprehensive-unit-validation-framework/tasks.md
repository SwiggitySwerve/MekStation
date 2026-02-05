# Tasks: Add Comprehensive Unit Validation Framework

## 1. Framework Infrastructure

- [x] 1.1 Create `src/types/validation/UnitValidationInterfaces.ts` with:
  - IValidationContext interface
  - IUnitValidationRule interface (extends IValidationRuleDefinition)
  - IValidationRuleResult interface
  - UnitCategory enum (MECH, VEHICLE, AEROSPACE, PERSONNEL)
- [x] 1.2 Create `src/services/validation/UnitValidationRegistry.ts` with:
  - Universal rules map
  - Category rules map (keyed by UnitCategory)
  - Unit-type rules map (keyed by UnitType)
  - `getRulesForUnitType(unitType)` method
  - `resolveInheritance(rules)` method
  - Rule caching per unit type
- [x] 1.3 Create `src/services/validation/UnitValidationOrchestrator.ts` with:
  - `validate(unit, context)` method
  - Priority-based rule execution
  - Result aggregation
  - Max errors truncation
  - Skip rules handling
- [x] 1.4 Create `src/utils/validation/UnitCategoryMapper.ts` with:
  - `getCategoryForUnitType(unitType)` function
  - Category constants

## 2. Universal Validation Rules

- [x] 2.1 Create `src/services/validation/rules/universal/` directory
- [x] 2.2 Implement VAL-UNIV-001 through VAL-UNIV-006 (entity validation):
  - EntityIdRequired rule
  - EntityNameRequired rule
  - ValidUnitType rule
  - TechBaseRequired rule
  - RulesLevelRequired rule
  - IntroductionYearValid rule
- [x] 2.3 Implement VAL-UNIV-007 through VAL-UNIV-010 (property validation):
  - TemporalConsistency rule
  - WeightNonNegative rule
  - CostNonNegative rule
  - BattleValueNonNegative rule
- [x] 2.4 Implement VAL-UNIV-011 and VAL-UNIV-012 (contextual validation):
  - EraAvailability rule
  - RulesLevelCompliance rule
- [x] 2.5 Register all universal rules with registry

## 3. Mech Category Rules

- [x] 3.1 Create `src/services/validation/rules/mech/` directory
- [x] 3.2 Implement VAL-MECH-001 through VAL-MECH-004 (required components):
  - MechEngineRequired rule
  - MechGyroRequired rule (with ProtoMech exception)
  - MechCockpitRequired rule
  - MechStructureRequired rule
- [x] 3.3 Implement VAL-MECH-005 through VAL-MECH-007 (construction):
  - MechMinimumHeatSinks rule (BattleMech/OmniMech only)
  - MechExactWeightMatch rule
  - MechCriticalSlotLimits rule
- [x] 3.4 Register all mech category rules with registry

## 4. Vehicle Category Rules

- [x] 4.1 Create `src/services/validation/rules/vehicle/` directory
- [x] 4.2 Implement VAL-VEH-001 through VAL-VEH-005:
  - VehicleEngineRequired rule
  - VehicleMotiveSystemRequired rule
  - VehicleTurretCapacity rule
  - VTOLRotorRequired rule
  - VehicleTonnageRange rule
- [x] 4.3 Register all vehicle category rules with registry

## 5. Aerospace Category Rules

- [x] 5.1 Create `src/services/validation/rules/aerospace/` directory
- [x] 5.2 Implement VAL-AERO-001 through VAL-AERO-004:
  - AeroEngineRequired rule
  - AeroThrustRatingValid rule
  - AeroStructuralIntegrityRequired rule
  - AeroFuelCapacityValid rule
- [x] 5.3 Register all aerospace category rules with registry

## 6. Personnel Category Rules

- [x] 6.1 Create `src/services/validation/rules/personnel/` directory
- [x] 6.2 Implement VAL-PERS-001 through VAL-PERS-003:
  - PersonnelSquadSizeValid rule
  - BattleArmorWeightRange rule
  - InfantryPrimaryWeaponRequired rule
- [x] 6.3 Register all personnel category rules with registry

## 7. BattleMech-Specific Rules Integration

- [x] 7.1 Analyze existing `validation-rules-master` 89 rules
- [x] 7.2 Create `src/services/validation/rules/battlemech/` directory
- [x] 7.3 Migrate BattleMech-specific rules from ValidationService:
  - Weight validation rules (VAL-WEIGHT-\*)
  - Slot validation rules (VAL-SLOT-\*)
  - Structural validation rules (VAL-STRUCT-\*)
  - Component requirement rules (VAL-COMP-\*)
  - Construction sequence rules (VAL-SEQ-\*)
  - Placement validation rules (VAL-PLACE-\*)
- [x] 7.4 Register BattleMech rules as unit-type-specific layer
- [x] 7.5 Mark appropriate rules as overriding/extending category rules

## 8. Service Integration

- [x] 8.1 Update `ValidationService` to use UnitValidationOrchestrator
- [x] 8.2 Maintain backward compatibility for existing `validate()` calls
- [x] 8.3 Add `validateUnit(unit, context)` method for generic unit validation
- [x] 8.4 Update ValidationRuleRegistry to integrate with UnitValidationRegistry

## 9. Testing

- [ ] 9.1 Unit tests for UnitValidationRegistry
- [ ] 9.2 Unit tests for UnitValidationOrchestrator
- [ ] 9.3 Unit tests for all universal rules (VAL-UNIV-\*)
- [ ] 9.4 Unit tests for mech category rules (VAL-MECH-\*)
- [ ] 9.5 Unit tests for rule inheritance (override/extend)
- [ ] 9.6 Integration tests for BattleMech validation (regression)
- [ ] 9.7 Integration tests for Vehicle validation (new)
- [ ] 9.8 Integration tests for Aerospace validation (new)
- [ ] 9.9 Integration tests for Personnel validation (new)

## 10. Documentation

- [ ] 10.1 Update `validation-rules-master` spec to reference framework
- [ ] 10.2 Add JSDoc comments to all new interfaces and classes
- [ ] 10.3 Create rule reference table in codebase (rules-reference.md)

## 11. UI Integration

- [x] 11.1 Create `src/hooks/useUnitValidation.ts` with:
  - React hook connecting UnitValidationOrchestrator to UI
  - Read unit state from Zustand store (useUnitStore)
  - Convert store state to IValidatableUnit format
  - Run validation and return UI-friendly results
  - Auto-initialize validation rules on first use
  - Memoized validation to avoid unnecessary re-runs
- [x] 11.2 Update `UnitEditorWithRouting.tsx` to use useUnitValidation:
  - Import and call useUnitValidation hook
  - Replace hardcoded `validationStatus: 'valid'` with live results
  - Wire validation.status, validation.errorCount, validation.warningCount to UnitStats
- [x] 11.3 ValidationBadge displays real-time validation status in UnitInfoBanner

## Dependencies

- Tasks 2-6 depend on Task 1 (framework infrastructure)
- Task 7 depends on Tasks 1-3 (framework + mech category)
- Task 8 depends on Tasks 1-7 (all rules implemented)
- Task 9 can start after Task 1, expanded as rules are added
- Task 10 can be done in parallel with implementation
- Task 11 depends on Tasks 1-6 (framework + all category rules)

## Parallelizable Work

- Tasks 3, 4, 5, 6 can be implemented in parallel after Task 2
- Testing tasks can run in parallel with remaining implementation
- Documentation can proceed alongside implementation
- Task 11 (UI integration) can proceed after Tasks 1-6
