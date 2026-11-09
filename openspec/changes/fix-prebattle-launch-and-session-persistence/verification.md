## Scope and evidence

Initial base: origin/main c9328a89f82fd0e986c9f4be5c7db931d9db42a2. Refreshed with `git merge --ff-only origin/main` to c85f2912c11c06e2eeb3afabdb2543128f56d6e2: the only upstream change is the campaign E2E environment scan test's temporary-directory race fix (#3088), with no runtime code changes. Root approved the file scope and three mutants before edits. Evidence logs are stored under `E:/Projects/Personal/_scratch/sm-audit-reports/w3-U13/`.

## Entry paths

| Entry | Relationship |
| --- | --- |
| Force-based interactive launch | Pre-battle route to launch hook, interactive session recovery, explicit restart linkage, store publication, navigation |
| Pre-battle auto-resolve | Same hook to GameEngine.runToCompletion, link, completion, campaign outcome, store publication, navigation |
| Spectator launch | Same hook to interactive session, restart linkage, spectator store, navigation |
| Unit-picker skirmish | Pre-battle route to skirmish hook, recovery, restart linkage, store publication, navigation |
| Completed game page | Game route to lifecycle hook, match-log and encounter-replay persistence |
| QuickResolve and quick game | Separate launchers; any completed session mounted on the game page shares lifecycle persistence |
| Campaign fast-forward | Calls runToCompletion independently; does not call the changed UI hooks |
| AI and GameEngine phases | Produce session state consumed by the page; no rule changes |
| Multiplayer dispatch and journal authority | Separate server entry and authority; unchanged |
| P2P translation | Separate translation entry; existing lifecycle reconnect and divergence wiring unchanged |
| Standalone simulation runner | Does not invoke these UI hooks |

## Test-first and mutation evidence

- `red-by-path.log`: 2 suites failed, 6 regression tests failed before production edits: all four launch modes, second-session persistence, and missing save-failure notification.
- `green-hooks.log`: the expanded existing hook suites passed, 33 tests.
- `mutant-1-no-launch-guard-final.log`: removing both launch guards was killed by all four launch regressions, each observing two submissions where one was required.
- `mutant-2-page-wide-flags.log`: changing session-specific membership checks to page-wide nonempty checks was killed by the A/B persistence regression.
- `mutant-3-silent-save-success.log`: recording failure as saved and removing its toast was killed by the save-failure regression.
- All mutations were restored before the broader gates.

## Local gates

- Full touched test directories: 17 suites, 99 tests passed, including the final restored-tree rerun after the replay error-cause correction.
- Both TypeScript configs passed after correcting the handling of the replay helper's unknown error value. The original value is preserved as the error cause.
- Root lint: 63 warnings, 0 errors.
- Units lint: 17079 findings against the unchanged 17085 total ceiling; every path passed its own ceiling.
- Formatting: all 9207 matched files passed.
- OpenSpec change validation: passed strict validation.
- Budget before and after: 3116 files, 57 unkeyable, 92 repo-wide. No new test files, no ceiling changes.
- After the main refresh, the corrected campaign API environment-scan suite passed all 4 tests. The final budget scan and units lint passed again without ceiling changes.
- The complete integration directory plus the required units-lint Jest suite: 54 suites passed, 675 tests passed, 32 existing tests skipped.
- Local `seam-fresh-construction-no-instant-defeat` E2E on port 3648: both tests passed, no retries, no skips, no flaky results. This includes two same-seed launches of one encounter and the visible, retryable refusal. `seam.json`, `seam.log`, and both traces under `e2e/` record the real dev-server run (9.6 minutes, including cold-route warm-up). Port 3600 was not used or stopped.

## Compatibility and limits

The existing pre-battle catch blocks and explicit restart calls were compared against the base and are unchanged. The route's visible S1a error surface is untouched. No engine, reducer, or simulation files changed, so the Wave 3 gameplay-only gates do not apply. No schema, persisted format, or replay fixture changes were made. Persistence failure is terminal for that session during this page mount; automatic retry and victory-page recovery remain outside this change.
