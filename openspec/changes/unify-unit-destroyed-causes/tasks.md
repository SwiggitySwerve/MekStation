## Implementation

- [x] Record replay/digest/golden baseline and failing contract test.
- [x] Consolidate the seven-value contract without changing vehicle mappings.
- [x] Prove replay acceptance/rejection and compile-time producer/consumer parity.
- [x] Kill deliberate missing-cause, extra-cause, and mapping mutants.
- [x] Re-anchor affected runner source citations by content.
- [x] Run whole-directory gates, replay/digest/golden comparison, combat validation, both TypeScript configs, lint, unit lint and tests, formatter, and CI budget check.

## Evidence

Node 22.22.0; better-sqlite3 opened an in-memory database successfully (no ABI error).

- Before: 90 replay/digest/golden suites, 1,272 tests, eight snapshots passed.
- Red: both new contract suites failed because the shared cause module did not exist.
- Green: compile-time equality covers damage results, state, destruction checks, critical-event payloads, runner ammo/critical results, and the destruction emitter input. Runtime replay tests cover every accepted cause and reject all six vehicle-only causes. Real vehicle attacks retain crew/turret-to-damage and ammo-to-ammo mappings.
- Killed mutants: omit head_destroyed from replay enum; admit crew_killed into replay enum; change vehicle fallback from damage to ammo_explosion. Each failed its new assertion, then was restored.
- After: the same 90 replay/digest/golden suites passed (1,285 tests, eight snapshots). No committed values or fixtures changed, including C4.
- Whole directories: 568 suites / 10,311 tests passed, 32 skipped; runner phase directory: three suites / 25 tests passed. Covers gameplay, engine, runner, gameplay types, replay, and integration.
- validate:combat passed: 79 suites / 2,107 tests plus all inventory and OpenSpec checks. Initial citation failure was corrected and the gate rerun.
- Both TypeScript configs passed. Root lint: 63 warnings, zero errors. lint:units passed at 17,075/17,085; its suite passed 33 tests. OpenSpec strict validation and oxfmt passed.
- CI budget: 57 unkeyable / 92 repository-wide keys; no ceilings changed.
- Twenty-two affected source citations were re-anchored by matching unchanged old/new boundary content, including split path/line anchors.

Raw local execution logs: E:/Temp/c14-evidence/pr1-*.log. Never regenerate committed replay fixtures or digests in this change.
