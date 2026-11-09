## Implementation

- [x] Record the replay/digest/golden baseline and behavior-preserving producer regression coverage.
- [x] Consolidate all four stun producers into vehicleCrewStun.stunCrew, prove unchanged behavior, and commit separately.
- [ ] Record failing increment tests, including the replacement for C14's old two-to-four expectation.
- [ ] Implement the pinned rule and verify first/repeated/mixed effects, countdown/re-stun, immutability, hydration, engine loops, and runner/replay parity.
- [ ] Kill an unconditional-plus-two mutant and restore the implementation.
- [ ] Complete whole-directory gameplay/engine/runner/integration tests, replay/digest/golden checks, validate:combat, both TypeScript configs, lint, unit lint and suite, oxfmt, OpenSpec, and the unchanged unkeyable budget.
- [ ] Open a draft PR and mark it ready only after hosted CI is green.

## Verification evidence

Base: fetched origin/main c9328a89f. Node 22.22.0 with better-sqlite3 rebuilt for that ABI. Raw evidence is in E:/Temp/c6-evidence/.

- Before production edits: 92 replay/digest/golden suites, 1,289 tests, and eight snapshots passed. Captured SHA-256 hashes of 209 tracked fixture/snapshot/golden/digest paths and related sources.
- Before consolidation: both affected gameplay suites passed, 48 tests total, including the added all-producer regression matrix. Both TypeScript configs passed. The new OpenSpec change passed strict validation.
- After consolidation: the same two suites and 48 tests passed with the old increment intact. The baseline budget attempt timed out in Jest discovery; rerun the unchanged gate after local test activity settles.
