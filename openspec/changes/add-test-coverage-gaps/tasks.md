# Tasks: Add Missing Test Coverage and Validation Rules

## 1. Pilot Store Tests

- [x] 1.1 Create `src/stores/__tests__/usePilotStore.test.ts`
- [x] 1.2 Test `fetchPilots` action (list, filter, pagination)
- [x] 1.3 Test `createPilot` action (success, validation errors)
- [x] 1.4 Test `updatePilot` action (partial updates, not found)
- [x] 1.5 Test `deletePilot` action (success, not found)
- [x] 1.6 Test `selectPilot` and `getSelectedPilot` actions
- [x] 1.7 Test `improveGunnery` and `improvePiloting` actions
- [x] 1.8 Test `purchaseAbility` action (XP deduction, prerequisites)
- [x] 1.9 Test filter actions (`setStatusFilter`, `setTypeFilter`, `setSearchQuery`)
- [x] 1.10 Test `getFilteredPilots` selector with combined filters
- [x] 1.11 Verify error handling and loading states

## 2. Validation Framework Tests

- [x] 2.1 Create `src/services/validation/__tests__/UnitValidationRegistry.test.ts`
- [x] 2.2 Test rule registration (`registerRule`, `registerRules`)
- [x] 2.3 Test rule retrieval (`getRule`, `getRulesByCategory`)
- [x] 2.4 Test rule unregistration and clearing
- [x] 2.5 Test category management (`getCategories`)
- [x] 2.6 Create `src/services/validation/__tests__/UnitValidationOrchestrator.test.ts`
- [x] 2.7 Test `validateUnit` with passing rules
- [x] 2.8 Test `validateUnit` with failing rules (errors, warnings)
- [x] 2.9 Test rule filtering by unit type
- [x] 2.10 Test rule priority ordering
- [x] 2.11 Test `validateCategory` for isolated category validation

## 3. Aerospace Validation Rules

- [x] 3.1 Create `src/services/validation/rules/aerospaceRules.ts` (added to existing AerospaceCategoryRules.ts)
- [x] 3.2 Implement `AERO-THRUST-001`: Validate thrust/weight ratio
- [x] 3.3 Implement `AERO-FUEL-001`: Validate minimum fuel capacity
- [x] 3.4 Implement `AERO-FUEL-002`: Validate fuel doesn't exceed max
- [x] 3.5 Implement `AERO-ARC-001`: Validate weapon arc assignments
- [x] 3.6 Implement `AERO-ARC-002`: Validate rear-arc weapon restrictions
- [x] 3.7 Register aerospace rules in `initializeUnitValidation.ts` (already registered via AEROSPACE_CATEGORY_RULES export)
- [x] 3.8 Create `src/services/validation/rules/__tests__/aerospaceRules.test.ts`
- [x] 3.9 Test all aerospace validation rules with valid/invalid inputs

## 4. Unit Card Print Styles

- [x] 4.1 Create `src/components/unit-card/UnitCard.print.css`
- [x] 4.2 Add `@media print` rules for card layout
- [x] 4.3 Hide action buttons in print view
- [x] 4.4 Optimize colors for print (high contrast)
- [x] 4.5 Set appropriate page break rules
- [x] 4.6 Import print styles in globals.css
- [x] 4.7 Create `src/components/unit-card/__tests__/UnitCard.print.test.ts` for print CSS verification

## 5. UI Component Tests (Bonus)

- [x] 5.1 Create `src/components/customizer/shared/__tests__/ValidationSummary.test.tsx`
- [x] 5.2 Test ValidationSummary renders errors, warnings, info
- [x] 5.3 Test ValidationSummary navigation callback
- [x] 5.4 Test ValidationSummary maxItems limit
- [x] 5.5 Create `src/components/customizer/shared/__tests__/ValidationBadge.test.tsx`
- [x] 5.6 Test ValidationBadge for all status types
- [x] 5.7 Test ValidationBadge icon visibility and labels

## 6. Verification

- [x] 6.1 Run all new tests: `npm test -- --testPathPattern="(usePilotStore|UnitValidation|aerospaceRules|ValidationSummary|ValidationBadge|UnitCard.print)"` - **231 tests passing**
- [x] 6.2 Verify lint passes: `npm run lint`
- [x] 6.3 Verify build passes: `npm run build`
