# Dropdown Migration Examples - Rich Component Database

## Overview

This document provides detailed before/after examples for migrating each dropdown component from hardcoded arrays to the Rich Component Database system. Each example shows the complete transformation including imports, state management, and UI rendering.

---

## 1. ChassisConfigPanel.tsx - Structure Dropdown

### BEFORE: Hardcoded Array Approach

```typescript
import React, { useCallback, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';

// ❌ HARDCODED: Limited metadata, no tech progression awareness
const STRUCTURE_TYPES = [
  { id: 'standard', name: 'Standard', weightMultiplier: 0.1, critSlots: 0, techLevel: 1 },
  { id: 'endo_steel', name: 'Endo Steel', weightMultiplier: 0.05, critSlots: 14, techLevel: 2 },
  { id: 'endo_steel_clan', name: 'Endo Steel (Clan)', weightMultiplier: 0.05, critSlots: 7, techLevel: 2 },
  { id: 'composite', name: 'Composite', weightMultiplier: 0.05, critSlots: 0, techLevel: 3 },
  { id: 'reinforced', name: 'Reinforced', weightMultiplier: 0.2, critSlots: 0, techLevel: 3 },
  { id: 'industrial', name: 'Industrial', weightMultiplier: 0.15, critSlots: 0, techLevel: 1 },
];

const ChassisConfigPanel: React.FC<ChassisConfigPanelProps> = ({ unit, onUnitChange }) => {
  // ❌ PROBLEM: No tech progression filtering
  const structureWeight = useMemo(() => {
    const structureType = STRUCTURE_TYPES.find(s => s.id === unit.data?.structure?.type) || STRUCTURE_TYPES[0];
    return Math.ceil(unit.mass * structureType.weightMultiplier * 2) / 2;
  }, [unit.mass, unit.data?.structure?.type]);

  // ❌ PROBLEM: No validation against tech progression
  const handleStructureTypeChange = useCallback((structureTypeId: string) => {
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        structure: {
          ...unit.data.structure,
          type: structureTypeId,
        },
      },
    };
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange]);

  return (
    <div className="flex items-center">
      <label className="text-xs font-medium text-gray-700 w-24">Structure:</label>
      {/* ❌ SHOWS ALL OPTIONS: No filtering based on tech progression */}
      <select
        value={unit.data?.structure?.type || 'standard'}
        onChange={(e) => handleStructureTypeChange(e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
      >
        {STRUCTURE_TYPES.map(type => (
          <option key={type.id} value={type.id}>
            {type.name} ({structureWeight}t)
          </option>
        ))}
      </select>
    </div>
  );
};
```

### AFTER: Database-Driven Approach

```typescript
import React, { useCallback, useMemo } from 'react';
import { EditableUnit } from '../../../types/editor';
// ✅ NEW IMPORTS: Rich component database
import { 
  getDropdownOptions, 
  validateAndResolveComponent, 
  findComponent,
  ComponentCategory 
} from '../../../utils/componentDatabase';
import { TechBase } from '../../../types/componentDatabase';

const ChassisConfigPanel: React.FC<ChassisConfigPanelProps> = ({ unit, onUnitChange }) => {
  // ✅ TECH PROGRESSION AWARE: Read current tech base from unit configuration
  const currentTechBase: TechBase = unit.techProgression?.chassis || 'Inner Sphere';
  
  // ✅ DYNAMIC OPTIONS: Generated from database based on tech progression
  const structureOptions = useMemo(() => {
    return getDropdownOptions('chassis', currentTechBase, {
      rulesLevel: unit.rulesLevel,
      showMetadata: true,
      currentSelection: unit.data?.structure?.type
    });
  }, [currentTechBase, unit.rulesLevel, unit.data?.structure?.type]);

  // ✅ AUTO-RESOLUTION: Validate and resolve invalid selections
  const currentStructure = useMemo(() => {
    return validateAndResolveComponent(
      unit.data?.structure?.type, 
      'chassis', 
      currentTechBase
    );
  }, [unit.data?.structure?.type, currentTechBase]);

  // ✅ RICH METADATA: Weight calculation from database
  const structureWeight = useMemo(() => {
    const component = findComponent(currentStructure, 'chassis', currentTechBase);
    if (component?.weightMultiplier) {
      return Math.ceil(unit.mass * component.weightMultiplier * 2) / 2;
    }
    return 0;
  }, [currentStructure, currentTechBase, unit.mass]);

  // ✅ VALIDATED CHANGE: Triggers full rebuild cascade
  const handleStructureTypeChange = useCallback((structureTypeId: string) => {
    // Validate the selection is allowed for current tech base
    const resolved = validateAndResolveComponent(structureTypeId, 'chassis', currentTechBase);
    
    const updatedUnit = {
      ...unit,
      data: {
        ...unit.data,
        structure: {
          ...unit.data.structure,
          type: resolved, // Use resolved component name
        },
      },
    };
    
    // This triggers the full UnitCriticalManager cascade
    onUnitChange(updatedUnit);
  }, [unit, onUnitChange, currentTechBase]);

  return (
    <div className="flex items-center">
      <label className="text-xs font-medium text-gray-700 w-24">Structure:</label>
      {/* ✅ FILTERED OPTIONS: Only shows valid choices for current tech base */}
      <select
        value={currentStructure}
        onChange={(e) => handleStructureTypeChange(e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
      >
        {structureOptions.map(option => (
          <option 
            key={option.id} 
            value={option.id}
            disabled={option.isDisabled}
          >
            {option.name} ({structureWeight}t) {option.criticalSlots}
          </option>
        ))}
      </select>
      
      {/* ✅ TECH LEVEL INDICATOR: Shows when advanced tech is selected */}
      {structureOptions.find(opt => opt.id === currentStructure)?.techLevel !== 'Introductory' && (
        <span className="ml-2 text-xs text-amber-600">
          [{structureOptions.find(opt => opt.id === currentStructure)?.techLevel}]
        </span>
      )}
    </div>
  );
};
```

---

## 2. ChassisConfigPanel.tsx - Enhancement Dropdown

### BEFORE: Hardcoded Array Approach

```typescript
// ❌ HARDCODED: Shows all options regardless of tech progression
const ENHANCEMENTS = [
  { id: 'none', name: 'None' },
  { id: 'tsm', name: 'Triple-Strength Myomer' },
  { id: 'masc', name: 'MASC' },
  { id: 'industrial_tsm', name: 'Industrial TSM' },
];

// ❌ PROBLEM: User can select TSM even when tech progression is set to Clan
<select
  value={unit.data?.myomer?.type || 'none'}
  onChange={(e) => onUnitChange({
    ...unit,
    data: {
      ...unit.data,
      myomer: { ...unit.data.myomer, type: e.target.value }
    }
  })}
  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
>
  {ENHANCEMENTS.map(type => (
    <option key={type.id} value={type.id}>{type.name}</option>
  ))}
</select>
```

### AFTER: Tech Progression Aware

```typescript
// ✅ DYNAMIC OPTIONS: Based on tech progression
const enhancementTechBase: TechBase = unit.techProgression?.myomer || 'Inner Sphere';
const enhancementOptions = useMemo(() => {
  return getDropdownOptions('myomer', enhancementTechBase, {
    rulesLevel: unit.rulesLevel,
    currentSelection: unit.data?.myomer?.type
  });
}, [enhancementTechBase, unit.rulesLevel, unit.data?.myomer?.type]);

// ✅ AUTO-RESOLUTION: TSM auto-resolves to 'None' when switching to Clan
const currentEnhancement = useMemo(() => {
  return validateAndResolveComponent(
    unit.data?.myomer?.type, 
    'myomer', 
    enhancementTechBase
  );
}, [unit.data?.myomer?.type, enhancementTechBase]);

// ✅ FILTERED DROPDOWN: Clan shows only 'None' and 'MASC'
<select
  value={currentEnhancement}
  onChange={(e) => handleEnhancementChange(e.target.value)}
  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
>
  {enhancementOptions.map(option => (
    <option key={option.id} value={option.id}>
      {option.name}
      {option.heatGeneration && ` (+${option.heatGeneration} heat)`}
    </option>
  ))}
</select>

// ✅ TECH BASE INDICATOR: Shows which tech base is selected
<div className="text-xs text-gray-500 mt-1">
  Tech Base: {enhancementTechBase}
  {enhancementOptions.length < 4 && (
    <span className="text-amber-600 ml-2">
      (Limited options for {enhancementTechBase})
    </span>
  )}
</div>
```

---

## 3. HeatSinksPanel.tsx - Heat Sink Type

### BEFORE: Fixed Options

```typescript
// ❌ HARDCODED: Fixed list regardless of tech progression
<select
  value={heatSinkType}
  onChange={(e) => handleHeatSinkTypeChange(e.target.value)}
  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
>
  <option value="single">Single</option>
  <option value="double">Double</option>
  <option value="double_clan">Double (Clan)</option>
  <option value="compact">Compact</option>
</select>
```

### AFTER: Tech Progression Filtered

```typescript
import { getDropdownOptions, validateAndResolveComponent } from '../../../utils/componentDatabase';

const HeatSinksPanel: React.FC<HeatSinksPanelProps> = ({ unit, onUnitChange }) => {
  // ✅ TECH PROGRESSION AWARE
  const heatSinkTechBase: TechBase = unit.techProgression?.heatsink || 'Inner Sphere';
  
  // ✅ DYNAMIC OPTIONS: Different options for IS vs Clan
  const heatSinkOptions = useMemo(() => {
    return getDropdownOptions('heatsink', heatSinkTechBase, {
      rulesLevel: unit.rulesLevel,
      showMetadata: true
    });
  }, [heatSinkTechBase, unit.rulesLevel]);

  // ✅ AUTO-RESOLUTION: Invalid selections resolve to defaults
  const currentHeatSinkType = useMemo(() => {
    return validateAndResolveComponent(
      unit.data?.heat_sinks?.type,
      'heatsink', 
      heatSinkTechBase
    );
  }, [unit.data?.heat_sinks?.type, heatSinkTechBase]);

  // ✅ RICH DISPLAY: Shows dissipation and weight information
  return (
    <div className="flex items-center">
      <label className="text-xs font-medium text-gray-700 w-24">Type:</label>
      <select
        value={currentHeatSinkType}
        onChange={(e) => handleHeatSinkTypeChange(e.target.value)}
        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
      >
        {heatSinkOptions.map(option => (
          <option key={option.id} value={option.id}>
            {option.name}
            {option.description && ` - ${option.description}`}
          </option>
        ))}
      </select>
      
      {/* ✅ METADATA DISPLAY: Current heat sink efficiency */}
      <div className="ml-2 text-xs text-gray-600">
        {heatSinkOptions.find(opt => opt.id === currentHeatSinkType)?.description}
      </div>
    </div>
  );
};
```

---

## 4. ArmorTypeSelector.tsx - Enhanced Filtering

### BEFORE: Basic Tech Filtering

```typescript
import React, { useMemo } from 'react';
import { ArmorType, ARMOR_TYPES } from '../../../types/editor';

const ArmorTypeSelector: React.FC<ArmorTypeSelectorProps> = ({
  currentType,
  availableTypes = ARMOR_TYPES,
  techLevel = 'Standard',
  techBase = 'Inner Sphere',
  onChange,
}) => {
  // ❌ LIMITED FILTERING: Basic tech level filtering only
  const filteredTypes = useMemo(() => {
    return availableTypes.filter(type => {
      if (techLevel === 'Introductory' && type.techLevel !== 'Introductory') {
        return false;
      }
      if (type.techBase && type.techBase !== 'Both' && type.techBase !== techBase) {
        return false;
      }
      return true;
    });
  }, [availableTypes, techLevel, techBase]);

  return (
    <select value={currentType?.id || ''} onChange={handleChange}>
      {filteredTypes.map((type) => (
        <option key={type.id} value={type.id}>
          {type.name}
        </option>
      ))}
    </select>
  );
};
```

### AFTER: Rich Database Integration

```typescript
import React, { useMemo } from 'react';
import { 
  getDropdownOptions, 
  validateAndResolveComponent,
  findComponent 
} from '../../../utils/componentDatabase';
import { TechBase, ComponentSpec } from '../../../types/componentDatabase';

interface ArmorTypeSelectorProps {
  currentType?: string;
  techBase: TechBase;
  rulesLevel?: string;
  onChange: (componentSpec: ComponentSpec) => void;
  disabled?: boolean;
  showDetails?: boolean;
}

const ArmorTypeSelector: React.FC<ArmorTypeSelectorProps> = ({
  currentType,
  techBase,
  rulesLevel,
  onChange,
  disabled = false,
  showDetails = true,
}) => {
  // ✅ RICH FILTERING: Tech base + rules level + tech level
  const armorOptions = useMemo(() => {
    return getDropdownOptions('armor', techBase, {
      rulesLevel,
      showMetadata: true,
      groupByTechLevel: true
    });
  }, [techBase, rulesLevel]);

  // ✅ AUTO-RESOLUTION: Validate current selection
  const resolvedArmorType = useMemo(() => {
    return validateAndResolveComponent(currentType, 'armor', techBase);
  }, [currentType, techBase]);

  // ✅ RICH COMPONENT DATA: Full component specification
  const currentComponent = useMemo(() => {
    return findComponent(resolvedArmorType, 'armor', techBase);
  }, [resolvedArmorType, techBase]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedComponent = findComponent(e.target.value, 'armor', techBase);
    if (selectedComponent) {
      onChange(selectedComponent);
    }
  };

  return (
    <div className="armor-type-selector">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-300 w-20">Armor Type:</label>
        <select
          value={resolvedArmorType}
          onChange={handleChange}
          disabled={disabled}
          className="flex-1 text-xs bg-gray-700 text-gray-100 border border-gray-600 rounded px-2 py-1 disabled:opacity-50"
        >
          {armorOptions.map((option) => (
            <option 
              key={option.id} 
              value={option.id}
              disabled={option.isDisabled}
            >
              {option.name}
              {option.criticalSlots && ` (${option.criticalSlots})`}
            </option>
          ))}
        </select>
      </div>

      {/* ✅ RICH DETAILS: Component specifications */}
      {showDetails && currentComponent && (
        <div className="mt-2 p-2 bg-gray-900 rounded text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-400">Points per Ton:</span>
            <span className="text-gray-200 font-medium">
              {currentComponent.weight || 'Variable'}
            </span>
          </div>
          
          {currentComponent.criticalSlots > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-400">Critical Slots:</span>
              <span className="text-gray-200 font-medium">
                {currentComponent.criticalSlots}
              </span>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-gray-400">Tech Level:</span>
            <span className="text-gray-200 font-medium">
              {currentComponent.techLevel}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Introduction:</span>
            <span className="text-gray-200 font-medium">
              {currentComponent.introductionYear}
            </span>
          </div>
          
          {currentComponent.description && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <p className="text-gray-300 text-xs">{currentComponent.description}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
```

---

## 5. Common Hook Pattern - useComponentDropdown

### Reusable Hook for All Dropdowns

```typescript
// utils/hooks/useComponentDropdown.ts
import { useMemo } from 'react';
import { 
  getDropdownOptions, 
  validateAndResolveComponent,
  findComponent
} from '../componentDatabase';
import { ComponentCategory, TechBase, ComponentSpec } from '../../types/componentDatabase';

interface UseComponentDropdownOptions {
  category: ComponentCategory;
  techBase: TechBase;
  currentSelection?: string;
  rulesLevel?: string;
  showMetadata?: boolean;
  autoResolve?: boolean;
}

export function useComponentDropdown({
  category,
  techBase,
  currentSelection,
  rulesLevel,
  showMetadata = true,
  autoResolve = true
}: UseComponentDropdownOptions) {
  // Generate dropdown options
  const options = useMemo(() => {
    return getDropdownOptions(category, techBase, {
      rulesLevel,
      showMetadata,
      currentSelection
    });
  }, [category, techBase, rulesLevel, showMetadata, currentSelection]);

  // Resolve current selection
  const resolvedSelection = useMemo(() => {
    if (!autoResolve) return currentSelection;
    return validateAndResolveComponent(currentSelection, category, techBase);
  }, [currentSelection, category, techBase, autoResolve]);

  // Get full component specification
  const currentComponent = useMemo(() => {
    return findComponent(resolvedSelection, category, techBase);
  }, [resolvedSelection, category, techBase]);

  // Check if selection was auto-resolved
  const wasAutoResolved = currentSelection !== resolvedSelection;

  return {
    options,
    resolvedSelection,
    currentComponent,
    wasAutoResolved,
    isValid: !!currentComponent
  };
}

// Example usage in any dropdown component:
const MyDropdownComponent = ({ unit, techProgression, onChange }) => {
  const {
    options,
    resolvedSelection,
    currentComponent,
    wasAutoResolved
  } = useComponentDropdown({
    category: 'engine',
    techBase: techProgression.engine,
    currentSelection: unit.engineType,
    rulesLevel: unit.rulesLevel
  });

  return (
    <div>
      <select 
        value={resolvedSelection}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map(option => (
          <option key={option.id} value={option.id}>
            {option.name} {option.weight}
          </option>
        ))}
      </select>
      
      {wasAutoResolved && (
        <div className="text-xs text-amber-600 mt-1">
          Selection auto-resolved due to tech progression change
        </div>
      )}
    </div>
  );
};
```

---

## 6. Tech Progression Integration Flow

### Overview Tab → Dropdown Updates

```typescript
// components/overview/OverviewTabV2.tsx
const handleTechProgressionChange = (subsystem: ComponentCategory, techBase: TechBase) => {
  // 1. Update tech progression
  const newProgression = { ...techProgression, [subsystem]: techBase };
  
  // 2. Auto-resolve any invalid component selections
  const configUpdates: any = { techProgression: newProgression };
  
  // Check each component category for invalid selections
  COMPONENT_CATEGORIES.forEach(category => {
    const currentComponent = getCurrentComponentForCategory(category);
    const resolvedComponent = validateAndResolveComponent(
      currentComponent, 
      category, 
      newProgression[category]
    );
    
    if (resolvedComponent !== currentComponent) {
      // Component was auto-resolved
      const configProperty = getConfigPropertyForCategory(category);
      configUpdates[configProperty] = resolvedComponent;
      
      // Notify user of auto-resolution
      showNotification({
        type: 'info',
        message: `${currentComponent} changed to ${resolvedComponent} due to tech progression change`
      });
    }
  });
  
  // 3. Single configuration update triggers full rebuild
  updateConfiguration(configUpdates);
};

// Result: All dropdowns automatically re-filter and show only valid options
```

---

## Migration Benefits Summary

### 1. **Consistency**
- All dropdowns use the same data source
- Identical behavior across components
- No more hardcoded array drift

### 2. **Tech Progression Awareness**
- Automatic filtering based on tech base
- Auto-resolution of invalid selections
- Real-time updates when tech progression changes

### 3. **Rich Metadata**
- Weight calculations from database
- Critical slot information
- Tech level and introduction year display
- Detailed descriptions for tooltips

### 4. **Future-Proof**
- Easy to add new components to database
- Support for rules level filtering
- Era-based filtering capability
- Extensible for custom modifications

### 5. **Better User Experience**
- No invalid selections possible
- Clear feedback on tech restrictions
- Intelligent auto-resolution
- Consistent validation across all components

---

## Implementation Checklist

### ✅ Component Migrations Required:
- [ ] ChassisConfigPanel.tsx - Structure dropdown
- [ ] ChassisConfigPanel.tsx - Engine dropdown  
- [ ] ChassisConfigPanel.tsx - Gyro dropdown
- [ ] ChassisConfigPanel.tsx - Enhancement dropdown
- [ ] HeatSinksPanel.tsx - Heat sink type dropdown
- [ ] ArmorTypeSelector.tsx - Armor type dropdown
- [ ] Any other component dropdowns using hardcoded arrays

### ✅ Support Systems:
- [ ] Create useComponentDropdown hook
- [ ] Update tech progression integration
- [ ] Add user notification system for auto-resolutions
- [ ] Create validation and error handling
- [ ] Add comprehensive testing

This migration will transform the entire dropdown system into a cohesive, database-driven architecture that properly respects BattleTech technology progression rules.
