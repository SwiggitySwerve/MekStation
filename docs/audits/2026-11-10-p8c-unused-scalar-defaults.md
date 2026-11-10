# P8c: unused scalar defaults

Baseline: `c4cdf9450178ec835bde60c0100e0052817b8321` (fresh `origin/main`).
This PR removes audit sites N06/N07/N08, PY15 and PY16 without changing the
policy of any production caller. No test files are deleted. Generated indexes, catalog data, schemas and loader
outputs are unchanged.

## Static reference proof

Before deletion, a repository search for `parseNumericField`, `parseIntField`
and `parseBooleanField` found only their declarations in
`AbstractUnitTypeHandler.ts` and two barrel re-exports. There were no callers,
tests, dynamic imports/requires, package scripts, workflows or documentation
instructions consuming them. Remove the declarations and both barrels together.
Keep `parseArrayField`, parse-result helpers and the handler's live parsers.

Before simplification, `map_armor_code` had six production call sites in five modules:
`blk_unit_fields.py`, `blk_battlearmor_fields.py`, `blk_vehicle_converter.py`,
`blk_protomech_converter.py` and two calls in `blk_aerospace_qualifiers.py`. All
explicitly passed `strict=True`. The existing armor-code tests also passed `strict=True`.
The remaining map lookup, error and omission expressions match the strict
implementation; remove the unused keyword at every caller. `blk_common.py`
remains the sole owner; do not create another armor table.

`blk_common.py`'s import fallback supplied invented rules only when the required
co-located `enum_mappings.py` or a dependency failed to import. Normal converter
execution uses the real module. Imports now propagate their original error.
No module, package entry point or CLI is deleted in this PR.

Reproduce the searches (exit 1 means no references):

```powershell
git grep -n -E 'parseNumericField|parseIntField|parseBooleanField' -- src scripts .github package.json
git grep -n -E 'map_armor_code' -- src scripts .github package.json
git grep -n -E 'parseNumericField|parseIntField|parseBooleanField|map_armor_code|blk_common' -- docs openspec
git grep -n -E 'require\(|import\(|import_module|__import__' -- src scripts .github
```

Use tracked-file searches: the default ripgrep ignore rules hide some tracked
converter modules. Confirm with `rg --no-ignore` on the bounded source trees.
The initial normal ripgrep scan missed three modules; focused converter tests
caught the leftover keyword arguments, which are now removed at all six sites.

Inspect imports, re-exports and dynamic module loads, including directory
barrels, against the removed names. The dynamic-import search has no consumers
of the removed helpers or permissive mode. Documentation matches for
`blk_common.py` are historical audit/maintenance references to the retained
module, not invocation of the removed mode. Package scripts and workflows have
no references to removed symbols. This document and BLK_RULES describe removal.

## Authority and behavior

The pinned MegaMek SHA from `config/reference-policy/derivation.json.goalPins`
is `48fcb2f64a1b3f2d575707ce5653dad64927b587`.
`EquipmentType.java:85-136` defines the armor identities consumed by the existing
shared table. Java has no equivalent to fallback Python implementations after a
module-import failure. Its definitions do not justify keeping unused scalar
helpers. Native omission defaults remain unchanged, including `None` armor.

Corpus impact is statically zero for production callers: the TypeScript
helpers have none; every Python caller used the retained strict branch; healthy
imports use the retained module. No new corpus census, BV calculation or
directory-wide test run was performed or claimed. There are no new unit
diagnostics in this deletion slice.

## Deferred audit rows

B22 is **not proven unreachable**. `mapBlkUnitType` accepts case variants, but
`layoutFor` matches exact case. A `tank` document can reach the Standard layout
fallback. Removing it could stop loading previously accepted input, so its
experimental change was withdrawn under C2's STOP rule. Resolve admission and
layout spelling together in a separately approved owner change; retain current
known-family rejected-array diagnostics and inspection behavior.

L15 remains unchanged alongside C3's component-technology work. The generated
schema admits only `CLAN` and `INNER_SPHERE`; the existing two-arm projection
maps both recognized values. Removing the recognized IS arm is not a deletion
of an unknown-value path. Do not duplicate that owner's packet changes here.

## Verification

Test-first: the new Python cases fail on the old code (five invalid armor
subcases and one missing-dependency case), then pass on the retained strict
decoder and direct import. They distinguish known identities, malformed and
unknown explicit values, optional omission and installation failure. Existing
pinned-source converter tests protect the caller paths. A separate mutant that returns STANDARD on decoding failure is killed; receipts are in the local parity audit directory.

Local results: 37 tests pass across the four focused Python files; 20 tests pass
in SupportVehicleUnitHandler.javaValidity.test.ts with `--maxWorkers=3`. Both
TypeScript configs pass. The three changed TypeScript files have zero lint
findings, including the unit-lint configuration. Formatting covers TypeScript
and Markdown; the repository has no Python formatter gate. Hosted PR Checks
provide full integration evidence. No OpenSpec files change.
