# Project Structure

Overview of the MekStation codebase organization.

## Directory Layout

```
megamek-web/
├── src/                    # Application source code
│   ├── components/         # React UI components
│   │   └── common/         # Shared components (Layout, Pagination, etc.)
│   ├── pages/              # Next.js pages and API routes
│   │   └── api/            # API endpoints
│   ├── services/           # Business logic layer
│   │   ├── catalog/        # Unit catalog management
│   │   ├── editor/         # Editor coordination
│   │   ├── equipment/      # Equipment data access
│   │   └── integration/    # Service orchestration
│   ├── types/              # TypeScript type definitions
│   │   ├── core/           # Core interfaces (IEntity, etc.)
│   │   ├── enums/          # Enumerations (TechBase, Era, etc.)
│   │   ├── construction/   # Construction system types
│   │   ├── equipment/      # Equipment definitions
│   │   ├── unit/           # Unit-level types
│   │   └── validation/     # Validation types
│   ├── utils/              # Utility functions
│   │   ├── construction/   # Construction calculations
│   │   ├── equipment/      # Equipment calculations
│   │   ├── physical/       # Weight and slot utilities
│   │   ├── temporal/       # Era/availability utilities
│   │   └── validation/     # Validation utilities
│   ├── hooks/              # Custom React hooks
│   └── stores/             # State management
├── openspec/               # Specifications (domain truth)
│   ├── specs/              # Current specifications
│   └── changes/            # Change proposals
├── data/                   # Data files
│   ├── megameklab_converted_output/  # Unit JSON files
│   └── schemas/            # JSON schemas
├── docs/                   # Documentation
└── public/                 # Static assets
```

## Key Directories

### `src/types/`

Type definitions organized by domain:

```
types/
├── core/           # Base interfaces (IEntity, ITechBaseEntity, etc.)
├── enums/          # TechBase, RulesLevel, Era, WeightClass
├── construction/   # EngineType, GyroType, ArmorType, etc.
├── equipment/      # Weapons, ammunition, electronics
├── unit/           # BattleMech interfaces, serialization
└── validation/     # Validation result types
```

**Import pattern**:

```typescript
import { TechBase, RulesLevel } from '@/types/enums';
import { IEntity, ITechBaseEntity } from '@/types/core';
import { IEngineType, ENGINE_TYPES } from '@/types/construction/EngineType';
```

### `src/utils/`

Calculation and utility functions:

```
utils/
├── construction/   # Engine, gyro, armor, movement calculations
├── equipment/      # Equipment property calculations
├── physical/       # Weight rounding, critical slot utilities
├── temporal/       # Era filtering, availability checks
└── validation/     # Validation rules and orchestration
```

### `src/services/`

Business logic services:

```
services/
├── catalog/        # CatalogGateway - unit catalog access
├── editor/         # UnitSwitchCoordinator - editor coordination
├── equipment/      # EquipmentGateway - equipment data access
└── integration/    # ServiceOrchestrator - service coordination
```

### `openspec/specs/`

Domain specifications (source of truth):

```
specs/
├── construction-rules-core/    # Weight, structure rules
├── engine-system/              # Engine formulas
├── armor-system/               # Armor points, allocation
├── weapon-system/              # Weapon stats, rules
├── validation-rules-master/    # Master validation rules
└── ... (38 total specs)
```

## Architecture Principles

1. **OpenSpec as Truth** - Domain rules live in `openspec/specs/`, not scattered in code
2. **Type Safety** - All code uses concrete TypeScript types from `src/types/`
3. **Service Layer** - Business logic in `src/services/`, not in components
4. **Calculation Utilities** - Formulas in `src/utils/construction/` match OpenSpec specs
5. **SOLID Principles** - Single responsibility, interface segregation

## Data Flow

```
OpenSpec Specs → TypeScript Types → Services → Components
     ↓                 ↓              ↓           ↓
  (Rules)          (Contracts)    (Logic)      (UI)
```
