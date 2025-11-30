# Dynamic Formula Registry Implementation Tasks

## 1. Formula Type System

- [ ] 1.1 Create `src/types/equipment/VariableEquipment.ts`
- [ ] 1.2 Define FormulaType enum
- [ ] 1.3 Define IFormula interface with all fields
- [ ] 1.4 Define IVariableFormulas interface
- [ ] 1.5 Add exports to `src/types/equipment/index.ts`

## 2. Formula Evaluator

- [ ] 2.1 Create `src/services/equipment/FormulaEvaluator.ts`
- [ ] 2.2 Implement FIXED evaluation
- [ ] 2.3 Implement CEIL_DIVIDE and FLOOR_DIVIDE
- [ ] 2.4 Implement MULTIPLY and MULTIPLY_ROUND
- [ ] 2.5 Implement EQUALS_WEIGHT and EQUALS_FIELD
- [ ] 2.6 Implement MIN and MAX combinators
- [ ] 2.7 Add context validation
- [ ] 2.8 Add error handling for unknown formula types

## 3. Builtin Formula Definitions

- [ ] 3.1 Create `src/services/equipment/builtinFormulas.ts`
- [ ] 3.2 Define Targeting Computer IS formula
- [ ] 3.3 Define Targeting Computer Clan formula
- [ ] 3.4 Define MASC IS formula
- [ ] 3.5 Define MASC Clan formula
- [ ] 3.6 Define Supercharger formula
- [ ] 3.7 Define Partial Wing formula
- [ ] 3.8 Define TSM formula

## 4. Formula Registry

- [ ] 4.1 Create `src/services/equipment/FormulaRegistry.ts`
- [ ] 4.2 Implement getFormulas(id) with layer lookup
- [ ] 4.3 Implement isVariable(id)
- [ ] 4.4 Implement getRequiredContext(id)
- [ ] 4.5 Implement registerCustomFormulas(id, formulas)
- [ ] 4.6 Implement unregisterCustomFormulas(id)
- [ ] 4.7 Implement loadCustomFormulas() from IndexedDB
- [ ] 4.8 Implement saveCustomFormulas() to IndexedDB
- [ ] 4.9 Add initialization method

## 5. IndexedDB Integration

- [ ] 5.1 Add 'custom-formulas' store to STORES constant
- [ ] 5.2 Update IndexedDBService.openDatabase() to create new store
- [ ] 5.3 Test formula persistence

## 6. Refactor EquipmentCalculatorService

- [ ] 6.1 Remove VARIABLE_EQUIPMENT constant
- [ ] 6.2 Remove REQUIRED_CONTEXT constant
- [ ] 6.3 Remove individual calculation methods
- [ ] 6.4 Inject FormulaRegistry dependency
- [ ] 6.5 Implement calculateProperties using registry + evaluator
- [ ] 6.6 Implement isVariable using registry
- [ ] 6.7 Implement getRequiredContext using registry
- [ ] 6.8 Update service exports

## 7. Testing & Validation

- [ ] 7.1 Add formula type validation
- [ ] 7.2 Test builtin formula calculations match previous implementation
- [ ] 7.3 Test custom formula registration
- [ ] 7.4 Test custom formula persistence
- [ ] 7.5 Test custom overrides builtin

## 8. Cleanup

- [ ] 8.1 Update equipment service barrel exports
- [ ] 8.2 Verify TypeScript compilation
- [ ] 8.3 Update spec documentation

