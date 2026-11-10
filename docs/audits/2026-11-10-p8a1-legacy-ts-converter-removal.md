# P8a1: retire the unused TypeScript conversion entry point

Baseline: `943f5354db0a8f88bd567e91ec4565ed83d3c5a7`, fetched and merged into
the existing branch before restoring the parked changes. No rebase or reset.

Remove `UnitFormatConverter.ts` and eight obsolete test/helper files. No live
load/import/convert path calls the adapter. Preserve `mapHeatSinkType` and the
`isClanSourceChassis` re-export and every caller. No converter tables, catalog,
committed unit data, schema, loader output or combat snapshot changes.

## Static proof

Search tracked files, including ignored-but-tracked sources:

```powershell
git grep -n -E 'UnitFormatConverter|IUnitFormatConverter|unit-format-converter' -- src scripts .github package.json docs openspec config
git grep -n -E 'mapHeatSinkType|isClanSourceChassis' -- src
```

Before removal, executable references to the adapter were only its own tests.
There were no production imports, dynamic imports/requires, barrel re-exports,
package scripts or workflow commands invoking it. The Wave 4 QC validator did
name a deleted converter test as evidence. Replace that anchor with the native
`MTFParserService.parse.test.ts`, requiring the parser name, parse call and
success assertion. Its regression requires that exact anchor and token count.

Retained files with the same prefix are distinct modules:
`UnitFormatConverterHelpers.ts`, `UnitFormatConverterTypes.ts` and their helper
test. Equipment resolver and unused mapping/helper cleanup are later P8a
slices; this capped entry-point PR does not claim to close all P8a audit sites.
The 2025 archived change and `docs/development/coverage-analysis.md` are
historical evidence, not callers, and remain intact.

`config/jest/test-durations.json` retains an old measurement for the deleted
root converter test. `shard-planner.js:weightOf/planShards` only looks up weights
for discovered files; the stale key cannot create a test or throw for a missing
path. Do not invent measurements or manually regenerate that evidence.

## Generated skip-list change

Per C2's C5 ruling, run `node scripts/jest/jest-dom-usage.js --write` and keep
only the generator's own two hunks removing these six entries:

- `src/__tests__/service/conversion/UnitFormatConverter.test.ts`
- `src/services/conversion/__tests__/UnitFormatConverter.configurationMapping.test.ts`
- `src/services/conversion/__tests__/UnitFormatConverter.convert.equipmentAndMetadata.test.ts`
- `src/services/conversion/__tests__/UnitFormatConverter.convert.test.ts`
- `src/services/conversion/__tests__/UnitFormatConverter.convertBatch.test.ts`
- `src/services/conversion/__tests__/UnitFormatConverter.test.ts`

The two deleted helper files are not test entries. Save the full generator
diff, restore the JSON, then apply only those unmodified deletion hunks. This
is scoped generator output, not a manual JSON edit. A semantic comparison
requires exactly those six removals and zero additions. The resumed generator
also produced 117 unrelated additions on this main, up from the earlier 108;
discard them and their trailing-comma hunk. C5 owns the full regeneration plus
`--check` mode. A missing listed file fails `jest-dom-skip.test.ts:59-69`; an
unlisted file simply loads jest-dom, so retaining main's staleness is harmless.

## Preserved Java default and live owners

MegaMek pin from `config/reference-policy/derivation.json.goalPins`:
`48fcb2f64a1b3f2d575707ce5653dad64927b587`.
`MtfFile.java:366-369,572-599` detects Double/Laser/Compact markers, otherwise
installing Single sinks. Keep that B-class type-selection behavior. The
expanded existing test covers Unknown, empty type text and Unclassified Sink,
including a Clan context. It does not claim Java admits a missing/malformed
full heat-sink source block. No implementation changes to the live mapper.

Technology/chassis remains owned by `unitHandlerShared`; its facade and all
users remain unchanged. The actual native source parser owns import semantics;
the removed legacy adapter is not replaced by another decoder or default.
Static production corpus impact is zero because the retired entry point has
no caller. No new unit-data census, BV or validity run is made.

## Verification

Test-first: the native-anchor regression failed before the validator changed
(66 assertions passed, one failed). A separate mutant drops its success token
while retaining the correct file and parse token; the new assertion must kill
it. The focused gate, ValueMappings, native parser and skip-list test files run
with `--maxWorkers=3`. Both TypeScript configs, changed-file lint/unit lint and
format are required before publication. No OpenSpec files change; hosted PR
Checks provide full integration evidence.
