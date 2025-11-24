# Equipment Variants Handling with iTech Base Interface

## Overview

After the project reorganization and typing improvements, the BattleTech editor now handles equipment variants through a sophisticated system that separates equipment definitions by tech base (Inner Sphere vs Clan), while maintaining type safety and component organization.

## Core Architecture

### 1. Equipment Definition Structure

Equipment is defined using a base interface with tech-specific variants:

```typescript
// From battletech-editor-app/data/equipment/types.ts
export interface Equipment {
  id: string;
  name: string;
  category: EquipmentCategory;
  baseType?: string;
  description?: string;
  requiresAmmo: boolean;
  introductionYear: number;
  rulesLevel: RulesLevel;
  techRating?: string;
  sourceBook?: string;
  pageReference?: string;
  variants: {
    IS?: EquipmentVariant;   // Inner Sphere variant
    Clan?: EquipmentVariant; // Clan variant
  };
  special?: string[];
  allowedLocations?: string[];
  locationRestrictions?: LocationRestrictions;
}
```

### 2. Tech Base Variants

Each equipment piece can have different specifications for different tech bases:

```typescript
export interface EquipmentVariant {
  weight: number;         // Weight in tons
  crits: number;         // Critical slots required
  damage?: number | null; // Damage value
  heat?: number | null;   // Heat generated/dissipated
  minRange?: number | null;
  rangeShort?: number | null;
  rangeMedium?: number | null;
  rangeLong?: number | null;
  rangeExtreme?: number | null;
  ammoPerTon?: number | null;
  cost?: number | null;
  battleValue?: number | null;
}
```

### 3. Example: PPC Variants

```typescript
export const HEAVY_PPC: Equipment = {
  id: 'heavy_ppc',
  name: 'Heavy PPC',
  category: 'Energy Weapons',
  baseType: 'Heavy PPC',
  description: 'Heavy PPC - Reduced heat particle projection cannon',
  requiresAmmo: false,
  introductionYear: 3067,
  rulesLevel: 'Standard',
  techRating: 'E',
  variants: {
    Clan: {
      weight: 6,    // Lighter for Clan
      crits: 2,     // Fewer slots for Clan
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 150000,
      battleValue: 176
    },
    IS: {
      weight: 7,    // Heavier for Inner Sphere
      crits: 3,     // More slots for Inner Sphere
      damage: 10,
      heat: 10,
      minRange: 0,
      rangeShort: 6,
      rangeMedium: 12,
      rangeLong: 18,
      cost: 150000,
      battleValue: 176
    }
  }
};
```

## Component Integration

### 1. Equipment Browser Component

The `EquipmentBrowser` component flattens the variant structure for display:

```typescript
// From battletech-editor-app/components/criticalSlots/EquipmentBrowser.tsx
function flattenLocalEquipment(): LocalEquipmentVariant[] {
  const flattened: LocalEquipmentVariant[] = [];
  
  ALL_EQUIPMENT_VARIANTS.forEach((equipment) => {
    // Process each tech base variant
    Object.entries(equipment.variants).forEach(([techBase, variant]) => {
      const flattenedVariant: LocalEquipmentVariant = {
        id: `${equipment.id}_${techBase.toLowerCase()}`,
        name: equipment.name,
        category: equipment.category,
        techBase: techBase as TechBase,
        weight: variant.weight,
        crits: variant.crits,
        // ... other properties
      };
      flattened.push(flattenedVariant);
    });
  });
  
  return flattened;
}
```

### 2. Type Safety with Interfaces

The system uses comprehensive TypeScript interfaces:

```typescript
// From battletech-editor-app/types/core/EquipmentInterfaces.ts
export interface IEquipmentVariant {
  readonly techBase: TechBase;
  readonly weight: number;
  readonly slots: number;
  readonly cost?: number;
  readonly battleValue?: number;
  readonly modifiers?: IEquipmentModifier[];
}

export interface IEquipment extends IEquipmentConfiguration {
  readonly variants?: IEquipmentVariant[];
  readonly sourceBook?: string;
  readonly pageReference?: string;
  readonly battleValue?: number;
  readonly cost?: number;
  readonly availability?: IAvailabilityRating;
  readonly special?: string[];
}
```

## Data Organization

### 1. Hierarchical Structure

Equipment data is organized by category:

```
battletech-editor-app/data/equipment/
├── energy-weapons/
│   ├── ppcs.ts
│   ├── flamers.ts
│   └── index.ts
├── ballistic-weapons/
├── missile-weapons/
├── equipment/
├── ammunition/
└── index.ts
```

### 2. Centralized Export

All equipment variants are exported from a single location:

```typescript
// From battletech-editor-app/data/equipment/index.ts
export const ALL_EQUIPMENT_VARIANTS = [
  ...ENERGY_WEAPONS,
  ...BALLISTIC_WEAPONS,
  ...MISSILE_WEAPONS,
  ...ARTILLERY_WEAPONS,
  ...CAPITAL_WEAPONS,
  // ... other categories
];
```

## Service Layer Integration

### 1. Equipment Data Service

```typescript
// From battletech-editor-app/utils/equipment/EquipmentBrowserTypes.ts
export interface IEquipmentDataService {
  loadAllEquipment(): Promise<EquipmentVariant[]>;
  getEquipmentById(id: string): EquipmentVariant | null;
  convertToEquipmentObject(variant: EquipmentVariant): EquipmentObject;
  getCategories(): string[];
  getTechBases(): string[];
  isReady(): boolean;
}
```

### 2. Equipment Integration Service

```typescript
// From battletech-editor-app/utils/constructionRules/EquipmentIntegrationService.ts
export interface EquipmentTechVariant {
  id: string;
  name: string;
  techBase: TechBase;
  weight: number;
  slots: number;
  cost?: number;
  battleValue?: number;
  category: string;
  rulesLevel: RulesLevel;
  special?: string[];
}
```

## Key Benefits of This Architecture

### 1. **Type Safety**
- All equipment variants are strongly typed
- Compile-time validation prevents runtime errors
- Clear interfaces for all equipment-related operations

### 2. **Separation of Concerns**
- Equipment definitions are separated from display logic
- Tech base differences are handled at the data level
- Components focus on presentation and user interaction

### 3. **Flexibility**
- Easy to add new equipment or variants
- Support for equipment with only one tech base variant
- Extensible for future equipment types

### 4. **Performance**
- Equipment data is flattened once and cached
- Efficient filtering and sorting operations
- Minimal re-computation during user interactions

## Tech Base Handling

### 1. Tech Base Enumeration

```typescript
export type TechBase = 'IS' | 'Clan';
```

### 2. Dynamic Tech Base Resolution

The system automatically:
- Filters equipment by available tech bases
- Displays appropriate variants based on unit configuration
- Handles mixed tech base scenarios
- Validates tech base compatibility

### 3. UI Display

```typescript
function getTechBaseDisplayName(techBase: string): string {
  switch (techBase) {
    case 'IS': return 'Inner Sphere';
    case 'Clan': return 'Clan';
    default: return techBase;
  }
}
```

## Equipment Allocation Integration

The variant system integrates seamlessly with the critical slot allocation system:

1. **Selection**: Users select equipment variants from the browser
2. **Conversion**: Variants are converted to `EquipmentObject` for allocation
3. **Allocation**: Equipment is placed in appropriate critical slots
4. **Validation**: Tech base compatibility is validated during allocation

## Conclusion

The reorganized equipment variant system provides a robust, type-safe, and efficient way to handle the complexity of BattleTech equipment with different tech base specifications. The separation of data definition, processing, and presentation ensures maintainability while providing excellent user experience through the equipment browser and allocation systems.

The iTech base interface concept is implemented through the variant system, where each piece of equipment can have different specifications for different tech bases, all handled transparently by the type system and component architecture.