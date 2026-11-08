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
  regressions failed. The first skirmish run failed to resolve the not-yet-created
  client module; the later missing-link mutant reproduced the actual hook defect.
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

## Merged-base gates

Merged fetched origin/main 3e6f6cdc292c76d1e3190a3d84cf5a2ddf1e071c (K6)
without conflicts; merge commit 0a90f93602686b49deba4fd07d5940e2f1561aa3.
No fast-forward, multiplayer or K6-owned source files differ from that main.

- Full required directory union repeated on merged main: 369 suites passed,
  4,848 tests passed, 32 skipped. This includes the complete integration,
  store and simulation-runner directories, replay/digest/golden suites and
  `scripts/__tests__/lint-units.test.ts`.
- Exact `npm run validate:combat`: exit 0; 79 suites / 2,107 tests passed,
  followed by the script's catalog, gap-report and OpenSpec checks.
- `npm run typecheck`: root and scripts TypeScript configurations passed.
- `npm run lint`: 63 warnings / 0 errors.
- `npm run lint:units`: 17,082 / 17,085; all four path ceilings passed.
- `node scripts/ci/budget-check.mjs`: 57 unkeyable / 57 allowed,
  92 repository-wide keys, 3,074 indexed test files.
- `npm run format:check`: all 9,137 matched files passed.
- `npx openspec validate --all --strict`: 260 passed / 0 failed.
  OpenSpec CI accounting: 39 / 39 active changes accounted; purpose lint passed.

Rule 4 required one source-proof re-anchor in CombatConsciousnessSourceRefs.ts.
The exact old L77-L216 content equals new L78-L217 content; this was checked
before changing the citation. No combat rule, payload, fixture or digest changed.
The complete runner directory is repeated after that re-anchor.

Post-re-anchor full runner directory: 152 suites / 1,498 tests passed.
Both TypeScript configurations also passed again after the citation update.

Draft PR: https://github.com/SwiggitySwerve/MekStation/pull/3058.
S1b findings with file:line evidence are in its body. Hosted checks and Root
review are pending at handoff; this lane never merges.
