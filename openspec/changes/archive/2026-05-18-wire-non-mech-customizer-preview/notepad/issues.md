# Issues — wire-non-mech-customizer-preview

(Problems hit and how they were solved.)

## Wave 3: tabRegistry.ts → tabRegistry.tsx
- The bound-spec factory helpers (`overviewSpecFor`/`previewSpecFor`) contain JSX
  arrow components, so `tabRegistry.ts` had to be renamed to `.tsx` via `git mv`.
  Importers use extensionless `from '.../tabRegistry'` so no importer edits needed.
- `UnitType` mech member is `BATTLEMECH` (value 'BattleMech'), NOT `BATTLE_MECH`.
- oxfmt config uses double quotes — files written with single quotes get
  reformatted; always run `npx oxfmt <file>` after Write/Edit.

## F4 manual QA caveat
- F4 ("open the live customizer for each type, click Preview/PDF/Overview") cannot
  be executed from the orchestration environment. Automated-equivalent coverage:
  task 4.1 mounts the Preview tab inside EACH per-type store context and asserts
  no throw (the exact inverse of the shipped crash); task 4.2 asserts each builder
  → `dispatchTargetFromUnit` → correct kind and `extractData` accepts it; task 4.3
  asserts the Overview placeholder renders with zero providers. Storybook build +
  full 24050-test suite + tsc + lint all green. The reviewer/user should still do
  a live click-through before final sign-off.
