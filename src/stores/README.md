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

| State File | Store File | Purpose |
|------------|------------|---------|
| `unitState.ts` | `useUnitStore.ts` | BattleMech state |
| `vehicleState.ts` | `useVehicleStore.ts` | Combat vehicles, VTOLs |
| `aerospaceState.ts` | `useAerospaceStore.ts` | Aerospace fighters |
| `battleArmorState.ts` | `useBattleArmorStore.ts` | Battle armor units |
| `infantryState.ts` | `useInfantryStore.ts` | Conventional infantry |
| `protoMechState.ts` | `useProtoMechStore.ts` | ProtoMechs |

## Other Stores

Single-file stores for UI/app state:
- `useAppSettingsStore.ts` - Application preferences
- `useCustomizerStore.ts` - Customizer UI state
- `useNavigationStore.ts` - Navigation state
- `usePilotStore.ts` - Pilot management
- `useIdentityStore.ts` - User identity for vault
