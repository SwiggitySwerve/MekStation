# Tasks: Refactor Customizer Type Descriptors

## 1. Descriptor Registry Foundation

- [x] 1.1 Create `src/components/customizer/shared/customizerTypeRegistry.tsx`
  with the `CustomizerTypeDescriptor` interface, `CustomizerShellProps`, and the
  dispatched-component prop types (`DispatchedOverviewProps`,
  `DispatchedPreviewProps`, `RecordSheetCanvasProps`).
  - Acceptance: interface compiles; every field documented with JSDoc.
  - QA: `npx tsc --noEmit` clean.
- [x] 1.2 Add `createNonMechShell(config)` factory — returns a `Shell` component
  that `useMemo`-hydrates the store (`getStore(id) ?? hydrateOrCreate(id, tab)`)
  and renders `<ErrorBoundary><StoreContext.Provider><Customizer store/></Provider></ErrorBoundary>`.
  - Acceptance: factory output is store-context-correct; mirrors the current
    non-mech blocks in `UnitTypeRouter` exactly.
- [x] 1.3 Add `MechShell` component — wraps `UnitStoreProvider` (with the existing
  loading fallback) + `UnitEditorWithRouting`, identical to the current mech
  `default` branch of `UnitTypeRouter`.
- [x] 1.4 Declare the six descriptors (Mech, Vehicle [VEHICLE+VTOL], Aerospace
  [AEROSPACE+CONVENTIONAL_FIGHTER], BattleArmor, Infantry, ProtoMech) — each wiring
  its `tabs` (existing `*_TABS`), `Shell`, and the four dispatched components.
  - Acceptance: every descriptor field populated; no `any`.
- [x] 1.5 Export `getCustomizerDescriptor(unitType)` (mech-descriptor fallback for
  unmapped types) and `getTabSpecsForUnitType(unitType)` (returns `descriptor.tabs`).
  - QA: `npx tsc --noEmit` clean.

## 2. Rewrite the Router And Dispatchers

- [x] 2.1 Rewrite `UnitTypeRouter.tsx` — remove all `is*` booleans, all per-type
  `useMemo`s, all per-type `if` blocks. Body: handle `!activeTab` empty state, then
  `const { Shell } = getCustomizerDescriptor(activeTab.unitType)` and render it.
  - Acceptance: no `switch`/`if` ladder on `UnitType` remains; file ≈40 lines.
  - QA: customizer renders every unit type live (dev-browser walk).
- [x] 2.2 Rewrite `OverviewTabForType.tsx` body to
  `getCustomizerDescriptor(unitType).OverviewComponent`. Keep export name + props.
- [x] 2.3 Rewrite `PreviewTabForType.tsx` body to use `.PreviewComponent`.
  Keep export name + props.
- [x] 2.4 Rewrite `ArmorDiagramForType.tsx` body to use `.ArmorDiagramComponent`.
  Keep export name + props.
- [x] 2.5 Rewrite `RecordSheetPreviewForType.tsx` body to use
  `.RecordSheetPreviewComponent`. Keep export name + props.
- [x] 2.6 Update `tabRegistry.tsx` — re-export `getTabSpecsForUnitType` from the
  descriptor registry; keep the `*_TABS` array exports unchanged.
  - QA: `npx tsc --noEmit` clean; no import cycle (`madge` or build passes).

## 3. Tests And Verification

- [x] 3.1 Update `nonMechCustomizerTabMount.test.tsx` — drive fixtures from the
  descriptor registry (`getCustomizerDescriptor` / registry array) so adding a
  unit type extends coverage with zero new test code.
  - Acceptance: suite still mounts every tab of every non-mech type store-safely.
- [x] 3.2 Add `customizerTypeRegistry.test.tsx` — assert: every `UnitType` resolves
  a descriptor; each descriptor's dispatched components match the pre-refactor
  `switch` target (component identity); `getCustomizerDescriptor` falls back to the
  mech descriptor for unmapped types.
- [x] 3.3 Confirm existing dispatcher tests (`OverviewTabForType.test.tsx`,
  `ArmorDiagramForType.test.tsx`) and `tabRegistry.canonical.test.ts` still pass
  unchanged — they are the no-behaviour-change regression guard.
- [x] 3.4 Full verification: `npm run lint`, `npx tsc --noEmit`,
  `npm test -- customizer`, and a dev-browser walk of all 6 unit types × all tabs.

## Final Verification Wave

- [x] F1 `npm run lint` clean.
- [x] F2 `npx tsc --noEmit` clean.
- [x] F3 `npx oxfmt --check` clean on all touched files.
- [x] F4 `npm test -- customizer` green; entire suite green in CI.
- [x] F5 Dev-browser: create all 6 unit types, click every tab, zero errors.
- [x] F6 Spec coverage: the `customizer-routing` ADDED requirement has a passing
  test (`customizerTypeRegistry.test.tsx`).
