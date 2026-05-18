# Design: Refactor Customizer Type Descriptors

## Technical Approach

One module — `customizerTypeRegistry.tsx` — exports an array of
`CustomizerTypeDescriptor` objects (one per unit-type family) and a
`getCustomizerDescriptor(unitType)` lookup. Every customizer surface that today
branches on `UnitType` becomes a lookup into this registry.

```ts
interface CustomizerTypeDescriptor {
  /** Every UnitType value this descriptor serves (e.g. [VEHICLE, VTOL]). */
  readonly unitTypes: readonly UnitType[];
  /** Human label — used for ErrorBoundary names and debugging. */
  readonly label: string;
  /** Registry tab set for this type (the existing *_TABS array). */
  readonly tabs: TabSpec<unknown>[];
  /** Full customizer shell: hydrates the store, mounts the provider + customizer. */
  readonly Shell: React.ComponentType<CustomizerShellProps>;
  /** Rendered by the Overview-tab dispatcher. */
  readonly OverviewComponent: React.ComponentType<DispatchedOverviewProps>;
  /** Rendered by the Preview-tab dispatcher. */
  readonly PreviewComponent: React.ComponentType<DispatchedPreviewProps>;
  /** Rendered by the armor-diagram dispatcher. */
  readonly ArmorDiagramComponent: React.ComponentType<{ className?: string }>;
  /** Rendered by the record-sheet-preview-canvas dispatcher. */
  readonly RecordSheetPreviewComponent: React.ComponentType<RecordSheetCanvasProps>;
}
```

`CustomizerShellProps = { activeTab: TabInfo; activeTabId: CustomizerTabId;
onTabChange: (tabId: CustomizerTabId) => void }`.

## Architecture Decisions

### Decision: `Shell` is a component, not a render callback

The shell must hydrate a store with `useMemo` — that is a hook, so it cannot live
in a plain `renderShell(ctx)` callback (Rules of Hooks). Each descriptor therefore
exposes a `Shell` **component**. `UnitTypeRouter` resolves the descriptor and mounts
exactly one `<Shell/>`, so hook order is stable across renders even though the
*which* shell changes — React treats a different component type as a fresh mount,
which is correct here (switching unit type already remounts the subtree today).

### Decision: A shared `NonMechShell` factory, a bespoke `MechShell`

The five non-mech shells are structurally identical: `getStore(id) ??
hydrateOrCreate(id, tab)` in a `useMemo`, then
`<ErrorBoundary><StoreContext.Provider><Customizer store={store}/></Provider></ErrorBoundary>`.
A factory `createNonMechShell({ label, getStore, hydrateOrCreate, StoreContext,
Customizer })` returns that component once. Each non-mech descriptor is then ~6
lines of data.

The mech path is genuinely different — it uses the async-hydrating
`UnitStoreProvider` (with a loading fallback) and `UnitEditorWithRouting` instead of
a `store`-prop customizer. The mech descriptor supplies its own `MechShell`
component. The descriptor *interface* stays uniform; only the mech `Shell`
implementation differs. This keeps the abstraction honest — no leaky union type,
no "mech-or-not" branching inside the registry consumers.

### Decision: Registry is the SSOT; `getTabSpecsForUnitType` delegates

`getCustomizerDescriptor(unitType).tabs` becomes the single unit-type → tab-set
mapping. `tabRegistry.tsx` keeps exporting the `*_TABS` array constants (the
descriptor registry imports them — one-way dependency, no cycle) but its
`getTabSpecsForUnitType` is reimplemented as a one-line delegate to the descriptor
registry. To avoid an import cycle, `getTabSpecsForUnitType` moves into
`customizerTypeRegistry.tsx` and `tabRegistry.tsx` re-exports it for back-compat.

### Decision: Dispatchers keep their public prop shape

`OverviewTabForType`, `PreviewTabForType`, `ArmorDiagramForType`,
`RecordSheetPreviewForType` keep their exact exported names and prop interfaces —
only their bodies change from a `switch` to
`getCustomizerDescriptor(unitType).XComponent`. Every existing caller and test
keeps working unchanged.

### Decision: No behaviour change — verified by component identity

For each unit type, the component the descriptor yields MUST be the same component
the current `switch` yields. The existing dispatcher tests already assert this by
element type (e.g. `OverviewTabForType.test.tsx` asserts the mech branch
`element.type === OverviewTab`). Those assertions are the regression guard; they
stay green iff the registry wired the same components.

## Data Flow

```
customizer page → UnitTypeRouter
  └─ getCustomizerDescriptor(activeTab.unitType)
       └─ <descriptor.Shell activeTab activeTabId onTabChange/>
            ├─ non-mech: useMemo store → <StoreContext.Provider><Customizer/></>
            └─ mech:     <UnitStoreProvider><UnitEditorWithRouting/></>

OverviewTabForType(unitType)        → getCustomizerDescriptor(u).OverviewComponent
PreviewTabForType(unitType)         → getCustomizerDescriptor(u).PreviewComponent
ArmorDiagramForType(unitType)       → getCustomizerDescriptor(u).ArmorDiagramComponent
RecordSheetPreviewForType(unitType) → getCustomizerDescriptor(u).RecordSheetPreviewComponent
```

`getCustomizerDescriptor` falls back to the mech descriptor for any unmapped
`UnitType` — identical to today's `default:` branch in every dispatcher.

## File Changes

- **NEW** `src/components/customizer/shared/customizerTypeRegistry.tsx` — the
  descriptor interface, the `createNonMechShell` factory, the `MechShell`,
  the six descriptors, `getCustomizerDescriptor`, `getTabSpecsForUnitType`.
- **MODIFIED** `UnitTypeRouter.tsx` — drop all `is*` booleans, all per-type
  `useMemo`s, all per-type `if` blocks; resolve a descriptor and mount its `Shell`.
- **MODIFIED** `OverviewTabForType.tsx` / `PreviewTabForType.tsx` /
  `ArmorDiagramForType.tsx` / `RecordSheetPreviewForType.tsx` — `switch` → lookup.
- **MODIFIED** `tabRegistry.tsx` — `getTabSpecsForUnitType` re-exported from the
  registry; the `*_TABS` arrays stay.
- **MODIFIED** `nonMechCustomizerTabMount.test.tsx` + dispatcher test imports —
  source fixtures from the descriptor registry so a new type is covered for free.

## Risks / Trade-offs

- **Risk:** a descriptor mis-wires a component (e.g. Vehicle descriptor points
  `OverviewComponent` at the mech `OverviewTab`). **Mitigation:** the existing
  dispatcher identity tests + the registry-driven mount invariant suite catch any
  mis-wire before merge.
- **Trade-off:** the mech `Shell` is bespoke, so the registry is not *fully*
  symmetric. Accepted — forcing the async `UnitStoreProvider` path into the
  non-mech factory shape would add a worse abstraction than one honest exception.

## Decisions discovered during execution

### Decision: `getTabSpecsForUnitType` stays in `tabRegistry.tsx`

The original plan moved `getTabSpecsForUnitType` into the descriptor registry.
During execution that proved unnecessary and slightly riskier: `tabRegistry.tsx`
is the documented SSOT for the `*_TABS` arrays, and `getTabSpecsForUnitType` is a
trivial switch over them. The descriptor registry instead *consumes*
`getTabSpecsForUnitType` to populate each descriptor's `tabs` field — a one-way
dependency. `tabRegistry.tsx` keeps exporting it unchanged. The descriptor
registry is still the SSOT for *dispatch* (shell + components); tab-set membership
stays in `tabRegistry`.

### Decision: `SUPPORT_VEHICLE` joins the Vehicle descriptor

Pre-refactor, three of the four dispatchers (`OverviewTabForType`,
`ArmorDiagramForType`, `RecordSheetPreviewForType`) treated `SUPPORT_VEHICLE` as a
Vehicle, but `UnitTypeRouter` did not — it had no `SUPPORT_VEHICLE` branch, so the
type fell through to the mech editor. The descriptor model maps one `UnitType` to
exactly one descriptor, so this inconsistency had to be resolved. `SUPPORT_VEHICLE`
is placed in the Vehicle descriptor, making all four surfaces consistent. This is
unobservable in practice — `SUPPORT_VEHICLE` has no creation path in the New Unit
modal — and corrects a latent bug rather than introducing one.

### Decision: Lazy memoised registry build

`tabRegistry.tsx` imports the `*ForType` dispatchers, which import the descriptor
registry, which imports the customizers, which import `tabRegistry` — a require
cycle. Building the descriptor array at module-evaluation time would risk
capturing half-initialised component bindings. `getCustomizerDescriptors()`
therefore builds the array lazily on first call and memoises it, by which point
every module in the cycle has fully evaluated. Memoisation also gives each
`Shell` a stable component identity across renders.

## Out of Scope

- The per-type store registries (`vehicleStoreRegistry.ts` etc.) keep their current
  API; the descriptor only *references* their `getStore` / `hydrateOrCreate`.
- Building the missing non-mech Overview editors (separate change).
- Any change to tab content, store shape, or record-sheet rendering.
