# Customizer Components SOLID Analysis & Refactoring Plan

## 🚨 **Monolithic Components Identified**

### **Critical SOLID Violations in Customizer Components**

| Component | Size | Responsibilities | SOLID Violations |
|-----------|------|------------------|------------------|
| **StructureTabV2** | 746 lines | 8+ responsibilities | SRP, OCP, DIP |
| **EquipmentTabWithHooks** | 728 lines | 9+ responsibilities | SRP, ISP, DIP |
| **OverviewTabV2** | 727 lines | 7+ responsibilities | SRP, OCP, DIP |
| **ArmorTabV2** | 676 lines | 8+ responsibilities | SRP, OCP, DIP |

**Total: 2,877 lines of monolithic React components violating SOLID principles**

---

## 📋 **Detailed Component Analysis**

### **1. StructureTabV2.tsx - 746 lines**
**🔴 Critical SRP Violations:**

**Multiple Responsibilities:**
1. **Core Unit Configuration** - Tonnage and tech base management
2. **Engine Configuration** - Engine type, rating, and movement calculations  
3. **System Components** - Structure, gyro, enhancement type management
4. **Heat Management** - Heat sink configuration and calculations
5. **Movement Configuration** - Walk MP, run MP, enhanced movement
6. **Tech Progression** - Memory system and tech progression filtering
7. **Component Validation** - ComponentConfiguration vs string migration
8. **UI State Management** - Form state, selection state, validation state

**Problems:**
- God component doing everything structure-related
- Complex state management mixed with business logic
- Tech progression memory system tightly coupled
- Difficult to test individual features
- Changes to one area affect unrelated areas

### **2. EquipmentTabWithHooks.tsx - 728 lines**
**🔴 Critical SRP Violations:**

**Multiple Responsibilities:**
1. **Equipment State Management** - Mounted vs available equipment
2. **Data Format Conversion** - Database format to UI format transformation
3. **Equipment Filtering** - Category, search, availability filtering
4. **Equipment Sorting** - Column-based sorting logic
5. **Weight Calculations** - Equipment weight summation and validation
6. **Equipment Addition/Removal** - CRUD operations for equipment
7. **UI State Management** - Filter state, sort state, selection state
8. **Equipment Database Integration** - Database queries and lookups
9. **Location Management** - Equipment location assignment

**Problems:**
- Massive component handling all equipment concerns
- Business logic mixed with presentation logic
- Complex data transformations inline
- Difficult to reuse individual features
- Testing requires mocking entire equipment system

### **3. OverviewTabV2.tsx - 727 lines**
**🔴 Critical SRP Violations:**

**Multiple Responsibilities:**
1. **Tech Base Management** - Master tech base configuration
2. **Tech Progression** - Granular subsystem tech progression
3. **Memory System** - Component memory restoration and persistence
4. **Tech Rating** - Era-based tech rating calculations
5. **Component Resolution** - Tech base component resolution
6. **Configuration Orchestration** - Coordinating updates across systems
7. **Initialization Logic** - First-time setup and default values

**Problems:**
- Central orchestrator doing too much
- Memory system tightly coupled to UI
- Complex initialization and restoration logic
- Difficult to maintain and extend
- Changes ripple through entire system

### **4. ArmorTabV2.tsx - 676 lines**
**🔴 Critical SRP Violations:**

**Multiple Responsibilities:**
1. **Armor Type Configuration** - Armor type selection and validation
2. **Armor Tonnage Management** - Tonnage investment and limits
3. **Location Armor Allocation** - Individual location armor distribution
4. **Auto-Allocation Algorithms** - Smart armor distribution logic
5. **Armor Efficiency Optimization** - Efficiency calculations and recommendations
6. **Interactive Diagram** - SVG diagram interaction and visualization
7. **Configuration Validation** - Armor configuration validation
8. **Tech Base Integration** - Armor type tech base synchronization

**Problems:**
- Single component handling all armor concerns
- Complex algorithms mixed with UI logic
- Diagram interaction tightly coupled
- Difficult to test allocation algorithms separately
- Hard to extend with new armor features

---

## 🏗️ **SOLID Refactoring Plan**

### **Phase 1: StructureTabV2 Decomposition**

#### **1.1 Create Focused Components (SRP)**

```typescript
// Engine Configuration Component (SRP)
interface IEngineConfigurationComponent {
  engineType: string
  engineRating: number
  walkMP: number
  onEngineTypeChange: (type: string) => void
  onWalkMPChange: (mp: number) => void
  readOnly?: boolean
}

class EngineConfigurationComponent implements IEngineConfigurationComponent {
  // ONLY engine-related logic
}

// System Components Manager (SRP)
interface ISystemComponentsManager {
  structureType: string
  gyroType: string
  enhancementType: string
  onStructureTypeChange: (type: string) => void
  onGyroTypeChange: (type: string) => void
  onEnhancementTypeChange: (type: string) => void
  readOnly?: boolean
}

class SystemComponentsManager implements ISystemComponentsManager {
  // ONLY system component logic
}

// Heat Management Component (SRP)
interface IHeatManagementComponent {
  heatSinkType: string
  totalHeatSinks: number
  heatGeneration: number
  heatDissipation: number
  onHeatSinkTypeChange: (type: string) => void
  onTotalHeatSinksChange: (count: number) => void
  readOnly?: boolean
}

class HeatManagementComponent implements IHeatManagementComponent {
  // ONLY heat management logic
}
```

#### **1.2 Create Structure Tab Orchestrator (DIP)**

```typescript
interface IStructureTabOrchestrator {
  validateConfiguration(): ValidationResult
  updateConfiguration(updates: any): void
}

class StructureTabOrchestrator implements IStructureTabOrchestrator {
  constructor(
    private readonly engineManager: IEngineConfigurationComponent,
    private readonly systemManager: ISystemComponentsManager,
    private readonly heatManager: IHeatManagementComponent,
    private readonly configurationService: IConfigurationService
  ) {}
  
  // Orchestrates structure configuration using injected dependencies
}
```

### **Phase 2: EquipmentTabWithHooks Decomposition**

#### **2.1 Extract Equipment Services (SRP)**

```typescript
// Equipment Data Service (SRP)
interface IEquipmentDataService {
  getAvailableEquipment(): EquipmentItem[]
  getMountedEquipment(): MountedEquipment[]
  convertToUIFormat(equipment: any): EquipmentItem
  getEquipmentSpecs(equipmentId: string): EquipmentSpecs
}

class EquipmentDataService implements IEquipmentDataService {
  // ONLY equipment data operations
}

// Equipment Filter Service (SRP)
interface IEquipmentFilterService {
  filterByCategory(equipment: EquipmentItem[], categories: string[]): EquipmentItem[]
  filterBySearch(equipment: EquipmentItem[], searchTerm: string): EquipmentItem[]
  filterByAvailability(equipment: EquipmentItem[], year: number): EquipmentItem[]
  sortEquipment(equipment: EquipmentItem[], column: string, direction: 'asc' | 'desc'): EquipmentItem[]
}

class EquipmentFilterService implements IEquipmentFilterService {
  // ONLY filtering and sorting logic
}

// Equipment Management Service (SRP)
interface IEquipmentManagementService {
  addEquipment(equipment: EquipmentItem): void
  removeEquipment(equipmentId: string): void
  calculateTotalWeight(equipment: MountedEquipment[]): number
  calculateTotalHeat(equipment: MountedEquipment[]): number
  validateEquipmentPlacement(equipment: EquipmentItem, location: string): ValidationResult
}

class EquipmentManagementService implements IEquipmentManagementService {
  // ONLY equipment management operations
}
```

#### **2.2 Create Equipment Tab Facade (Facade Pattern)**

```typescript
class EquipmentTabFacade {
  constructor(
    private readonly dataService: IEquipmentDataService,
    private readonly filterService: IEquipmentFilterService,
    private readonly managementService: IEquipmentManagementService
  ) {}
  
  // Provides simplified interface to equipment functionality
  getFilteredEquipment(filters: EquipmentFilters): EquipmentItem[] {
    let equipment = this.dataService.getAvailableEquipment()
    equipment = this.filterService.filterByCategory(equipment, filters.categories)
    equipment = this.filterService.filterBySearch(equipment, filters.searchTerm)
    return this.filterService.sortEquipment(equipment, filters.sortColumn, filters.sortDirection)
  }
}
```

### **Phase 3: OverviewTabV2 Decomposition**

#### **3.1 Extract Overview Managers (SRP)**

```typescript
// Tech Progression Manager (SRP)
interface ITechProgressionManager {
  getCurrentProgression(): TechProgression
  updateSubsystem(subsystem: string, techBase: string): void
  validateProgression(): boolean
  generateTechBaseString(): string
}

class TechProgressionManager implements ITechProgressionManager {
  // ONLY tech progression logic
}

// Memory System Manager (SRP)
interface IMemorySystemManager {
  initializeMemory(): ComponentMemoryState
  restoreFromMemory(subsystem: string, techBase: string): string
  updateMemory(subsystem: string, techBase: string, component: string): void
  persistMemory(): void
}

class MemorySystemManager implements IMemorySystemManager {
  // ONLY memory system operations
}

// Tech Rating Manager (SRP)
interface ITechRatingManager {
  calculateTechRating(year: number, progression: TechProgression): TechRating
  getEraForYear(year: number): string
  validateEraCompatibility(equipment: string[], year: number): boolean
}

class TechRatingManager implements ITechRatingManager {
  // ONLY tech rating calculations
}
```

#### **3.2 Create Overview Orchestrator (DIP)**

```typescript
class OverviewOrchestrator {
  constructor(
    private readonly techProgressionManager: ITechProgressionManager,
    private readonly memoryManager: IMemorySystemManager,
    private readonly techRatingManager: ITechRatingManager,
    private readonly configurationService: IConfigurationService
  ) {}
  
  // Coordinates overview functionality using injected services
}
```

### **Phase 4: ArmorTabV2 Decomposition**

#### **4.1 Extract Armor Services (SRP)**

```typescript
// Armor Configuration Service (SRP)
interface IArmorConfigurationService {
  getArmorTypeOptions(techBase: string): string[]
  validateArmorType(armorType: string, techBase: string): boolean
  calculateMaxArmorTonnage(tonnage: number, armorType: string): number
  calculateArmorEfficiency(armorType: string): number
}

class ArmorConfigurationService implements IArmorConfigurationService {
  // ONLY armor configuration logic
}

// Armor Allocation Service (SRP)
interface IArmorAllocationService {
  autoAllocateArmor(availablePoints: number, internalStructure: any): ArmorAllocation
  validateAllocation(allocation: ArmorAllocation): ValidationResult
  optimizeAllocation(allocation: ArmorAllocation): ArmorAllocation
  getMaxArmorForLocation(location: string, tonnage: number): number
}

class ArmorAllocationService implements IArmorAllocationService {
  // ONLY armor allocation algorithms
}

// Armor Diagram Service (SRP)
interface IArmorDiagramService {
  renderDiagram(allocation: ArmorAllocation): DiagramElements
  handleLocationClick(location: string): void
  updateLocationDisplay(location: string, armor: number): void
  validateInteraction(location: string, action: string): boolean
}

class ArmorDiagramService implements IArmorDiagramService {
  // ONLY diagram interaction logic
}
```

#### **4.2 Create Armor Tab Coordinator (DIP)**

```typescript
class ArmorTabCoordinator {
  constructor(
    private readonly configurationService: IArmorConfigurationService,
    private readonly allocationService: IArmorAllocationService,
    private readonly diagramService: IArmorDiagramService,
    private readonly validationService: IValidationService
  ) {}
  
  // Coordinates armor management using injected services
}
```

---

## 🎯 **Implementation Strategy**

### **Step 1: Start with Armor Tab (Partially Done)**
- ✅ Some extraction already done (`ArmorConfigurationControls`, `ArmorLocationEditor`)
- 🔄 Complete the remaining extractions
- 🔄 Create coordinator pattern

### **Step 2: Structure Tab Decomposition**
1. Extract engine configuration component
2. Extract system components manager  
3. Extract heat management component
4. Create structure tab orchestrator
5. Update tests for focused components

### **Step 3: Equipment Tab Refactoring**
1. Extract equipment data service
2. Extract filter/sort service
3. Extract management service
4. Create equipment tab facade
5. Separate UI components from business logic

### **Step 4: Overview Tab Restructuring**
1. Extract tech progression manager
2. Extract memory system manager
3. Extract tech rating manager
4. Create overview orchestrator
5. Implement proper dependency injection

---

## 📊 **Expected Benefits**

### **Before Refactoring**
```typescript
// ❌ Monolithic component doing everything
class StructureTabV2 extends React.Component {
  // 746 lines of mixed concerns
  handleEngineChange() { /* engine logic */ }
  handleStructureChange() { /* structure logic */ }
  handleHeatSinkChange() { /* heat logic */ }
  handleMemoryRestoration() { /* memory logic */ }
  validateConfiguration() { /* validation logic */ }
  updateTechProgression() { /* tech progression logic */ }
  calculateMovement() { /* movement logic */ }
  renderUI() { /* massive render method */ }
}
```

### **After Refactoring**
```typescript
// ✅ Focused components with single responsibilities
class StructureTabOrchestrator {
  constructor(
    private readonly engineManager: IEngineConfigurationComponent,
    private readonly systemManager: ISystemComponentsManager,
    private readonly heatManager: IHeatManagementComponent
  ) {}
  
  // Clean orchestration of focused services
}

class EngineConfigurationComponent {
  // ONLY engine-related logic (150 lines)
}

class SystemComponentsManager {
  // ONLY system component logic (120 lines)
}

class HeatManagementComponent {
  // ONLY heat management logic (100 lines)
}
```

---

## 🏆 **Success Metrics**

| Metric | Before | Target After | Improvement |
|--------|--------|--------------|-------------|
| **Largest Component** | 746 lines | <200 lines | 73% reduction |
| **Component Cohesion** | Very Low | High | Complete transformation |
| **Testability** | Very Poor | Excellent | 100% improvement |
| **Reusability** | None | High | New capability |
| **Maintainability** | Poor | Excellent | Major improvement |

---

## 🚀 **Next Steps**

1. **Complete Armor Tab extraction** (build on existing work)
2. **Implement Structure Tab decomposition** 
3. **Refactor Equipment Tab with service pattern**
4. **Restructure Overview Tab with proper DI**
5. **Create comprehensive component tests**
6. **Document component interaction patterns**
7. **Performance optimization for decomposed components**

---

## 🎯 **Conclusion**

The customizer components currently violate all SOLID principles with massive monolithic components averaging 700+ lines each. The proposed refactoring will:

✅ **Achieve Single Responsibility** - Each component has one clear purpose  
✅ **Enable Open/Closed Principle** - New features can be added without modification  
✅ **Support Liskov Substitution** - Services can be easily mocked and tested  
✅ **Implement Interface Segregation** - Focused interfaces for specific needs  
✅ **Apply Dependency Inversion** - High-level components depend on abstractions  

This transformation will result in a maintainable, testable, and extensible customizer system that follows industry best practices.