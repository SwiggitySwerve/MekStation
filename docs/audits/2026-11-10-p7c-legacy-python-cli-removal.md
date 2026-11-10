# P7c: retire the generic legacy conversion CLI

Baseline: `943f5354db0a8f88bd567e91ec4565ed83d3c5a7`, the verified parent of the
deletion commit and current `origin/main`. Remove the five `data_converter`
modules as one unused CLI: its entry point, MTF reader, BLK reader, metadata
helpers and UnitVerifierOptions XML reader. No active family converter calls
them. No replacement logic or source-value policy is introduced.

## Static reference proof

Before deletion, all executable references to these five module names were
imports among the five files themselves. There are no consumers in TypeScript,
Python tests, package scripts or workflows. Search tracked files to avoid
default ignore rules hiding tracked Python modules:

```powershell
git grep -n -E 'data_converter|data-converter' -- src scripts .github package.json docs openspec
git grep -n -E 'parse_xml_file|DERIVED_EQUIPMENT|SKIPPED_FILES_LOG|add_to_derived_equipment|get_year_from_path' -- src scripts .github package.json
```

The first search covers direct and dynamic imports/requires, CLI path strings,
barrels, scripts and workflow commands. The second checks distinctive helper
exports for alias callers. After deletion there are no executable imports or
invocations. `mtf_converter.py` retains a historical docstring saying it replaced
the old CLI; this is not an invocation. The README now directs users to the
retained MTF and family-specific BLK npm scripts. The dated PR2225 audit and
QC registry/graph notes describe historical extractions and remain unchanged.
No generated QC index is hand-edited or regenerated.

Two **reviewed** maintenance-ledger entries refer to the retired CLI's old
736-line and 499-line bloat findings. The validator requires each entry's file
to exist (`validate-maintenance-warning-ledger.mjs:202-204`), even for fixed
entries. Remove those two obsolete waivers and decrease their reviewed fixed
count from 19 to 17. This ledger carries manually reviewed dispositions and
rationales; the scanner emits findings, not that reviewed ledger. All other
ledger values are preserved. The original rationale was that XML/metadata and
MTF/BLK extraction reduced the old CLI's size; the dated audit and registry
history retain that evidence. Do not run or claim a full maintenance scan here.

## Impact and parity boundaries

The accepted audit's generic-CLI sites PY26/PY27/PY32-PY36 retire with this
entry point. Their invented source year, technology, armor and equipment
properties no longer have a supported generic publishing route. The native
family owners and all package scripts remain unchanged. Canonical loading,
imports, editor opening and save/reopen never invoked this CLI. Static impact
on the active 9,815-unit pipeline is zero; no new corpus measurement is claimed.
No committed unit, catalog, schema, loader output or Jest skip-list changes.

PY37's Single heat-sink fallback is B-class parity, not a behavior to fix.
Pinned MegaMek `48fcb2f64a1b3f2d575707ce5653dad64927b587`
`MtfFile.java:366-369,572-599` selects Single when no Double/Laser/Compact
marker is present. Removing the unused generic reader does not change any
retained reader's policy. Live sink mapping is preserved; this PR does not
change converter tables or replace the Java-compatible default.
The existing `ValueMappings.test.ts` heat-sink group passes eight focused tests,
including `should default to SINGLE for unknown`, documenting that retained
fallback rather than changing it.

## Verification

All seven retained native CLI entry points import and answer `--help`:
MTF, vehicle, aerospace, battle armor, infantry, ProtoMek and capital. These
commands do not parse a source corpus or write generated data. No existing
tests import the removed modules, so no test files are removed or rewritten.

The ledger's missing-path guard has two failures immediately after file
deletion and zero after retiring their waivers. Its focused validator suite
passes two tests with `--maxWorkers=3`, using fixture scans; this is not a full
maintenance-ledger gate. Both TypeScript configs pass. Surviving changes are
Markdown and the reviewed JSON ledger: format them; there are no surviving
executable lint/unit-lint targets. Hosted PR Checks provide full integration
evidence. No OpenSpec files change and no directory-wide test run is made.
