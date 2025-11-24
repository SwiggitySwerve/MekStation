# Rich Component Database Implementation Guide

## Executive Summary

**Objective:** Replace all hardcoded component arrays with a single, comprehensive component database that serves as the single source of truth for all BattleTech components, their metadata, and tech base availability.

**Problem:** Multiple hardcoded arrays across components create maintenance burden, inconsistencies, and inability to dynamically filter based on technology progression.

**Solution:** Create a rich component database that includes all metadata (weights, critical slots, tech levels, introduction years) and generate all dropdown options dynamically from this single source.

---

## Architecture Overview

### Current State (Problematic)
```
ChassisConfigPanel.tsx    → STRUCTURE_TYPES array (hardcoded)
                         → ENGINE_TYPES array (hardcoded)
                         → GYRO_TYPES array (hardcoded)
                         → ENHANCEMENTS array (hardcoded)

HeatSinksPanel.tsx       → Hardcoded heat sink options

ArmorTypeSelector.tsx    → ARMOR_TYPES array (hardcoded)

componentAvailability.ts → Simple name-only arrays
```

### Target State (Solution)
```
COMPONENT_DATABASE       → Rich metadata for all components
    ↓
dropdownGeneration.ts    → Dynamic option generation
    ↓
All Dropdown Components  → Generated options with tech filtering
    ↓
Tech Progression Changes → Auto-filter + auto-resolve invalid selections
    ↓
UnitCriticalManager      → Single rebuild cascade
```

## Database Schema Design

### Core Database Structure
```typescript
export interface ComponentSpec {
  name: string                    // Display name: "Endo Steel (Clan)"
  id: string                      // Unique identifier: "endo_steel_clan"
  weightMultiplier?: number       // For structure: 0.05 = 5% of tonnage
  weightMod?: number              // For engine/gyro: 0.5 = half weight
  weight?: number                 // Fixed weight: 3.0 tons
  criticalSlots: number           // Required critical slots
  techLevel: TechLevel            // "Introductory" | "Standard" | "Advanced" | "Experimental"
  rulesLevel: RulesLevel          // "Introductory" | "Standard" | "Advanced" | "Experimental"
  introductionYear: number       // Year introduced: 3050
  description?: string            // Optional description
  isDefault?: boolean             // Default choice for this tech base
  specialRules?: string[]         // Special game rules or restrictions
}

export interface ComponentCategory {
  [techBase: string]: ComponentSpec[]
}

export interface ComponentDatabase {
  chassis: ComponentCategory
  engine: ComponentCategory
  gyro: ComponentCategory
  heatsink: ComponentCategory
  armor: ComponentCategory
  myomer: ComponentCategory
  targeting: ComponentCategory
  movement: ComponentCategory
}
```

### Example Database Entry
```typescript
chassis: {
  "Inner Sphere": [
    {
      name: "Standard",
      id: "standard",
      weightMultiplier: 0.1,
      criticalSlots: 0,
      techLevel: "Introductory",
      rulesLevel: "Introductory", 
      introductionYear: 2439,
      isDefault: true,
      description: "Standard internal structure provides baseline protection"
    },
    {
      name: "Endo Steel",
      id: "endo_steel",
      weightMultiplier: 0.05,
      criticalSlots: 14,
      techLevel: "Standard",
      rulesLevel: "Standard",
      introductionYear: 3035,
      description: "Lightweight structure saves 50% weight but requires critical slots"
    }
  ],
  "Clan": [
    {
      name: "Standard", 
      id: "standard",
      weightMultiplier: 0.1,
      criticalSlots: 0,
      techLevel: "Introductory",
      rulesLevel: "Introductory",
      introductionYear: 2439,
      isDefault: true,
      description: "Standard internal structure"
    },
    {
      name: "Endo Steel (Clan)",
      id: "endo_steel_clan", 
      weightMultiplier: 0.05,
      criticalSlots: 7,
      techLevel: "Standard",
      rulesLevel: "Standard",
      introductionYear: 2945,
      description: "Clan Endo Steel uses fewer critical slots than Inner Sphere version"
    }
  ]
}
```

## API Interface Specifications

### Core Query Functions
```typescript
// Get all components for a category and tech base
function getComponentsByCategory(
  category: ComponentCategory, 
  techBase: TechBase,
  rulesLevel?: RulesLevel
): ComponentSpec[]

// Find specific component by name
function findComponent(
  name: string, 
  category: ComponentCategory, 
  techBase: TechBase
): ComponentSpec | null

// Get default component for tech base
function getDefaultComponent(
  category: ComponentCategory, 
  techBase: TechBase
): ComponentSpec

// Generate dropdown options
function getDropdownOptions(
  category: ComponentCategory,
  techBase: TechBase, 
  rulesLevel?: RulesLevel,
  currentSelection?: string
): DropdownOption[]

// Validate component selection
function validateComponentSelection(
  componentName: string,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): ValidationResult
```

### Dropdown Generation Interface
```typescript
interface DropdownOption {
  id: string                    // For <option value="">
  name: string                  // Display name
  description?: string          // Metadata display
  weight?: string              // "0.5x weight" or "3.0 tons" 
  criticalSlots?: string       // "14 slots"
  isDisabled?: boolean         // Rules/tech level restrictions
  isDefault?: boolean          // Default selection
}
```

## Migration Strategy

### Phase 1: Create Database (Non-Breaking)
1. Create `COMPONENT_DATABASE` with complete metadata
2. Create helper functions that work alongside existing hardcoded arrays
3. Add database-backed validation functions
4. No component changes yet

### Phase 2: Update Components (Breaking Changes)
1. Replace hardcoded arrays with database queries
2. Update dropdown generation logic
3. Add tech progression filtering
4. Add auto-resolution for invalid selections

### Phase 3: Integration & Testing
1. Integrate with tech progression system
2. Add comprehensive validation
3. Remove obsolete hardcoded arrays
4. Performance optimization

### Backward Compatibility Strategy
```typescript
// Legacy support during transition
export function getLegacyStructureTypes(): LegacyStructureType[] {
  return getComponentsByCategory('chassis', 'Inner Sphere')
    .concat(getComponentsByCategory('chassis', 'Clan'))
    .map(component => ({
      id: component.id,
      name: component.name,
      weightMultiplier: component.weightMultiplier!,
      critSlots: component.criticalSlots,
      techLevel: component.techLevel
    }));
}
```

## Before/After Code Examples

### ChassisConfigPanel.tsx - Structure Dropdown

#### BEFORE (Hardcoded)
```typescript
// Hardcoded array with limited metadata
const STRUCTURE_TYPES = [
  { id: 'standard', name: 'Standard', weightMultiplier: 0.1, critSlots: 0, techLevel: 1 },
  { id: 'endo_steel', name: 'Endo Steel', weightMultiplier: 0.05, critSlots: 14, techLevel: 2 },
  { id: 'endo_steel_clan', name: 'Endo Steel (Clan)', weightMultiplier: 0.05, critSlots: 7, techLevel: 2 },
  // ... more hardcoded entries
];

// No tech progression awareness
<select value={unit.data?.structure?.type || 'standard'}>
  {STRUCTURE_TYPES.map(type => (
    <option key={type.id} value={type.id}>
      {type.name} ({structureWeight}t)
    </option>
  ))}
</select>
```

#### AFTER (Database-Driven)
```typescript
import { getDropdownOptions, validateAndResolveComponent } from '../../utils/componentDatabase';

// Dynamic options based on tech progression
const techBase = unit.techProgression?.chassis || 'Inner Sphere';
const structureOptions = getDropdownOptions('chassis', techBase, unit.rulesLevel);

// Auto-resolve invalid selections
const currentStructure = validateAndResolveComponent(
  unit.data?.structure?.type, 
  'chassis', 
  techBase
);

<select 
  value={currentStructure}
  onChange={(e) => handleStructureChange(e.target.value)}
>
  {structureOptions.map(option => (
    <option key={option.id} value={option.id} disabled={option.isDisabled}>
      {option.name} ({option.weight})
    </option>
  ))}
</select>
```

### HeatSinksPanel.tsx - Heat Sink Type

#### BEFORE (Hardcoded Options)
```typescript
// Fixed options regardless of tech progression
<select value={heatSinkType}>
  <option value="single">Single</option>
  <option value="double">Double</option>
  <option value="double_clan">Double (Clan)</option>
  <option value="compact">Compact</option>
</select>
```

#### AFTER (Tech-Aware)
```typescript
// Tech progression aware options
const techBase = unit.techProgression?.heatsink || 'Inner Sphere';
const heatSinkOptions = getDropdownOptions('heatsink', techBase);

// Auto-resolve if current selection is invalid
const currentHeatSink = validateAndResolveComponent(
  heatSinkType,
  'heatsink', 
  techBase
);

<select 
  value={currentHeatSink}
  onChange={(e) => handleHeatSinkChange(e.target.value)}
>
  {heatSinkOptions.map(option => (
    <option key={option.id} value={option.id}>
      {option.name} ({option.description})
    </option>
  ))}
</select>
```

### Enhancement Dropdown - Myomer Systems

#### BEFORE (Shows All Options)
```typescript
const ENHANCEMENTS = [
  { id: 'none', name: 'None' },
  { id: 'tsm', name: 'Triple-Strength Myomer' },
  { id: 'masc', name: 'MASC' },
  { id: 'industrial_tsm', name: 'Industrial TSM' },
];

// User can select TSM even on Clan tech (invalid)
```

#### AFTER (Tech-Filtered)
```typescript
// Clan tech base = only shows 'None' and 'MASC'
// Inner Sphere tech base = shows all options
const techBase = unit.techProgression?.myomer || 'Inner Sphere';
const enhancementOptions = getDropdownOptions('myomer', techBase);

// TSM auto-resolves to 'None' when switching to Clan tech
```

## Tech Progression Integration Flow

### 1. Tech Progression Change in Overview Tab
```typescript
// User clicks "Clan" for myomer in Overview tab
const newProgression = { ...techProgression, myomer: 'Clan' };

// This triggers configuration update
updateConfiguration({ 
  techProgression: newProgression,
  // Component auto-resolution happens here:
  enhancementType: resolveComponentForTechBase(
    currentEnhancement, 
    'myomer', 
    'Clan'
  )
});
```

### 2. Dropdown Re-filtering (Automatic)
```typescript
// All dropdowns automatically re-render with new options
// React detects techProgression change and re-filters options

// Enhancement dropdown now shows: ['None', 'MASC']
// TSM is no longer available in the dropdown
```

### 3. Auto-Resolution Example
```typescript
// Before: enhancementType = "Triple-Strength Myomer"
// After tech change to Clan: enhancementType = "None" (default)

function resolveComponentForTechBase(current, category, newTechBase) {
  const component = findComponent(current, category, newTechBase);
  if (component) {
    return current; // Still valid
  }
  
  // Invalid - return default for new tech base
  return getDefaultComponent(category, newTechBase).name;
}
```

### 4. Single Rebuild Cascade
```typescript
// Only ONE call to updateConfiguration() triggers:
// 1. UnitCriticalManager.updateConfiguration()
// 2. Component validation and auto-resolution
// 3. Special component regeneration (Endo Steel pieces, etc.)
// 4. Weight/heat/slot recalculations
// 5. Observer notifications → UI updates
```

## Error Handling and Validation

### Component Validation Pipeline
```typescript
interface ValidationResult {
  isValid: boolean;
  resolvedComponent?: ComponentSpec;
  errors: string[];
  warnings: string[];
  autoResolved: boolean;
}

function validateComponentSelection(
  componentName: string,
  category: ComponentCategory,
  techBase: TechBase,
  rulesLevel?: RulesLevel
): ValidationResult {
  // 1. Check if component exists in database
  const component = findComponent(componentName, category, techBase);
  if (!component) {
    return {
      isValid: false,
      resolvedComponent: getDefaultComponent(category, techBase),
      errors: [`${componentName} not available for ${techBase}`],
      warnings: [`Auto-resolved to default component`],
      autoResolved: true
    };
  }
  
  // 2. Check rules level restrictions
  if (rulesLevel && !isComponentAllowedForRulesLevel(component, rulesLevel)) {
    return {
      isValid: false,
      resolvedComponent: findAlternativeComponent(component, rulesLevel),
      errors: [`${componentName} not allowed for ${rulesLevel} rules`],
      warnings: [`Auto-resolved to rules-compliant alternative`],
      autoResolved: true
    };
  }
  
  // 3. Valid component
  return {
    isValid: true,
    resolvedComponent: component,
    errors: [],
    warnings: [],
    autoResolved: false
  };
}
```

### Error Recovery Strategies
```typescript
// Strategy 1: Auto-resolve to default
function autoResolveToDefault(category: ComponentCategory, techBase: TechBase) {
  return getDefaultComponent(category, techBase);
}

// Strategy 2: Find closest alternative
function findClosestAlternative(
  invalidComponent: string, 
  category: ComponentCategory, 
  techBase: TechBase
) {
  // Look for same base type: "XL" → "XL (Clan)"
  // Fall back to default if no alternatives exist
}

// Strategy 3: Preserve user intent when possible
function preserveUserIntent(
  userSelection: string,
  availableComponents: ComponentSpec[]
) {
  // Try to find component with similar characteristics
  // Prefer same tech level, similar weight/slots
}
```

### User Feedback System
```typescript
interface ComponentChangeNotification {
  component: string;
  category: ComponentCategory;
  oldValue: string;
  newValue: string;
  reason: 'tech_progression_change' | 'rules_level_change' | 'invalid_selection';
  action: 'auto_resolved' | 'user_required';
}

// Show user-friendly notifications
function notifyComponentChange(notification: ComponentChangeNotification) {
  if (notification.action === 'auto_resolved') {
    showToast(`${notification.component} changed from ${notification.oldValue} to ${notification.newValue} (${notification.reason})`);
  }
}
```

## Implementation Benefits

### 1. Single Source of Truth
- **One database** defines all component availability
- **No duplication** across multiple hardcoded arrays
- **Automatic consistency** between dropdowns and validation

### 2. Dynamic Filtering
- **Real-time updates** when tech progression changes
- **Rules level filtering** for tournament legal configurations
- **Era filtering** for historical accuracy

### 3. Rich Metadata
- **Weight calculations** from database values
- **Critical slot requirements** for auto-allocation
- **Tech level information** for advanced validation
- **Introduction years** for era-specific games

### 4. Future Extensibility
- **Cost calculations** (when C-Bills system added)
- **Availability ratings** for advanced campaign rules
- **Custom components** through database extensions
- **Mod support** through external component databases

### 5. Improved User Experience
- **Auto-resolution** prevents invalid configurations
- **Smart defaults** based on tech progression
- **Comprehensive validation** with helpful error messages
- **Consistent behavior** across all dropdowns

## Testing Strategy

### Unit Tests
```typescript
// Database integrity tests
describe('Component Database', () => {
  test('all categories have Inner Sphere and Clan variants', () => {
    Object.keys(COMPONENT_DATABASE).forEach(category => {
      expect(COMPONENT_DATABASE[category]['Inner Sphere']).toBeDefined();
      expect(COMPONENT_DATABASE[category]['Clan']).toBeDefined();
    });
  });
  
  test('each tech base has a default component', () => {
    // Verify default components exist for all categories
  });
});

// Component resolution tests  
describe('Component Resolution', () => {
  test('invalid component resolves to default', () => {
    const result = validateAndResolveComponent('Invalid Component', 'myomer', 'Clan');
    expect(result).toBe('None'); // Default for Clan myomer
  });
  
  test('TSM resolves to None for Clan tech', () => {
    const result = resolveComponentForTechBase('Triple-Strength Myomer', 'myomer', 'Clan');
    expect(result).toBe('None');
  });
});
```

### Integration Tests
```typescript
// Full workflow tests
describe('Dropdown Integration', () => {
  test('tech progression change filters all dropdowns', () => {
    // 1. Start with Inner Sphere tech progression
    // 2. Change myomer to Clan in Overview tab  
    // 3. Verify enhancement dropdown only shows None/MASC
    // 4. Verify TSM auto-resolves to None
  });
  
  test('component change triggers single rebuild', () => {
    // Mock updateConfiguration and verify called only once
  });
});
```

---

## Implementation Status: ✅ READY FOR DEVELOPMENT

This comprehensive database approach provides the foundation for a robust, maintainable, and extensible component system that will serve all current and future BattleTech construction needs.

**Next Steps:** 
1. Create TypeScript interfaces (`types/componentDatabase.ts`)
2. Create the component database (`utils/componentDatabase.ts`)  
3. Create helper functions (`utils/componentDatabaseHelpers.ts`)
4. Begin dropdown component migration
