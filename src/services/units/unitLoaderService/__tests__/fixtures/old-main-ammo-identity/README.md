# Frozen saves from the main writer

These are complete JSON document bytes read from SQLite after saving canonical
Sentinel STN-3L and Warhammer WHM-6R through the real save-dialog handler on main
`73ef85c970ab79654f575e5c345e2b33b7ecdde8`, without the ammo-token fix.
The `.saved` extension preserves the original compact bytes without a JSON
formatter rewriting them. Do not regenerate or format these documents.

`manifest.json` records their SHA-256 hashes, main's reopen observations, and the
original versus saved ammo cells. The main writer's source SHA-256 is recorded
separately. The library and embedded document IDs differ because creating a
library record assigns its own ID; the first overwrite adopts that library ID.

The old-save cases in `mixedTechEquipmentIdentity.test.tsx` insert the frozen
documents into real SQLite, open them through the custom loader, render the real
editor diagnostics and targeted save dialog, and overwrite/reopen three times.
They assert unchanged main-open mount facts, BV and ammo BV, exact first-save
bytes (only the document ID changes), and identical SHA-256 hashes for all three
A saves. UUID generation alone is controlled so the original library IDs remain
reproducible. No loader, serializer, BV, or diagnostics result is mocked.

The original ammo strings are absent from the entire saved documents. Mounted
equipment IDs and `sourceDefinition` survive; these tests deliberately preserve
the old reopen values rather than repairing them. In particular Sentinel stays
at 719 BV / 19 ammo BV, versus its canonical/Java 717 / 18. Both old documents
show no critical-slot loss notice and offer an enabled Overwrite action.

Generation receipts are in
`E:/Projects/Personal/_scratch/sm-audit-reports/parity-0c-a-ammo-identity/old-saves/`;
`RECOVERY-PROPOSAL.md` is in its parent report directory.
The generation used create-only writes; existing fixtures were never replaced.

Rerun from this checkout with the Node version matching the SQLite binary:

```text
node node_modules/jest/bin/jest.js --selectProjects unit --maxWorkers=3 --runTestsByPath src/services/units/unitLoaderService/__tests__/mixedTechEquipmentIdentity.test.tsx --testNamePattern="frozen main-writer old saves"
```
