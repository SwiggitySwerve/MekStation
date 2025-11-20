# Component Name Refactor Documentation

## Overview

This document describes the refactor from name-based matching to ID-based matching for all components and equipment in the codebase.

## Key Changes

### 1. Internal IDs vs Display Names

- **Internal IDs**: Used for all logic, matching, serialization (e.g., `"endo_steel"`, `"ferro_fibrous"`)
- **Display Names**: Used for UI rendering only (e.g., `"Endo Steel"`, `"Ferro-Fibrous"`)

### 2. Component Mappings

| Internal ID | Display Name |
|-------------|--------------|
| `endo_steel` | `Endo Steel` |
| `ferro_fibrous` | `Ferro-Fibrous` |
| `endo_steel_clan` | `Endo Steel (Clan)` |
| `ferro_fibrous_clan` | `Ferro-Fibrous (Clan)` |
| ... | ... |

### 3. Usage Guidelines

#### Logic Layer
```typescript
// ✅ Correct - Use ID for logic
if (equipment.id === 'endo_steel') { ... }

// ❌ Wrong - Don't use display name for logic
if (equipment.name === 'Endo Steel') { ... }
```

#### UI Layer
```typescript
// ✅ Correct - Use display name for UI
<span>{equipment.name}</span>

// ❌ Wrong - Don't use ID for display
<span>{equipment.id}</span>
```

#### Tests
```typescript
// ✅ Correct - Test logic with ID
expect(equipment.id).toBe('endo_steel');

// ✅ Correct - Test UI with display name
expect(equipment.name).toBe('Endo Steel');
```

### 4. Migration

For legacy data that uses display names, use the migration utility:

```typescript
import { migrateOldNameToId } from '../utils/componentNameUtils';

const newId = migrateOldNameToId('Endo Steel Structure'); // Returns 'endo_steel'
```

### 5. Utility Functions

- `getComponentDisplayName(id)`: Get display name from ID
- `getComponentIdByName(name)`: Get ID from display name
- `isSpecialComponent(id)`: Check if component is special
- `isStructureComponent(id)`: Check if component is structure
- `isArmorComponent(id)`: Check if component is armor

## Files Modified

This refactor affects:
- All TypeScript/JavaScript files with component logic
- Component definitions and databases
- Tests
- UI components
- Serialization/deserialization logic

## Breaking Changes

- Component matching logic now uses IDs instead of names
- Display names no longer include "Structure" or "Armor" suffixes for Endo Steel and Ferro-Fibrous
- Serialized data now stores IDs instead of display names

## Migration Steps

1. Update component definitions with ID and name fields
2. Replace name-based logic with ID-based logic
3. Update UI to use display names
4. Update tests to match on IDs for logic
5. Migrate legacy data using migration utility
6. Update serialization to use IDs
