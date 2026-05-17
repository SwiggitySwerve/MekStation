# Refactor Customizer Type Descriptors

## Why

Adding (or correctly wiring) a unit type to the customizer currently means editing
**six independent surfaces**, each with its own per-type `switch` / `if` ladder:

1. `UnitTypeRouter.tsx` — five near-identical blocks: an `is<Type>` boolean, a
   `useMemo` store-hydration hook, and an `if` that returns
   `<ErrorBoundary><Context.Provider><Customizer/></Provider></ErrorBoundary>`.
2. `tabRegistry.tsx` — the `getTabSpecsForUnitType` switch.
3. `OverviewTabForType.tsx` — a `switch (unitType)` dispatcher.
4. `PreviewTabForType.tsx` — a `switch (unitType)` dispatcher.
5. `ArmorDiagramForType.tsx` — a `switch (unitType)` dispatcher.
6. `RecordSheetPreviewForType.tsx` — a `switch (unitType)` dispatcher.

Nothing ties these together. A unit type can be present in one ladder and missing
(or wrong) in another, and the compiler cannot catch the gap. **This is exactly the
bug class that shipped three times** — the mech `OverviewTab` / `PreviewTab` /
`RecordSheetPreview` leaking into a non-mech customizer because one dispatcher's
branch was missing or stale, crashing with
`useUnitStore must be used within a UnitStoreProvider`.

The five non-mech `UnitTypeRouter` blocks are byte-for-byte structural copies —
~150 lines of duplication that grows linearly with every new unit type.

## What Changes

Introduce a **single per-type descriptor registry** —
`src/components/customizer/shared/customizerTypeRegistry.tsx` — that is the one
source of truth for everything the customizer dispatches by `UnitType`:

- the customizer **shell** (store hydration + store context provider + customizer
  component, or the mech `UnitStoreProvider` + `UnitEditorWithRouting` path);
- the registry **tab set**;
- the **Overview**, **Preview**, **armor-diagram**, and **record-sheet-preview**
  components that the four `*ForType` dispatchers render.

`UnitTypeRouter` and the four `*ForType` dispatchers are rewritten as **thin
descriptor lookups** — no per-type `switch`/`if` ladders remain. Adding a unit type
becomes **one descriptor registration**; a missing field is a **TypeScript compile
error**, not a runtime crash.

No behaviour change. Every unit type renders exactly the components it renders
today; this change only consolidates *how those components are selected*.

## Impact

- **Affected specs:** `customizer-routing` (ADDED: Unit-Type Customizer Resolution).
- **Affected code:**
  - NEW `src/components/customizer/shared/customizerTypeRegistry.tsx`
  - MODIFIED `UnitTypeRouter.tsx` (≈180 lines → ≈40)
  - MODIFIED `OverviewTabForType.tsx`, `PreviewTabForType.tsx`,
    `ArmorDiagramForType.tsx`, `RecordSheetPreviewForType.tsx` (switch → lookup)
  - MODIFIED `tabRegistry.tsx` — `getTabSpecsForUnitType` delegates to the registry
  - MODIFIED test imports + the `nonMechCustomizerTabMount` invariant suite, which
    becomes registry-data-driven and covers a new type automatically.
- **Risk:** Low. Pure refactor, no behaviour change, guarded by the existing
  customizer test suite plus the registry-driven mount invariant suite.
