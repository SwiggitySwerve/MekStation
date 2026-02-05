# Dynamic Formula Registry Implementation Tasks

## 1. Formula Type System

- [x] 1.1 Create `src/types/equipment/VariableEquipment.ts`
- [x] 1.2 Define FormulaType enum
- [x] 1.3 Define IFormula interface with all fields
- [x] 1.4 Define IVariableFormulas interface
- [x] 1.5 Add exports to `src/types/equipment/index.ts`

## 2. Formula Evaluator

- [x] 2.1 Create `src/services/equipment/FormulaEvaluator.ts`
- [x] 2.2 Implement FIXED evaluation
- [x] 2.3 Implement CEIL_DIVIDE and FLOOR_DIVIDE
- [x] 2.4 Implement MULTIPLY and MULTIPLY_ROUND
- [x] 2.5 Implement EQUALS_WEIGHT and EQUALS_FIELD
- [x] 2.6 Implement MIN and MAX combinators
- [x] 2.7 Add context validation
- [x] 2.8 Add error handling for unknown formula types

## 3. Builtin Formula Definitions

- [x] 3.1 Create `src/services/equipment/builtinFormulas.ts`
- [x] 3.2 Define Targeting Computer IS formula
- [x] 3.3 Define Targeting Computer Clan formula
- [x] 3.4 Define MASC IS formula
- [x] 3.5 Define MASC Clan formula
- [x] 3.6 Define Supercharger formula
- [x] 3.7 Define Partial Wing formula
- [x] 3.8 Define TSM formula

## 4. Formula Registry

- [x] 4.1 Create `src/services/equipment/FormulaRegistry.ts`
- [x] 4.2 Implement getFormulas(id) with layer lookup
- [x] 4.3 Implement isVariable(id)
- [x] 4.4 Implement getRequiredContext(id)
- [x] 4.5 Implement registerCustomFormulas(id, formulas)
- [x] 4.6 Implement unregisterCustomFormulas(id)
- [x] 4.7 Implement loadCustomFormulas() from IndexedDB
- [x] 4.8 Implement saveCustomFormulas() to IndexedDB
- [x] 4.9 Add initialization method

## 5. IndexedDB Integration

- [x] 5.1 Add 'custom-formulas' store to STORES constant
- [x] 5.2 Update IndexedDBService.openDatabase() to create new store
- [x] 5.3 Test formula persistence

## 6. Refactor EquipmentCalculatorService

- [x] 6.1 Remove VARIABLE_EQUIPMENT constant
- [x] 6.2 Remove REQUIRED_CONTEXT constant
- [x] 6.3 Remove individual calculation methods
- [x] 6.4 Inject FormulaRegistry dependency
- [x] 6.5 Implement calculateProperties using registry + evaluator
- [x] 6.6 Implement isVariable using registry
- [x] 6.7 Implement getRequiredContext using registry
- [x] 6.8 Update service exports

## 7. Testing & Validation

- [x] 7.1 Add formula type validation
- [x] 7.2 Test builtin formula calculations match previous implementation
- [x] 7.3 Test custom formula registration
- [x] 7.4 Test custom formula persistence
- [x] 7.5 Test custom overrides builtin

## 8. Cleanup

- [x] 8.1 Update equipment service barrel exports
- [x] 8.2 Verify TypeScript compilation
- [x] 8.3 Update spec documentation
