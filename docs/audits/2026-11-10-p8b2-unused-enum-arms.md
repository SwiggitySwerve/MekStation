# P8b2: remove factory-only enum parsers

Parent: P8b1, local commit `49b77909c`. Publish after P8b1, then merge updated
main into this branch. No rebase or reset is needed.

Remove audit E01-E06 and E09-E11: engine, gyro, cockpit, structure, armor,
heat-sink, era, configuration and location defaults. Their only production
importers were the unused factory and builder deleted by P8b1. Remove the
factory-only weight-class wrapper too. The index-weight owner remains intact.

## Static proof

Tracked-file searches after P8b1 showed the registry lifecycle/type symbols
only in their own module and the unit barrel. The removed parsers had no
production consumers. Only the obsolete factory armor assertions remained in
`ferroFibrousPrototype.test.ts`. Remove those assertions and their import;
retain its ordinary armor normalization checks, prototype loader, validation,
BV, preview, JSON save/reopen and BLK-code tests. No test file is deleted.

The only remaining executable references to `EnumParserRegistry` are the
equipment parser imports and the unit barrel's two retained re-exports:

```powershell
git grep -n -E 'EnumParserRegistry|getEnumParserRegistry|resetEnumParserRegistry|IEnumParserRegistry|EnumParser<' -- src scripts .github package.json docs openspec
```

This also covers dynamic imports/requires, package scripts, workflow entry
points and barrel exports. Names such as `getWeightClass` or `parseEngineType`
in other owning modules refer to different implementations and remain intact.
Historical audits cite the retained module. `CockpitType.RULES.md` still
correctly describes its unchanged equipment rules-level interpretation.

## Preserved boundary

Keep `parseTechBase` and `parseRulesLevel` at the same module path for live
equipment loading. Keep both maps, normalization, lookup and default values.
Delete only the unused registry class, interface, singleton/reset APIs, maps
and export wrappers. There is no extension or registration API to preserve.

An isolated parser probe records every existing alias, lower-case and padded
variants, plus empty/unknown text. All 37 input/output cases are byte-identical
before and after, SHA-256
`e104eef155da2283dfff6bea1ed25144c6cc6d4b9d5facef522958cc5e2e6350`.
This is a module-level preservation probe, not a unit-data census. The live
Mixed/unknown technology and Unofficial/unknown rules defaults remain separate
accepted audit findings; this deletion does not endorse them as Java parity.
C3 owns the later rules decoder change.

Pinned Java remains MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587` from
`config/reference-policy/derivation.json.goalPins`. No Java default is changed
or reproduced here. Static production corpus impact is zero because the
removed arms have no callers after P8b1. No catalog, loader output, replay
payload, generated schema or skip-list entry changes.

## Verification

The deletion relies on the reference proof above and the unchanged-output
probe. No test is added merely to mirror a removed implementation. The three
directly affected equipment-conversion, schema-bridge and prototype-armor
files pass 14 tests with `--maxWorkers=3`. Both TypeScript configs, changed-file
lint/unit lint and format are required before publication. Hosted PR Checks
provide full integration evidence; no directory-wide or corpus run is made.
