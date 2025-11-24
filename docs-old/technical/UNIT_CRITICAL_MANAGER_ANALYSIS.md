# UnitCriticalManager Analysis & Dependencies

## Current File Structure (3,257 lines)

### **Major Responsibilities Identified:**

1. **State Management** (~300 lines)
   - Configuration updates
   - State serialization/deserialization  
   - Observer pattern implementation
   - Persistence methods

2. **System Component Management** (~400 lines)
   - Engine allocation across torso sections
   - Gyro placement in center torso
   - System component initialization
   - Special component factory pattern

3. **Weight & Balance Calculations** (~350 lines)
   - Engine weight calculations
   - Gyro weight calculations 
   - Total tonnage tracking
   - Armor tonnage limits
   - Construction limits enforcement

4. **Critical Slot Calculations** (~350 lines)
   - Slot availability calculations
   - User equipment slot status
   - Critical slot breakdown
   - Slot reservation management

5. **Equipment Allocation** (~500 lines)
   - Equipment placement validation
   - Auto-allocation algorithms
   - Location restriction enforcement
   - Equipment pool management

6. **Construction Rules Validation** (~400 lines)
   - BattleTech rule enforcement
   - Weight limit validation
   - Armor limit validation
   - Tech base consistency

7. **Utility & Helper Methods** (~250 lines)
   - Component type extraction
   - Maximum value calculations
   - Heat management
   - Internal structure lookups

### **Key Dependencies:**

#### **External Imports:**
- `CriticalSection` - Section-level slot management
- `EquipmentObject` - Equipment data structures
- `SystemComponentRules` - Engine/gyro allocation rules
- `CriticalSlotCalculator` - Slot calculation utilities
- `ComponentConfiguration` - Tech base and type definitions

#### **Internal Data:**
- `sections: Map<string, CriticalSection>` - All 8 mech locations
- `unallocatedEquipment: EquipmentAllocation[]` - Equipment pool
- `configuration: UnitConfiguration` - Unit specifications
- `listeners: (() => void)[]` - State change observers

#### **Critical Data Flows:**
1. **Configuration → System Components → Slot Allocation**
2. **Equipment Pool → Location Validation → Slot Placement**
3. **Weight Calculations → Armor Limits → Validation**
4. **State Changes → Observer Notifications → UI Updates**

### **Service Extraction Plan:**

#### **Phase 1A: UnitStateManager** 
**Target Lines:** State management, serialization, observers
**Dependencies:** UnitConfiguration, listeners array
**Interface:**
```typescript
interface UnitStateManager {
  getUnitState(): UnitData;
  updateUnitState(updates: Partial<UnitData>): void;
  saveToStorage(key: string): Promise<void>;
  loadFromStorage(key: string): Promise<UnitData | null>;
  subscribeToChanges(callback: (state: UnitData) => void): () => void;
}
```

#### **Phase 1B: SystemComponentService**
**Target Lines:** Engine/gyro allocation, special components
**Dependencies:** SystemComponentRules, CriticalSection
**Interface:**
```typescript
interface SystemComponentService {
  calculateEngineWeight(rating: number, type: string): number;
  getEngineSlots(rating: number, type: string): number;
  allocateSystemComponents(sections: Map<string, CriticalSection>): void;
}
```

#### **Phase 1C: WeightBalanceService** 
**Target Lines:** Weight calculations, tonnage limits
**Dependencies:** Configuration, calculation utilities
**Interface:**
```typescript
interface WeightBalanceService {
  calculateTotalWeight(unit: UnitData): WeightBreakdown;
  validateWeightLimits(unit: UnitData): ValidationResult;
  getMaxArmorTonnage(): number;
}
```

### **Current Test Coverage:**
- 36 passing tests covering core functionality
- Tests validate: Construction, Equipment Management, Weight Calculations, Armor Calculations, Heat Management, Critical Slots, Validation, State Management, Auto-Allocation

### **Extraction Strategy:**
1. **Extract UnitStateManager first** (lowest coupling, clear interface)
2. **Extract SystemComponentService** (medium coupling, clear responsibilities) 
3. **Extract WeightBalanceService** (medium coupling, calculation focused)
4. **Extract CriticalSlotCalculator** (high coupling, requires careful interface design)
5. **Extract EquipmentAllocationService** (highest coupling, most complex)
6. **Extract ConstructionRulesValidator** (cross-cutting, requires all other services)
7. **Refactor core UnitCriticalManager** (orchestrator pattern)

**Risk Mitigation:**
- Each extraction maintains existing test compatibility
- Gradual interface migration with backward compatibility
- Comprehensive integration testing after each step
- Rollback procedures documented for each phase
