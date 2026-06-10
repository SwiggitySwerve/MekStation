# Change Proposal: Audit MegaMek Board Import Corpus

## Summary

Add an optional local audit command that parses a MegaMek `data/boards` corpus
with MekStation's board parser and reports import coverage for board count,
hex count, large-coordinate labels, and `cliff_top` metadata.

## Motivation

The tactical map depends on imported terrain, elevation, and edge metadata for
rules-backed movement and visibility projection. Recent slices fixed
`cliff_top` import and large-board labels, but the remaining source-trust gap is
broader external oracle sweep coverage over real MegaMek boards.

CI cannot assume a local MegaMek checkout, so this change adds a developer-run
verifier that is explicit, repeatable, and documented without making the normal
test suite depend on external files.

## Scope

- Add a script that scans a local MegaMek `data/boards` directory.
- Parse every selected `.board` file through `parseMegaMekBoard`.
- Fail on parser errors or parsed-hex count mismatches.
- Report large-coordinate and `cliff_top` coverage.
- Add a package script for discoverability.
- Update tactical-map audit docs with the new verifier.

## Non-Goals

- Add MegaMek board files to the repository.
- Require the corpus audit in CI.
- Compare every terrain semantic against MegaMek runtime behavior.
- Expand parser terrain-type support beyond the current import contract.
