# Core Architecture Principles & Naming Standards

## 🏗️ **Architectural Overview**

This document establishes the core architectural principles, design patterns, and naming conventions for the BattleTech Editor application. It addresses the current inconsistencies and provides a foundation for SOLID-compliant, maintainable code.

---

## 🎯 **Core Design Principles**

### **1. Single Responsibility Principle (SRP)**
- Each class should have **one reason to change**
- **Services** handle business logic for a specific domain
- **Managers** coordinate multiple services (orchestration only)
- **Factories** create objects with complex initialization
- **Validators** perform specific validation logic
- **Repositories** handle data persistence and retrieval

### **2. Open/Closed Principle (OCP)**
- Classes open for extension, closed for modification
- Use **Strategy Pattern** for algorithmic variations
- Use **Factory Pattern** for object creation variations
- Use **Dependency Injection** for behavior variations

### **3. Liskov Substitution Principle (LSP)**
- Derived classes must be substitutable for base classes
- **Interfaces** define contracts that implementations must honor
- **Abstract classes** provide common behavior for related implementations

### **4. Interface Segregation Principle (ISP)**
- Clients should not depend on interfaces they don't use
- **Focused interfaces** with specific responsibilities
- **Composition over inheritance** for complex behaviors

### **5. Dependency Inversion Principle (DIP)**
- High-level modules should not depend on low-level modules
- Both should depend on **abstractions (interfaces)**
- **Dependency injection** at construction time

---

## 📐 **Naming Conventions**

### **Interfaces**
```typescript
// ✅ CORRECT: Use descriptive names starting with 'I'
interface IWeightCalculationService {
  calculateWeight(unit: BattleUnit): number;
}

interface IValidationOrchestrator {
  validateUnit(unit: BattleUnit): ValidationResult;
}

interface IEquipmentRepository {
  findByType(type: EquipmentType): Equipment[];
}

// ❌ INCORRECT: Inconsistent naming
interface WeightCalculationService { } // Missing 'I' prefix
interface IWeightCalculationServiceInterface { } // Redundant 'Interface' suffix
interface WeightService { } // Too generic
```

### **Implementations**
```typescript
// ✅ CORRECT: Clear, descriptive names
class WeightCalculationService implements IWeightCalculationService {
  // Implementation
}

class ValidationOrchestrator implements IValidationOrchestrator {
  // Implementation
}

class EquipmentRepository implements IEquipmentRepository {
  // Implementation
}

// ❌ INCORRECT: Inconsistent patterns
class WeightCalculationServiceImpl { } // Unnecessary 'Impl' suffix
class WeightCalculationManager { } // Should be 'Service' not 'Manager'
class WeightCalculationServiceRefactored { } // Temporary naming
class WeightCalculationServiceV2 { } // Version numbers in names
```

### **Factories**
```typescript
// ✅ CORRECT: Factory pattern naming
interface IValidationServiceFactory {
  createWeightValidator(): IWeightValidator;
  createHeatValidator(): IHeatValidator;
}

class ValidationServiceFactory implements IValidationServiceFactory {
  // Factory implementation
}

// ❌ INCORRECT: Inconsistent factory naming
class ValidatorFactory { } // Missing 'Service' context
interface ValidationFactory { } // Missing 'I' prefix
```

### **Managers vs Services**
```typescript
// ✅ CORRECT: Services handle business logic
class WeightCalculationService implements IWeightCalculationService {
  calculateStructureWeight(unit: BattleUnit): number { /* logic */ }
  calculateArmorWeight(unit: BattleUnit): number { /* logic */ }
}

// ✅ CORRECT: Managers orchestrate services
class UnitConfigurationManager {
  constructor(
    private readonly weightService: IWeightCalculationService,
    private readonly validationService: IValidationOrchestrator,
    private readonly equipmentService: IEquipmentAllocationService
  ) {}
  
  updateConfiguration(unit: BattleUnit, changes: ConfigurationChanges): void {
    // Orchestrates services, no business logic
  }
}

// ❌ INCORRECT: Manager doing business logic
class WeightCalculationManager {
  calculateStructureWeight() { /* business logic - should be in service */ }
}
```

---

## 🏛️ **Architectural Patterns**

### **1. Service Layer Pattern**
```typescript
// Domain services handle business logic
interface IArmorCalculationService {
  calculateMaxArmor(tonnage: number, armorType: ArmorType): number;
  calculateArmorEfficiency(armorType: ArmorType): number;
  validateArmorAllocation(allocation: ArmorAllocation): ValidationResult;
}

class ArmorCalculationService implements IArmorCalculationService {
  calculateMaxArmor(tonnage: number, armorType: ArmorType): number {
    // Pure business logic
    return tonnage * this.getArmorMultiplier(armorType);
  }
  
  private getArmorMultiplier(armorType: ArmorType): number {
    // Helper method
  }
}
```

### **2. Repository Pattern**
```typescript
// Data access abstraction
interface IEquipmentRepository {
  findByCategory(category: EquipmentCategory): Equipment[];
  findByTechBase(techBase: TechBase): Equipment[];
  findByAvailability(year: number): Equipment[];
}

class EquipmentDatabaseRepository implements IEquipmentRepository {
  // Database-specific implementation
}

class EquipmentInMemoryRepository implements IEquipmentRepository {
  // In-memory implementation for testing
}
```

### **3. Factory Pattern**
```typescript
// Object creation with complex initialization
interface IValidationServiceFactory {
  createOrchestrator(): IValidationOrchestrator;
  createWeightValidator(): IWeightValidator;
  createHeatValidator(): IHeatValidator;
}

class ValidationServiceFactory implements IValidationServiceFactory {
  createOrchestrator(): IValidationOrchestrator {
    return new ValidationOrchestrator(
      this.createWeightValidator(),
      this.createHeatValidator(),
      this.createEquipmentValidator()
    );
  }
}
```

### **4. Strategy Pattern**
```typescript
// Algorithm variations
interface IArmorAllocationStrategy {
  allocateArmor(availablePoints: number, unit: BattleUnit): ArmorAllocation;
}

class BalancedAllocationStrategy implements IArmorAllocationStrategy {
  allocateArmor(availablePoints: number, unit: BattleUnit): ArmorAllocation {
    // Balanced allocation algorithm
  }
}

class MaximumProtectionStrategy implements IArmorAllocationStrategy {
  allocateArmor(availablePoints: number, unit: BattleUnit): ArmorAllocation {
    // Maximum protection algorithm
  }
}
```

### **5. Observer Pattern**
```typescript
// Event notifications
interface IConfigurationObserver {
  onConfigurationChanged(event: ConfigurationChangedEvent): void;
}

interface IConfigurationNotifier {
  addObserver(observer: IConfigurationObserver): void;
  removeObserver(observer: IConfigurationObserver): void;
  notifyObservers(event: ConfigurationChangedEvent): void;
}
```

---

## 🔧 **Dependency Injection Patterns**

### **Constructor Injection (Preferred)**
```typescript
// ✅ CORRECT: Constructor injection
class ValidationOrchestrator implements IValidationOrchestrator {
  constructor(
    private readonly weightValidator: IWeightValidator,
    private readonly heatValidator: IHeatValidator,
    private readonly equipmentValidator: IEquipmentValidator
  ) {}
  
  validateUnit(unit: BattleUnit): ValidationResult {
    // Use injected dependencies
    const weightResult = this.weightValidator.validateWeight(unit);
    const heatResult = this.heatValidator.validateHeat(unit);
    return this.combineResults(weightResult, heatResult);
  }
}
```

### **Factory Injection**
```typescript
// ✅ CORRECT: Factory injection for complex object graphs
class UnitConfigurationManager {
  constructor(
    private readonly serviceFactory: IValidationServiceFactory,
    private readonly repositoryFactory: IRepositoryFactory
  ) {}
  
  validateConfiguration(unit: BattleUnit): ValidationResult {
    const orchestrator = this.serviceFactory.createOrchestrator();
    return orchestrator.validateUnit(unit);
  }
}
```

---

## 📊 **Component Categories & Responsibilities**

### **Services** (Business Logic)
```typescript
// Handle specific domain logic
IWeightCalculationService
IHeatManagementService
IArmorAllocationService
IEquipmentValidationService
ITechProgressionService
```

### **Managers** (Orchestration)
```typescript
// Coordinate multiple services
UnitConfigurationManager
ValidationOrchestrationManager
EquipmentAllocationManager
```

### **Repositories** (Data Access)
```typescript
// Handle data persistence and retrieval
IEquipmentRepository
IUnitConfigurationRepository
IValidationRuleRepository
```

### **Factories** (Object Creation)
```typescript
// Create complex objects with dependencies
IValidationServiceFactory
IRepositoryFactory
IComponentFactory
```

### **Validators** (Validation Logic)
```typescript
// Focused validation responsibilities
IWeightValidator
IHeatValidator
IArmorValidator
IEquipmentValidator
```

### **Calculators** (Pure Functions)
```typescript
// Mathematical calculations without side effects
IWeightCalculator
IHeatCalculator
IMovementCalculator
```

---

## 🎨 **React Component Architecture**

### **Container Components** (State Management)
```typescript
// ✅ CORRECT: Container handles state, injects services
interface UnitConfigurationContainerProps {
  unitId: string;
}

const UnitConfigurationContainer: React.FC<UnitConfigurationContainerProps> = ({ unitId }) => {
  const [unit, setUnit] = useState<BattleUnit | null>(null);
  const configurationManager = useConfigurationManager();
  
  const handleConfigurationUpdate = useCallback((changes: ConfigurationChanges) => {
    configurationManager.updateConfiguration(unit!, changes);
  }, [configurationManager, unit]);
  
  return (
    <UnitConfigurationView
      unit={unit}
      onConfigurationUpdate={handleConfigurationUpdate}
    />
  );
};
```

### **Presentation Components** (UI Only)
```typescript
// ✅ CORRECT: Pure presentation component
interface UnitConfigurationViewProps {
  unit: BattleUnit;
  onConfigurationUpdate: (changes: ConfigurationChanges) => void;
}

const UnitConfigurationView: React.FC<UnitConfigurationViewProps> = ({
  unit,
  onConfigurationUpdate
}) => {
  // Only UI logic, no business logic
  return (
    <div>
      <EngineConfiguration 
        engine={unit.engine}
        onEngineChange={(engine) => onConfigurationUpdate({ engine })}
      />
      <WeightSummary weight={unit.weight} />
    </div>
  );
};
```

---

## 🚀 **Migration Strategy**

### **Phase 1: Establish Naming Standards**
```typescript
// Current inconsistent naming
class HeatManagementManager { } // ❌
class WeightCalculationServiceImpl { } // ❌
class UnitCriticalManagerRefactored { } // ❌
interface ValidationOrchestrator { } // ❌

// Standardized naming
class HeatManagementService implements IHeatManagementService { } // ✅
class WeightCalculationService implements IWeightCalculationService { } // ✅
class UnitCriticalSlotManager { } // ✅ (orchestration)
interface IValidationOrchestrator { } // ✅
```

### **Phase 2: Extract Services from Managers**
```typescript
// Before: Manager doing business logic
class WeightCalculationManager {
  calculateStructureWeight() { /* business logic */ }
  calculateArmorWeight() { /* business logic */ }
  validateWeight() { /* validation logic */ }
}

// After: Service + Manager separation
class WeightCalculationService implements IWeightCalculationService {
  calculateStructureWeight() { /* business logic */ }
  calculateArmorWeight() { /* business logic */ }
}

class WeightValidator implements IWeightValidator {
  validateWeight() { /* validation logic */ }
}

class UnitConfigurationManager {
  constructor(
    private readonly weightService: IWeightCalculationService,
    private readonly weightValidator: IWeightValidator
  ) {}
  
  updateConfiguration() { /* orchestration only */ }
}
```

### **Phase 3: Implement Dependency Injection**
```typescript
// Before: Direct instantiation
class ValidationOrchestrator {
  private weightValidator = new WeightValidator(); // ❌
  private heatValidator = new HeatValidator(); // ❌
}

// After: Dependency injection
class ValidationOrchestrator implements IValidationOrchestrator {
  constructor(
    private readonly weightValidator: IWeightValidator, // ✅
    private readonly heatValidator: IHeatValidator // ✅
  ) {}
}
```

---

## 📋 **File Organization**

### **Directory Structure**
```
src/
├── services/              # Business logic services
│   ├── weight/
│   │   ├── IWeightCalculationService.ts
│   │   ├── WeightCalculationService.ts
│   │   └── WeightCalculationService.test.ts
│   ├── validation/
│   │   ├── IValidationOrchestrator.ts
│   │   ├── ValidationOrchestrator.ts
│   │   └── validators/
│   │       ├── IWeightValidator.ts
│   │       └── WeightValidator.ts
│   └── equipment/
├── managers/              # Orchestration managers
│   ├── UnitConfigurationManager.ts
│   └── ValidationOrchestrationManager.ts
├── repositories/          # Data access
│   ├── IEquipmentRepository.ts
│   └── EquipmentDatabaseRepository.ts
├── factories/             # Object creation
│   ├── IValidationServiceFactory.ts
│   └── ValidationServiceFactory.ts
├── types/                 # Shared types and interfaces
│   ├── BattleUnit.ts
│   ├── ValidationResult.ts
│   └── ConfigurationChanges.ts
└── components/            # React components
    ├── containers/        # State management
    └── presentation/      # Pure UI components
```

---

## 🎯 **Quality Gates**

### **Code Review Checklist**
- [ ] **Naming**: All classes/interfaces follow naming conventions
- [ ] **SRP**: Each class has single responsibility
- [ ] **DIP**: Dependencies injected, not instantiated directly
- [ ] **ISP**: Interfaces are focused and cohesive
- [ ] **Testing**: Unit tests for all services and validators
- [ ] **Documentation**: Clear JSDoc for public APIs

### **Architecture Validation**
- [ ] **Services**: Handle business logic only
- [ ] **Managers**: Orchestrate services only
- [ ] **Repositories**: Handle data access only
- [ ] **Factories**: Create objects with complex initialization
- [ ] **Components**: Presentation components are pure functions

---

## 📊 **Success Metrics**

| Metric | Current | Target | Improvement |
|--------|---------|---------|-------------|
| **Naming Consistency** | 30% | 95% | 65% improvement |
| **SOLID Compliance** | 40% | 90% | 50% improvement |
| **Test Coverage** | 60% | 85% | 25% improvement |
| **Code Maintainability** | Poor | Excellent | Complete transformation |
| **Dependency Coupling** | High | Low | Significant reduction |

---

## 🏆 **Expected Benefits**

### **Developer Experience**
- **Predictable naming** - developers know where to find functionality
- **Clear responsibilities** - each class has obvious purpose
- **Easy testing** - dependencies can be mocked
- **Simple debugging** - clear call stack and responsibility chain

### **Code Quality**
- **Maintainable** - changes isolated to specific classes
- **Extensible** - new features added without modification
- **Testable** - focused classes with clear interfaces
- **Reusable** - services can be used across different contexts

### **Team Productivity**
- **Faster onboarding** - consistent patterns and naming
- **Reduced bugs** - clear contracts and validation
- **Easier refactoring** - well-defined interfaces
- **Better collaboration** - shared architectural understanding

---

## 🚀 **Implementation Timeline**

### **Week 1-2: Foundation**
- Establish naming standards
- Create core interfaces
- Document architectural patterns

### **Week 3-4: Service Extraction**
- Extract services from managers
- Implement dependency injection
- Create focused validators

### **Week 5-6: Component Refactoring**
- Refactor React components
- Implement container/presentation pattern
- Add comprehensive tests

### **Week 7-8: Integration & Testing**
- Integration testing
- Performance optimization
- Documentation completion

---

This architecture provides a solid foundation for maintainable, testable, and extensible code following SOLID principles and consistent naming conventions.