# U15/U16 verification

Base: fetched `origin/main` at `218fd27b16adb1db0c90b65714792d6334584b68`, including D-6 #3100 (`c8d395bcb`). The branch was created with `--no-track`.

## Regression and mutation evidence

The two existing component suites were extended before changing runtime code. The red run reached assertions: **8 failed, 13 passed**. Five failures covered stale spotters after undo, replacement, rollover and session clearing; three covered missing dock cancellation.

After the fix, the full shell/dock directories passed **30 suites / 255 tests**. A repeat after all mutants were restored also passed **30 suites / 255 tests**.

| Deliberate mutant | Assertion failures | Result |
| --- | ---: | --- |
| Restore the exact original forward-only shell | 5 | Killed |
| Omit cancellation before the next preview request | 2 | Killed |
| Omit unmount cleanup | 2 | Killed |

Each mutation was applied alone. A `finally` restored the source bytes and checked their SHA-256 before the next variant. Restored shell SHA-256: `77df4112649eb5d2c2cabbe6a5afec417e58a09a72cbaa4c9e72eb52f67cd16c`; restored dock: `7c43bbbf3da56bd43c7187aacfd9eaf6f3d6bf9ef513baf13b55c626dbe93662`.

The dock regression uses D-6's real `capturePreviewFreshness` and `validateGmCascadePreviewFreshness`: a changed source fingerprint blocks approval, preserves the same visible preview and its fingerprint, and keeps it pending for cancellation before replacement. The replacement uses fresh metadata and can be approved. The existing tactical GM intervention surface suite also passed in the broader directory run. Pipeline, freshness, reducer and event-schema files were unchanged.

## Local gates

| Command / surface | Result |
| --- | --- |
| `npm test -- --selectProjects unit --runInBand --watchAll=false src/components/gameplay/TacticalCommandShell src/components/gameplay/TacticalActionDock` | 30 suites, 255 passed; repeated after restoration |
| `npm test -- --selectProjects unit --runInBand --watchAll=false src/__tests__/integration scripts/__tests__/lint-units.test.ts src/pages-modules/gameplay/games/__tests__` | 56 suites, 690 passed, 32 skipped |
| `npm run typecheck` | Both root and scripts projects passed; repeated on restored tree |
| `npm run lint` | 63 warnings, 0 errors; repeated on restored tree |
| `npm run lint:units` | PASS, 17079/17085; ceilings unchanged |
| `npx oxfmt --write <four changed TS/TSX files>` and `npx oxfmt --check .` | PASS |
| `openspec validate fix-tactical-spotter-and-preview-lifecycle --strict` | PASS |
| `npm run qc:openspec-ci:validate` | 72/72 active changes accounted, 0 errors |
| `node scripts/ci/budget-check.mjs` | PASS: 57 unkeyable, 92 repo-wide |

No engine, gameplay reducer or simulation source changed, so the Wave 3 exception applies to runner, replay/golden and combat-validation gates. No fixture, digest, persistence format or generated catalog was changed. Browser verification and a production build were not run locally; hosted checks are a separate gate before the PR becomes ready.

The empty worktree's slow npm install was stopped and preserved in its ignored cache. Validation used a completed dependency install through a local junction. The source and install package-lock hashes matched (`D007A047FCDD32D4B3E4364FABF892A43493106AE0B9BC3178E7B79EBA01ACE7`), with zero required-package version mismatches. No source files in that checkout were modified.

Detailed red, green, mutant, restored-file hashes and gate logs are in the coordinator's local `w3-u15-u16/` evidence directory.
