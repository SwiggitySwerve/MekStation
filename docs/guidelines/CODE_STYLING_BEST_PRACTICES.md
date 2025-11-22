# Code Styling Best Practices

This document establishes the **authoritative standards** for code style, formatting, and conventions in the BattleTech Editor codebase. Adherence to these practices ensures consistency, readability, and maintainability across the project.

---

## 1. TypeScript Style Guidelines

### 1.1 Type Definitions

**Use concrete types, avoid `any`**

```typescript
// ✅ GOOD - Concrete type
function processUnit(unit: ICompleteUnitConfiguration): void {
  // ...
}

// ❌ BAD - Using 'any'
function processUnit(unit: any): void {
  // ...
}
```

**Prefer interfaces over type aliases for object shapes**

```typescript
// ✅ GOOD - Interface
interface UnitConfiguration {
  tonnage: number;
  techBase: TechBase;
}

// ⚠️ ACCEPTABLE - Type alias for unions/primitives
type TechBase = 'Inner Sphere' | 'Clan' | 'Mixed';
```

**Avoid double casting (`as unknown as`)**

Double casting disables type safety completely. Use type guards or proper conversion functions instead.

```typescript
// ❌ BAD
const unit = data as unknown as EditableUnit;

// ✅ GOOD
if (isValidUnit(data)) {
  const unit = data;
}
```

**Use type guards for runtime validation**

```typescript
// ✅ GOOD - Type guard
function isValidUnit(data: unknown): data is ICompleteUnitConfiguration {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tonnage' in data &&
    'techBase' in data
  );
}

// Usage
if (isValidUnit(response.data)) {
  processUnit(response.data); // TypeScript knows it's valid
}
```

### 1.2 Import Organization

**Group imports in this order:**
1. External dependencies (React, Next.js, etc.)
2. Internal absolute imports (`src/types/core`, `src/utils`, etc.)
3. Relative imports (`../components`, `./utils`, etc.)
4. Type-only imports (use `import type`)

```typescript
// ✅ GOOD - Organized imports
import React, { useState, useEffect } from 'react';
import { NextPage } from 'next';

import { TechBase, ComponentCategory } from 'src/types/core';
import { calculateWeight } from 'src/utils/calculations';

import { UnitCard } from '../components/UnitCard';
import type { UnitProps } from './types';
```

**Use absolute imports from `src/` when possible**

```typescript
// ✅ GOOD - Absolute import
import { TechBase } from 'src/types/core';

// ⚠️ ACCEPTABLE - Relative import for nearby files
import { UnitCard } from './UnitCard';
```

### 1.3 Naming Conventions

**Files and Directories**
- **Components**: PascalCase (`UnitCard.tsx`, `EquipmentBrowser.tsx`)
- **Utilities**: camelCase (`componentCalculations.ts`, `armorAllocation.ts`)
- **Types**: PascalCase (`UnitInterfaces.ts`, `BaseTypes.ts`)
- **Constants**: UPPER_SNAKE_CASE (`TECH_BASES.ts`, `COMPONENT_CATEGORIES.ts`)
- **Hooks**: camelCase with `use` prefix (`useUnitData.tsx`, `useEquipment.ts`)

**Variables and Functions**
- **Variables**: camelCase (`unitConfiguration`, `techBase`)
- **Functions**: camelCase (`calculateWeight`, `validateUnit`)
- **Constants**: UPPER_SNAKE_CASE (`MAX_TONNAGE`, `DEFAULT_TECH_BASE`)
- **Types/Interfaces**: PascalCase (`IUnitConfiguration`, `TechBase`)

**React Components**
- **Component names**: PascalCase (`UnitCard`, `EquipmentBrowser`)
- **Props interfaces**: PascalCase with `Props` suffix (`UnitCardProps`, `EquipmentBrowserProps`)

```typescript
// ✅ GOOD
interface UnitCardProps {
  unit: ICompleteUnitConfiguration;
  onEdit: (id: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({ unit, onEdit }) => {
  // ...
};
```

### 1.4 Code Organization

**File Structure**
- One main export per file (default export for components)
- Named exports for utilities and types
- Group related functionality together

```typescript
// ✅ GOOD - Clear organization
// Imports
import React from 'react';
import { TechBase } from 'src/types/core';

// Types
interface ComponentProps {
  // ...
}

// Constants
const DEFAULT_TECH_BASE: TechBase = TechBase.INNER_SPHERE;

// Component
export const Component: React.FC<ComponentProps> = () => {
  // ...
};
```

**Function Organization**
- Keep functions focused and single-purpose
- Extract complex logic into separate utility functions
- Use early returns to reduce nesting

```typescript
// ✅ GOOD - Single purpose, early return
function validateTonnage(tonnage: number): boolean {
  if (tonnage <= 0) return false;
  if (tonnage > 200) return false;
  return true;
}

// ❌ BAD - Multiple responsibilities
function validateAndProcessUnit(unit: any): any {
  // validation logic
  // processing logic
  // transformation logic
}
```

---

## 2. React/Next.js Style Guidelines

### 2.1 Component Structure

**Component organization order:**
1. Imports
2. Types/Interfaces
3. Constants
4. Component definition
5. Helper functions (if needed)
6. Export

```typescript
// ✅ GOOD - Well-organized component
import React, { useState } from 'react';
import { TechBase } from 'src/types/core';

interface UnitEditorProps {
  unitId: string;
  onSave: (unit: ICompleteUnitConfiguration) => void;
}

const DEFAULT_CONFIG = {
  techBase: TechBase.INNER_SPHERE,
};

export const UnitEditor: React.FC<UnitEditorProps> = ({ unitId, onSave }) => {
  const [unit, setUnit] = useState<ICompleteUnitConfiguration | null>(null);

  const handleSave = () => {
    if (unit) {
      onSave(unit);
    }
  };

  return (
    <div>
      {/* Component JSX */}
    </div>
  );
};
```

### 2.2 Hooks Usage

**Custom hooks naming**
- Prefix with `use`
- Return objects for multiple values, tuples for pairs

```typescript
// ✅ GOOD - Custom hook
export function useUnitData(unitId: string) {
  const [unit, setUnit] = useState<ICompleteUnitConfiguration | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch logic
  }, [unitId]);

  return { unit, loading, setUnit };
}

// Usage
const { unit, loading } = useUnitData(unitId);
```

**Hook dependencies**
- Always include all dependencies in dependency arrays
- Use ESLint rule `react-hooks/exhaustive-deps` to catch missing dependencies

```typescript
// ✅ GOOD - Complete dependencies
useEffect(() => {
  fetchUnit(unitId);
}, [unitId]); // All dependencies listed

// ❌ BAD - Missing dependency
useEffect(() => {
  fetchUnit(unitId);
}, []); // Missing unitId dependency
```

### 2.3 JSX/TSX Formatting

**JSX attributes**
- Use double quotes for string attributes
- Use camelCase for prop names
- Self-close tags when possible

```typescript
// ✅ GOOD
<UnitCard
  unit={unit}
  onEdit={handleEdit}
  className="unit-card"
/>

// ❌ BAD
<UnitCard unit={unit} onEdit={handleEdit} className='unit-card'></UnitCard>
```

**Conditional rendering**
- Use ternary for simple conditions
- Extract complex conditions to variables
- Use `&&` for optional rendering

```typescript
// ✅ GOOD - Clear conditional rendering
const isClan = techBase === TechBase.CLAN;

return (
  <div>
    {isClan && <ClanBadge />}
    {loading ? <Spinner /> : <UnitDisplay unit={unit} />}
  </div>
);
```

---

## 3. Formatting Standards

### 3.1 Indentation and Spacing

**Indentation**
- Use 2 spaces (no tabs)
- Consistent indentation throughout the file

**Spacing**
- Single space after keywords (`if (condition)`)
- No space before function parentheses in declarations (`function name()`)
- Space before function parentheses in calls (`name()`)
- Spaces around operators (`a + b`, `x === y`)

```typescript
// ✅ GOOD - Consistent spacing
function calculateWeight(tonnage: number, multiplier: number): number {
  return tonnage * multiplier;
}

const result = calculateWeight(50, 1.5);
if (result > 100) {
  console.log('Heavy unit');
}
```

### 3.2 Line Length

**Maximum line length: 100 characters**
- Break long lines at logical points
- Align continuation lines appropriately

```typescript
// ✅ GOOD - Broken at logical point
const isValid = 
  tonnage > 0 && 
  tonnage <= 200 && 
  techBase !== TechBase.MIXED;

// ✅ GOOD - Function parameters
function processUnit(
  unit: ICompleteUnitConfiguration,
  options: ProcessingOptions
): ProcessedUnit {
  // ...
}
```

### 3.3 Semicolons

**Always use semicolons**
- End statements with semicolons
- Exception: Function declarations and class methods

```typescript
// ✅ GOOD - Semicolons used
const unit = getUnit();
const weight = calculateWeight(unit.tonnage);

function processUnit(unit: ICompleteUnitConfiguration) {
  // No semicolon after function declaration
  return unit;
}
```

### 3.4 Trailing Commas

**Use trailing commas in multi-line structures**
- Arrays, objects, function parameters
- Improves git diffs and reduces merge conflicts

```typescript
// ✅ GOOD - Trailing commas
const techBases = [
  TechBase.INNER_SPHERE,
  TechBase.CLAN,
  TechBase.MIXED,
];

const config = {
  tonnage: 50,
  techBase: TechBase.INNER_SPHERE,
};
```

---

## 4. Comments and Documentation

### 4.1 Code Comments

**When to comment**
- Complex algorithms or business logic
- Non-obvious workarounds or hacks
- Public API functions and classes
- TODO/FIXME items with context

**Comment style**
- Use `//` for single-line comments
- Use `/* */` for multi-line comments
- Place comments above the code they describe

```typescript
// ✅ GOOD - Clear, helpful comment
// Calculate engine weight based on tonnage and engine type
// Formula: baseWeight = tonnage * engineMultiplier
function calculateEngineWeight(tonnage: number, engineType: EngineType): number {
  const multiplier = getEngineMultiplier(engineType);
  return tonnage * multiplier;
}

// ❌ BAD - Obvious comment
// Set unit tonnage
unit.tonnage = 50;
```

### 4.2 JSDoc Comments

**Use JSDoc for public APIs**

```typescript
// ✅ GOOD - JSDoc documentation
/**
 * Validates a unit configuration against BattleTech construction rules.
 * 
 * @param unit - The unit configuration to validate
 * @param options - Optional validation options
 * @returns Validation result with errors and warnings
 * @throws {InvalidUnitError} If unit is null or undefined
 */
function validateUnit(
  unit: ICompleteUnitConfiguration,
  options?: ValidationOptions
): ValidationResult {
  // ...
}
```

### 4.3 Type Documentation

**Document complex types**

```typescript
// ✅ GOOD - Documented type
/**
 * Complete unit configuration including all components and allocations.
 * 
 * @property tonnage - Unit tonnage (20-200)
 * @property techBase - Primary tech base (Inner Sphere, Clan, or Mixed)
 * @property systemComponents - System component specifications
 * @property armorAllocation - Armor allocation by location
 */
interface ICompleteUnitConfiguration {
  tonnage: number;
  techBase: TechBase;
  systemComponents: SystemComponents;
  armorAllocation: ArmorAllocationMap;
}
```

---

## 5. Error Handling

### 5.1 Error Types

**Use specific error types**

```typescript
// ✅ GOOD - Specific error class
class InvalidTonnageError extends Error {
  constructor(tonnage: number) {
    super(`Invalid tonnage: ${tonnage}. Must be between 20 and 200.`);
    this.name = 'InvalidTonnageError';
  }
}

// Usage
if (tonnage < 20 || tonnage > 200) {
  throw new InvalidTonnageError(tonnage);
}
```

### 5.2 Error Handling Patterns

**Handle errors gracefully**

```typescript
// ✅ GOOD - Graceful error handling
try {
  const unit = await fetchUnit(unitId);
  setUnit(unit);
} catch (error) {
  if (error instanceof InvalidTonnageError) {
    showError('Invalid unit tonnage');
  } else {
    console.error('Failed to fetch unit:', error);
    showError('Failed to load unit');
  }
}
```

---

## 6. Performance Considerations

### 6.1 React Performance

**Memoization**
- Use `React.memo` for expensive components
- Use `useMemo` for expensive calculations
- Use `useCallback` for stable function references

```typescript
// ✅ GOOD - Memoized component
export const ExpensiveComponent = React.memo<ComponentProps>(({ data }) => {
  const processedData = useMemo(() => {
    return expensiveProcessing(data);
  }, [data]);

  return <div>{processedData}</div>;
});

// ✅ GOOD - Stable callback
const handleClick = useCallback(() => {
  onAction(id);
}, [id, onAction]);
```

### 6.2 Code Splitting

**Lazy load heavy components**

```typescript
// ✅ GOOD - Lazy loading
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Spinner />,
  ssr: false,
});
```

---

## 7. Testing Style

### 7.1 Test Organization

**Test file naming**
- Match source file: `Component.tsx` → `Component.test.tsx`
- Group related tests with `describe` blocks

```typescript
// ✅ GOOD - Well-organized test
describe('UnitCard', () => {
  describe('rendering', () => {
    it('renders unit name', () => {
      // ...
    });

    it('renders tech base badge', () => {
      // ...
    });
  });

  describe('interactions', () => {
    it('calls onEdit when edit button clicked', () => {
      // ...
    });
  });
});
```

### 7.2 Test Naming

**Use descriptive test names**

```typescript
// ✅ GOOD - Descriptive test name
it('should calculate engine weight correctly for standard engine', () => {
  // ...
});

// ❌ BAD - Vague test name
it('works', () => {
  // ...
});
```

---

## 8. ESLint Configuration

The project uses ESLint with TypeScript and React rules. Key rules:

- **`@typescript-eslint/no-explicit-any`**: Warns on `any` usage
- **`@typescript-eslint/explicit-module-boundary-types`**: Requires return types
- **`react-hooks/rules-of-hooks`**: Enforces hooks rules
- **`react-hooks/exhaustive-deps`**: Warns on missing dependencies

**Run linting:**
```bash
npm run lint
```

---

## 9. File Organization

### 9.1 Directory Structure

```
src/
├── components/          # React components
│   ├── editor/         # Editor-specific components
│   ├── equipment/      # Equipment-related components
│   └── common/         # Shared components
├── hooks/              # Custom React hooks
├── services/           # Business logic services
├── types/              # TypeScript type definitions
│   └── core/           # Core type definitions
├── utils/              # Utility functions
└── pages/              # Next.js pages
```

### 9.2 File Naming

- **Components**: PascalCase (`UnitCard.tsx`)
- **Utilities**: camelCase (`componentCalculations.ts`)
- **Types**: PascalCase (`UnitInterfaces.ts`)
- **Hooks**: camelCase with `use` prefix (`useUnitData.tsx`)

---

## 10. Common Patterns

### 10.1 Constants

**Define constants at module level**

```typescript
// ✅ GOOD - Module-level constants
const MAX_TONNAGE = 200;
const MIN_TONNAGE = 20;
const DEFAULT_TECH_BASE = TechBase.INNER_SPHERE;

export function validateTonnage(tonnage: number): boolean {
  return tonnage >= MIN_TONNAGE && tonnage <= MAX_TONNAGE;
}
```

### 10.2 Type Guards

**Use type guards for runtime validation**

```typescript
// ✅ GOOD - Type guard pattern
export function isValidUnit(data: unknown): data is ICompleteUnitConfiguration {
  return (
    typeof data === 'object' &&
    data !== null &&
    'tonnage' in data &&
    'techBase' in data &&
    typeof (data as ICompleteUnitConfiguration).tonnage === 'number'
  );
}
```

### 10.3 Utility Functions

**Keep utilities pure and testable**

```typescript
// ✅ GOOD - Pure function
export function calculateEngineWeight(
  tonnage: number,
  engineType: EngineType
): number {
  const multiplier = ENGINE_MULTIPLIERS[engineType];
  return tonnage * multiplier;
}

// ❌ BAD - Side effects
export function calculateEngineWeight(tonnage: number): number {
  const multiplier = getMultiplierFromDatabase(); // Side effect!
  return tonnage * multiplier;
}
```

---

## 11. Migration from Legacy Code

When updating legacy code to follow these standards:

1. **Start with critical paths** - Fix type safety issues first
2. **Update imports** - Migrate to `src/types/core`
3. **Replace string literals** - Use constants (`TechBase.INNER_SPHERE`)
4. **Add type guards** - Replace `as any` casts
5. **Refactor incrementally** - Don't change everything at once

See [TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md) for detailed migration guidance.

---

## 12. Tools and Automation

### 12.1 Pre-commit Hooks

Run linting before committing:
```bash
npm run lint
```

### 12.2 IDE Configuration

**Recommended VS Code settings:**
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.preferences.importModuleSpecifier": "relative"
}
```

---

## Summary

- ✅ Use concrete types, avoid `any`
- ✅ Organize imports logically
- ✅ Follow naming conventions consistently
- ✅ Keep functions focused and single-purpose
- ✅ Use type guards for runtime validation
- ✅ Document public APIs with JSDoc
- ✅ Handle errors gracefully
- ✅ Write descriptive test names
- ✅ Follow React best practices
- ✅ Run linting before committing

For type system specifics, see [TYPE_SYSTEM_BEST_PRACTICES.md](./TYPE_SYSTEM_BEST_PRACTICES.md).

