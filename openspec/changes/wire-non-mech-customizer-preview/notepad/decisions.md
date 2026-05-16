# Decisions — wire-non-mech-customizer-preview

(Decisions discovered mid-execution. Referenced by 2+ tasks graduate to design.md.)

## Decision: Registry binds `unitType` via per-tab-set spec factories
**Discovered during**: Tasks 1.3, 3.1 (registry wiring), 2.1-2.5 (per-type leaves)
**Context**: The tab registry renders `<TabComponent readOnly={...} />` — it passes
ONLY `readOnly`, never `unitType`. But `PreviewTabForType` / `OverviewTabForType`
need a `unitType` to switch on. `SHARED_PREVIEW` / `SHARED_OVERVIEW` are single
consts shared across every tab set, so a shared dispatcher cannot know its type.
**Choice**: `PreviewTabForType` / `OverviewTabForType` accept a `unitType` prop.
`tabRegistry.ts` builds per-tab-set Preview/Overview `TabSpec`s via small factory
helpers (`previewSpecFor(unitType)` / `overviewSpecFor(unitType)`) whose `component`
is a thin wrapper `(props) => <PreviewTabForType unitType={fixed} {...props} />`.
`MECH_TABS` binds `UnitType.BATTLE_MECH`; each non-mech tab set binds its family
type. This keeps the dispatcher registered (spec requirement) while honouring the
registry's `readOnly`-only render contract.
**Rationale**: Hooks cannot be conditional, so a single shared component cannot
pick a store hook at render time. Binding `unitType` at registry-build time gives
each tab set a statically-correct dispatcher. The per-type preview leaf still reads
its own store's exact `unitType` for the `dispatchTargetFromUnit` hint, so binding
the family type (e.g. VEHICLE) for routing is sufficient.

## Decision: Per-type preview leaf emits the store's exact unitType as the hint
**Discovered during**: Tasks 2.1-2.5
**Choice**: Each `<Type>PreviewTab` reads its per-type store's `unitType` field
(`useVehicleStore((s) => s.unitType)` etc.) and sets it as the `unitType` hint on
the built unit object. `dispatchTargetFromUnit` normalizes it (lower-case, strip
whitespace) and resolves vehicle/vtol/supportvehicle → 'vehicle',
aerospace/conventionalfighter → 'aerospace', etc.
**Rationale**: The store already holds the precise discriminated type; no need to
hardcode a hint. `getRecordSheetDispatchKind` accepts all the per-type store enum
string values verbatim.
