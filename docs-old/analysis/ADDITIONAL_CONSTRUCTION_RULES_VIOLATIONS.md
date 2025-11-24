# Additional BattleTech Construction Rules Violations Found

## 🚨 CRITICAL VIOLATIONS DISCOVERED

After conducting a comprehensive search, I have identified **22 additional files** that contain violations of official BattleTech construction rules. These violations all relate to the same fundamental issue: **artificial minimum of 10 heat sinks**.

## 📋 Complete List of Violations

### 1. **Core Validation Files - CRITICAL**
- `services/validation/validators/SpecialComponentValidator.ts` - Line 314
- `services/validation/orchestration/commands/ConfigurationValidationCommand.ts` - Line 190
- `services/validation/ValidationOrchestrationManagerRefactored.ts` - Line 113

### 2. **Centralized Constants - CRITICAL**
- `battletech-editor-app/constants/BattleTechConstructionRules.ts` - Line 104-107

### 3. **Service Layer Files - MAJOR**
- `battletech-editor-app/services/ConstructionRulesValidator.ts` - Line 906
- `battletech-editor-app/services/validation/ValidationService.ts` - Line 692
- `battletech-editor-app/services/validation/MovementRulesValidator.ts` - Line 61
- `battletech-editor-app/services/validation/HeatRulesValidator.ts` - Line 106, 464
- `battletech-editor-app/services/validation/focused/ValidationServiceFactory.ts` - Line 169
- `battletech-editor-app/services/calculation/CalculationOrchestrator.ts` - Line 823

### 4. **Utility Files - MAJOR**
- `battletech-editor-app/utils/componentValidation.ts` - Line 126
- `battletech-editor-app/utils/editor/UnitValidationService.ts` - Line 670
- `battletech-editor-app/utils/criticalSlots/UnitCriticalManagerTypes.ts` - Line 121
- `battletech-editor-app/utils/criticalSlots/HeatManagementManager.ts` - Line 122
- `battletech-editor-app/utils/criticalSlots/ConfigurationManager.ts` - Line 124
- `battletech-editor-app/utils/heatSinkCalculations.ts` - Line 162

### 5. **Test Files - MAJOR**
- Multiple test files expecting incorrect minimum behavior
- Tests need to be updated to expect official BattleTech rules

## 🔧 Required Fixes

### **Official BattleTech Heat Sink Rule**
**Correct Rule**: Engine heat sinks = **Engine Rating ÷ 25** (rounded down), **NO MINIMUM**

### **Incorrect Minimum Heat Sink Rule**
**Violation**: "Minimum = 10 OR number of heat-generating weapons, whichever is higher"
**Problem**: This is NOT an official BattleTech rule for engine heat sinks

### **Confusion Between Two Different Rules**
The violation appears to stem from confusing two different BattleTech rules:
1. **Engine Heat Sinks** (what we're fixing): Rating ÷ 25, NO MINIMUM
2. **Total Heat Sinks Required** (different rule): Minimum 10 for the entire mech

## 🎯 Impact Assessment

### **Severity**: CRITICAL
- Affects core construction validation
- Impacts 22+ files across the entire codebase
- Violates fundamental BattleTech construction mechanics

### **Scope**: WIDESPREAD
- Service layer validation
- Utility functions
- Test suites
- Core constants

### **Priority**: IMMEDIATE
- Must be fixed to ensure proper BattleTech compliance
- Affects all mech construction validation

## 📝 Next Steps

1. **Fix centralized constants** first
2. **Update all service files** to use correct rule
3. **Fix utility functions** to remove artificial minimum
4. **Update test files** to expect correct behavior
5. **Validate all changes** with comprehensive testing

## 🔍 Root Cause Analysis

The violations appear to have originated from:
1. **Misunderstanding of BattleTech rules** - confusing engine heat sinks with total heat sink requirements
2. **Copy-paste propagation** - incorrect rule copied across multiple files
3. **Lack of centralized rule definition** - multiple files defining their own rules
4. **Test-driven implementation** - implementations changed to match incorrect test expectations

This demonstrates the critical importance of:
- Single source of truth for construction rules
- Proper validation against official BattleTech sources
- Regular rule compliance audits