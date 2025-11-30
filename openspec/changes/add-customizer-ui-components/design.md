# Customizer UI Components - Technical Design

## Context

### Background
The customizer is the primary interface for creating and editing BattleMech units. It requires a cohesive set of UI components that work together to provide a fluid editing experience with real-time feedback.

### Constraints
- **Technical**: Must use React with TypeScript, Tailwind CSS for styling
- **BattleTech Rules**: Visual feedback must accurately represent game rules
- **Performance**: Components must handle frequent updates during editing
- **Accessibility**: Support keyboard navigation and screen readers

### Stakeholders
- **Users**: Configure units through visual interfaces
- **Developers**: Build on component patterns for future features

---

## Goals & Non-Goals

### Goals
1. Provide intuitive visual interfaces for all unit configuration aspects
2. Enable multi-unit editing with session persistence
3. Maintain consistent visual language across all components
4. Support both mouse and keyboard interactions

### Non-Goals
1. Mobile-first design (desktop-focused, responsive as enhancement)
2. Theme customization (dark theme only for initial release)
3. Offline-first architecture (online with local caching)

---

## Architecture

### Component Hierarchy
```
MultiUnitProvider (Zustand state)
└── CustomizerPage
    ├── TabManager (multi-unit tabs)
    ├── UnitInfoBanner (stats summary)
    ├── TabNavigation (section tabs)
    ├── TabContent
    │   ├── OverviewTab
    │   ├── StructureTab
    │   ├── ArmorTab
    │   │   └── ArmorDiagramDisplay
    │   ├── EquipmentTab
    │   │   └── EquipmentBrowser
    │   ├── CriticalsTab
    │   │   └── CriticalSlotsDisplay
    │   └── FluffTab
    ├── EquipmentTray (persistent sidebar)
    ├── ColorLegend (collapsible reference)
    └── ResetConfirmationDialog (modal)
```

### State Management
```typescript
// Zustand store for multi-unit state
interface UnitStoreState {
  tabs: Record<string, TabState>;
  tabOrder: string[];
  activeTabId: string | null;
}

// React context for active unit
interface UnitContextValue {
  unit: IBattleMech;
  updateConfiguration: (updates: Partial<IBattleMech>) => void;
  unitVersion: number;
}
```

### Data Flow
```
User Action → Component Handler → Context Update → State Change → Re-render
                                        ↓
                            Zustand Persist → localStorage
```

---

## Type References

### Core Imports
```typescript
import type { IBattleMech } from '@/types/unit/BattleMechInterfaces';
import { MechLocation, CriticalSlot } from '@/types/construction/CriticalSlotAllocation';
import { IEquipmentItem, EquipmentCategory } from '@/types/equipment';
import { TechBase } from '@/types/enums/TechBase';
import { RulesLevel } from '@/types/enums/RulesLevel';
```

### Service Integration
```typescript
import { EquipmentLookupService } from '@/services/equipment';
import { CalculationService } from '@/services/construction';
import { ValidationService } from '@/services/construction';
```

---

## Planned File Structure

```
src/
├── components/
│   └── customizer/
│       ├── armor/
│       │   ├── ArmorDiagramDisplay.tsx
│       │   ├── ArmorTab.tsx
│       │   └── MechSilhouette.tsx
│       ├── criticals/
│       │   ├── CriticalSlotsDisplay.tsx
│       │   ├── CriticalSlotDropZone.tsx
│       │   ├── UnallocatedEquipmentDisplay.tsx
│       │   └── UnifiedColorLegend.tsx
│       ├── equipment/
│       │   ├── EquipmentBrowser.tsx
│       │   ├── EquipmentTray.tsx
│       │   └── EquipmentTrayItem.tsx
│       ├── multiUnit/
│       │   ├── MultiUnitProvider.tsx
│       │   ├── TabManager.tsx
│       │   └── NewTabModal.tsx
│       ├── overview/
│       │   └── OverviewTab.tsx
│       ├── tabs/
│       │   ├── StructureTab.tsx
│       │   ├── ArmorTab.tsx
│       │   ├── EquipmentTab.tsx
│       │   ├── CriticalsTab.tsx
│       │   └── FluffTab.tsx
│       ├── common/
│       │   └── ResetConfirmationDialog.tsx
│       ├── UnitInfoBanner.tsx
│       └── TopStatsBanner.tsx
├── hooks/
│   ├── useUnit.ts
│   ├── useEquipmentBrowser.ts
│   └── useCustomizerReset.ts
├── stores/
│   └── unitStore.ts
├── utils/
│   └── colors/
│       ├── equipmentColors.ts
│       └── classifyEquipment.ts
└── styles/
    └── criticalSlots.module.css
```

---

## Color System Design

### System Component Colors
| Component | Background | Border |
|-----------|-----------|--------|
| Engine | `bg-orange-600` | `border-orange-500` |
| Gyro | `bg-purple-600` | `border-purple-500` |
| Actuators | `bg-blue-600` | `border-blue-500` |
| Cockpit | `bg-yellow-600` | `border-yellow-500` |
| Empty | `bg-gray-600` | `border-dashed` |

### Equipment Type Colors
| Type | Background |
|------|-----------|
| Energy Weapons | `bg-red-700` |
| Ballistic Weapons | `bg-red-800` |
| Missile Weapons | `bg-red-600` |
| Ammunition | `bg-orange-700` |
| Heat Sinks | `bg-cyan-700` |
| Electronics | `bg-blue-700` |

### Tech Base Colors
| Tech Base | Accent Color |
|-----------|--------------|
| Inner Sphere | `text-blue-400` |
| Clan | `text-green-400` |
| Mixed | `text-purple-400` |

---

## Dependencies
- React 18+
- React DnD (drag-and-drop)
- Zustand (state management)
- Tailwind CSS

---

## Open Questions
1. Should equipment tray support drag-to-remove?
2. Should multi-unit tabs sync across browser tabs?

