## Implementation

- [x] Record the replay/digest/golden baseline and behavior-preserving producer regression coverage.
- [x] Consolidate all four stun producers into vehicleCrewStun.stunCrew, prove unchanged behavior, and commit separately.
- [x] Record failing increment tests, including the replacement for C14's old two-to-four expectation.
- [x] Implement the pinned rule and verify first/repeated/mixed effects, countdown/re-stun, immutability, hydration, engine loops, and runner/replay parity.
- [x] Kill an unconditional-plus-two mutant and restore the implementation.
- [x] Complete whole-directory gameplay/engine/runner/integration tests, replay/digest/golden checks, validate:combat, both TypeScript configs, lint, unit lint and suite, oxfmt, OpenSpec, and the unchanged unkeyable budget.
- [ ] Open a draft PR and mark it ready only after hosted CI is green.

## Verification evidence

Base: fetched origin/main c9328a89f. Node 22.22.0 with better-sqlite3 rebuilt for that ABI. Raw evidence is in E:/Temp/c6-evidence/.

- Before production edits: 92 replay/digest/golden suites, 1,289 tests, and eight snapshots passed. Captured SHA-256 hashes of 209 tracked fixture/snapshot/golden/digest paths and related sources.
- Before consolidation: both affected gameplay suites passed, 48 tests total, including the added all-producer regression matrix. Both TypeScript configs passed. The new OpenSpec change passed strict validation.
- After consolidation: the same two suites and 48 tests passed with the old increment intact. The baseline budget attempt timed out in Jest discovery; rerun the unchanged gate after local test activity settles.
- Consolidation commit: 0742ffab3. Its unmodified commit hook passed lint, formatting, and both TypeScript configs.
- Red: all four approved test files failed, with 13 failed and 45 passed assertions/tests. Failures cover the direct/reducer matrix, mixed sources, re-stun at one remaining round, C14's former two-to-four expectation, interactive/runToCompletion paths, and runner/replay parity. An earlier full-discovery attempt was interrupted after engine failures appeared; the complete red result is parity-red-scoped.json. No repository gate configuration changed.
- Green: the same four suites passed all 58 tests after the pinned rule was applied.
- Killed mutant: deliberately restored unconditional plus-two; all six direct/reducer matrix tests failed. Restored the pinned implementation before running the final gates.
- Whole-directory gameplay, engine, runner (including phases), gameplay types, integration, and unit-lint suite: 559 suites / 9,800 tests passed, 32 skipped. Passed both before and after merging fetched main updates; final tested main is 1480f0445, merged into 01a707724. No terrain or damage-threshold piloting skill roll producers were edited.
- Original before/after replay comparison: the same 92 suites / 1,289 tests and eight snapshots passed. The final merged-tree run passed 92 suites / 1,303 tests and the same eight snapshots; the extra 14 tests came from main's replay-load recovery change. Zero snapshots were updated. No fixture, digest, golden, or C4 value was regenerated or changed.
- validate:combat passed twice: 79 suites / 2,107 tests, inventory assertions, and strict OpenSpec validation, using the exact npm command from CI.
- Both TypeScript configs passed. Root lint: 63 warnings / zero errors. Unit lint: 17,079 / 17,085 with unchanged ceilings; its Jest suite also passed. Root format check, strict change/all-spec validation, and the OpenSpec CI-quality gate passed.
- Final budget gate passed on the merged tree: 3,116 files, 57 unkeyable tests / 92 repository-wide keys. Earlier cold-discovery timeouts were resolved by warming the exact discovery command and rerunning the unchanged gate; no budget or timeout setting changed.
- Compared all 209 protected fixture/snapshot/golden/digest paths and related sources after both main merges: every SHA-256 hash was unchanged. An initial comparison had a PowerShell array-enumeration error; the corrected file-by-file check confirmed zero changed paths.
- No combat source citations reference the three modified production modules; no re-anchoring was needed. Combat catalog contract suites passed.
