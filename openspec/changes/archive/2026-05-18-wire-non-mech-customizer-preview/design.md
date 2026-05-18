# Design: Wire Non-Mech Customizer Preview

## Technical Approach

React hooks cannot be conditional, so a single component cannot call
`useUnitStore` for mechs and `useVehicleStore` for vehicles. The fix is a
**dispatcher pattern**, identical in shape to the existing, proven
`src/components/customizer/armor/ArmorDiagramForType.tsx`: a thin component
switches on `UnitType` and renders a per-type child; each per-type child calls
exactly one store hook and is only ever mounted inside the matching store context.

Three seams are coupled to the mech store and must be addressed:

1. `PreviewTab.tsx` — the Preview tab body.
2. `RecordSheetPreview.tsx` — the on-canvas preview surface rendered inside
   `PreviewTab`.
3. `OverviewTab.tsx` — same flaw, currently masked by non-mech customizers
   defaulting to a non-Overview initial tab.

The `RecordSheetService` layer is already unit-type-complete:
`dispatchTargetFromUnit()` (`src/services/printing/recordsheet/dispatchTarget.ts`)
is a discriminated union over `mech | vehicle | aerospace | battlearmor | infantry
| protomech`, and `exportPDF` / `renderPreview` already branch mech vs non-mech.
The per-type unit-config interfaces (`IVehicleUnitConfig`, `IAerospaceUnitConfig`,
`IBattleArmorUnitConfig`, `IInfantryUnitConfig`, `IProtoMechUnitConfig`) and the
per-type extractors already exist. This change therefore touches **only the
customizer UI** — no service, renderer, template, or extractor changes.

## Architecture Decisions

### Decision: Dispatcher component, not conditional hooks

**Choice**: Introduce `PreviewTabForType`, `OverviewTabForType`, and
`RecordSheetPreviewForType` dispatchers that `switch (unitType)` and render a
per-type child component.

**Rationale**: Rules of Hooks forbid calling a store hook conditionally. A
dispatcher renders a *different component* per type — each child unconditionally
calls its one store hook, satisfying the rules. This exactly mirrors
`ArmorDiagramForType`, which the team already accepts as the per-type,
store-coupled component pattern.

**Alternatives considered**:
- *Make `PreviewTab` read a generic "current unit" abstraction* — rejected: no such
  abstraction exists; per-type stores have no shared `toUnit`/`serialize` helper,
  and inventing one is a much larger change (explicitly a Non-goal).
- *Try/catch around `useUnitStore`* — rejected: catching a hook error is not
  legal React and would not give the non-mech component access to its real store.

### Decision: Per-type preview components own their store reads

**Choice**: Add `VehiclePreviewTab`, `AerospacePreviewTab`, `BattleArmorPreviewTab`,
`InfantryPreviewTab`, `ProtoMechPreviewTab` under
`src/components/customizer/<type>/`. Each calls its one per-type store hook,
reads store fields directly, builds the per-type unit object, and renders a
per-type record-sheet canvas.

**Rationale**: Per-type stores expose **no** `toUnit`/`serialize` helper (verified
across `vehicleState.ts`, `aerospaceState.ts`, `battleArmorState.ts`,
`infantryState.ts`, `protoMechState.ts`). The builder must read store fields
directly. Co-locating each builder with its per-type folder matches how the
per-type armor diagrams (`VehicleArmorDiagram` et al.) are organised.

**Alternatives considered**:
- *One shared non-mech preview component* — rejected: it would still need to call a
  different store hook per type, so it would just re-create the dispatcher problem
  inside itself.

### Decision: Mech branch reuses existing components verbatim

**Choice**: `PreviewTabForType`'s mech branch renders the existing `PreviewTab`;
`OverviewTabForType`'s mech branch renders the existing `OverviewTab`;
`RecordSheetPreviewForType`'s mech branch renders the existing `RecordSheetPreview`.
No edits to the mech components' internals.

**Rationale**: Behaviour-preservation requirement — the mech Preview path must keep
working identically and all existing mech Preview tests must stay green. The
cleanest guarantee is to not touch the mech component bodies at all.

### Decision: Overview gets a non-crashing placeholder, not a full editor

**Choice**: `OverviewTabForType`'s non-mech branches render a single shared
`NonMechOverviewPlaceholder` panel ("Overview editor not yet available for this
unit type"). A full per-type Overview editor is deferred to a named follow-up
change `add-per-type-customizer-overview`.

**Rationale**: A full per-type Overview editor is a large, multi-tab feature in its
own right (identity, chassis, tech progression per type). The shipped bug is a
*crash*; the minimum correct fix is to stop the crash. The placeholder satisfies
the "no non-mech tab crashes" gate without scope inflation.

### Decision: How the per-type unit object signals its type to the service

**Choice**: Each per-type builder sets the `unitType` (or `type`) hint field so
`dispatchTargetFromUnit` resolves to the correct non-mech kind — e.g. a vehicle
builder sets a hint resolving via `getRecordSheetDispatchKind` to `'vehicle'`.

**Rationale**: `dispatchTargetFromUnit` already normalizes the hint
(`getRecordSheetDispatchKind` lower-cases and strips whitespace, accepting
`'vehicle' | 'vtol' | 'supportvehicle'`, `'aerospace' | 'conventionalfighter'`,
`'battlearmor'`, `'infantry'`, `'protomech'`). The builder only needs to emit a
hint string in that accepted set — no service change required.

## Data Flow

```
<VehicleCustomizer>                       (mounts VehicleStoreContext.Provider)
  └─ tab registry → PreviewTabForType
       └─ switch(unitType) → <VehiclePreviewTab>      (inside VehicleStoreContext)
            ├─ useVehicleStore(...)  → reads store fields directly
            ├─ buildVehicleUnitObject(storeFields)    → { unitType:'vehicle', ... }
            ├─ <RecordSheetPreviewForType unitType=VEHICLE/>
            │     └─ <VehicleRecordSheetPreview> → extractData → renderPreview(canvas)
            └─ onExportPDF → RecordSheetService.extractData → exportPDF
```

The mech path is unchanged:

```
<UnitEditor>  (mounts UnitStoreContext.Provider)
  └─ tab registry → PreviewTabForType
       └─ switch(unitType) → <PreviewTab>             (existing, unmodified)
```

## File Changes

New (per-type preview components — one per non-mech type):
- `src/components/customizer/tabs/PreviewTabForType.tsx` — `UnitType` dispatcher.
- `src/components/customizer/tabs/OverviewTabForType.tsx` — `UnitType` dispatcher;
  mech branch renders `OverviewTab`, non-mech branches render the placeholder.
- `src/components/customizer/tabs/NonMechOverviewPlaceholder.tsx` — graceful panel.
- `src/components/customizer/preview/RecordSheetPreviewForType.tsx` — `UnitType`
  dispatcher for the on-canvas preview surface.
- `src/components/customizer/vehicle/VehiclePreviewTab.tsx`
- `src/components/customizer/vehicle/VehicleRecordSheetPreview.tsx`
- `src/components/customizer/aerospace/AerospacePreviewTab.tsx`
- `src/components/customizer/aerospace/AerospaceRecordSheetPreview.tsx`
- `src/components/customizer/battlearmor/BattleArmorPreviewTab.tsx`
- `src/components/customizer/battlearmor/BattleArmorRecordSheetPreview.tsx`
- `src/components/customizer/infantry/InfantryPreviewTab.tsx`
- `src/components/customizer/infantry/InfantryRecordSheetPreview.tsx`
- `src/components/customizer/protomech/ProtoMechPreviewTab.tsx`
- `src/components/customizer/protomech/ProtoMechRecordSheetPreview.tsx`
- `src/components/customizer/<type>/__tests__/*PreviewTab.test.tsx` — per-type
  render-in-context regression tests.

Modified:
- `src/components/customizer/shared/tabRegistry.ts` — `SHARED_PREVIEW.component`
  → `PreviewTabForType`; `SHARED_OVERVIEW.component` → `OverviewTabForType`;
  correct the file-header and shared-tab comments to state that Overview/Preview
  are per-type dispatchers and only Fluff is a single shared implementation.

Unchanged (explicitly):
- `PreviewTab.tsx`, `OverviewTab.tsx`, `RecordSheetPreview.tsx` internals — mech
  branches reuse them verbatim.
- `RecordSheetService`, the SVG renderers, the record-sheet templates, the per-type
  data extractors, `dispatchTarget.ts`.
- `FluffTab.tsx` — already store-decoupled and shared-safe.

## Follow-Up (named, out of scope)

- `add-per-type-customizer-overview` — replace the `NonMechOverviewPlaceholder`
  with real per-type Overview editors (identity / chassis / tech progression).

## Decisions discovered during execution

### Decision: Registry binds `unitType` via per-tab-set spec factories

**Choice**: `PreviewTabForType` / `OverviewTabForType` accept a `unitType` prop.
`tabRegistry.tsx` builds per-tab-set Overview/Preview `TabSpec`s via small factory
helpers (`previewSpecFor(unitType)` / `overviewSpecFor(unitType)`) whose
`component` is a thin wrapper `(props) => <PreviewTabForType unitType={fixed}
{...props} />`. `MECH_TABS` binds `UnitType.BATTLEMECH`; each non-mech tab set
binds its family type.

**Rationale**: The tab registry renders a tab component with ONLY a `readOnly`
prop — it never passes `unitType`. `SHARED_PREVIEW` / `SHARED_OVERVIEW` were single
consts shared across every tab set, so a shared dispatcher could not know its type
at render time, and hooks cannot be conditional. Binding `unitType` at
registry-build time gives each tab set a statically-correct dispatcher while
honouring the registry's `readOnly`-only render contract. The per-type preview
leaf still reads its own store's exact `unitType` for the dispatch hint, so binding
the family type (e.g. `VEHICLE`) for routing is sufficient.

**Discovered during**: Tasks 1.3, 3.1, 2.1–2.5.

**Note**: `tabRegistry.ts` was renamed to `tabRegistry.tsx` because the factory
helpers contain JSX.

### Decision: Per-type preview leaf emits the store's exact `unitType` as the hint

**Choice**: Each `<Type>PreviewTab` / builder reads its per-type store's
`unitType` field and sets it as the `unitType` hint on the built unit object.
`dispatchTargetFromUnit` normalizes it (lower-case, strip whitespace) and resolves
`vehicle | vtol | supportvehicle → 'vehicle'`,
`aerospace | conventionalfighter → 'aerospace'`, etc. Battle Armor / Infantry /
ProtoMech builders emit a fixed lower-case literal hint since each has exactly one
unit type.

**Rationale**: The per-type store already holds the precise discriminated type, so
no hint needs to be hardcoded for the multi-type families.
`getRecordSheetDispatchKind` accepts all the per-type store enum string values
verbatim — no service change required.

**Discovered during**: Tasks 2.1–2.5.
