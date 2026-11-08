# S1a verification

Base audited: ea79b4d1c83c7a108249a96acdcf7966d18ebe25. Node 22.22.0 matches
the installed SQLite native ABI; Node 24 initially failed ABI loading and was
not counted as product evidence. No dependencies were rebuilt or changed.

## Test-first and independent refactor

- Refactor commit 8eee7e8d8 extracted existing classification. Encounter directory:
  12 suites / 241 tests passed; both TypeScript configurations passed.
- Before behavior implementation, new repository regressions failed on missing-row
  acceptance, reassignment, absent completion, stale linkage and cascade linkage.
- Before replay completion implementation, all four unfinished/mismatched history
  regressions failed. The skirmish link assertion then failed on the original hook.
- Replay/digest/golden baseline: 68 suites / 1,030 tests passed.

## Mutants

- Removed the skirmish link call: 2 tests failed in the full pre-battle test
  directory. Restored the call.
- Removed terminal GameEnded validation: 3 tests failed across service, session
  API and replay API directories. Restored the guard.

## Local gates before merging newer main

- All touched test directories, full stores, integration, full simulation runner,
  replay/digest/golden suites and lint-units Jest suite: 369 suites passed,
  4,847 tests passed, 32 skipped. After the request-size fix, affected directories
  also passed (22 suites / 448 tests).
- Both TypeScript configurations passed. Root lint: 63 warnings / 0 errors.
- lint:units: 17,083 findings within 17,085 ceiling; no ceilings raised.
- CI budget: 57 unkeyable tests / 57 allowed, 92 repository-wide keys.
- Strict OpenSpec validation: 259 items passed; focused change validation,
  OpenSpec accounting and purpose lint passed.
- No committed replay fixtures, digests, schema packs or event payloads changed.

## Follow-up and limits

S1b remains deferred: fast-forward and authoritative multiplayer link/completion
are not implemented here. Existing inconsistent rows are not migrated or
rewritten; see legacy-audit.md. No live database was modified.

Next requires literal route config values during static extraction. Both
encounter sizeLimit literals are pinned by tests to the shared encounter
transport limit. The quick-game endpoint retains its independent existing limit
because it is outside encounter transport scope.

Hosted CI has not run yet. Final merged-base gate results are recorded below
before the draft PR is filed.
