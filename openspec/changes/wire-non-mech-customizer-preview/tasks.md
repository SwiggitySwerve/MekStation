# Tasks: Wire Non-Mech Customizer Preview

## 1. Foundation — Dispatchers And Overview Guard

- [x] 1.1 Create `src/components/customizer/tabs/NonMechOverviewPlaceholder.tsx`
  — a store-free graceful panel ("Overview editor not yet available for this unit
  type"). Accepts `unitType` for the label; no store hook calls.
  - Acceptance: pure presentational component; calls no `use*Store` hook.
  - QA: `npx tsc --noEmit` clean; renders with zero providers without throwing.
- [x] 1.2 Create `src/components/customizer/tabs/OverviewTabForType.tsx`
  — dispatcher: `switch (unitType)`; mech / omnimech / industrialmech branch
  renders existing `OverviewTab`; all non-mech branches render
  `NonMechOverviewPlaceholder`. Mirror `ArmorDiagramForType` structure + JSDoc.
  - Acceptance: dispatcher renders `OverviewTab` only for mech types; non-mech
    types render the placeholder; no non-mech branch calls `useUnitStore`.
  - QA: `npx tsc --noEmit` clean.
- [x] 1.3 Create `src/components/customizer/tabs/PreviewTabForType.tsx`
  — dispatcher: mech branch renders existing `PreviewTab` verbatim; non-mech
  branches render the matching per-type preview component (Section 2). Forwards
  `_readOnly` / `className` props. Mirror `ArmorDiagramForType` structure + JSDoc.
  - Acceptance: mech branch renders unmodified `PreviewTab`; each non-mech branch
    routes to its per-type component.
  - QA: `npx tsc --noEmit` clean.
- [x] 1.4 Create `src/components/customizer/preview/RecordSheetPreviewForType.tsx`
  — dispatcher for the on-canvas preview surface; mech branch renders existing
  `RecordSheetPreview`; non-mech branches render per-type canvas components.
  - Acceptance: mech branch renders unmodified `RecordSheetPreview`.
  - QA: `npx tsc --noEmit` clean.

## 2. Per-Type Preview Components

Each task delivers two co-located files under `src/components/customizer/<type>/`:
a `<Type>PreviewTab.tsx` (toolbar + builder, mounted in the matching store context)
and a `<Type>RecordSheetPreview.tsx` (canvas surface). Each builder reads the
per-type store directly and emits a `unitType`/`type` hint that
`dispatchTargetFromUnit` resolves to the matching non-mech kind.

- [x] 2.1 Vehicle — `VehiclePreviewTab.tsx` + `VehicleRecordSheetPreview.tsx`.
  Reads `useVehicleStore`; builds an `IVehicleUnitConfig`-shaped object with a
  hint resolving to `'vehicle'`. Handles VEHICLE / VTOL / SUPPORT_VEHICLE.
  - Acceptance: built object passed to `dispatchTargetFromUnit` → kind `'vehicle'`;
    `extractData` does not throw `UnsupportedUnitTypeError`.
  - QA: mount `VehicleCustomizer`, open Preview → no throw; canvas renders.
- [x] 2.2 Aerospace — `AerospacePreviewTab.tsx` + `AerospaceRecordSheetPreview.tsx`.
  Reads `useAerospaceStore`; builds an `IAerospaceUnitConfig`-shaped object with a
  hint resolving to `'aerospace'`. Handles AEROSPACE / CONVENTIONAL_FIGHTER.
  - Acceptance: `dispatchTargetFromUnit` → kind `'aerospace'`; `extractData` ok.
  - QA: mount `AerospaceCustomizer`, open Preview → no throw; canvas renders.
- [x] 2.3 Battle Armor — `BattleArmorPreviewTab.tsx` +
  `BattleArmorRecordSheetPreview.tsx`. Reads `useBattleArmorStore`; builds an
  `IBattleArmorUnitConfig`-shaped object with a hint resolving to `'battlearmor'`.
  - Acceptance: `dispatchTargetFromUnit` → kind `'battlearmor'`; `extractData` ok.
  - QA: mount `BattleArmorCustomizer`, open Preview → no throw; canvas renders.
- [x] 2.4 Infantry — `InfantryPreviewTab.tsx` + `InfantryRecordSheetPreview.tsx`.
  Reads `useInfantryStore`; builds an `IInfantryUnitConfig`-shaped object with a
  hint resolving to `'infantry'`.
  - Acceptance: `dispatchTargetFromUnit` → kind `'infantry'`; `extractData` ok.
  - QA: mount `InfantryCustomizer`, open Preview → no throw; canvas renders.
- [x] 2.5 ProtoMech — `ProtoMechPreviewTab.tsx` +
  `ProtoMechRecordSheetPreview.tsx`. Reads `useProtoMechStore`; builds an
  `IProtoMechUnitConfig`-shaped object with a hint resolving to `'protomech'`.
  - Acceptance: `dispatchTargetFromUnit` → kind `'protomech'`; `extractData` ok.
  - QA: mount `ProtoMechCustomizer`, open Preview → no throw; canvas renders.

## 3. Registry Wiring

- [x] 3.1 In `src/components/customizer/shared/tabRegistry.ts`, change
  `SHARED_PREVIEW.component` from `PreviewTab` to `PreviewTabForType` and
  `SHARED_OVERVIEW.component` from `OverviewTab` to `OverviewTabForType`. Update
  imports accordingly.
  - Acceptance: `MECH_TABS` still renders the mech path (dispatcher's mech branch);
    all five non-mech tab sets now reference the dispatchers.
  - QA: `npx tsc --noEmit` clean; `tabRegistry.canonical.test.ts` stays green.
- [x] 3.2 Correct the misleading comments in `tabRegistry.ts`: the file-header
  block (lines ~15-16) and the "Shared tab specs" section comment must state that
  Fluff is genuinely shared, while Overview and Preview are per-type dispatchers —
  NOT a single mech implementation reused across all unit types.
  - Acceptance: no comment in the file claims Overview/Preview "reuse the mech
    implementations across all unit types".
  - QA: visual review of comment text.

## 4. Tests

- [x] 4.1 Regression gate — `src/components/customizer/<type>/__tests__/
  <Type>PreviewTab.test.tsx` for each non-mech type: render `PreviewTabForType`
  (or the per-type preview) wrapped in the matching per-type store context provider
  and assert it does NOT throw. This is the inverse of the shipped crash.
  - Acceptance: 5 tests (vehicle, aerospace, battlearmor, infantry, protomech);
    each mounts inside its store context and asserts no throw.
  - QA: `npm test -- PreviewTab` → all green.
- [x] 4.2 Per-type unit-object test: for each non-mech preview builder, assert the
  built object's discriminated `unitType` is correct and `dispatchTargetFromUnit`
  resolves to the matching kind and `RecordSheetService.extractData` accepts it.
  - Acceptance: 5 assertions, one per non-mech type, no `UnsupportedUnitTypeError`.
  - QA: `npm test -- recordsheet` → green.
- [x] 4.3 Overview crash-guard test: render `OverviewTabForType` for each non-mech
  type with NO `UnitStoreProvider` and assert the placeholder renders without
  throwing.
  - Acceptance: 5 non-mech assertions + 1 mech assertion (mech branch still renders
    `OverviewTab`).
  - QA: `npm test -- Overview` → green.
- [x] 4.4 Mech behaviour-preservation check: run the existing mech Preview and
  registry tests unchanged.
  - Acceptance: `tabRegistry.canonical.test.ts` and any existing `PreviewTab` /
    `RecordSheetPreview` tests stay green with zero edits.
  - QA: `npm test -- tabRegistry` → green.

## Final Verification Wave

- [x] F1 `npx tsc --noEmit` clean across all touched and new files.
- [x] F2 `npm run lint` clean; `npx oxfmt --check` clean on changed files.
- [x] F3 Full test suite green — new regression + wiring tests pass, all
  pre-existing mech Preview / registry tests still pass (behaviour-preserving).
- [x] F4 Manual QA: in the running app, open the customizer for a Vehicle, VTOL,
  Aerospace, Conventional Fighter, Battle Armor, Infantry, and ProtoMech; for each,
  click the Preview tab (no crash, canvas renders), click Download PDF (correct
  per-type sheet), and click Overview (graceful placeholder, no crash).
- [x] F5 `npx openspec validate wire-non-mech-customizer-preview --strict` passes.
- [x] F6 Confirm every SHALL/MUST in the three delta specs has test or QA coverage.
