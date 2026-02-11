# Stores Directory

This directory contains Zustand stores and their associated state definitions.

## File Naming Pattern

The stores follow a consistent two-file pattern:

### `xxxState.ts` - State Types & Utilities

Pure TypeScript files containing:

- State interfaces (e.g., `VehicleState`, `AerospaceState`)
- Factory functions (e.g., `createDefaultVehicleState()`)
- Utility functions (e.g., `getTotalVehicleArmor()`)
- Armor allocation helpers

These files have **no Zustand dependencies** and can be imported anywhere.

### `useXxxStore.ts` - Zustand Store Implementation

Contains the actual Zustand store that:

- Imports types/functions from the corresponding `xxxState.ts`
- Implements the store with `create()` from Zustand
- Handles persistence via `zustand/middleware`
- Exports the store hook and context

## Example: Vehicle Store

```typescript
// vehicleState.ts - Pure types and utilities
export interface VehicleState { ... }
export function createDefaultVehicleState(): VehicleState { ... }
export function getTotalVehicleArmor(allocation: IVehicleArmorAllocation): number { ... }

// useVehicleStore.ts - Zustand store
import { VehicleState, createDefaultVehicleState } from './vehicleState';
export const createVehicleStore = () => create<VehicleStore>()(...)
```

## Store Registry

Unit stores support multiple unit types via a registry pattern:

- `unitStoreRegistry.ts` - Manages store instances by unit ID
- `UnitStoreProvider.tsx` - React context provider

## Available Stores

| State File            | Store File               | Purpose                |
| --------------------- | ------------------------ | ---------------------- |
| `unitState.ts`        | `useUnitStore.ts`        | BattleMech state       |
| `vehicleState.ts`     | `useVehicleStore.ts`     | Combat vehicles, VTOLs |
| `aerospaceState.ts`   | `useAerospaceStore.ts`   | Aerospace fighters     |
| `battleArmorState.ts` | `useBattleArmorStore.ts` | Battle armor units     |
| `infantryState.ts`    | `useInfantryStore.ts`    | Conventional infantry  |
| `protoMechState.ts`   | `useProtoMechStore.ts`   | ProtoMechs             |

## Shared Utilities (`utils/`)

- `createStoreRegistry.ts` - Generic registry factory for managing store instances by ID (hydrate, persist, CRUD)
- `clientSafeStorage.ts` - SSR-safe localStorage wrapper for Zustand persist middleware

### Why No Further Shared Store Abstractions

**Audited**: All 6 unit-type stores were audited for extractable shared patterns (Feb 2026).

**Finding**: ~87 lines of truly identical logic across stores — below the 100-line extraction threshold.

| Pattern                                                                            | Lines | Stores   | Why Not Extracted                                                                                                                                                 |
| ---------------------------------------------------------------------------------- | ----- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identity setters (setName, setChassis, setModel, setMulId, setYear, setRulesLevel) | ~32   | 5 of 6   | Simple 4-5 line setters. Extracting requires generic `set()` wrappers that add indirection without reducing complexity. Each setter is trivially readable inline. |
| React context boilerplate (Context, hook, apiHook)                                 | ~23   | 6 of 6   | Type-specific by nature. A generic factory would lose type safety or require complex generics that hurt DX more than 23 lines of copy-paste.                      |
| Equipment actions (remove, clear, linkAmmo)                                        | ~18   | 3-4 of 6 | Only `removeEquipment`/`clearAllEquipment` are truly identical. `addEquipment` differs (location types, turret flags). `linkAmmo` absent in Infantry/BattleArmor. |
| Armor actions (setArmorType, setArmorTonnage)                                      | ~10   | 2-3 of 6 | `autoAllocateArmor` is completely different per unit type (different locations, percentages, rules). Only the trivial setters match.                              |
| markModified                                                                       | ~4    | 5 of 6   | 4 lines. Not worth a utility.                                                                                                                                     |

**Key insight**: The stores _look_ similar at a structural level (identity → chassis → armor → equipment → metadata) but the actual logic diverges significantly per unit type:

- **Vehicles** have turrets, motion type switching (VTOL/tracked/wheeled), flank MP
- **Aerospace** has thrust, fuel, structural integrity, bomb bays, firing arcs
- **BattleArmor** has squad size, manipulators, per-trooper weight/armor, stealth
- **ProtoMechs** have per-location structure, main gun, myomer boosters, 2-9 ton range
- **Infantry** has platoon composition, primary/secondary weapons, field guns, armor kits
- **BattleMech** (UnitStore) already decomposed into 4 action slices

The `isModified: true, lastModifiedAt: Date.now()` idiom appears 200+ times but is a 2-line state flag, not extractable logic.

**Decision**: Keep stores as-is. The existing `createStoreRegistry` and `clientSafeStorage` already extract the genuinely shared infrastructure. Further abstraction would create premature indirection.

## Other Stores

Single-file stores for UI/app state:

- `useAppSettingsStore.ts` - Application preferences
- `useCustomizerStore.ts` - Customizer UI state
- `useNavigationStore.ts` - Navigation state
- `usePilotStore.ts` - Pilot management
- `useIdentityStore.ts` - User identity for vault
