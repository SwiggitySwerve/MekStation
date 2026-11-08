## Implementation

- [x] Record the full replay/digest/golden baseline and failing countdown tests.
- [x] Add a separately named pure vehicle countdown step and document the persisted counter's round semantics.
- [x] Wire both phaseManagement and SimulationRunnerState without building C7's shared reset helper.
- [x] Verify intra-round stability, duplicate boundaries, zero floor, immutability, nonvehicle preservation, engine entry paths, and live-versus-replay equality.
- [x] Kill missing-decrement, per-phase, below-zero, and missing-runner-call mutants.
- [x] Re-anchor all affected runner citations by matching content.
- [x] Run whole-directory gates, replay/digest/golden suites, combat validation, both TypeScript configs, lint, unit lint and suite, oxfmt, and budget check at 57/92.

## Follow-up outside this change

- [ ] Correct repeated-stun increments in a separate approved change: MegaMek 48fcb2f64 megamek/src/megamek/common/units/Tank.java:1066-1069 sets two rounds on the first stun, then adds one for subsequent stuns. Preserve the current plus-two producers in this PR.


## Verification evidence

Node 22.22.0; better-sqlite3 opens successfully with this installed ABI.

- Before and after: the same 90 replay/digest/golden suites, 1,272 tests and eight snapshots passed. C4 values and all committed replay fixtures/digests/goldens are unchanged; no rebaseline.
- Red: three suites failed with five countdown assertions (expected one or zero, received two); the intra-round/repeated-stun test passed before implementation.
- Green: seven new tests pass, covering both reducer boundary events, duplicate boundaries, every intra-round phase, zero floor, immutable updates, unrelated vehicle fields, and nonvehicle identity. Engine tests exercise interactive phase advance and runToCompletion with a legitimate critical event seeded at start. Runner reset vehicle combat state equals the corresponding replay fold.
- Killed mutants: remove the decrement; decrement every phase; remove the zero floor; remove the runner call. Each failed a new assertion, then was restored. The missing-runner mutant specifically failed the live counter (expected one, received two).
- Whole gameplay, engine, runner (including phases), gameplay types and integration directories: 551 suites / 9,656 tests passed, 32 skipped.
- validate:combat passed: 79 suites / 2,107 tests plus all inventory and strict OpenSpec checks.
- Both TypeScript configs passed; root lint has 63 warnings / zero errors; lint:units passed at 17,076/17,085 and its suite passed 33 tests; oxfmt and strict change validation passed.
- CI budget passed at 57 unkeyable / 92 repository-wide keys. No limits changed.
- Thirteen affected source citations were re-anchored using identical boundary content, including split path/line references.
- Fetched origin/main remained 03647bfcc at the final check. C7 has not landed; the separately named countdown can move with its reset call sites when C7 integrates.

Raw local evidence: E:/Temp/c14-evidence/pr2-*.log.
