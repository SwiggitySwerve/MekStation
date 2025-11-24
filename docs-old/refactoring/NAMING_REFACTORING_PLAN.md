# Naming Refactoring Implementation Plan

## 🎯 **Current Naming Issues**

Based on codebase analysis, we have identified **78 inconsistently named classes and interfaces** that violate our architectural standards. This document provides a systematic refactoring plan to achieve consistent naming and proper architectural separation.

---

## 🔍 **Identified Naming Violations**

### **1. Manager vs Service Confusion**
```typescript
// ❌ CURRENT: Managers doing business logic (should be Services)
class HeatManagementManager           // → HeatManagementService
class ArmorManagementManager          // → ArmorManagementService  
class WeightCalculationManager        // → WeightCalculationService
class ComponentConfigurationManager   // → ComponentConfigurationService
class ArmorConfigurationManager       // → ArmorConfigurationService
class WeightBalanceManager           // → WeightBalanceService
class SystemComponentsManager        // → SystemComponentsService
class SpecialComponentManager        // → SpecialComponentService
class SlotCalculationManager         // → SlotCalculationService
class SlotValidationManager          // → SlotValidationService
class CriticalSlotCalculationManager // → CriticalSlotCalculationService
class ConfigurationManager           // → ConfigurationService
class ComponentTypeManager           // → ComponentTypeService
class EquipmentAllocationManager     // → EquipmentAllocationService
class EquipmentQueryManager          // → EquipmentQueryService
class SlotAllocationManager          // → SlotAllocationService
class SectionManagementManager       // → SectionManagementService
class UnitCalculationManager         // → UnitCalculationService
class UnitSerializationManager       // → UnitSerializationService
class UnitStateManager               // → UnitStateService
class ValidationManager              // → ValidationService
class SpecialComponentsManager       // → SpecialComponentsService
```

### **2. Inconsistent Service Naming**
```typescript
// ❌ CURRENT: Unnecessary suffixes and version numbers
class WeightCalculationServiceImpl        // → WeightCalculationService
class WeightBalanceServiceImpl           // → WeightBalanceService
class WeightBalanceAnalysisServiceImpl   // → WeightBalanceAnalysisService
class WeightOptimizationServiceImpl      // → WeightOptimizationService
class SystemComponentServiceImpl         // → SystemComponentService
class UnitStateManagerImpl              // → UnitStateService
class EquipmentAllocationServiceImpl     // → EquipmentAllocationService

// Version numbers and "Refactored" suffixes
class UnitCriticalManagerRefactored      // → UnitCriticalSlotManager
class ValidationOrchestrationManagerRefactored // → ValidationOrchestrationManager
class EquipmentValidationServiceRefactored // → EquipmentValidationService
class WeaponValidationServiceRefactored  // → WeaponValidationService
class UnitCriticalManagerV2             // → UnitCriticalSlotManager
class UnitCriticalManagerV2Refactored   // → UnitCriticalSlotManager
```

### **3. Missing Interface Prefixes**
```typescript
// ❌ CURRENT: Interfaces without 'I' prefix
interface WeightBalanceService           // → IWeightBalanceService
interface WeightCalculationService       // → IWeightCalculationService
interface WeightOptimizationService      // → IWeightOptimizationService
interface WeightBalanceAnalysisService   // → IWeightBalanceAnalysisService
interface SystemComponentService         // → ISystemComponentService
interface UnitStateManager              // → IUnitStateManager
interface EquipmentAllocationService     // → IEquipmentAllocationService
interface ValidationServiceFactory      // → IValidationServiceFactory
interface ComponentFactory              // → IComponentFactory
interface OrchestratorFactory           // → IOrchestratorFactory
```

### **4. Incorrectly Named Managers**
```typescript
// ❌ CURRENT: These should remain as Managers (orchestration)
class UnitManager                 // ✅ CORRECT (orchestrates multiple services)
class TabManager                  // ✅ CORRECT (UI orchestration)
class EventManager                // ✅ CORRECT (event orchestration)
class MultiUnitStateService      // → MultiUnitStateManager (orchestrates state)
class UnitSynchronizationService // → UnitSynchronizationManager (orchestrates sync)
```

---

## 🏗️ **Refactoring Strategy**

### **Phase 1: Core Services (Week 1-2)**

#### **1.1 Weight & Balance Services**
```typescript
// File: battletech-editor-app/services/weight/
// BEFORE → AFTER
WeightCalculationServiceImpl     → WeightCalculationService
WeightBalanceServiceImpl         → WeightBalanceService  
WeightBalanceAnalysisServiceImpl → WeightBalanceAnalysisService
WeightOptimizationServiceImpl    → WeightOptimizationService
WeightCalculationManager         → WeightCalculationService
WeightBalanceManager             → WeightBalanceService

// Interfaces
WeightCalculationService         → IWeightCalculationService
WeightBalanceService             → IWeightBalanceService
WeightBalanceAnalysisService     → IWeightBalanceAnalysisService
WeightOptimizationService        → IWeightOptimizationService
```

#### **1.2 Validation Services**
```typescript
// File: services/validation/
// BEFORE → AFTER
ValidationOrchestrationManagerRefactored → ValidationOrchestrationManager
EquipmentValidationServiceRefactored     → EquipmentValidationService
WeaponValidationServiceRefactored        → WeaponValidationService
ValidationManager                        → ValidationService
EquipmentValidationManager               → EquipmentValidationService
ComponentValidationManager               → ComponentValidationService
ValidationReportingManager               → ValidationReportingService
RuleManagementManager                    → RuleManagementService
CalculationUtilitiesManager              → CalculationUtilitiesService
```

#### **1.3 Equipment Services**
```typescript
// File: services/equipment/
// BEFORE → AFTER
EquipmentAllocationServiceImpl   → EquipmentAllocationService
EquipmentAllocationManager       → EquipmentAllocationService
EquipmentQueryManager            → EquipmentQueryService
PlacementCalculationService      → ✅ CORRECT (already proper)

// Interfaces
EquipmentAllocationService       → IEquipmentAllocationService
```

### **Phase 2: Critical Slot Services (Week 3-4)**

#### **2.1 Critical Slot Management**
```typescript
// File: utils/criticalSlots/
// BEFORE → AFTER
UnitCriticalManagerRefactored        → UnitCriticalSlotManager
UnitCriticalManagerV2               → UnitCriticalSlotManager
UnitCriticalManagerV2Refactored     → UnitCriticalSlotManager
SlotCalculationManager              → SlotCalculationService
SlotValidationManager               → SlotValidationService
SlotAllocationManager               → SlotAllocationService
CriticalSlotCalculationManager      → CriticalSlotCalculationService
CriticalSlotsManagementService      → CriticalSlotsManagementService (✅ already correct)
```

#### **2.2 Component Management**
```typescript
// File: utils/criticalSlots/
// BEFORE → AFTER
ComponentConfigurationManager    → ComponentConfigurationService
ComponentTypeManager             → ComponentTypeService
SpecialComponentManager          → SpecialComponentService
SpecialComponentsManager         → SpecialComponentsService
SystemComponentsManager          → SystemComponentsService

// Interfaces
SystemComponentService           → ISystemComponentService
ComponentFactory                 → IComponentFactory
```

### **Phase 3: Unit Management Services (Week 5-6)**

#### **3.1 Unit State and Configuration**
```typescript
// File: utils/unit/
// BEFORE → AFTER
UnitStateManagerImpl            → UnitStateService
UnitStateManager                → UnitStateService
UnitCalculationManager          → UnitCalculationService
UnitSerializationManager        → UnitSerializationService
ConfigurationManager            → ConfigurationService

// Interfaces
UnitStateManager                → IUnitStateManager
IUnitManager                    → IUnitManager (✅ already correct)
```

#### **3.2 Heat and Armor Management**
```typescript
// File: utils/criticalSlots/
// BEFORE → AFTER
HeatManagementManager           → HeatManagementService
ArmorManagementManager          → ArmorManagementService
ArmorConfigurationManager       → ArmorConfigurationService
SectionManagementManager        → SectionManagementService
```

### **Phase 4: Orchestration Managers (Week 7-8)**

#### **4.1 True Managers (Orchestration)**
```typescript
// These should remain as Managers (they orchestrate services)
UnitManager                     → ✅ CORRECT (orchestrates unit services)
TabManager                      → ✅ CORRECT (orchestrates UI tabs)
EventManager                    → ✅ CORRECT (orchestrates events)

// These should become Managers (currently misnamed as Services)
MultiUnitStateService          → MultiUnitStateManager
UnitSynchronizationService     → UnitSynchronizationManager
```

#### **4.2 Factory Interfaces**
```typescript
// File: services/factories/
// BEFORE → AFTER
ValidationServiceFactory        → IValidationServiceFactory
ComponentFactory                → IComponentFactory
OrchestratorFactory            → IOrchestratorFactory
```

---

## 🔧 **Implementation Details**

### **File Renaming Matrix**

| Current File | New File | Type Change |
|-------------|----------|-------------|
| `HeatManagementManager.ts` | `HeatManagementService.ts` | Manager → Service |
| `ArmorManagementManager.ts` | `ArmorManagementService.ts` | Manager → Service |
| `WeightCalculationServiceImpl.ts` | `WeightCalculationService.ts` | Remove Impl suffix |
| `UnitCriticalManagerRefactored.ts` | `UnitCriticalSlotManager.ts` | Remove Refactored, clarify purpose |
| `ValidationOrchestrationManagerRefactored.ts` | `ValidationOrchestrationManager.ts` | Remove Refactored |
| `EquipmentValidationServiceRefactored.ts` | `EquipmentValidationService.ts` | Remove Refactored |

### **Interface Extraction**

#### **Services that need interfaces:**
```typescript
// 1. Weight Services
export interface IWeightCalculationService {
  calculateTotalWeight(unit: BattleUnit): number;
  calculateStructureWeight(unit: BattleUnit): number;
  calculateArmorWeight(unit: BattleUnit): number;
  calculateEquipmentWeight(unit: BattleUnit): number;
}

// 2. Heat Services  
export interface IHeatManagementService {
  calculateHeatGeneration(unit: BattleUnit): number;
  calculateHeatDissipation(unit: BattleUnit): number;
  validateHeatBalance(unit: BattleUnit): ValidationResult;
}

// 3. Armor Services
export interface IArmorManagementService {
  calculateMaxArmor(unit: BattleUnit): number;
  allocateArmor(unit: BattleUnit, allocation: ArmorAllocation): void;
  validateArmorAllocation(unit: BattleUnit): ValidationResult;
}

// 4. Critical Slot Services
export interface ICriticalSlotCalculationService {
  calculateSlotRequirements(equipment: Equipment[]): SlotRequirements;
  calculateAvailableSlots(unit: BattleUnit): AvailableSlots;
  validateSlotAllocation(unit: BattleUnit): ValidationResult;
}
```

### **Dependency Injection Updates**

#### **Before (Direct Instantiation):**
```typescript
class UnitConfigurationManager {
  private heatManager = new HeatManagementManager();
  private armorManager = new ArmorManagementManager();
  private weightManager = new WeightCalculationManager();
}
```

#### **After (Dependency Injection):**
```typescript
class UnitConfigurationManager {
  constructor(
    private readonly heatService: IHeatManagementService,
    private readonly armorService: IArmorManagementService,
    private readonly weightService: IWeightCalculationService
  ) {}
}
```

---

## 📋 **Migration Checklist**

### **Phase 1: Core Services**
- [ ] Rename weight calculation services
- [ ] Rename validation services  
- [ ] Rename equipment services
- [ ] Extract interfaces for services
- [ ] Update all imports
- [ ] Update tests

### **Phase 2: Critical Slot Services**
- [ ] Rename critical slot managers to services
- [ ] Rename component managers to services
- [ ] Extract interfaces
- [ ] Update imports
- [ ] Update tests

### **Phase 3: Unit Management Services**
- [ ] Rename unit state managers to services
- [ ] Rename heat/armor managers to services
- [ ] Extract interfaces
- [ ] Update imports
- [ ] Update tests

### **Phase 4: Orchestration Managers**
- [ ] Identify true managers (orchestration)
- [ ] Rename misnamed services to managers
- [ ] Extract factory interfaces
- [ ] Update imports
- [ ] Update tests

---

## 🧪 **Testing Strategy**

### **Automated Refactoring Tests**
```typescript
// Create tests to verify naming consistency
describe('Naming Consistency', () => {
  it('should have all services implement interfaces with I prefix', () => {
    // Test that all services have corresponding interfaces
  });
  
  it('should have all managers for orchestration only', () => {
    // Test that managers only orchestrate, no business logic
  });
  
  it('should have no classes with Impl, Refactored, or V2 suffixes', () => {
    // Test naming consistency
  });
});
```

### **Import Update Script**
```typescript
// Automated script to update all imports
const renameMap = {
  'HeatManagementManager': 'HeatManagementService',
  'ArmorManagementManager': 'ArmorManagementService',
  'WeightCalculationServiceImpl': 'WeightCalculationService',
  // ... all other renames
};

// Script to update all files
updateImports(renameMap);
```

---

## 📊 **Impact Analysis**

### **Files Affected**
- **78 class/interface files** need renaming
- **~200 import statements** need updating
- **~150 test files** need updating
- **~50 component files** need import updates

### **Risk Mitigation**
1. **Automated refactoring tools** (TypeScript compiler API)
2. **Comprehensive test coverage** before changes
3. **Incremental migration** (one phase at a time)
4. **Rollback plan** for each phase

---

## 🏆 **Success Metrics**

| Metric | Before | After | Target |
|--------|--------|-------|--------|
| **Naming Consistency** | 30% | 95% | 95% |
| **Services with Interfaces** | 40% | 90% | 85% |
| **Proper Manager Usage** | 20% | 95% | 90% |
| **Test Coverage** | 60% | 85% | 85% |
| **Architecture Compliance** | 35% | 90% | 85% |

---

## 🚀 **Implementation Timeline**

### **Week 1-2: Core Services**
- Rename weight/validation/equipment services
- Extract interfaces
- Update core imports
- Test core functionality

### **Week 3-4: Critical Slot Services**  
- Rename critical slot services
- Extract interfaces
- Update critical slot imports
- Test critical slot functionality

### **Week 5-6: Unit Management Services**
- Rename unit services
- Extract interfaces  
- Update unit management imports
- Test unit functionality

### **Week 7-8: Final Integration**
- Rename orchestration managers
- Extract factory interfaces
- Final testing
- Documentation updates

---

## 📚 **Documentation Updates**

### **Files to Update**
- [ ] Architecture documentation
- [ ] API documentation
- [ ] Component interaction diagrams
- [ ] Developer onboarding guide
- [ ] Testing documentation

### **New Documentation**
- [ ] Service interface catalog
- [ ] Dependency injection guide
- [ ] Factory pattern usage
- [ ] Manager vs service guidelines

---

This comprehensive refactoring plan will transform the inconsistent naming into a coherent, SOLID-compliant architecture that follows industry best practices and makes the codebase maintainable for future development.