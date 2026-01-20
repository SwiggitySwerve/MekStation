# Tasks: Add Missing Test Coverage and Validation Rules

## 1. Pilot Store Tests

- [ ] 1.1 Create `src/stores/__tests__/usePilotStore.test.ts`
- [ ] 1.2 Test `fetchPilots` action (list, filter, pagination)
- [ ] 1.3 Test `createPilot` action (success, validation errors)
- [ ] 1.4 Test `updatePilot` action (partial updates, not found)
- [ ] 1.5 Test `deletePilot` action (success, not found)
- [ ] 1.6 Test `selectPilot` and `getSelectedPilot` actions
- [ ] 1.7 Test `improveGunnery` and `improvePiloting` actions
- [ ] 1.8 Test `purchaseAbility` action (XP deduction, prerequisites)
- [ ] 1.9 Test filter actions (`setStatusFilter`, `setTypeFilter`, `setSearchQuery`)
- [ ] 1.10 Test `getFilteredPilots` selector with combined filters
- [ ] 1.11 Verify error handling and loading states

## 2. Validation Framework Tests

- [ ] 2.1 Create `src/services/validation/__tests__/UnitValidationRegistry.test.ts`
- [ ] 2.2 Test rule registration (`registerRule`, `registerRules`)
- [ ] 2.3 Test rule retrieval (`getRule`, `getRulesByCategory`)
- [ ] 2.4 Test rule unregistration and clearing
- [ ] 2.5 Test category management (`getCategories`)
- [ ] 2.6 Create `src/services/validation/__tests__/UnitValidationOrchestrator.test.ts`
- [ ] 2.7 Test `validateUnit` with passing rules
- [ ] 2.8 Test `validateUnit` with failing rules (errors, warnings)
- [ ] 2.9 Test rule filtering by unit type
- [ ] 2.10 Test rule priority ordering
- [ ] 2.11 Test `validateCategory` for isolated category validation

## 3. Aerospace Validation Rules

- [ ] 3.1 Create `src/services/validation/rules/aerospaceRules.ts`
- [ ] 3.2 Implement `AERO-THRUST-001`: Validate thrust/weight ratio
- [ ] 3.3 Implement `AERO-FUEL-001`: Validate minimum fuel capacity
- [ ] 3.4 Implement `AERO-FUEL-002`: Validate fuel doesn't exceed max
- [ ] 3.5 Implement `AERO-ARC-001`: Validate weapon arc assignments
- [ ] 3.6 Implement `AERO-ARC-002`: Validate rear-arc weapon restrictions
- [ ] 3.7 Register aerospace rules in `initializeUnitValidation.ts`
- [ ] 3.8 Create `src/services/validation/rules/__tests__/aerospaceRules.test.ts`
- [ ] 3.9 Test all aerospace validation rules with valid/invalid inputs

## 4. Unit Card Print Styles

- [ ] 4.1 Create `src/components/unit-card/UnitCard.print.css`
- [ ] 4.2 Add `@media print` rules for card layout
- [ ] 4.3 Hide action buttons in print view
- [ ] 4.4 Optimize colors for print (high contrast)
- [ ] 4.5 Set appropriate page break rules
- [ ] 4.6 Import print styles in unit card components
- [ ] 4.7 Test print output in browser print preview

## 5. Verification

- [ ] 5.1 Run all new tests: `npm test -- --testPathPattern="(usePilotStore|UnitValidation|aerospaceRules)"`
- [ ] 5.2 Verify lint passes: `npm run lint`
- [ ] 5.3 Verify build passes: `npm run build`
- [ ] 5.4 Manual test: Print unit card from browser
- [ ] 5.5 Manual test: Aerospace customizer shows validation errors
