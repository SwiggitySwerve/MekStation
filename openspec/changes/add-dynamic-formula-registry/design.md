# Dynamic Formula Registry Design

## Context

Variable equipment (Targeting Computer, MASC, Supercharger, etc.) has properties that depend on mech configuration. The current implementation uses hardcoded equipment IDs and switch statements. This design introduces a data-driven formula system that supports both built-in and custom equipment.

## Goals / Non-Goals

**Goals:**
- Data-driven formula definitions (no hardcoded switch statements)
- Support MIN/MAX combinators for complex formulas
- Runtime registration of custom equipment formulas
- Persistence of custom formulas in IndexedDB
- Type-safe formula definitions with validation
- Same public API for EquipmentCalculatorService

**Non-Goals:**
- Full expression parser (no arbitrary math expressions)
- Formula editing UI (future enhancement)
- Server-side formula storage (client-only for now)

## Decisions

### Decision 1: Formula Type System

Use a structured formula type instead of string expressions:

```typescript
type FormulaType = 
  | 'FIXED'           // Constant value
  | 'CEIL_DIVIDE'     // ceil(field / divisor)
  | 'FLOOR_DIVIDE'    // floor(field / divisor)
  | 'MULTIPLY'        // field × multiplier
  | 'MULTIPLY_ROUND'  // field × multiplier, rounded
  | 'EQUALS_WEIGHT'   // = calculated weight
  | 'EQUALS_FIELD'    // = context field
  | 'MIN'             // min(formula1, formula2, ...)
  | 'MAX';            // max(formula1, formula2, ...)

interface IFormula {
  readonly type: FormulaType;
  readonly field?: string;         // Context field name
  readonly value?: number;         // For FIXED
  readonly divisor?: number;       // For CEIL_DIVIDE, FLOOR_DIVIDE
  readonly multiplier?: number;    // For MULTIPLY variants
  readonly roundTo?: number;       // Rounding precision (0.5, 1)
  readonly formulas?: IFormula[];  // For MIN/MAX combinators
}
```

**Rationale**: Type-safe, serializable, no eval() needed.

### Decision 2: Layered Registry Architecture

```
┌─────────────────────────────────────────┐
│         FormulaRegistry                 │
├─────────────────────────────────────────┤
│  getFormulas(id)                        │
│  isVariable(id)                         │
│  registerCustomFormulas(id, formulas)   │
├─────────────────────────────────────────┤
│  Layer 2: Custom Formulas (IndexedDB)   │  ← Runtime, user-defined
│  - Loaded on initialization             │
│  - Persisted on register                │
│  - Overrides builtin                    │
├─────────────────────────────────────────┤
│  Layer 1: Builtin Formulas (Code)       │  ← Compile-time, read-only
│  - TARGETING_COMPUTER_IS                │
│  - MASC_IS, MASC_CLAN                   │
│  - SUPERCHARGER, PARTIAL_WING, TSM      │
└─────────────────────────────────────────┘
```

**Rationale**: 
- Builtin formulas are versioned with code (bug fixes apply automatically)
- Custom formulas are stored with user data (exportable, importable)
- Custom can override builtin for variants

### Decision 3: Formula Evaluation Order

For `calculateProperties(equipmentId, context)`:

1. Look up formulas in registry (custom → builtin)
2. Validate required context fields are present
3. Evaluate weight formula
4. Add `weight` to context (for slots/cost that depend on it)
5. Evaluate criticalSlots formula
6. Evaluate cost formula
7. Return { weight, criticalSlots, cost }

**Rationale**: Some properties depend on others (slots = weight for some equipment).

### Decision 4: Custom Formula Storage

```typescript
// IndexedDB store: 'custom-formulas'
interface IStoredFormula {
  readonly equipmentId: string;
  readonly formulas: IVariableFormulas;
  readonly createdAt: number;
  readonly modifiedAt: number;
}
```

**Rationale**: Separate from equipment definitions for clean separation of concerns.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Formula type explosion | Keep types minimal, add only when needed |
| Circular dependencies in formulas | Validate formula references at registration |
| Performance of registry lookups | Use Map for O(1) lookup |
| Invalid custom formulas | Validate on registration and load |

## Migration Plan

1. Add new formula types to `src/types/equipment/VariableEquipment.ts`
2. Create FormulaEvaluator (new file)
3. Create FormulaRegistry (new file)
4. Define builtin formulas as data
5. Refactor EquipmentCalculatorService to use registry
6. Add IndexedDB store for custom formulas
7. Delete hardcoded constants from EquipmentCalculatorService

## Open Questions

- Should we support nested formulas beyond MIN/MAX (e.g., ADD, SUBTRACT)?
- Should custom formula validation be strict or permissive?
- What's the maximum formula nesting depth to allow?

