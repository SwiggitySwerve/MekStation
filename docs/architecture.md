---
title: Architecture & System Design
description: Current mech customizer + mech lab architecture overview for BattleTech Editor.
---

## 1. State & Domain Layers

### MechLab State
- Defined in `src/features/mech-lab/store/MechLabState.ts`.
- `IMechLabState` holds canonical mech metadata (tonnage, tech base), systems configuration (structure, armor, engine, gyro, cockpit, heat sinks), allocations (armor, equipment, critical slots), derived validation fields, and fluff notes.
- `IMechLabActions` exposes typed setters (`setTonnage`, `setStructureType`, `setArmorAllocation`, `setFluffNotes`, etc.) so UI panels remain type-safe.
- `useMechLabStore` (React hook) wraps the state with derived metrics via `calculateMechLabMetrics` for the legacy Mech Lab UI.

### Customizer Store (Zustand)
- `src/features/mech-customizer/store/useCustomizerStore.ts` mirrors the mech lab state but adds UI-specific flags (active tab, tray expansion, debug panel).
- All actions delegate to the same domain mutations as Mech Lab (e.g., calling `setArmorAllocation` updates the shared structure).
- Reset flows (full, configuration, equipment-only) call `CustomizerResetService` to rebuild armor allocation, equipment, and validation state.

### Mechanics Layer
- Pure calculation modules live under `src/mechanics`:
  - `WeightOps` – structure/engine/gyro/cockpit/armor/jump jet weights, max armor points.
  - `Structure`, `Engine`, `Gyro` – specialized helpers for UI panels/tests.
  - `CriticalSlots` – slot layout generation + placement helpers.
  - `Validation` – `MechValidator.validate` enforces weight, tech base, and system rules.
- Treat these files as the **single source of truth** for calculations; UI layers only read their results.

## 2. Component Architecture

### Shared Panels
- `src/features/mech-lab/components/panels/*` (Structure, Engine, Equipment, Export, PaperDoll) are prop-driven and can consume either store (`useMechLabStore` or `useCustomizerViewModel`).
- These panels handle presentation only; all calculations come from WeightOps/mechanics.

### Customizer Experience
- `CustomizerApp` handles top-level layout: equipment tray, stats banner, tab navigation/content, reset dialog, and optional debug panel.
- Tabs:
  - `overview`: weight summary + validation messages.
  - `structure`: reuses StructurePanel + EnginePanel.
  - `armor`: typed armor allocation editor + armor type selection.
  - `equipment`: equipment management + export.
  - `criticals`: interactive paper doll.
  - `fluff`: chassis metadata + narrative notes.

## 3. Reset & Persistence

### CustomizerResetService
- `src/services/CustomizerResetService.ts` provides `reset(state, { mode })` with three modes:
  - `full`: clones DEFAULT_MECH_STATE but preserves tonnage/tech base/name/model.
  - `configuration`: resets structure/armor/heat sink/cockpit/engine types; leaves equipment.
  - `equipment`: clears equipment allocations, resetting critical slots.
- Always revalidates the returned state so UI metrics remain accurate.

### Persistence Hooks
- Armor allocation uses `ARMOR_LOCATIONS` and `createEmptyArmorAllocation` so front/rear values per location remain typed.
- Fluff notes stored as freeform text (`fluffNotes`).
- Tabs read/write localStorage key `mech-customizer-active-tab` for continuity.

## 4. Documented Patterns

### Component Update Flow (Legacy)
- Docs under `docs-old/architecture/ComponentUpdateArchitecture.md` describe the prior MultiUnitProvider + ComponentUpdateService architecture (SRP, adapters, SOLID). Use it solely for historical context—new work should target the Zustand-based store.

### Special Component Managers
- `docs-old/architecture/SpecialComponentManagerConsolidation.md` and `ComponentUpdateArchitecture.md` explain past TypeScript services (ComponentUpdateService, adapters, MultiUnitProvider). Use these if you need to port logic; otherwise rely on the new mechanics modules + store actions.

## 5. Testing & Validation Hooks

- Jest suites live under `src/mechanics/__tests__` and `src/features/mech-customizer/store/__tests__`.
- WeightOps tests ensure constants match `BattleTechConstructionRules`.
- Critical slot tests verify dynamic slot allocation for XL engines and equipment placement.
- Customizer store tests cover tonnage updates, equipment addition, reset modes, and armor allocation.

## 6. Future Enhancements

- Align any remaining legacy helper services with the new mechanics layer (if they are still required for backend use cases).
- Expand `CustomizerResetService` to support partial resets (e.g., only arms/legs).
- Add undo/redo capabilities by snapshotting `IMechLabState` transitions.
- Integrate asynchronous persistence (API sync) via middleware on the Zustand store.

## 7. File Map (New Source of Truth)

| Concern                     | Primary Files                                                 |
|-----------------------------|---------------------------------------------------------------|
| State definitions/actions   | `src/features/mech-lab/store/MechLabState.ts`, `useMechLabStore.ts` |
| Customizer store/UI         | `src/features/mech-customizer/store/useCustomizerStore.ts`, `components/*` |
| Mechanics/calculations      | `src/mechanics/*`                                             |
| Reset logic                 | `src/services/CustomizerResetService.ts`                      |
| Tests                       | `src/mechanics/__tests__/*`, `src/features/mech-customizer/store/*.test.ts` |
| Legacy references           | `docs-old/architecture/*`, `docs-old/technical/*`             |

