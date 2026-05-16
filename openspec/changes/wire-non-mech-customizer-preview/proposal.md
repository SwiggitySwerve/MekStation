# Wire Non-Mech Customizer Preview

## Why

The customizer's **Preview tab crashes on every non-mech unit type**. Opening Preview
for a Vehicle / VTOL / Support Vehicle / Aerospace / Conventional Fighter / Battle Armor /
Infantry / ProtoMech throws:

```
useUnitStore must be used within a UnitStoreProvider. Component: PreviewTab
```

Users therefore cannot preview or Save-PDF any non-mech unit they build in the customizer.

**Root cause.** `src/components/customizer/shared/tabRegistry.ts` registers the
shared `SHARED_PREVIEW` and `SHARED_OVERVIEW` tab specs (whose components are the
mech `PreviewTab.tsx` and `OverviewTab.tsx`) into **every** per-type tab set
(`VEHICLE_TABS`, `AEROSPACE_TABS`, `BATTLE_ARMOR_TABS`, `INFANTRY_TABS`,
`PROTOMECH_TABS`). The registry comment claims these tabs "reuse the mech
implementations across all unit types" — but they are **not** shared-safe:

- `PreviewTab.tsx` hard-calls `useUnitStore` (the BattleMech store) for ~20 fields
  and builds a mech-only unit config (`IEditableMech`, mech crit slots, mech armor
  locations). Non-mech customizers mount their own store context
  (`VehicleStoreContext`, `AerospaceStoreContext`, etc.) — there is no
  `UnitStoreProvider`, so `PreviewTab` throws on mount.
- `RecordSheetPreview.tsx` (the preview canvas inside `PreviewTab`) independently
  hard-calls `useUnitStore` — same flaw.
- `OverviewTab.tsx` has the identical flaw; it only avoids crashing today because
  non-mech customizers default to a non-Overview initial tab. Clicking Overview crashes.

**This is the missing UI half of the Wave-1/Wave-2 templated-record-sheet work.**
The changes `add-templated-vehicle-aero-proto-record-sheets` and
`add-templated-infantry-battlearmor-record-sheets` built templated record-sheet
renderers and per-type data extractors. `RecordSheetService` already dispatches per
unit type via `dispatchTargetFromUnit()`, and `exportPDF` / `renderPreview` already
branch mech vs non-mech. But the **only callers** of `extractData` are the mech-only
`PreviewTab.tsx` and `RecordSheetPreview.tsx`. Nothing in the customizer ever calls
the service with non-mech data, so the Wave-1/2 renderers are unreachable from the UI.
This change builds that customizer→service seam.

This is a **pre-existing bug** — it was not introduced by the Wave-1/2 templated
record-sheet changes.

## What Changes

- Introduce a **`PreviewTabForType` dispatcher** that switches on the active
  `UnitType` and renders the correct per-type preview component, mirroring the
  proven `ArmorDiagramForType` pattern. The mech branch reuses the existing
  `PreviewTab` logic unchanged (behaviour-preserving).
- Add **per-type preview components** (`VehiclePreviewTab`, `AerospacePreviewTab`,
  `BattleArmorPreviewTab`, `InfantryPreviewTab`, `ProtoMechPreviewTab`). Each reads
  **only its own per-type store** (so it is safely mounted inside its matching store
  context), builds a per-type unit object of the correct discriminated `unitType`,
  and passes it to `RecordSheetService.extractData` → `exportPDF` / `renderPreview`.
- Make **`RecordSheetPreview`** unit-type-aware (a `RecordSheetPreviewForType`
  dispatcher, or per-type canvas components) since it independently calls
  `extractData`.
- Add a **non-crashing Overview guard** for non-mech types: a graceful
  "Overview not yet available for this unit type" panel rendered via an
  `OverviewTabForType` dispatcher, so no non-mech tab crashes.
- Register the per-type dispatchers in `tabRegistry.ts` in place of the mech
  `SHARED_PREVIEW` / `SHARED_OVERVIEW`, and **correct the misleading registry
  comment** that asserts the shared tabs are reused safely across all unit types.
- Add a **regression test gate**: rendering the Preview tab inside each per-type
  store context must not throw — the inverse of the shipped crash.

## Non-Goals

- **A full per-type Overview editor** is out of scope. Non-mech Overview gets only a
  non-crashing graceful panel. A full per-type Overview editor is named as a
  follow-up change (`add-per-type-customizer-overview`).
- **No changes to `RecordSheetService`, the SVG renderers, the record-sheet
  templates, or the per-type data extractors.** The service layer already works for
  all unit types; this change is purely the customizer UI seam.
- **No changes to mech Preview behaviour.** The mech `PreviewTab` /
  `RecordSheetPreview` path is behaviour-preserving and its existing tests stay green.
- **No new per-type store serialization API.** Per-type stores have no `toUnit`
  helper; the per-type preview components read store fields directly. Adding a shared
  serialization helper is out of scope.
- **`FluffTab`** is already store-decoupled and shared-safe — it is not touched.

## Affected Specs

- `customizer-tabs` — MODIFIED: Preview/Overview tabs become unit-type-aware
  dispatchers; the "all tab components access state via `useUnitStore`" assumption
  is corrected.
- `multi-unit-tabs` — ADDED: per-type Preview wiring requirement; tab registry must
  not register mech-coupled components into non-mech tab sets.
- `record-sheet-export` — ADDED: customizer non-mech preview/export path requirement
  binding each per-type preview to `RecordSheetService` with the correct
  discriminated `unitType`.

## Test Strategy

- Infrastructure: exists — Jest + React Testing Library (`@swc/jest`).
- Tests: tests-after — regression + per-type wiring tests authored alongside
  implementation tasks.
- Agent QA: render-in-context smoke checks (mount each per-type customizer, open
  Preview, assert no throw + canvas/PDF path reachable).
