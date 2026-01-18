# Validation Architecture

This document describes the three-layer validation architecture used in MekStation.

## Overview

Validation is split across three directories, each with a distinct responsibility:

```
src/
├── types/validation/       # Layer 1: Type definitions (interfaces, enums)
├── utils/validation/       # Layer 2: Pure utility functions (stateless)
└── services/validation/    # Layer 3: Framework & orchestration (stateful)
```

## Layer 1: Types (`src/types/validation/`)

**Purpose**: Define validation-related interfaces and type definitions.

**Contains**:
- `UnitValidationInterfaces.ts` - Core validation result types (`IValidationResult`, `IValidationError`)
- `rules/ValidationRuleInterfaces.ts` - Rule definition interfaces (`IValidationRule`, `IRuleCategory`)
- Domain calculation types (`BattleValue`, `HeatManagement`, `TechRating`, etc.)

**Usage**: Import types here when defining validation structures. These have no dependencies on other layers.

```typescript
import type { IValidationResult, IValidationError } from '@/types/validation';
```

## Layer 2: Utilities (`src/utils/validation/`)

**Purpose**: Pure, stateless validation helper functions.

**Contains**:
- `armorValidationUtils.ts` - Armor allocation calculations and checks
- `slotValidationUtils.ts` - Critical slot usage calculations
- `weightValidationUtils.ts` - Weight budget calculations
- `validationNavigation.ts` - Navigation helpers for validation UI
- `rules/` - Individual validation rule implementations:
  - `StandardValidationRules.ts` - Common rules for all mechs
  - `BipedValidationRules.ts` - Biped-specific rules
  - `QuadValidationRules.ts` - Quad-specific rules
  - `ConfigurationValidationRules.ts` - Configuration constraints
  - etc.

**Usage**: Import utilities for performing validation calculations. These depend only on types.

```typescript
import { calculateStructuralWeight, isWithinWeightLimit } from '@/utils/validation';
import { StandardValidationRules } from '@/utils/validation/rules';
```

## Layer 3: Services (`src/services/validation/`)

**Purpose**: Validation framework with registry, orchestration, and stateful operations.

**Contains**:
- `UnitValidationRegistry.ts` - Registry of all validation rules by category
- `UnitValidationOrchestrator.ts` - Coordinates running rules against units
- `initializeUnitValidation.ts` - Bootstraps the validation system
- `rules/` - Category-specific rule bundles:
  - `mech/MechCategoryRules.ts`
  - `vehicle/VehicleCategoryRules.ts`
  - `aerospace/AerospaceCategoryRules.ts`
  - `battlemech/BattleMechRules.ts`
  - `universal/UniversalValidationRules.ts`

**Usage**: Import services for orchestrating validation across a unit.

```typescript
import { 
  UnitValidationRegistry, 
  UnitValidationOrchestrator,
  initializeUnitValidation 
} from '@/services/validation';
```

## Dependency Flow

```
types/validation (Layer 1)
         ↓
utils/validation (Layer 2) ← imports types
         ↓
services/validation (Layer 3) ← imports types + utils
```

**Rules**:
- Layer 1 has no internal dependencies
- Layer 2 imports only from Layer 1
- Layer 3 imports from Layer 1 and Layer 2
- Never import upward (services → utils → types only)

## Adding New Validation Rules

### 1. Define types (if needed) in `types/validation/`
```typescript
// types/validation/rules/ValidationRuleInterfaces.ts
export interface IMyNewRule extends IValidationRule { ... }
```

### 2. Implement pure logic in `utils/validation/rules/`
```typescript
// utils/validation/rules/MyNewRules.ts
export const MyNewRules: IValidationRule[] = [
  {
    id: 'my-rule-001',
    name: 'My New Rule',
    category: 'weight',
    validate: (unit) => { ... },
  },
];
```

### 3. Register in the service layer
```typescript
// services/validation/rules/mech/MechCategoryRules.ts
import { MyNewRules } from '@/utils/validation/rules';

export function registerMechRules(registry: UnitValidationRegistry) {
  registry.registerRules('mech', [
    ...existingRules,
    ...MyNewRules,
  ]);
}
```

## Spec References

- `openspec/specs/unit-validation-framework/spec.md` - Framework architecture
- `openspec/specs/validation-patterns/spec.md` - Validation patterns
