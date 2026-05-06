# Notepad — Decisions

Architectural choices made during implementation. Decisions referenced by 2+ tasks graduate into design.md before archive.

## [2026-05-06] Task: P0 — Class with method API + asD6Roller adapter

**Decision**: `SeededD6Roller` is a class with `.rollD6()` and `.roll2d6()` instance methods AND an `.asD6Roller(): D6Roller` adapter that returns the bound `rollD6` function for callsites typed against the existing `D6Roller = () => number` contract.

**Rationale**: The spec scenarios reference `seededRoller.roll2d6()` (method form), but the existing `D6Roller` type at `src/utils/gameplay/diceTypes.ts:20` is `() => number` (function form). Bridging via a class with a function-shape adapter satisfies both: scenario tests get the ergonomic method form for assertions, and production utilities (`roll2d6(roller)`, `rollD6(roller)`) get a drop-in function compatible with `defaultD6Roller`. The bound-method capture means the adapter carries the underlying PRNG state with it — calls through the adapter advance the same stream as direct method calls (verified by the "shares state with the originating roller" test).

**Discovered during**: P0.1 (SeededD6Roller authoring).

**Tasks that will reuse this pattern**: P3 (critical hit wiring uses `roller?: D6Roller`), P4 (heat & ammo events use `roller?: D6Roller`), P6 (Monte Carlo distribution tests pass `new SeededD6Roller(seed).asD6Roller()` into `roll2d6`/`rollD6`/`checkCriticalHitTrigger`/`resolveDamage`).

**Graduation candidate**: Yes — this is referenced by at least P3, P4, P6 tasks. Orchestrator should graduate to design.md before archive.

