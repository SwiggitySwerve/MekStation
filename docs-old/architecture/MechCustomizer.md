# Mech Customizer Architecture (2025 Refresh)

The legacy `src-old/pages/customizer-v2` experience has been rebuilt in the modern Next.js + Zustand stack. This document summarizes where the new logic lives and how to extend it without touching the deprecated code paths.

## High-Level Structure

```
src/
 ├─ app/customizer/page.tsx     ➜ Route entry point (Client Component)
 ├─ features/mech-customizer/   ➜ UI/UX rebuilt from legacy tabs
 │   ├─ components/TopStatsBanner.tsx
 │   ├─ components/EquipmentTray.tsx
 │   └─ components/tabs/*.tsx
 ├─ features/mech-lab/          ➜ Shared panels reused by both dashboard + customizer
 ├─ services/CustomizerResetService.ts
 └─ mechanics/CriticalSlots.ts  ➜ Slot accounting + layout helpers
```

The `CustomizerApp` component wires the Zustand store, equipment tray, tab navigation, and reset dialog together. The existing Mech Lab panels (`StructurePanel`, `EnginePanel`, etc.) are now prop-driven so they can consume shared state instead of instantiating their own React state.

## Zustand Store

- `src/features/mech-customizer/store/useCustomizerStore.ts` exposes `unit`, derived `metrics`, `validation`, tab toggles, and `IMechLabActions`.
- Actions wrap `IMechLabState` mutators (tonnage, system types, armor allocation, fluff notes, equipment CRUD, reset helper).
- `useCustomizerViewModel()` is the recommended selector for UI components; it memoizes `{ unit, metrics, validation, actions }`.
- Tests (`useCustomizerStore.test.ts`) cover tonnage changes, equipment weight math, reset flows, and the new armor allocation updates.

## Armor & Fluff UX

- `ARMOR_LOCATIONS` and `createEmptyArmorAllocation()` live in `MechLabState.ts` and define the canonical per-location schema.
- The Armor tab now edits front/rear allocations for each location while showing total / remaining points.
- Fluff tab persists `fluffNotes` so narrative context exports alongside the configuration.

## Reset & Validation

- `CustomizerResetService` supports `full`, `equipment`, and `configuration` modes and now rebuilds armor allocations via `createEmptyArmorAllocation()`.
- `docs/testing/customizer-validation-checklist.md` lists the manual smoke scenarios that should run before release.

## Extending the Feature

1. Add new fields to `IMechLabState` + `IMechLabActions`.
2. Update both stores (`useMechLabStore`, `useCustomizerStore`) so shared panels pick up the change automatically.
3. Wire UI through the tab components or panels (prefer reusing existing panels over duplicating functionality).
4. Add targeted Jest coverage if the change touches store logic or services.

The old `src-old` tree remains for reference but is no longer exercised at runtime. Any new work should target the files listed above.***

