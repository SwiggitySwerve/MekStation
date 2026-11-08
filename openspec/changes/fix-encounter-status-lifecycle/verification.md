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

Initial merged-base results are recorded below. The later hosted census
failure and its correction are recorded in the CI follow-up section.

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

## CI follow-up: route census and shared guard

Root reported Unit Tests (1/3), job 128724542991, failed because the new session
route was missing from the pinned census. Reproduced locally: expected 98 routes,
found 99 (1 failed / 609 passed). Updated the reviewed URL list and count to 99.

Review confirmed server.js:587 evaluates the shared same-host rule before Next
handles any API request; its guard loader/evaluator are at server.js:501/508.
Sibling encounter launch/clone handlers use method checks and no additional
bearer authentication. The new session handler now also calls the shared
rejectUnlessSameHost before its method check, request-size check, query/body
validation or database access, covering direct-handler / next-dev access.
Existing POST/PATCH method checks and local encounter authorization behavior
are preserved; no independent authentication system was added.

Added direct-handler coverage to the census's existing Host/Origin/fetch-site
matrix and explicit POST/PATCH session rows to its real-server development and
production matrix. Before adding the handler guard, the new direct cases were
red: 18 failed / 658 passed. Existing session API tests now supply loopback Host
headers, so valid request and 405 behavior remain exercised behind the guard.

Merged fetched main 447803027ede2f9067bda0f252e60a08dde1f209 (merge
21c6162453725caa9701bee103b7c00e6e4cc390) before the follow-up verification.

- Entire src/__tests__/api directory: 68 suites / 1,734 tests passed.
- Entire src/__tests__/integration plus lint-units Jest suite: 53 suites /
  660 tests passed, 32 skipped.
- Both TypeScript configurations passed; root lint 63 warnings / 0 errors.
- lint:units passed at 17,074 / 17,085; no ceilings changed.
- CI budget check passed: 57 unkeyable / 57 allowed; 92 repository-wide keys.
- Changed runtime/test files pass oxfmt and git diff --check.

The CampaignDashboardPage.advanceButtons failure belongs to main and is handled
by #3059, per Root. No dashboard files were changed for this follow-up.

## Explicit restart ruling after hosted E2E failure

Root reported run 42479354495 at head ffc46970f: the second manual launch of
the same encounter was refused as an unintended reassignment. Root explicitly
allows pre-battle restarts of Launched encounters and requires visible refusal
feedback. The E2E's same-encounter semantics remain unchanged.

Fetched and fast-forwarded Root's branch head before work, then merged fetched
main 240e3bf6cff974918bc6a415afc95e30571f0287 (merge
b0d6b1883fab42ee8eb4e44380c5d54bc75f765d). No rebase or force push.

- Restart regression tests were red before implementation: 5 failed, 82 passed.
- Real-SQLite coverage now proves launch A -> explicit restart B -> completion A
  refused -> completion B succeeds; Completed cannot restart. Failed restart
  writes roll back to A. Ordinary/default links still refuse reassignment.
- API replay coverage proves an abandoned A is refused before replay writing
  or completion, while B can persist and complete. Client/API tests pin explicit
  boolean intent and ensure generic links and completion never opt in.
- The requested `npx playwright test e2e/seam-fresh-construction-no-instant-defeat.spec.ts`
  passed both scenarios. The original still materializes once and launches the
  SAME encounter twice with seed 1337, comparing equal outcome markers. The
  added refusal scenario asserts an inline alert is visible and in the viewport,
  the manual button becomes enabled again, and navigation does not occur.
- Local E2E used isolated port 3619 and `node server.js` through the existing
  server-command override. Initial Turbopack/Webpack attempts could not compile
  across the shared cross-drive dependency junction. Materialized a local copy
  of the same installed dependencies, including the existing native TypeScript
  toolchain; no dependency manifest, lockfile, version, application bundler
  configuration or test timeout changed. The final run used normal Turbopack
  and passed in 36.9 seconds.
- Full affected directories (encounter services/hooks/pages, all API tests,
  campaign encounter/co-op tests), full integration and simulation runner,
  replay/digest/golden after-run and lint-units Jest suite: 369 suites /
  5,484 tests passed, 32 skipped. Entire stores directory: 81 suites /
  1,305 tests passed. These groups overlap; do not sum them.
- Replay/digest/golden before-run: 69 suites / 1,046 tests passed. No committed
  fixtures, digests, replay schema packs or payload formats changed.
- Exact `npm run validate:combat`: exit 0, 79 suites / 2,107 tests passed plus
  the script's catalog/gap/OpenSpec checks.
- Both TypeScript configurations passed. Root lint: 63 warnings / 0 errors.
  lint:units: 17,074 / 17,085; no ceilings raised.
- Budget: 3,080 indexed tests, 57 unkeyable / 57 allowed, 92 repository-wide keys.
- Strict OpenSpec: 263 passed / 0 failed; CI accounting 42 / 42, purpose lint passed.

See relaunch-audit.md for all callers, including the pinned #3063 resume path
that returns its recorded session without invoking launch/reassignment. The
only new opt-ins are the pre-battle force and skirmish hooks. Existing persisted
encounters are not migrated or automatically repaired.

Rule 4 source re-anchor: CombatConsciousnessSourceRefs.ts now cites the actual
applyPilotToSelection-through-createInteractiveSkirmishSession region. Checked
that both the assigned rpgToughness snapshot and pilotToughness transfer remain
inside the cited content; full runner/catalog checks pass.
