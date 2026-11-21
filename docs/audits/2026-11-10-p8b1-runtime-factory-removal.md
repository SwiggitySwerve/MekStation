# P8b1: remove the unused runtime factory

Baseline: `4fa934e76` (`origin/main` fetched before preparation).
The factory's only non-test exposure was its getter in the service registry
and its unit-service barrel. Neither was invoked by production code. Remove
that exposure, the three factory implementation files, and their obsolete tests.
Canonical loading, import, editor mapping and serialization retain their owners.

## Static reference proof

Use tracked-file searches because default ripgrep ignores some tracked files:

```powershell
git grep -n -E 'UnitFactoryService|getUnitFactory|resetUnitFactory|IUnitFactoryResult|services\.units|units\.factory' -- src scripts .github package.json
git grep -n 'serviceRegistry' -- src scripts .github package.json
git grep -n -E 'UnitFactoryService|getUnitFactory|resetUnitFactory|IUnitFactoryResult' -- docs openspec
```

Before deletion, executable matches were limited to the factory and its two
helpers, their tests, the integration-test barrel, the unit-service barrel,
`serviceRegistry.ts` and its getter test. After deletion, the first search has
no matches. This covers direct imports, dynamic `require`/`import` path strings,
barrel re-exports, registry references, package scripts and workflows. The
registry itself remains exported by `src/services/index.ts`; its persistence,
equipment, construction and pilot getters and lifecycle functions remain tested.

The live canonical path already returns shape-checked serialized data:
`CanonicalUnitService.ts:getById` calls `assertUnitShape` and caches that result.
It does not create an `IBattleMech`. Editor hydration uses `UnitLoaderService`.
No production path is rerouted in this deletion.

`src/services/README.md` drops the removed service from its current inventory.
Remaining archived OpenSpec references are historical. The canonical
`openspec/specs/unit-services/spec.md:49,236,291` also names the factory: these
clauses already describe a path absent from production, as the source proof
above shows. This PR does not rewrite the canonical unit-services contract;
that stale specification needs C5's spec-sync review. It is a documentation
reference, not a hidden runtime caller. Do not claim that every textual mention
of the retired class is gone.

## Generated skip-list scope

Run `node scripts/jest/jest-dom-usage.js --write` once after deleting the tests.
The generator removes precisely these two entries:

- `src/__tests__/integration/dataLoading/UnitFactoryService.test.ts`
- `src/__tests__/service/units/UnitFactoryService.test.ts`

Keep those two unmodified generator-produced deletion hunks. Discard all 115
unrelated additions and the associated trailing-comma hunk. The additions are
main's existing staleness (seven more than the earlier 108-entry observation),
not this PR's work. C5 owns full regeneration and a `--check` mode. There is no
manual edit to the generated JSON: save the full generator diff, restore the
file, and apply only those two original hunks. Semantic set comparison confirms
two removals and zero additions. The helper file deleted with the obsolete
tests has no skip-list entry. The missing-file guard passes after scoping.

## Boundaries and evidence

P8b2 will remove the now-unused parser arms. This slice leaves
`EnumParserRegistry.ts` unchanged, including the technology/rules exports used
by live equipment loading and the prototype-armor parser assertion added on
main. That assertion will retire with its obsolete parser; its loader and
save/reopen coverage remains live. No technology/rules correction is included.

Pinned source authority remains MegaMek
`48fcb2f64a1b3f2d575707ce5653dad64927b587`, as recorded in
`config/reference-policy/derivation.json.goalPins`. There is no Java rule to
change here: unused local code is removed, with zero production corpus impact
by call-graph proof. No corpus, BV, validity or directory-wide test run was made.

Test-first: a new registry test fails while the unused factory exposure exists
(14 pass, one fails), then passes after removal. A mutant restoring an empty
`units` registry branch must also fail that test. The four focused test files
cover the registry, skip-list guard, canonical loading and the preserved
prototype-armor loader/save path, with `--maxWorkers=3`. Both TypeScript configs,
changed-file lint/unit lint and format are required before publication. No
OpenSpec files change. Hosted PR Checks remain the full integration evidence.
