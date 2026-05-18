# Learnings — wire-non-mech-customizer-preview

## Conventions
- Dispatcher precedent: `src/components/customizer/armor/ArmorDiagramForType.tsx` —
  thin component, `switch (unitType)`, JSDoc with `@spec` tag, mech default branch.
- `UnitType` enum imported from `@/types/unit/BattleMechInterfaces`. Non-mech members:
  VEHICLE, VTOL, SUPPORT_VEHICLE, AEROSPACE, CONVENTIONAL_FIGHTER, BATTLE_ARMOR,
  INFANTRY, PROTOMECH. Mech members fall through `default`.
- `tabRegistry.ts` `SHARED_PREVIEW` / `SHARED_OVERVIEW` TabSpec consts feed every
  per-type tab set. `MECH_TABS` also references them.
- `dispatchTargetFromUnit` (`src/services/printing/recordsheet/dispatchTarget.ts`)
  reads `unit.type ?? unit.unitType`, normalizes lower-case + strips whitespace.
  Accepted non-mech hints: `'vehicle'|'vtol'|'supportvehicle'`,
  `'aerospace'|'conventionalfighter'`, `'battlearmor'`, `'infantry'`, `'protomech'`.
- Mech `PreviewTab` props: `_readOnly?: boolean`, `className?: string`.
- Mech `PreviewTab` flow: build unit config → `getRecordSheetService().extractData`
  → `exportPDF` / `renderPreview`. Uses `PreviewToolbar` + `RecordSheetPreview`.

## Gotchas
- Test/story files are oxlint-ignored by config — do not worry about oxlint there.
- `RecordSheetService` / extractors / dispatchTarget / templates / renderers are
  FROZEN — UI-only change. If a task seems to need a service edit, STOP and flag.
- A PostToolUse formatter hook reformats files after Write — always run
  `npx oxfmt <files>` (no --check) after creating a file, then re-check.

## Wave 1 results
- `NonMechOverviewPlaceholder.tsx` + `OverviewTabForType.tsx` created.
- `UnitType` enum confirmed: OMNIMECH, INDUSTRIALMECH, PROTOMECH, VEHICLE, VTOL,
  AEROSPACE, CONVENTIONAL_FIGHTER, INFANTRY, BATTLE_ARMOR, SUPPORT_VEHICLE (+ BATTLE_MECH).
- `OverviewTab` named export at `src/components/customizer/tabs/OverviewTab.tsx`,
  props `{ readOnly?: boolean; className?: string }`.
- Mech `PreviewTab` props: `{ _readOnly?: boolean; className?: string }`.
- `RecordSheetService` accessed via `getRecordSheetService()` from
  `@/services/printing/RecordSheetService`. `PreviewToolbar` at
  `../preview/PreviewToolbar`. `PaperSize`/`PAPER_DIMENSIONS` from `@/types/printing`.
